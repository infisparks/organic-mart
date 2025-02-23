"use client";

import { useState, useEffect } from "react";
import { onValue, ref as dbRef } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { auth, database } from "../../../lib/firebase";
import Link from "next/link";
import Image from "next/image";

interface Order {
  id: string;
  items: any[];
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
  purchaseTime: number;
  shippingAddress: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface CartItem {
  id: string;
  productId?: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  quantity: number;
  image: string;
  nutrients: Array<{ name: string; value: string }>;
}

interface OrderDetailClientProps {
  orderId: string;
}

export default function OrderDetailClient({ orderId }: OrderDetailClientProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const orderRef = dbRef(database, `user/${user.uid}/order/${orderId}`);
        onValue(orderRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            setOrder({ id: orderId, ...data });
          }
          setLoading(false);
        });
      } else {
        setOrder(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, [orderId]);

  if (loading) {
    return <div className="text-center py-10">Loading order details...</div>;
  }

  if (!order) {
    return <div className="text-center py-10">Order not found.</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
        <Link href="/orders" className="text-blue-500 hover:underline">
          Back to Orders
        </Link>
      </header>
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-500">Order ID: {order.id}</p>
            <p className="text-lg font-semibold text-gray-800">Total: ₹{order.total}</p>
            <p className="text-sm text-gray-600">
              Ordered on: {new Date(order.purchaseTime).toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">
              Status:{" "}
              <span
                className={`font-semibold ${
                  order.status === "pending"
                    ? "text-yellow-600"
                    : order.status === "completed"
                    ? "text-green-600"
                    : "text-gray-600"
                }`}
              >
                {order.status}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              Shipping Address: {order.shippingAddress}
            </p>
            {order.location && (
              <p className="text-sm text-gray-600">
                Location: Lat {order.location.latitude}, Lon {order.location.longitude}
              </p>
            )}
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Products</h2>
          <div className="space-y-4">
            {order.items.map((item: CartItem) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row gap-4 bg-gray-50 p-4 rounded-lg"
              >
                <div className="relative w-full sm:w-32 h-32">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-contain object-center rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                </div>
                <div className="flex items-center">
                  <p className="text-lg font-bold text-gray-900">₹{item.price * item.quantity}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t pt-4 flex justify-end">
            <div>
              <p className="text-sm text-gray-600">Subtotal: ₹{order.subtotal}</p>
              <p className="text-sm text-gray-600">Shipping: ₹{order.shipping}</p>
              <p className="text-lg font-bold text-gray-900">Total: ₹{order.total}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
