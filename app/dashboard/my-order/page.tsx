'use client';

import { useState, useEffect } from 'react';
import { onValue, ref as dbRef } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, database } from '../../../lib/firebase';
import Link from 'next/link';
import { FaHome, FaPlus, FaBoxOpen, FaShoppingCart } from 'react-icons/fa';

interface OrderItem {
  id: string;
  productId: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  quantity: number;
  image: string;
}

interface OrderData {
  purchaseTime: number;
  shipping: number;
  shippingAddress: string;
  status: string;
  subtotal: number;
  total: number;
  items: OrderItem[];
}

interface OrderForMyProducts {
  orderId: string;
  userId: string;
  profile: {
    name: string;
    phone: string;
    address: string;
  } | null;
  orderData: OrderData;
}

export default function MyOrder() {
  const [orders, setOrders] = useState<OrderForMyProducts[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, user => {
      if (user) {
        const companyUid = user.uid;
        // 1. Fetch your company products to build a set of your product IDs.
        const companyProductsRef = dbRef(database, `companies/${companyUid}/products`);
        onValue(companyProductsRef, companySnap => {
          const myProductIds = new Set<string>();
          if (companySnap.exists()) {
            const data = companySnap.val();
            Object.keys(data).forEach(pid => {
              myProductIds.add(pid);
            });
          }
          // 2. Now fetch orders from all users.
          const usersRef = dbRef(database, 'user');
          onValue(usersRef, usersSnap => {
            const ordersForMyProducts: OrderForMyProducts[] = [];
            usersSnap.forEach(userSnap => {
              const userId = userSnap.key;
              const profile = userSnap.child('profile').val();
              const ordersNode = userSnap.child('order');
              if (ordersNode.exists()) {
                ordersNode.forEach(orderSnap => {
                  const orderData: OrderData = orderSnap.val();
                  const items = orderData.items || [];
                  // Filter items that belong to your company.
                  const myItems = items.filter((item: any) => myProductIds.has(item.productId));
                  if (myItems.length > 0) {
                    ordersForMyProducts.push({
                      orderId: orderSnap.key as string,
                      userId: userId as string,
                      profile: profile || null,
                      orderData: { ...orderData, items: myItems },
                    });
                  }
                });
              }
            });
            // Sort orders by purchase time (most recent first)
            ordersForMyProducts.sort((a, b) => b.orderData.purchaseTime - a.orderData.purchaseTime);
            setOrders(ordersForMyProducts);
            setLoading(false);
          });
        });
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-700 animate-pulse">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-6 items-center h-16">
            <Link href="/dashboard" className="flex items-center text-gray-700 hover:text-blue-500 transition-colors">
              <FaHome className="mr-1" /> Dashboard
            </Link>
            <Link href="/dashboard/add-product" className="flex items-center text-gray-700 hover:text-blue-500 transition-colors">
              <FaPlus className="mr-1" /> Add Product
            </Link>
            <Link href="/dashboard/my-product" className="flex items-center text-gray-700 hover:text-blue-500 transition-colors">
              <FaBoxOpen className="mr-1" /> My Product
            </Link>
            <Link href="/dashboard/my-order" className="flex items-center text-blue-500 font-semibold">
              <FaShoppingCart className="mr-1" /> My Order
            </Link>
          </div>
        </div>
      </nav>

      {/* Orders List */}
      <div className="p-6 md:p-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Orders for My Products</h1>
        {orders.length === 0 ? (
          <p className="text-gray-600 text-lg">No orders for your products yet.</p>
        ) : (
          orders.map(order => (
            <div
              key={order.orderId}
              className="bg-white shadow rounded-lg p-6 mb-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                <div className="mb-4 md:mb-0">
                  <p className="text-sm text-gray-500">
                    Order ID: <span className="font-mono">{order.orderId}</span>
                  </p>
                  <p className="text-xl font-semibold text-gray-800 mt-1">
                    Total: <span className="text-blue-600">₹{order.orderData.total}</span>
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Ordered on: {new Date(order.orderData.purchaseTime).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Status: <span className="font-medium">{order.orderData.status}</span>
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg shadow-inner w-full md:w-auto">
                  <p className="font-medium text-gray-800 mb-1">Customer Details</p>
                  {order.profile ? (
                    <>
                      <p className="text-sm text-gray-700">Name: {order.profile.name}</p>
                      <p className="text-sm text-gray-700">Phone: {order.profile.phone}</p>
                      <p className="text-sm text-gray-700">Address: {order.profile.address}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-700">No profile info</p>
                  )}
                </div>
              </div>
              <div>
                <h2 className="font-medium text-gray-800 mb-3">Purchased Items</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {order.orderData.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-4 border border-gray-200 p-3 rounded-md hover:shadow-sm transition-shadow"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-md"
                      />
                      <div>
                        <p className="font-semibold text-gray-800">{item.name}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        <p className="text-sm text-gray-600">
                          Price: <span className="text-blue-600">₹{item.price * item.quantity}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
