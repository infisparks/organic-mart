"use client";
import { useState, useEffect } from "react";
import { onValue, ref as dbRef } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { auth, database } from "../../lib/firebase";
import Link from "next/link";

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
            // Convert the orders object into an array.
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
    return <div className="text-center py-10">Loading orders...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow p-4">
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
      </header>
      <div className="max-w-7xl mx-auto p-4">
        {orders.length === 0 ? (
          <div className="text-center text-gray-600 py-10">
            You have no orders yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">
                      Order ID: {order.id}
                    </p>
                    <p className="text-lg font-semibold text-gray-800">
                      ₹{order.total}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
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
                <div className="mt-2 text-sm text-gray-600">
                  <p>
                    Ordered on:{" "}
                    {new Date(order.purchaseTime).toLocaleDateString()}
                  </p>
                  <p>Shipping Address: {order.shippingAddress}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
