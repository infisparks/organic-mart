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
  MessageSquare,
} from "lucide-react";
import Image from "next/image";
import AuthPopup from "../../components/AuthPopup";
import { auth, database } from "../../../lib/firebase";
import {
  get,
  ref as dbRef,
  set,
  remove,
  push,
  update,
  onValue,
} from "firebase/database";
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
  const [showDirectBuy, setShowDirectBuy] = useState(false);
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerPincode, setBuyerPincode] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");

  // Review-related state.
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviews, setReviews] = useState<
    { uid: string; rating: number; reviewText: string; createdAt: number }[]
  >([]);

  // Use discountPrice if available; otherwise fallback to originalPrice.
  const displayPrice = product.discountPrice ?? product.originalPrice;

  // For the "selected image", choose the first if available.
  const [selectedImage, setSelectedImage] = useState(
    product.productPhotoUrls?.[0] ?? ""
  );
  const images = product.productPhotoUrls ?? [];

  // Prefill shipping details from user profile.
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profileRef = dbRef(database, `user/${user.uid}/profile`);
        const profileSnap = await get(profileRef);
        if (profileSnap.exists()) {
          const profile = profileSnap.val();
          setBuyerAddress(profile.address || "");
          setBuyerPincode(profile.pincode || "");
          setBuyerPhone(profile.phone || "");
        }
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Check if product is in cart.
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const cartRef = dbRef(
          database,
          `user/${user.uid}/addtocart/${product.id}`
        );
        const cartSnap = await get(cartRef);
        setInCart(cartSnap.exists());
      } else {
        setInCart(false);
      }
    });
    return () => unsubscribeAuth();
  }, [product.id]);

  // Listen for favorite status.
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
    return () => unsubscribeAuth();
  }, [product.id]);

  // Check if the user already reviewed this product.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const reviewRef = dbRef(
          database,
          `products/${product.id}/reviews/${user.uid}`
        );
        const reviewSnap = await get(reviewRef);
        setHasReviewed(reviewSnap.exists());
      } else {
        setHasReviewed(false);
      }
    });
    return () => unsubscribe();
  }, [product.id]);

  // Subscribe to all reviews for this product.
  useEffect(() => {
    const reviewsRef = dbRef(database, `products/${product.id}/reviews`);
    const unsubscribeReviews = onValue(reviewsRef, (snapshot) => {
      const reviewsData = snapshot.val();
      if (reviewsData) {
        const reviewsArray = Object.keys(reviewsData).map((key) => ({
          uid: key,
          ...reviewsData[key],
        }));
        setReviews(reviewsArray);
      } else {
        setReviews([]);
      }
    });
    return () => unsubscribeReviews();
  }, [product.id]);

  // Calculate aggregated rating.
  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0
      ? (
          reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
        ).toFixed(1)
      : null;

  // Toggle favorite status.
  const toggleFavorite = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setShowAuthPopup(true);
      return;
    }
    try {
      const favRef = dbRef(
        database,
        `user/${currentUser.uid}/addfav/${product.id}`
      );
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
      const cartItemRef = dbRef(
        database,
        `user/${currentUser.uid}/addtocart/${product.id}`
      );
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
      const cartItemRef = dbRef(
        database,
        `user/${currentUser.uid}/addtocart/${product.id}`
      );
      await remove(cartItemRef);
      setInCart(false);
    } catch (error) {
      console.error("Error removing product from cart:", error);
    }
  };

  // Direct buy functionality.
  const handleDirectBuy = () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setShowAuthPopup(true);
      return;
    }
    setShowDirectBuy(true);
  };

  // Helper: fetch current geolocation.
  const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          (error) => reject(error)
        );
      } else {
        reject(new Error("Geolocation is not supported by this browser."));
      }
    });
  };

  // Submit direct buy order.
  const handleDirectBuySubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setShowAuthPopup(true);
      return;
    }
    if (!buyerAddress || !buyerPincode || !buyerPhone) {
      alert("Please fill in your shipping details.");
      return;
    }
    try {
      // Auto fetch current location.
      const location = await getCurrentLocation();
      // Create order.
      const orderRef = dbRef(database, `user/${currentUser.uid}/order`);
      const newOrderRef = push(orderRef);
      await set(newOrderRef, {
        items: [
          {
            description: "",
            id: product.id,
            image: product.productPhotoUrls?.[0] || "",
            name: product.productName,
            originalPrice: product.originalPrice,
            price: displayPrice,
            productId: product.id,
            quantity: quantity,
          },
        ],
        purchaseTime: Date.now(),
        shipping: 99,
        shippingAddress: buyerAddress,
        pincode: buyerPincode,
        phone: buyerPhone,
        status: "pending",
        subtotal: displayPrice * quantity,
        total: displayPrice * quantity + 99,
        location: location,
      });
      // Update user profile with shipping details.
      const profileRef = dbRef(database, `user/${currentUser.uid}/profile`);
      await update(profileRef, {
        address: buyerAddress,
        pincode: buyerPincode,
        phone: buyerPhone,
        lat: location.lat,
        lng: location.lng,
      });
      alert("Order placed successfully!");
      setShowDirectBuy(false);
      setBuyerAddress("");
      setBuyerPincode("");
      setBuyerPhone("");
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Could not place order.");
    }
  };

  // After a successful auth, try adding product to cart.
  const handleAuthSuccess = () => {
    setShowAuthPopup(false);
    handleAddToCart();
  };

  const updateQuantity = (newQuantity: number) => {
    if (newQuantity < 1) return;
    setQuantity(newQuantity);
  };

  // Handle review submission.
  const handleReviewSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setShowAuthPopup(true);
      return;
    }
    try {
      const reviewRef = dbRef(
        database,
        `products/${product.id}/reviews/${currentUser.uid}`
      );
      const reviewSnap = await get(reviewRef);
      if (reviewSnap.exists()) {
        alert("You have already reviewed this product!");
        return;
      }
      await set(reviewRef, {
        rating: reviewRating,
        reviewText: reviewText,
        createdAt: Date.now(),
      });
      setHasReviewed(true);
      alert("Review submitted successfully!");
      setShowReviewModal(false);
      setReviewRating(5);
      setReviewText("");
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Could not submit review.");
    }
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
            <h3 className="font-medium text-gray-900 text-base sm:text-lg">
              {product.company.name}
            </h3>
            {/* Display aggregated review if available */}
            <div className="flex items-center gap-1">
              {averageRating ? (
                <>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.round(Number(averageRating))
                            ? "text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600 ml-1">
                    {averageRating} ({reviewCount} reviews)
                  </span>
                </>
              ) : (
                <span className="text-xs sm:text-sm text-gray-600">
                  No reviews yet
                </span>
              )}
            </div>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {product.productName}
        </h1>
        <p className="text-base sm:text-lg text-gray-600">
          {product.productDescription}
        </p>

        {product.nutrients && product.nutrients.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            {product.nutrients.map((nutrient) => (
              <div
                key={nutrient.name}
                className="bg-gray-50 p-2 sm:p-4 rounded-xl"
              >
                <div className="font-semibold text-gray-900 text-sm sm:text-base">
                  {nutrient.value}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {nutrient.name}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-baseline gap-2 sm:gap-4">
          <span className="text-2xl sm:text-3xl font-bold text-gray-900">
            ₹{displayPrice}
          </span>
          {product.discountPrice && (
            <span className="text-lg sm:text-xl text-gray-400 line-through">
              ₹{product.originalPrice}
            </span>
          )}
          {product.discountPrice && (
            <span className="text-green-600 font-medium text-sm sm:text-base">
              Save{" "}
              {Math.round(
                ((product.originalPrice - displayPrice) / product.originalPrice) *
                  100
              )}
              %
            </span>
          )}
        </div>

        {/* Controls: Quantity, Add-to-Cart, Favorite */}
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
              isFavorite
                ? "bg-red-500 hover:bg-red-600"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            <Heart
              className={`w-5 h-5 ${
                isFavorite ? "text-white" : "text-gray-600"
              }`}
            />
          </button>
        </div>

        {/* Direct Buy Button */}
        <div>
          <button
            onClick={handleDirectBuy}
            className="w-full bg-blue-600 text-white py-2 sm:py-3 rounded-full font-medium hover:bg-blue-700 transition-all duration-300 text-sm sm:text-base text-center"
          >
            Buy Now • ₹{displayPrice * quantity}
          </button>
        </div>

        {/* Shipping Details */}
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

        {/* Reviews Section */}
        <div className="mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" /> Reviews
          </h2>
          {hasReviewed ? (
            <p className="text-gray-600">You have already reviewed this product.</p>
          ) : (
            <button
              onClick={() => setShowReviewModal(true)}
              className="bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <MessageSquare className="w-5 h-5" /> Write a Review
            </button>
          )}
        </div>

        {/* List of All Reviews */}
        <div className="mt-6">
          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.uid}
                  className="p-4 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-center mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating
                            ? "text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-xs text-gray-600">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-800">{review.reviewText}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 mt-4">
              No reviews yet. Be the first to review this product.
            </p>
          )}
        </div>
      </div>

      {showAuthPopup && (
        <AuthPopup
          onClose={() => setShowAuthPopup(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Direct Buy Modal */}
      {showDirectBuy && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg w-11/12 max-w-md">
            <h2 className="text-xl font-bold mb-4">Enter Shipping Details</h2>
            <form onSubmit={handleDirectBuySubmit}>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <textarea
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Pincode
                </label>
                <input
                  type="text"
                  value={buyerPincode}
                  onChange={(e) => setBuyerPincode(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDirectBuy(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Professional Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg w-11/12 max-w-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-6 h-6" /> Write a Review
              </h2>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleReviewSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Rating
                </label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= reviewRating
                            ? "text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={4}
                  placeholder="Share your experience..."
                  required
                ></textarea>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
