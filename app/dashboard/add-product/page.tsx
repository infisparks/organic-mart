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

// Define categories as an object with main categories as keys and an array of subcategories as values.
const categoryOptions: { [key: string]: string[] } = {
  "Organic Groceries & Superfoods": [
    "Organic Staples & Grains",
    "Cold-Pressed Oils & Ghee",
    "Organic Spices & Condiments",
    "Superfoods & Immunity Boosters",
    "Natural Sweeteners",
    "Organic Snacks & Beverages",
    "Dairy & Plant-Based Alternatives"
  ],
  "Herbal & Natural Personal Care": [
    "Organic Skincare",
    "Herbal Haircare",
    "Natural Oral Care",
    "Chemical-Free Cosmetics",
    "Organic Fragrances"
  ],
  "Health & Wellness Products": [
    "Ayurvedic & Herbal Supplements",
    "Nutritional Supplements",
    "Detox & Gut Health",
    "Immunity Boosters",
    "Essential Oils & Aromatherapy"
  ],
  "Sustainable Home & Eco-Friendly Living": [
    "Organic Cleaning Products",
    "Reusable & Biodegradable Kitchen Essentials",
    "Organic Gardening",
    "Sustainable Home Décor"
  ],
  "Sustainable Fashion & Accessories": [
    "Organic Cotton & Hemp Clothing",
    "Eco-Friendly Footwear",
    "Bamboo & Wooden Accessories",
    "Handmade & Sustainable Jewelry"
  ],
  "Organic Baby & Kids Care": [
    "Organic Baby Food",
    "Natural Baby Skincare",
    "Eco-Friendly Baby Clothing",
    "Non-Toxic Toys & Accessories"
  ],
  "Organic Pet Care": [
    "Organic Pet Food",
    "Herbal Grooming & Skincare",
    "Natural Pet Supplements"
  ],
  "Special Dietary & Lifestyle Products": [
    "Gluten-Free Foods",
    "Vegan & Plant-Based Alternatives",
    "Keto & Low-Carb Products",
    "Diabetic-Friendly Foods"
  ]
};

