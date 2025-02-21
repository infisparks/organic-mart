'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storage, database, auth } from '../../../lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ref as dbRef, push, set } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';

const availableNutrients = [
  "Protein",
  "Fat",
  "Carbs",
  "Fiber"
];

export default function AddProduct() {
  const router = useRouter();

  const [productPhoto, setProductPhoto] = useState<File | null>(null);
  const [productPhotoPreview, setProductPhotoPreview] = useState<string>('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [selectedNutrient, setSelectedNutrient] = useState(availableNutrients[0]);
  const [nutrientValue, setNutrientValue] = useState('');
  const [nutrients, setNutrients] = useState<Array<{ name: string; value: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Generate preview for selected image
  useEffect(() => {
    if (productPhoto) {
      const previewUrl = URL.createObjectURL(productPhoto);
      setProductPhotoPreview(previewUrl);

      return () => URL.revokeObjectURL(previewUrl);
    } else {
      setProductPhotoPreview('');
    }
  }, [productPhoto]);

  const addNutrient = () => {
    if (!nutrientValue) return;
    // Prevent duplicate nutrients
    if (nutrients.find(n => n.name === selectedNutrient)) {
      setMessage(`${selectedNutrient} is already added.`);
      return;
    }
    const newNutrient = { name: selectedNutrient, value: nutrientValue };
    setNutrients([...nutrients, newNutrient]);
    setNutrientValue('');
    setMessage('');
  };

  const removeNutrient = (name: string) => {
    setNutrients(nutrients.filter(n => n.name !== name));
  };

  const uploadProductPhoto = async (file: File) => {
    const uniqueFileName = uuidv4();
    const photoReference = storageRef(storage, `product-photos/${uniqueFileName}`);
    const uploadResult = await uploadBytes(photoReference, file);
    const downloadUrl = await getDownloadURL(uploadResult.ref);
    return downloadUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productPhoto) {
      setMessage('Please upload a product photo.');
      return;
    }
    if (!auth.currentUser) {
      setMessage('User not authenticated.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Upload photo and get URL
      const photoUrl = await uploadProductPhoto(productPhoto);

      // Prepare product data
      const productData = {
        productName,
        productDescription,
        originalPrice: parseFloat(originalPrice),
        discountPrice: parseFloat(discountPrice),
        productPhotoUrl: photoUrl,
        nutrients, // array of nutrient objects
        createdAt: Date.now(),
      };

      const uid = auth.currentUser.uid;
      const productRef = dbRef(database, `companies/${uid}/products`);
      const newProductRef = push(productRef);
      await set(newProductRef, productData);

      setMessage('Product added successfully!');
      // Redirect to My Product page
      router.push('/dashboard/my-product');
    } catch (error: any) {
      console.error('Error adding product:', error);
      setMessage(error.message || 'Error adding product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Add Product</h2>
        {message && <div className="mb-4 text-red-500">{message}</div>}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Form Section */}
          <form onSubmit={handleSubmit} className="flex-1 space-y-6">
            {/* Product Photo */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Product Photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProductPhoto(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
                required
              />
            </div>

            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Product Name
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Enter product name"
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                required
              />
            </div>

            {/* Product Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Product Description
              </label>
              <textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Enter product description"
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                required
              ></textarea>
            </div>

            {/* Price Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Original Price
                </label>
                <input
                  type="number"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  placeholder="Original Price"
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Discount Price
                </label>
                <input
                  type="number"
                  value={discountPrice}
                  onChange={(e) => setDiscountPrice(e.target.value)}
                  placeholder="Discount Price"
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  required
                />
              </div>
            </div>

            {/* Nutrients Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nutrients
              </label>
              <div className="flex space-x-2 mt-1">
                <select
                  value={selectedNutrient}
                  onChange={(e) => setSelectedNutrient(e.target.value)}
                  className="block w-1/2 border border-gray-300 rounded-md p-2"
                >
                  {availableNutrients.map((nutrient) => (
                    <option key={nutrient} value={nutrient}>
                      {nutrient}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={nutrientValue}
                  onChange={(e) => setNutrientValue(e.target.value)}
                  placeholder="Enter value (e.g., 2g)"
                  className="block w-1/2 border border-gray-300 rounded-md p-2"
                />
                <button
                  type="button"
                  onClick={addNutrient}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              {nutrients.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {nutrients.map((nutrient) => (
                    <li
                      key={nutrient.name}
                      className="flex justify-between items-center border border-gray-200 rounded-md p-2"
                    >
                      <span>
                        {nutrient.name}: {nutrient.value}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeNutrient(nutrient.name)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {loading ? 'Adding Product...' : 'Add Product'}
            </button>
          </form>

          {/* Preview Section */}
          <div className="flex-1 border border-gray-200 rounded-md p-4 bg-gray-50">
            <h3 className="text-xl font-semibold mb-4">Product Preview</h3>
            {productPhotoPreview ? (
              <div className="w-full h-80 flex items-center justify-center mb-4">
                <img
                  src={productPhotoPreview}
                  alt="Product Preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-full h-80 bg-gray-300 flex items-center justify-center mb-4 rounded-md">
                <span className="text-gray-600">Image Preview</span>
              </div>
            )}
            <div className="space-y-2">
              <div>
                <span className="font-medium">Name: </span>
                <span>{productName || 'Product name'}</span>
              </div>
              <div>
                <span className="font-medium">Description: </span>
                <span>{productDescription || 'Product description'}</span>
              </div>
              <div>
                <span className="font-medium">Original Price: </span>
                <span>{originalPrice ? `$${originalPrice}` : '$0.00'}</span>
              </div>
              <div>
                <span className="font-medium">Discount Price: </span>
                <span>{discountPrice ? `$${discountPrice}` : '$0.00'}</span>
              </div>
              <div>
                <span className="font-medium">Nutrients:</span>
                {nutrients.length > 0 ? (
                  <ul className="list-disc ml-5">
                    {nutrients.map((nutrient) => (
                      <li key={nutrient.name}>
                        {nutrient.name}: {nutrient.value}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span> None</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
