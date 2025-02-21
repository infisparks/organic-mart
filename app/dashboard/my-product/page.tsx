'use client';

import { useState, useEffect } from 'react';
import { auth, database } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref as dbRef, onValue, remove } from 'firebase/database';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MyProduct() {
  const [products, setProducts] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const uid = user.uid;
        // Reference to the company's products
        const productsRef = dbRef(database, `companies/${uid}/products`);
        // Listen for changes in the products node
        const unsubscribeProducts = onValue(productsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            // Convert the returned object into an array
            const productsArray = Object.entries(data as Record<string, any>).map(
              ([id, product]) => ({
                id,
                ...(product as Record<string, any>),
              })
            );
            setProducts(productsArray);
          } else {
            setProducts([]);
          }
          setLoading(false);
        });
        // Cleanup the products listener when user changes
        return () => {
          unsubscribeProducts();
        };
      } else {
        setLoading(false);
      }
    });

    // Cleanup the auth listener on unmount
    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Delete a product from the database
  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    try {
      await remove(dbRef(database, `companies/${uid}/products/${productId}`));
      alert('Product deleted successfully!');
    } catch (error: any) {
      alert(error.message || 'Error deleting product.');
    }
  };

  // Filter products based on search term
  const filteredProducts = products.filter((product) => {
    const name = product.productName?.toLowerCase() || '';
    const description = product.productDescription?.toLowerCase() || '';
    return (
      name.includes(searchTerm.toLowerCase()) ||
      description.includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 items-center h-16">
            <Link
              href="/dashboard"
              className="px-3 py-2 text-gray-700 hover:text-blue-500 font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/add-product"
              className="px-3 py-2 text-gray-700 hover:text-blue-500 font-medium"
            >
              Add Product
            </Link>
            <Link
              href="/dashboard/my-product"
              className="px-3 py-2 text-blue-500 font-medium"
            >
              My Product
            </Link>
            <Link
              href="/dashboard/my-order"
              className="px-3 py-2 text-gray-700 hover:text-blue-500 font-medium"
            >
              My Order
            </Link>
          </div>
        </div>
      </nav>

      {/* Products List */}
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">My Products</h1>
        {/* Search Input */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <p className="text-gray-600">Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-gray-600">No products found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white shadow rounded-lg overflow-hidden flex flex-col"
              >
                <img
                  src={product.productPhotoUrl}
                  alt={product.productName}
                  className="w-full h-48 bg-gray-100 object-contain"
                />
                <div className="p-4 flex-grow flex flex-col">
                  <h2 className="text-xl font-bold">{product.productName}</h2>
                  <p className="text-gray-600 flex-grow">{product.productDescription}</p>
                  <div className="mt-2">
                    <span className="font-medium">Price: </span>
                    <span className="line-through text-red-500">
                      ${product.originalPrice}
                    </span>
                    <span className="ml-2 text-green-600">
                      ${product.discountPrice}
                    </span>
                  </div>
                  {product.nutrients && product.nutrients.length > 0 && (
                    <div className="mt-2">
                      <h3 className="font-medium">Nutrients:</h3>
                      <ul className="list-disc ml-5">
                        {product.nutrients.map((nutrient: any, idx: number) => (
                          <li key={idx}>
                            {nutrient.name}: {nutrient.value}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-4 flex justify-between">
                    <Link
                      href={`/dashboard/edit-product/${product.id}`}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
