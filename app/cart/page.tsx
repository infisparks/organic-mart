"use client";

import { useState } from "react";
import { Leaf, Minus, Plus, ArrowLeft, Trash2, ShieldCheck, Truck, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function CartPage() {
  const [cartItems, setCartItems] = useState(initialCartItems);

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCartItems(items =>
      items.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeItem = (id: string) => {
    setCartItems(items => items.filter(item => item.id !== id));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = 99;
  const total = subtotal + shipping;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <Leaf className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 group-hover:rotate-12 transition-transform duration-300" />
              <span className="text-xl sm:text-2xl font-bold text-gray-900">EcoHarvest</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex items-center gap-2 mb-8">
          <Link href="/" className="text-green-600 hover:text-green-700 flex items-center gap-2 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Continue Shopping
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600">Shopping Cart</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {cartItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="relative w-full sm:w-40 h-40">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-500">{item.description}</p>
                      </div>
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      {item.nutrients.map((nutrient) => (
                        <div key={nutrient.name} className="bg-gray-50 p-2 rounded-lg">
                          <div className="font-medium text-gray-900">{nutrient.value}</div>
                          <div className="text-gray-500">{nutrient.name}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3 bg-gray-50 rounded-full p-1">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">₹{item.price * item.quantity}</span>
                        {item.oldPrice && (
                          <span className="text-sm text-gray-400 line-through">₹{item.oldPrice * item.quantity}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-sm sticky top-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>₹{shipping}</span>
                </div>
                <div className="border-t pt-4 flex justify-between font-semibold text-gray-900">
                  <span>Total</span>
                  <span>₹{total}</span>
                </div>
              </div>

              <button className="w-full bg-green-600 text-white py-4 rounded-full font-medium
                hover:bg-green-700 transform hover:scale-[1.02] transition-all duration-300">
                Proceed to Checkout
              </button>

              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                  <span>Secure payment with SSL encryption</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Truck className="w-5 h-5 text-green-600" />
                  <span>Free shipping on orders over ₹1000</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Clock className="w-5 h-5 text-green-600" />
                  <span>Delivery within 24-48 hours</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

const initialCartItems = [
  {
    id: "1",
    name: "Organic Avocados",
    description: "Fresh, ripe avocados from certified organic farms",
    price: 299,
    oldPrice: 399,
    quantity: 2,
    image: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?ixlib=rb-4.0.3",
    nutrients: [
      { name: "Protein", value: "2g" },
      { name: "Fat", value: "15g" },
      { name: "Carbs", value: "9g" },
      { name: "Fiber", value: "7g" }
    ]
  },
  {
    id: "2",
    name: "Fresh Strawberries",
    description: "Sweet and juicy organic strawberries",
    price: 199,
    oldPrice: 249,
    quantity: 1,
    image: "https://images.unsplash.com/photo-1518635017480-01eb763f1fbb?ixlib=rb-4.0.3",
    nutrients: [
      { name: "Protein", value: "0.7g" },
      { name: "Fat", value: "0.3g" },
      { name: "Carbs", value: "8g" },
      { name: "Fiber", value: "2g" }
    ]
  },
  {
    id: "3",
    name: "Organic Honey",
    description: "Pure, raw honey from local organic beekeepers",
    price: 499,
    quantity: 1,
    image: "https://images.unsplash.com/photo-1587049352847-81a56d773cae?ixlib=rb-4.0.3",
    nutrients: [
      { name: "Protein", value: "0.3g" },
      { name: "Fat", value: "0g" },
      { name: "Carbs", value: "82g" },
      { name: "Energy", value: "304kcal" }
    ]
  }
];