'use client';

import Link from 'next/link';

export default function MyOrder() {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 items-center h-16">
            <Link href="/dashboard" className="px-3 py-2 text-gray-700 hover:text-blue-500 font-medium">
              Dashboard
            </Link>
            <Link href="/dashboard/add-product" className="px-3 py-2 text-gray-700 hover:text-blue-500 font-medium">
              Add Product
            </Link>
            <Link href="/dashboard/my-product" className="px-3 py-2 text-gray-700 hover:text-blue-500 font-medium">
              My Product
            </Link>
            <Link href="/dashboard/my-order" className="px-3 py-2 text-blue-500 font-medium">
              My Order
            </Link>
          </div>
        </div>
      </nav>

      <div className="p-8">
        <h1 className="text-2xl font-bold">My Orders</h1>
        <p className="mt-4 text-gray-600">List of orders related to your products goes here.</p>
        {/* Render your order list here */}
      </div>
    </div>
  );
}
