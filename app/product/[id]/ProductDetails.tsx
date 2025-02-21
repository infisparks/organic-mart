"use client";

import { useState } from "react";
import { Minus, Plus, Heart, ShieldCheck, Truck, Clock, Star } from "lucide-react";
import Image from "next/image";

type ProductDetailsProps = {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    oldPrice?: number;
    image: string;
    company: {
      name: string;
      logo: string;
    };
    nutrients: {
      name: string;
      value: string;
    }[];
  };
};

export default function ProductDetails({ product }: ProductDetailsProps) {
  const [quantity, setQuantity] = useState(1);

  const updateQuantity = (newQuantity: number) => {
    if (newQuantity < 1) return;
    setQuantity(newQuantity);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 sm:p-8">
      {/* Product Images */}
      <div className="space-y-6">
        <div className="relative aspect-square rounded-xl overflow-hidden">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
          />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover hover:scale-110 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Product Info */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-4">
          <Image
            src={product.company.logo}
            alt={product.company.name}
            width={40}
            height={40}
            className="rounded-full"
          />
          <div>
            <h3 className="font-medium text-gray-900">{product.company.name}</h3>
            <div className="flex items-center gap-1 text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
              <span className="text-sm text-gray-600 ml-2">4.8 (120 reviews)</span>
            </div>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{product.name}</h1>
        <p className="text-lg text-gray-600">{product.description}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {product.nutrients.map((nutrient) => (
            <div key={nutrient.name} className="bg-gray-50 p-4 rounded-xl">
              <div className="font-semibold text-gray-900">{nutrient.value}</div>
              <div className="text-sm text-gray-600">{nutrient.name}</div>
            </div>
          ))}
        </div>

        <div className="flex items-baseline gap-4">
          <span className="text-3xl font-bold text-gray-900">₹{product.price}</span>
          {product.oldPrice && (
            <span className="text-xl text-gray-400 line-through">₹{product.oldPrice}</span>
          )}
          {product.oldPrice && (
            <span className="text-green-600 font-medium">
              Save {Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3 bg-gray-100 rounded-full p-1">
            <button 
              onClick={() => updateQuantity(quantity - 1)}
              className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-10 text-center font-medium">{quantity}</span>
            <button 
              onClick={() => updateQuantity(quantity + 1)}
              className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button className="flex-1 bg-green-600 text-white px-8 py-4 rounded-full font-medium
            hover:bg-green-700 transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2">
            Add to Cart
            <span className="text-sm opacity-90">• ₹{product.price * quantity}</span>
          </button>

          <button className="p-4 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <Heart className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span>100% Organic Certified</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Truck className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span>Free shipping over ₹1000</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Clock className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span>24-48 hour delivery</span>
          </div>
        </div>
      </div>
    </div>
  );
}