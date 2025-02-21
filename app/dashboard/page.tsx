'use client';

import Link from 'next/link';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-4 items-center">
              <Link href="/dashboard" className="px-3 py-2 text-gray-700 hover:text-blue-500 font-medium">
                Dashboard
              </Link>
              <Link href="/dashboard/add-product" className="px-3 py-2 text-gray-700 hover:text-blue-500 font-medium">
                Add Product
              </Link>
              <Link href="/dashboard/my-product" className="px-3 py-2 text-gray-700 hover:text-blue-500 font-medium">
                My Product
              </Link>
              <Link href="/dashboard/my-order" className="px-3 py-2 text-gray-700 hover:text-blue-500 font-medium">
                My Order
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="p-8">
        <h1 className="text-2xl font-bold">Welcome to Your Company Dashboard</h1>
        <p className="mt-4 text-gray-600">Select an option from the navigation above.</p>
      </div>
    </div>
  );
}
