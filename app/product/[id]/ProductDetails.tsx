"use client";

import { useState, useEffect } from "react";
import {
  Minus,
  Plus,
  Heart,
  ShieldCheck,
  Truck,
  Clock,
  Star,
} from "lucide-react";
import Image from "next/image";
import AuthPopup from "../../components/AuthPopup";
import { auth, database } from "../../../lib/firebase";
import { get, ref as dbRef, set, remove } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";

type ProductDetailsProps = {
  product: {
    id: string;
    productName: string;
    productDescription: string;
    originalPrice: number;
    discountPrice?: number;
    productPhotoUrls?: string[];
    company: {
      name: string;
      logo: string;
    };
    nutrients?: {
      name: string;
      value: string;
    }[];
  };
};

export default function ProductDetails({ product }: ProductDetailsProps) {
  const [quantity, setQuantity] = useState(1);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [inCart, setInCart] = useState(false);

  // Use discountPrice if available; otherwise, fallback to originalPrice.
  const displayPrice = product.discountPrice ?? product.originalPrice;

  // For the "selected image", choose the first image if available.
  const [selectedImage, setSelectedImage] = useState(
    product.productPhotoUrls?.[0] ?? ""
  );
  const images = product.productPhotoUrls ?? [];

  // Check if product is in cart.
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const cartRef = dbRef(database, `user/${user.uid}/addtocart/${product.id}`);
        const cartSnap = await get(cartRef);
        setInCart(cartSnap.exists());
      } else {
        setInCart(false);
      }
    });
    return () => {
      unsubscribeAuth();
    };
  }, [product.id]);

  // Listen for the favorite status of the current product.
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const favRef = dbRef(database, `user/${user.uid}/addfav/${product.id}`);
        const favSnap = await get(favRef);
        setIsFavorite(favSnap.exists());
      } else {
        setIsFavorite(false);
      }
    });
    return () => {
      unsubscribeAuth();
    };
  }, [product.id]);

  // Toggle favorite status using the product id as key.
  const toggleFavorite = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setShowAuthPopup(true);
      return;
    }
    try {
      const favRef = dbRef(database, `user/${currentUser.uid}/addfav/${product.id}`);
      const favSnap = await get(favRef);
      if (favSnap.exists()) {
        await remove(favRef);
        setIsFavorite(false);
      } else {
        await set(favRef, {
          productId: product.id,
          productName: product.productName,
          price: displayPrice,
          addedAt: Date.now(),
        });
        setIsFavorite(true);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  // Add-to-cart functionality.
  const handleAddToCart = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setShowAuthPopup(true);
      return;
    }
    const profileRef = dbRef(database, `user/${currentUser.uid}/profile`);
    const profileSnap = await get(profileRef);
    if (!profileSnap.exists()) {
      setShowAuthPopup(true);
      return;
    }
    try {
      const cartItemRef = dbRef(database, `user/${currentUser.uid}/addtocart/${product.id}`);
      const cartItemSnap = await get(cartItemRef);
      if (cartItemSnap.exists()) {
        alert("This product is already in your cart!");
        return;
      }
      await set(cartItemRef, {
        productId: product.id,
        productName: product.productName,
        quantity: quantity,
        price: displayPrice,
        addedAt: Date.now(),
      });
      setInCart(true);
    } catch (error) {
      console.error("Error adding product to cart:", error);
      alert("Could not add product to cart.");
    }
  };

  // Remove-from-cart functionality.
  const handleRemoveFromCart = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setShowAuthPopup(true);
      return;
    }
    try {
      const cartItemRef = dbRef(database, `user/${currentUser.uid}/addtocart/${product.id}`);
      await remove(cartItemRef);
      setInCart(false);
    } catch (error) {
      console.error("Error removing product from cart:", error);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthPopup(false);
    // After successful login, add the product to cart.
    handleAddToCart();
  };

  const updateQuantity = (newQuantity: number) => {
    if (newQuantity < 1) return;
    setQuantity(newQuantity);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-4 sm:p-6 relative">
      {/* Images Section */}
      <div className="space-y-4">
        <div className="relative aspect-square rounded-xl overflow-hidden">
          {selectedImage && (
            <Image
              src={selectedImage}
              alt={product.productName}
              fill
              className="object-cover"
            />
          )}
        </div>
        <div className="flex space-x-2 sm:space-x-4 overflow-x-auto">
          {images.map((imgUrl, i) => (
            <div
              key={i}
              onClick={() => setSelectedImage(imgUrl)}
              className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden cursor-pointer border ${
                selectedImage === imgUrl ? "border-green-600" : "border-gray-300"
              } hover:scale-105 transition-transform duration-300`}
            >
              <Image
                src={imgUrl}
                alt={`Thumbnail ${i + 1}`}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Product Info Section */}
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3 mb-2 sm:mb-4">
          <Image
            src={product.company.logo}
            alt={product.company.name}
            width={40}
            height={40}
            className="rounded-full"
          />
          <div>
            <h3 className="font-medium text-gray-900 text-base sm:text-lg">{product.company.name}</h3>
            <div className="flex items-center gap-1 text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
              <span className="text-xs sm:text-sm text-gray-600 ml-1">4.8 (120 reviews)</span>
            </div>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {product.productName}
        </h1>
        <p className="text-base sm:text-lg text-gray-600">{product.productDescription}</p>

        {product.nutrients && product.nutrients.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            {product.nutrients.map((nutrient) => (
              <div key={nutrient.name} className="bg-gray-50 p-2 sm:p-4 rounded-xl">
                <div className="font-semibold text-gray-900 text-sm sm:text-base">{nutrient.value}</div>
                <div className="text-xs sm:text-sm text-gray-600">{nutrient.name}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-baseline gap-2 sm:gap-4">
          <span className="text-2xl sm:text-3xl font-bold text-gray-900">₹{displayPrice}</span>
          {product.discountPrice && (
            <span className="text-lg sm:text-xl text-gray-400 line-through">₹{product.originalPrice}</span>
          )}
          {product.discountPrice && (
            <span className="text-green-600 font-medium text-sm sm:text-base">
              Save{" "}
              {Math.round(((product.originalPrice - displayPrice) / product.originalPrice) * 100)}%
            </span>
          )}
        </div>

        {/* Single row for quantity control, add-to-cart, and favorite */}
        <div className="flex flex-row items-center gap-3">
          {/* Quantity Control */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1">
            <button
              onClick={() => updateQuantity(quantity - 1)}
              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-medium text-sm sm:text-base">
              {quantity}
            </span>
            <button
              onClick={() => updateQuantity(quantity + 1)}
              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to Cart Button */}
          {inCart ? (
            <button
              onClick={handleRemoveFromCart}
              className="flex-1 bg-red-500 text-white py-2 sm:py-3 rounded-full font-medium hover:bg-red-600 transition-all duration-300 text-sm sm:text-base text-center"
            >
              Remove from Cart
            </button>
          ) : (
            <button
              onClick={handleAddToCart}
              className="flex-1 bg-green-600 text-white py-2 sm:py-3 rounded-full font-medium hover:bg-green-700 transition-all duration-300 text-sm sm:text-base text-center"
            >
              Add to Cart • ₹{displayPrice * quantity}
            </button>
          )}

          {/* Favorite Button */}
          <button
            onClick={toggleFavorite}
            className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-colors ${
              isFavorite ? "bg-red-500 hover:bg-red-600" : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? "text-white" : "text-gray-600"}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 pt-4 sm:pt-6 border-t">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
            <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span>100% Organic Certified</span>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
            <Truck className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span>Free shipping over ₹1000</span>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
            <Clock className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span>24-48 hour delivery</span>
          </div>
        </div>
      </div>

      {showAuthPopup && (
        <AuthPopup
          onClose={() => setShowAuthPopup(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}
