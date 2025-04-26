"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Minus,
  Plus,
  Heart,
  ShieldCheck,
  Truck,
  Clock,
  Star,
  MessageSquare,
  Share2,
  ChevronRight,
  X,
  Check,
  MapPin,
} from "lucide-react"
import Image from "next/image"
import AuthPopup from "../../components/AuthPopup"
import { auth, database } from "../../../lib/firebase"
import { get, ref as dbRef, set, remove, push, update, onValue } from "firebase/database"
import { onAuthStateChanged } from "firebase/auth"
import RazorpayPayment from "../../components/razorpay-payment"

type ProductDetailsProps = {
  product: {
    id: string
    productName: string
    productDescription: string
    originalPrice: number
    discountPrice?: number
    productPhotoUrls?: string[]
    company: {
      name: string
      logo: string
    }
    nutrients?: {
      name: string
      value: string
    }[]
  }
}

export default function ProductDetails({ product }: ProductDetailsProps) {
  const [quantity, setQuantity] = useState(1)
  const [showAuthPopup, setShowAuthPopup] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [inCart, setInCart] = useState(false)
  const [showDirectBuy, setShowDirectBuy] = useState(false)
  const [buyerAddress, setBuyerAddress] = useState("")
  const [buyerPincode, setBuyerPincode] = useState("")
  const [buyerPhone, setBuyerPhone] = useState("")
  const [activeTab, setActiveTab] = useState<"description" | "reviews">("description")
  const [showRazorpay, setShowRazorpay] = useState(false)
  const [orderId, setOrderId] = useState("")

  // Review-related state.
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState("")
  const [hasReviewed, setHasReviewed] = useState(false)
  const [reviews, setReviews] = useState<{ uid: string; rating: number; reviewText: string; createdAt: number }[]>([])

  // Use discountPrice if available; otherwise fallback to originalPrice.
  const displayPrice = product.discountPrice ?? product.originalPrice

  // For the "selected image", choose the first if available.
  const [selectedImage, setSelectedImage] = useState(product.productPhotoUrls?.[0] ?? "")
  const images = product.productPhotoUrls ?? []

  // Prefill shipping details from user profile.
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profileRef = dbRef(database, `user/${user.uid}/profile`)
        const profileSnap = await get(profileRef)
        if (profileSnap.exists()) {
          const profile = profileSnap.val()
          setBuyerAddress(profile.address || "")
          setBuyerPincode(profile.pincode || "")
          setBuyerPhone(profile.phone || "")
        }
      }
    })
    return () => unsubscribeAuth()
  }, [])

  // Check if product is in cart.
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const cartRef = dbRef(database, `user/${user.uid}/addtocart/${product.id}`)
        const cartSnap = await get(cartRef)
        setInCart(cartSnap.exists())
      } else {
        setInCart(false)
      }
    })
    return () => unsubscribeAuth()
  }, [product.id])

  // Listen for favorite status.
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const favRef = dbRef(database, `user/${user.uid}/addfav/${product.id}`)
        const favSnap = await get(favRef)
        setIsFavorite(favSnap.exists())
      } else {
        setIsFavorite(false)
      }
    })
    return () => unsubscribeAuth()
  }, [product.id])

  // Check if the user already reviewed this product.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const reviewRef = dbRef(database, `products/${product.id}/reviews/${user.uid}`)
        const reviewSnap = await get(reviewRef)
        setHasReviewed(reviewSnap.exists())
      } else {
        setHasReviewed(false)
      }
    })
    return () => unsubscribe()
  }, [product.id])

  // Subscribe to all reviews for this product.
  useEffect(() => {
    const reviewsRef = dbRef(database, `products/${product.id}/reviews`)
    const unsubscribeReviews = onValue(reviewsRef, (snapshot) => {
      const reviewsData = snapshot.val()
      if (reviewsData) {
        const reviewsArray = Object.keys(reviewsData).map((key) => ({
          uid: key,
          ...reviewsData[key],
        }))
        setReviews(reviewsArray)
      } else {
        setReviews([])
      }
    })
    return () => unsubscribeReviews()
  }, [product.id])

  // Calculate aggregated rating.
  const reviewCount = reviews.length
  const averageRating =
    reviewCount > 0 ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(1) : null

  // Toggle favorite status.
  const toggleFavorite = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      setShowAuthPopup(true)
      return
    }
    try {
      const favRef = dbRef(database, `user/${currentUser.uid}/addfav/${product.id}`)
      const favSnap = await get(favRef)
      if (favSnap.exists()) {
        await remove(favRef)
        setIsFavorite(false)
      } else {
        await set(favRef, {
          productId: product.id,
          productName: product.productName,
          price: displayPrice,
          addedAt: Date.now(),
        })
        setIsFavorite(true)
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
    }
  }

  // Add-to-cart functionality.
  const handleAddToCart = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      setShowAuthPopup(true)
      return
    }
    const profileRef = dbRef(database, `user/${currentUser.uid}/profile`)
    const profileSnap = await get(profileRef)
    if (!profileSnap.exists()) {
      setShowAuthPopup(true)
      return
    }
    try {
      const cartItemRef = dbRef(database, `user/${currentUser.uid}/addtocart/${product.id}`)
      const cartItemSnap = await get(cartItemRef)
      if (cartItemSnap.exists()) {
        alert("This product is already in your cart!")
        return
      }
      await set(cartItemRef, {
        productId: product.id,
        productName: product.productName,
        quantity: quantity,
        price: displayPrice,
        addedAt: Date.now(),
      })
      setInCart(true)
    } catch (error) {
      console.error("Error adding product to cart:", error)
      alert("Could not add product to cart.")
    }
  }

  // Remove-from-cart functionality.
  const handleRemoveFromCart = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      setShowAuthPopup(true)
      return
    }
    try {
      const cartItemRef = dbRef(database, `user/${currentUser.uid}/addtocart/${product.id}`)
      await remove(cartItemRef)
      setInCart(false)
    } catch (error) {
      console.error("Error removing product from cart:", error)
    }
  }

  // Direct buy functionality.
  const handleDirectBuy = () => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      setShowAuthPopup(true)
      return
    }
    setShowDirectBuy(true)
  }

  // Helper: fetch current geolocation.
  const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            })
          },
          (error) => reject(error),
        )
      } else {
        reject(new Error("Geolocation is not supported by this browser."))
      }
    })
  }

  // Initialize Razorpay payment
  const initializePayment = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      setShowAuthPopup(true)
      return
    }

    // Check if shipping details are available
    if (!buyerAddress || !buyerPincode || !buyerPhone) {
      setShowDirectBuy(true)
      return
    }

    // Generate a unique order ID
    const tempOrderId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    setOrderId(tempOrderId)
    setShowRazorpay(true)
  }

  // Handle successful payment
  const handlePaymentSuccess = async (response: any) => {
    const currentUser = auth.currentUser
    if (!currentUser) return

    try {
      // Auto fetch current location
      const location = await getCurrentLocation().catch(() => ({ lat: 0, lng: 0 }))

      // Create order data object, ensuring no undefined values
      const orderData = {
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
        status: "confirmed",
        subtotal: displayPrice * quantity,
        total: displayPrice * quantity + 99,
        location: location,
        // Only add payment details if they exist
        ...(response.razorpay_payment_id && { paymentId: response.razorpay_payment_id }),
        ...(response.razorpay_order_id ? { orderId: response.razorpay_order_id } : { orderId }),
        // Only add signature if it exists
        ...(response.razorpay_signature && { signature: response.razorpay_signature }),
      }

      // Create order in Firebase
      const orderRef = dbRef(database, `user/${currentUser.uid}/order`)
      const newOrderRef = push(orderRef)
      await set(newOrderRef, orderData)

      // Update user profile with shipping details
      const profileRef = dbRef(database, `user/${currentUser.uid}/profile`)
      await update(profileRef, {
        address: buyerAddress,
        pincode: buyerPincode,
        phone: buyerPhone,
        lat: location.lat,
        lng: location.lng,
      })

      alert("Payment successful! Your order has been placed.")
      setShowRazorpay(false)
      setShowDirectBuy(false)
    } catch (error) {
      console.error("Error creating order:", error)
      alert("Payment was successful, but there was an error creating your order. Please contact support.")
    }
  }

  // Handle payment failure
  const handlePaymentFailure = (error: any) => {
    console.error("Payment failed:", error)
    alert(`Payment failed: ${error.description || "Unknown error"}`)
    setShowRazorpay(false)
  }

  // Submit direct buy order.
  const handleDirectBuySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const currentUser = auth.currentUser
    if (!currentUser) {
      setShowAuthPopup(true)
      return
    }
    if (!buyerAddress || !buyerPincode || !buyerPhone) {
      alert("Please fill in your shipping details.")
      return
    }

    // Close the shipping details modal and initialize payment
    setShowDirectBuy(false)
    initializePayment()
  }

  // After a successful auth, try adding product to cart.
  const handleAuthSuccess = () => {
    setShowAuthPopup(false)
    handleAddToCart()
  }

  const updateQuantity = (newQuantity: number) => {
    if (newQuantity < 1) return
    setQuantity(newQuantity)
  }

  // Handle review submission.
  const handleReviewSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const currentUser = auth.currentUser
    if (!currentUser) {
      setShowAuthPopup(true)
      return
    }
    try {
      const reviewRef = dbRef(database, `products/${product.id}/reviews/${currentUser.uid}`)
      const reviewSnap = await get(reviewRef)
      if (reviewSnap.exists()) {
        alert("You have already reviewed this product!")
        return
      }
      await set(reviewRef, {
        rating: reviewRating,
        reviewText: reviewText,
        createdAt: Date.now(),
      })
      setHasReviewed(true)
      alert("Review submitted successfully!")
      setShowReviewModal(false)
      setReviewRating(5)
      setReviewText("")
    } catch (error) {
      console.error("Error submitting review:", error)
      alert("Could not submit review.")
    }
  }

  return (
    <div className="bg-white">
      {/* Breadcrumb */}
      <nav className="hidden sm:flex items-center text-sm text-gray-500 px-4 sm:px-6 lg:px-8 ">
        <a href="#" className="hover:text-gray-900">
          Home
        </a>
        <ChevronRight className="w-4 h-4 mx-2" />
        <a href="#" className="hover:text-gray-900">
          Products
        </a>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="text-gray-900 font-medium">{product.productName}</span>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-0">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16">
          {/* Product Images */}
          <div className="lg:max-w-lg lg:self-start">
            <div className="overflow-hidden rounded-2xl bg-gray-100 mb-4">
              {selectedImage && (
                <div className="relative aspect-square">
                  <Image
                    src={selectedImage || "/placeholder.svg"}
                    alt={product.productName}
                    fill
                    className="object-cover w-full h-full"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                </div>
              )}
            </div>

            {/* Image Gallery */}
            <div className="grid grid-cols-4 gap-3">
              {images.map((imgUrl, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(imgUrl)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === imgUrl
                      ? "border-emerald-500 ring-2 ring-emerald-500/20"
                      : "border-transparent hover:border-gray-300"
                  }`}
                >
                  <Image
                    src={imgUrl || "/placeholder.svg"}
                    alt={`Product image ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 25vw, 12vw"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="mt-10 lg:mt-0 lg:col-start-2 lg:row-span-2 lg:self-start">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative h-12 w-12 overflow-hidden rounded-full border border-gray-200">
                <Image
                  src={product.company.logo || "/placeholder.svg"}
                  alt={product.company.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h4 className="text-base font-medium text-gray-900">{product.company.name}</h4>
                <div className="flex items-center mt-1">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          averageRating && i < Math.round(Number(averageRating))
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-500">
                    {averageRating ? `${averageRating} (${reviewCount} reviews)` : "No reviews yet"}
                  </span>
                </div>
              </div>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{product.productName}</h1>

            {/* Price */}
            <div className="mt-6 flex items-center">
              <h2 className="sr-only">Product price</h2>
              <p className="text-3xl font-bold text-gray-900">₹{displayPrice}</p>
              {product.discountPrice && (
                <>
                  <p className="ml-3 text-lg text-gray-500 line-through">₹{product.originalPrice}</p>
                  <p className="ml-3 text-sm font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    {Math.round(((product.originalPrice - displayPrice) / product.originalPrice) * 100)}% OFF
                  </p>
                </>
              )}
            </div>

            {/* Tabs */}
            <div className="mt-8 border-b border-gray-200">
              <div className="flex space-x-8">
                <button
                  onClick={() => setActiveTab("description")}
                  className={`pb-4 text-sm font-medium ${
                    activeTab === "description"
                      ? "border-b-2 border-emerald-500 text-emerald-600"
                      : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Description
                </button>
                <button
                  onClick={() => setActiveTab("reviews")}
                  className={`pb-4 text-sm font-medium flex items-center ${
                    activeTab === "reviews"
                      ? "border-b-2 border-emerald-500 text-emerald-600"
                      : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Reviews
                  {reviewCount > 0 && (
                    <span className="ml-2 bg-gray-100 text-gray-700 py-0.5 px-2 rounded-full text-xs">
                      {reviewCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
              {activeTab === "description" ? (
                <>
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <p>{product.productDescription}</p>
                  </div>

                  {/* Nutrients */}
                  {product.nutrients && product.nutrients.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Nutritional Information</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {product.nutrients.map((nutrient) => (
                          <div key={nutrient.name} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="font-semibold text-gray-900 text-lg">{nutrient.value}</div>
                            <div className="text-sm text-gray-600">{nutrient.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6">
                  {/* Review Actions */}
                  {!hasReviewed && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Share your thoughts</h3>
                      <p className="text-gray-600 text-sm mb-4">
                        If you've used this product, share your thoughts with other customers
                      </p>
                      <button
                        onClick={() => setShowReviewModal(true)}
                        className="w-full sm:w-auto bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" /> Write a Review
                      </button>
                    </div>
                  )}

                  {/* Reviews List */}
                  {reviews.length > 0 ? (
                    <div className="space-y-6">
                      {reviews.map((review) => (
                        <div key={review.uid} className="p-5 rounded-lg bg-white border border-gray-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(review.createdAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          <p className="text-gray-700">{review.reviewText}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No reviews yet</h3>
                      <p className="text-gray-500">Be the first to review this product</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Shipping Benefits */}
            <div className="mt-8 border-t border-gray-200 pt-8">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Shipping & Benefits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700">100% Organic Certified</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Truck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Free shipping over ₹1000</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700">24-48 hour delivery</span>
                </div>
              </div>
            </div>

            {/* Add to Cart Section */}
            <div className="mt-8 border-t border-gray-200 pt-8">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Quantity Selector */}
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => updateQuantity(quantity - 1)}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="w-12 text-center font-medium">{quantity}</div>
                  <button
                    onClick={() => updateQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {inCart ? (
                    <button
                      onClick={handleRemoveFromCart}
                      className="flex items-center justify-center gap-2 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" /> Remove from Cart
                    </button>
                  ) : (
                    <button
                      onClick={handleAddToCart}
                      className="flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 px-4 rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <Check className="w-4 h-4" /> Add to Cart
                    </button>
                  )}
                  <button
                    onClick={initializePayment}
                    className="flex items-center justify-center gap-2 bg-gray-900 text-white py-3 px-4 rounded-lg hover:bg-black transition-colors"
                  >
                    Buy Now • ₹{displayPrice * quantity}
                  </button>
                </div>
              </div>

              {/* Wishlist & Share */}
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={toggleFavorite}
                  className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-colors ${
                    isFavorite ? "text-red-600 bg-red-50" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? "fill-red-600" : ""}`} />
                  <span className="text-sm font-medium">{isFavorite ? "Saved to Wishlist" : "Add to Wishlist"}</span>
                </button>
                <button className="flex items-center gap-2 py-2 px-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                  <Share2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Share</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Popup */}
      {showAuthPopup && <AuthPopup onClose={() => setShowAuthPopup(false)} onSuccess={handleAuthSuccess} />}

      {/* Direct Buy Modal */}
      {showDirectBuy && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="flex items-center justify-between bg-gray-50 px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">Shipping Details</h2>
              <button onClick={() => setShowDirectBuy(false)} className="text-gray-400 hover:text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDirectBuySubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                    <textarea
                      value={buyerAddress}
                      onChange={(e) => setBuyerAddress(e.target.value)}
                      className="pl-10 block w-full rounded-lg border border-gray-300 py-2 px-3 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                      rows={3}
                      placeholder="Enter your full address"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                    <input
                      type="text"
                      value={buyerPincode}
                      onChange={(e) => setBuyerPincode(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 py-2 px-3 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                      placeholder="Enter pincode"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 py-2 px-3 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                      placeholder="Enter phone number"
                      required
                    />
                  </div>
                </div>

                <div className="bg-gray-50 -mx-6 -mb-6 p-6 mt-6 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-600">Total</span>
                    <span className="text-lg font-bold text-gray-900">₹{displayPrice * quantity + 99}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
                    <span>Product cost</span>
                    <span>₹{displayPrice * quantity}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
                    <span>Shipping fee</span>
                    <span>₹99</span>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    Confirm Order
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="flex items-center justify-between bg-gray-50 px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" /> Write a Review
              </h2>
              <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Your Rating</label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            star <= reviewRating ? "fill-amber-400 text-amber-400" : "text-gray-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 py-3 px-4 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    rows={4}
                    placeholder="Share your experience with this product..."
                    required
                  ></textarea>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Submit Review
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Razorpay Payment */}
      {showRazorpay && (
        <RazorpayPayment
          amount={displayPrice * quantity + 99}
          name={product.company.name}
          description={`Payment for ${product.productName}`}
          image={product.company.logo}
          prefill={{
            name: auth.currentUser?.displayName || undefined,
            email: auth.currentUser?.email || undefined,
            contact: buyerPhone,
            address: buyerAddress,
          }}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
        />
      )}
    </div>
  )
}
