"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { onValue, ref as dbRef } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { auth, database } from "../../../lib/firebase";
import { Calendar, MapPin, Package } from "lucide-react";

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
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <p className="text-xl text-gray-600">Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <p className="text-xl text-gray-600">Order not found.</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md py-6 px-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="w-7 h-7 text-green-600" /> Order Details
        </h1>
        <Link href="/orders" className="text-blue-600 hover:underline text-lg">
          Back to Orders
        </Link>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Order Header */}
          <div className="mb-6 border-b pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <p className="text-sm text-gray-500">Order ID: <span className="font-mono">{order.id}</span></p>
                <p className="text-2xl font-bold text-gray-800 mt-1">₹{order.total}</p>
              </div>
              <div>
                <span
                  className={`px-3 py-1 text-sm font-semibold rounded-full ${
                    order.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : order.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {order.status.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <span>
                  Ordered on: {new Date(order.purchaseTime).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-500" />
                <span>Shipping Address: {order.shippingAddress}</span>
              </div>
              {order.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-500" />
                  <span>
                    Location: Lat {order.location.latitude}, Lon {order.location.longitude}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
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
                    className="object-contain rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  {item.nutrients && (
                    <ul className="mt-2 text-xs text-gray-500">
                      {item.nutrients.map((nutrient, idx) => (
                        <li key={idx}>
                          {nutrient.name}: {nutrient.value}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex items-center">
                  <p className="text-xl font-bold text-gray-900">
                    ₹{item.price * item.quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="mt-8 border-t pt-4 flex justify-end">
            <div className="text-right">
              <p className="text-sm text-gray-600">Subtotal: ₹{order.subtotal}</p>
              <p className="text-sm text-gray-600">Shipping: ₹{order.shipping}</p>
              <p className="text-2xl font-bold text-gray-900">Total: ₹{order.total}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