export default function AddProduct() {
  const router = useRouter();

  // States for product details
  const [productPhotos, setProductPhotos] = useState<File[]>([]);
  const [productPhotoPreviews, setProductPhotoPreviews] = useState<string[]>([]);
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [selectedNutrient, setSelectedNutrient] = useState(availableNutrients[0]);
  const [nutrientValue, setNutrientValue] = useState('');
  const [nutrients, setNutrients] = useState<Array<{ name: string; value: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // States for category selection
  const mainCategoryKeys = Object.keys(categoryOptions);
  const [selectedMainCategory, setSelectedMainCategory] = useState(mainCategoryKeys[0]);
  const [selectedSubCategory, setSelectedSubCategory] = useState(categoryOptions[mainCategoryKeys[0]][0]);
  const [selectedCategories, setSelectedCategories] = useState<
    Array<{ main: string; sub: string }>
  >([]);

  // Generate previews for selected images
  useEffect(() => {
    if (productPhotos.length > 0) {
      const previews = productPhotos.map(file => URL.createObjectURL(file));
      setProductPhotoPreviews(previews);

      // Cleanup: revoke object URLs on unmount or when productPhotos change
      return () => {
        previews.forEach(url => URL.revokeObjectURL(url));
      };
    } else {
      setProductPhotoPreviews([]);
    }
  }, [productPhotos]);

  // Nutrients logic remains unchanged
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

  // Category logic: add a category combination if not already added
  const addCategory = () => {
    if (!selectedMainCategory || !selectedSubCategory) return;
    const exists = selectedCategories.find(
      (cat) =>
        cat.main === selectedMainCategory && cat.sub === selectedSubCategory
    );
    if (exists) {
      setMessage(`Category ${selectedMainCategory} > ${selectedSubCategory} is already added.`);
      return;
    }
    setSelectedCategories([...selectedCategories, { main: selectedMainCategory, sub: selectedSubCategory }]);
    setMessage('');
  };

  const removeCategory = (main: string, sub: string) => {
    setSelectedCategories(selectedCategories.filter(cat => !(cat.main === main && cat.sub === sub)));
  };

  // Limit file selection to a maximum of 3 files
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      let files = Array.from(e.target.files);
      if (files.length > 3) {
        setMessage('You can only upload a maximum of 3 images.');
        files = files.slice(0, 3);
      }
      setProductPhotos(files);
    }
  };

  // Allows setting the thumbnail (position 0) by swapping the clicked image with the current thumbnail.
  const handleSetThumbnail = (index: number) => {
    if (index === 0) return; // already thumbnail
    const newPhotos = [...productPhotos];
    // Swap position 0 with the clicked index
    [newPhotos[0], newPhotos[index]] = [newPhotos[index], newPhotos[0]];
    setProductPhotos(newPhotos);
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

    if (productPhotos.length < 1) {
      setMessage('Please upload at least one product photo.');
      return;
    }
    if (!auth.currentUser) {
      setMessage('User not authenticated.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Upload all photos concurrently and get an array of URLs
      const photoUrls = await Promise.all(productPhotos.map(file => uploadProductPhoto(file)));

      // Prepare product data, including photo URLs, nutrients, and selected categories
      const productData = {
        productName,
        productDescription,
        originalPrice: parseFloat(originalPrice),
        discountPrice: parseFloat(discountPrice),
        productPhotoUrls: photoUrls, // storing multiple photo URLs
        nutrients, // array of nutrient objects
        categories: selectedCategories, // array of { main, sub } objects
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
            {/* Product Photos */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Product Photos (Min: 1, Max: 3)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
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

            {/* Categories Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Categories
              </label>
              <div className="flex flex-col space-y-2 mt-1">
                <div className="flex space-x-2">
                  <select
                    value={selectedMainCategory}
                    onChange={(e) => {
                      const mainCat = e.target.value;
                      setSelectedMainCategory(mainCat);
                      // Reset subcategory to the first option of the selected main category
                      setSelectedSubCategory(categoryOptions[mainCat][0]);
                    }}
                    className="block w-1/2 border border-gray-300 rounded-md p-2"
                  >
                    {mainCategoryKeys.map((main) => (
                      <option key={main} value={main}>
                        {main}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedSubCategory}
                    onChange={(e) => setSelectedSubCategory(e.target.value)}
                    className="block w-1/2 border border-gray-300 rounded-md p-2"
                  >
                    {categoryOptions[selectedMainCategory].map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addCategory}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Add
                  </button>
                </div>
                {selectedCategories.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {selectedCategories.map((cat, idx) => (
                      <li
                        key={idx}
                        className="flex justify-between items-center border border-gray-200 rounded-md p-2"
                      >
                        <span>
                          {cat.main} &gt; {cat.sub}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeCategory(cat.main, cat.sub)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
            {productPhotoPreviews.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {productPhotoPreviews.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt={`Product Preview ${index + 1}`}
                      className="w-full h-40 object-contain rounded-md"
                    />
                    <div className="absolute top-0 left-0 bg-blue-500 text-white px-2 py-1 text-xs rounded-br">
                      {index === 0 ? "Thumbnail" : `Position ${index}`}
                    </div>
                    {index !== 0 && (
                      <button
                        type="button"
                        onClick={() => handleSetThumbnail(index)}
                        className="absolute bottom-0 left-0 bg-green-600 text-white text-xs px-2 py-1 rounded-tl hover:bg-green-700"
                      >
                        Set as Thumbnail
                      </button>
                    )}
                  </div>
                ))}
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
              <div>
                <span className="font-medium">Categories:</span>
                {selectedCategories.length > 0 ? (
                  <ul className="list-disc ml-5">
                    {selectedCategories.map((cat, idx) => (
                      <li key={idx}>
                        {cat.main} &gt; {cat.sub}
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
