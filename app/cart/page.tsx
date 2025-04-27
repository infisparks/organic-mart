"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { auth, database } from "../../lib/firebase"
import { onValue, ref as dbRef, update, remove, push } from "firebase/database"
import { onAuthStateChanged } from "firebase/auth"
import { Minus, Plus, ArrowLeft, Trash2, ShieldCheck, Truck, Clock } from "lucide-react"
import Header from "../components/Header"
import Footer from "../components/Footer"
import RazorpayPayment from "../components/razorpay-payment"

interface CartItem {
  id: string
  productId?: string
  name: string
  description: string
  price: number
  originalPrice: number
  quantity: number
  image: string
  nutrients: Array<{ name: string; value: string }>
}

interface CompanyProduct {
  productName: string
  productDescription: string
  originalPrice: number
  discountPrice: number
  productPhotoUrls: string[]
  nutrients: Array<{ name: string; value: string }>
}

interface CompaniesData {
  [companyId: string]: {
    companyName: string
    companyPhotoUrl: string
    email: string
    phoneNumber: string
    products: {
      [productId: string]: CompanyProduct
    }
  }
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [companies, setCompanies] = useState<CompaniesData>({})
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [address, setAddress] = useState("")
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const router = useRouter()

  // Load companies data from Firebase.
  useEffect(() => {
    const companiesRef = dbRef(database, "companies")
    const unsubscribeCompanies = onValue(companiesRef, (snapshot) => {
      if (snapshot.exists()) {
        setCompanies(snapshot.val())
      } else {
        setCompanies({})
      }
    })
    return () => unsubscribeCompanies()
  }, [])

  // Helper: Find a matching company product using the productId.
  const getCompanyProduct = (productId: string): CompanyProduct | null => {
    for (const companyId in companies) {
      const company = companies[companyId]
      if (company.products && company.products[productId]) {
        return company.products[productId]
      }
    }
    return null
  }

  // Helper: Get product thumbnail from companies data.
  const getProductThumbnail = (productId: string): string | null => {
    const companyProduct = getCompanyProduct(productId)
    if (
      companyProduct &&
      companyProduct.productPhotoUrls &&
      Array.isArray(companyProduct.productPhotoUrls) &&
      companyProduct.productPhotoUrls.length > 0
    ) {
      return companyProduct.productPhotoUrls[0]
    }
    return null
  }

  // Load cart and profile data once the user is authenticated.
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Fetch default address from user profile.
        const profileRef = dbRef(database, `user/${user.uid}/profile`)
        onValue(profileRef, (snapshot) => {
          if (snapshot.exists()) {
            const profileData = snapshot.val()
            setAddress(profileData.address || "")
          }
        })

