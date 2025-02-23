"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { onValue, ref as dbRef } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { auth, database } from "../../lib/firebase";
import { Package, Calendar, MapPin } from "lucide-react";
import Header from "../components/Header";
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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const ordersRef = dbRef(database, `user/${user.uid}/order`);
        onValue(ordersRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const loadedOrders = Object.keys(data).map((key) => ({
              id: key,
              ...data[key],
            }));
            // Sort orders by purchaseTime (most recent first)
            loadedOrders.sort((a, b) => b.purchaseTime - a.purchaseTime);
            setOrders(loadedOrders);
          } else {
            setOrders([]);
          }
          setLoading(false);
        });
      } else {
        setOrders([]);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-10">
        <p className="text-xl text-gray-600">Loading orders...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
    <Header/>
      <div className="max-w-7xl mx-auto p-6">
        {orders.length === 0 ? (
          <div className="text-center text-gray-600 py-12">
            <p className="text-xl">You have no orders yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow duration-200"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">Order ID: {order.id}</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">
                      ₹{order.total}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`px-3 py-1 text-sm font-semibold rounded-full ${
                        order.status === "pending"
                          ? "bg-yellow-200 text-yellow-800"
                          : order.status === "completed"
                          ? "bg-green-200 text-green-800"
                          : "bg-gray-200 text-gray-800"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <span>
                      Ordered on:{" "}
                      {new Date(order.purchaseTime).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-gray-500" />
                    <span>Shipping Address: {order.shippingAddress}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