        const cartRef = dbRef(database, `user/${user.uid}/addtocart`)
        const unsubscribeCart = onValue(cartRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val()
            const loadedItems: CartItem[] = Object.keys(data).map((key) => {
              const itemData = data[key]
              const productId = itemData.productId || key
              const thumbnailFromCompany = getProductThumbnail(productId)
              const companyProduct = getCompanyProduct(productId)
              return {
                id: key,
                productId,
                name: itemData.productName || itemData.name || "Unknown",
                description: itemData.productDescription || itemData.description || "",
                price: itemData.price || companyProduct?.discountPrice || 0,
                originalPrice: companyProduct?.originalPrice || itemData.originalPrice || 0,
                quantity: itemData.quantity || 1,
                image:
                  thumbnailFromCompany ||
                  (itemData.productPhotoUrls && itemData.productPhotoUrls[0]) ||
                  itemData.image ||
                  "https://via.placeholder.com/150",
                nutrients: itemData.nutrients || [],
              }
            })
            setCartItems(loadedItems)
          } else {
            setCartItems([])
          }
        })
        return () => unsubscribeCart()
      } else {
        setCartItems([])
      }
    })
    return () => unsubscribeAuth()
  }, [companies])

  // Update quantity in Firebase and local state.
  const updateQuantity = async (id: string, newQuantity: number) => {
    if (newQuantity < 1) return
    setCartItems((items) => items.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item)))
    const user = auth.currentUser
    if (!user) return
    const cartItemRef = dbRef(database, `user/${user.uid}/addtocart/${id}`)
    await update(cartItemRef, { quantity: newQuantity })
  }

  // Remove an item from the cart.
  const removeItem = async (id: string) => {
    setCartItems((items) => items.filter((item) => item.id !== id))
    const user = auth.currentUser
    if (!user) return
    const cartItemRef = dbRef(database, `user/${user.uid}/addtocart/${id}`)
    await remove(cartItemRef)
  }

  const shipping = 99
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = subtotal + shipping

  // Order placement function that pushes the order including address and location.
  const handleCheckout = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) return
    try {
      const orderData = {
        items: cartItems,
        subtotal,
        shipping,
        total,
        status: "pending",
        purchaseTime: Date.now(),
        shippingAddress: address,
        location, // contains latitude and longitude
      }
      // Push order to orders node.
      const orderRef = dbRef(database, `user/${currentUser.uid}/order`)
      await push(orderRef, orderData)
      // Clear cart.
      const cartRef = dbRef(database, `user/${currentUser.uid}/addtocart`)
      await remove(cartRef)
      setCartItems([])
    } catch (error) {
      console.error("Error during checkout:", error)
    }
  }

  // Function to fetch geolocation and then place the order if successful.
  const handlePlaceOrder = () => {
    if (cartItems.length === 0) {
      alert("Your cart is empty. Please add products to your cart.")
      return
    }
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.")
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setLocation({ latitude, longitude })
        setShowAddressModal(false)

        // Show Razorpay payment after getting location
        setShowPaymentModal(true)
      },
      (error) => {
        console.error("Geolocation error:", error)
        alert("Could not fetch location. Please enable location services and try again.")
      },
    )
  }

  const handlePaymentSuccess = async (response: any) => {
    console.log("Payment successful", response)
    setLoading(true)
    try {
      await handleCheckout()
      setLoading(false)
      setOrderPlaced(true)
      setShowPaymentModal(false)
      setShowAddressModal(true) // Show success message
    } catch (error) {
      console.error("Error during checkout:", error)
      setLoading(false)
      alert("There was an error processing your order. Please try again.")
    }
  }

  const handlePaymentFailure = (error: any) => {
    console.error("Payment failed", error)
    alert(`Payment failed: ${error.description}`)
    setShowPaymentModal(false)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
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
            {cartItems.length === 0 ? (
              <div className="text-gray-600">
                Your cart is empty.
                <Link href="/" className="text-green-600 ml-2">
                  Go Shopping!
                </Link>
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Updated Image Container: 1:1 aspect ratio and centered */}
                    <div className="relative w-full sm:w-40 aspect-square">
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        fill
                        className="object-contain object-center rounded-lg"
                      />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                          <p className="text-sm text-gray-500">{item.description}</p>
                          {item.originalPrice > item.price && (
                            <p className="text-sm text-gray-500">Original Price: ₹{item.originalPrice}</p>
                          )}
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
                          {item.originalPrice > item.price && (
                            <span className="text-sm text-gray-400 line-through">
                              ₹{item.originalPrice * item.quantity}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
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

              <button
                onClick={() => {
                  setShowAddressModal(true)
                  setOrderPlaced(false)
                  setLoading(false)
                }}
                className="w-full bg-green-600 text-white py-4 rounded-full font-medium hover:bg-green-700 transform hover:scale-[1.02] transition-all duration-300"
              >
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

      {/* New Address / Order Placement Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            {orderPlaced ? (
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Order Placed Successfully</h2>
                <p>Your order has been placed successfully!</p>
                <button
                  onClick={() => setShowAddressModal(false)}
                  className="mt-4 w-full text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
              </div>
            ) : loading ? (
              <div className="text-center">
                <p className="text-lg">Loading...</p>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold mb-4">Enter Shipping Address</h2>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full border p-2 mb-4"
                  placeholder="Enter your address"
                />
                <button
                  onClick={handlePlaceOrder}
                  className="w-full bg-green-600 text-white py-3 rounded-full font-medium hover:bg-green-700 transition-colors"
                >
                  Place Order
                </button>
                <button
                  onClick={() => setShowAddressModal(false)}
                  className="mt-4 w-full text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Razorpay Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Complete Payment</h2>
            <p className="mb-4">Total amount: ₹{total}</p>
            <RazorpayPayment
              amount={total}
              name="Organic Store"
              description="Purchase of organic products"
              prefill={{
                name: auth.currentUser?.displayName || "",
                email: auth.currentUser?.email || "",
                address: address,
              }}
              onSuccess={handlePaymentSuccess}
              onFailure={handlePaymentFailure}
            />
            <button
              onClick={() => setShowPaymentModal(false)}
              className="mt-4 w-full text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <Footer />
    </main>
  )
}
