"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { auth, database } from "../../lib/firebase"
import { onValue, ref as dbRef, update, remove, push } from "firebase/database"
import { onAuthStateChanged } from "firebase/auth"
import { Minus, Plus, ArrowLeft, Trash2, ShieldCheck, Truck, Clock, MapPin, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
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

interface DeliveryAddress {
  name: string
  phone: string
  secondaryPhone: string
  street: string
  city: string
  state: string
  pincode: string
  fullAddress: string
  lat: number
  lng: number
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [companies, setCompanies] = useState<CompaniesData>({})
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
    name: "",
    phone: "",
    secondaryPhone: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    fullAddress: "",
    lat: 0,
    lng: 0,
  })
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  // Load companies data from Firebase
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

  // Helper: Find a matching company product using the productId
  const getCompanyProduct = (productId: string): CompanyProduct | null => {
    for (const companyId in companies) {
      const company = companies[companyId]
      if (company.products && company.products[productId]) {
        return company.products[productId]
      }
    }
    return null
  }

  // Helper: Get product thumbnail from companies data
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

  // Load cart and profile data once the user is authenticated
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Fetch user profile data
        const profileRef = dbRef(database, `user/${user.uid}/profile`)
        onValue(profileRef, (snapshot) => {
          if (snapshot.exists()) {
            const profileData = snapshot.val()
            setUserProfile(profileData)
            // Auto-fill delivery address from profile
            setDeliveryAddress({
              name: profileData.name || "",
              phone: profileData.phone || "",
              secondaryPhone: "",
              street: profileData.street || "",
              city: profileData.city || "",
              state: profileData.state || "",
              pincode: profileData.pincode || "",
              fullAddress:
                profileData.fullAddress ||
                `${profileData.street || ""}, ${profileData.city || ""}, ${profileData.state || ""} ${profileData.pincode || ""}`.trim(),
              lat: profileData.lat || 0,
              lng: profileData.lng || 0,
            })
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

  // Update quantity in Firebase and local state
  const updateQuantity = async (id: string, newQuantity: number) => {
    if (newQuantity < 1) return
    setCartItems((items) => items.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item)))
    const user = auth.currentUser
    if (!user) return
    const cartItemRef = dbRef(database, `user/${user.uid}/addtocart/${id}`)
    await update(cartItemRef, { quantity: newQuantity })
  }

  // Remove an item from the cart
  const removeItem = async (id: string) => {
    setCartItems((items) => items.filter((item) => item.id !== id))
    const user = auth.currentUser
    if (!user) return
    const cartItemRef = dbRef(database, `user/${user.uid}/addtocart/${id}`)
    await remove(cartItemRef)
  }

  // Reverse geocoding function
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      )
      const data = await response.json()
      return {
        street: data.locality || "",
        city: data.city || data.locality || "",
        state: data.principalSubdivision || "",
        pincode: data.postcode || "",
        fullAddress: data.display_name || "",
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error)
      return null
    }
  }

  // Fetch current location and auto-fill address
  const fetchCurrentLocation = async () => {
    setLocationLoading(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude

          setDeliveryAddress((prev) => ({
            ...prev,
            lat,
            lng,
          }))

          // Fetch address details
          const addressData = await reverseGeocode(lat, lng)
          if (addressData) {
            setDeliveryAddress((prev) => ({
              ...prev,
              street: addressData.street || prev.street,
              city: addressData.city || prev.city,
              state: addressData.state || prev.state,
              pincode: addressData.pincode || prev.pincode,
              fullAddress: addressData.fullAddress || prev.fullAddress,
            }))
          }
          setLocationLoading(false)
        },
        (error) => {
          console.error("Error fetching location:", error)
          setError("Unable to fetch current location. Please enter address manually.")
          setLocationLoading(false)
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
      )
    } else {
      setError("Geolocation is not supported by this browser.")
      setLocationLoading(false)
    }
  }

  // Validate delivery address form
  const validateDeliveryAddress = () => {
    if (!deliveryAddress.name.trim()) {
      setError("Name is required.")
      return false
    }
    if (!/^\d{10}$/.test(deliveryAddress.phone)) {
      setError("Phone number must be exactly 10 digits.")
      return false
    }
    if (deliveryAddress.secondaryPhone && !/^\d{10}$/.test(deliveryAddress.secondaryPhone)) {
      setError("Secondary phone number must be exactly 10 digits.")
      return false
    }
    if (!deliveryAddress.street.trim()) {
      setError("Street address is required.")
      return false
    }
    if (!deliveryAddress.city.trim()) {
      setError("City is required.")
      return false
    }
    if (!deliveryAddress.state.trim()) {
      setError("State is required.")
      return false
    }
    if (!/^\d{6}$/.test(deliveryAddress.pincode)) {
      setError("Pincode must be exactly 6 digits.")
      return false
    }
    return true
  }

  const shipping = 99
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = subtotal + shipping

  // Order placement function
  const handleCheckout = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) return

    try {
      // Get current location for order
      const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
        return new Promise((resolve, reject) => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                resolve({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                })
              },
              (error) => {
                console.error("Geolocation error:", error)
                // Use address coordinates if current location fails
                resolve({
                  latitude: deliveryAddress.lat,
                  longitude: deliveryAddress.lng,
                })
              },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
            )
          } else {
            resolve({
              latitude: deliveryAddress.lat,
              longitude: deliveryAddress.lng,
            })
          }
        })
      }

      const currentLocation = await getCurrentLocation()

      const orderData = {
        items: cartItems,
        subtotal,
        shipping,
        total,
        status: "pending",
        purchaseTime: Date.now(),
        deliveryAddress: {
          ...deliveryAddress,
          currentOrderLat: currentLocation.latitude,
          currentOrderLng: currentLocation.longitude,
        },
        orderLocation: currentLocation,
      }

      // Push order to orders node
      const orderRef = dbRef(database, `user/${currentUser.uid}/order`)
      await push(orderRef, orderData)

      // Clear cart
      const cartRef = dbRef(database, `user/${currentUser.uid}/addtocart`)
      await remove(cartRef)
      setCartItems([])
    } catch (error) {
      console.error("Error during checkout:", error)
      throw error
    }
  }

  // Handle place order button click
  const handlePlaceOrder = () => {
    if (cartItems.length === 0) {
      setError("Your cart is empty. Please add products to your cart.")
      return
    }

    if (!validateDeliveryAddress()) {
      return
    }

    setError("")
    setShowAddressModal(false)
    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = async (response: any) => {
    console.log("Payment successful", response)
    setLoading(true)
    try {
      await handleCheckout()
      setLoading(false)
      setOrderPlaced(true)
      setShowPaymentModal(false)
      setShowAddressModal(true)
    } catch (error) {
      console.error("Error during checkout:", error)
      setLoading(false)
      setError("There was an error processing your order. Please try again.")
    }
  }

  const handlePaymentFailure = (error: any) => {
    console.error("Payment failed", error)
    setError(`Payment failed: ${error.description}`)
    setShowPaymentModal(false)
  }

  const handleInputChange = (field: keyof DeliveryAddress, value: string) => {
    setDeliveryAddress((prev) => ({ ...prev, [field]: value }))
    if (error) setError("")
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

              <Button
                onClick={() => {
                  setShowAddressModal(true)
                  setOrderPlaced(false)
                  setLoading(false)
                  setError("")
                }}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                Proceed to Checkout
              </Button>

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

      {/* Enhanced Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {orderPlaced ? (
              <CardContent className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-green-700 mb-2">Order Placed Successfully!</CardTitle>
                <CardDescription className="text-lg mb-6">
                  Your order has been confirmed and will be delivered soon.
                </CardDescription>
                <Button onClick={() => setShowAddressModal(false)} className="w-full max-w-xs">
                  Continue Shopping
                </Button>
              </CardContent>
            ) : loading ? (
              <CardContent className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p className="text-lg">Processing your order...</p>
              </CardContent>
            ) : (
              <>
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-green-700">Delivery Information</CardTitle>
                  <CardDescription>Please confirm your delivery details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Warning Message */}
                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      <strong>Important:</strong> Please ensure your delivery address and phone number are correct. Our
                      delivery team will contact you on the provided number for product delivery coordination.
                    </AlertDescription>
                  </Alert>

                  <form className="space-y-4">
                    {/* Personal Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>

                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="Enter your full name"
                          value={deliveryAddress.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number *</Label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="10-digit phone number"
                            value={deliveryAddress.phone}
                            onChange={(e) => handleInputChange("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="secondaryPhone">Secondary Phone (Optional)</Label>
                          <Input
                            id="secondaryPhone"
                            type="tel"
                            placeholder="Alternative phone number"
                            value={deliveryAddress.secondaryPhone}
                            onChange={(e) =>
                              handleInputChange("secondaryPhone", e.target.value.replace(/\D/g, "").slice(0, 10))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Address Information */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Delivery Address</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={fetchCurrentLocation}
                          disabled={locationLoading}
                        >
                          {locationLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <MapPin className="mr-2 h-4 w-4" />
                          )}
                          {locationLoading ? "Fetching..." : "Use Current Location"}
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="street">Street Address *</Label>
                        <Input
                          id="street"
                          type="text"
                          placeholder="House/Building number, Street name"
                          value={deliveryAddress.street}
                          onChange={(e) => handleInputChange("street", e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            type="text"
                            placeholder="City"
                            value={deliveryAddress.city}
                            onChange={(e) => handleInputChange("city", e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State *</Label>
                          <Input
                            id="state"
                            type="text"
                            placeholder="State"
                            value={deliveryAddress.state}
                            onChange={(e) => handleInputChange("state", e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pincode">Pincode *</Label>
                        <Input
                          id="pincode"
                          type="text"
                          placeholder="6-digit pincode"
                          value={deliveryAddress.pincode}
                          onChange={(e) => handleInputChange("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fullAddress">Complete Address</Label>
                        <Textarea
                          id="fullAddress"
                          placeholder="Complete address with landmarks"
                          value={deliveryAddress.fullAddress}
                          onChange={(e) => handleInputChange("fullAddress", e.target.value)}
                          rows={3}
                        />
                      </div>
                    </div>

                    {deliveryAddress.lat !== 0 && deliveryAddress.lng !== 0 && (
                      <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                        ✓ Location coordinates detected: {deliveryAddress.lat.toFixed(4)},{" "}
                        {deliveryAddress.lng.toFixed(4)}
                      </div>
                    )}

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-4 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddressModal(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handlePlaceOrder}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        Confirm & Pay ₹{total}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      )}

      {/* Razorpay Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-green-700">Complete Payment</CardTitle>
              <CardDescription>Secure payment processing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Amount:</span>
                  <span className="text-2xl font-bold text-green-600">₹{total}</span>
                </div>
              </div>

              <RazorpayPayment
                amount={total}
                name="Organixa Store"
                description="Purchase of organic products"
                prefill={{
                  name: deliveryAddress.name,
                  email: auth.currentUser?.email || "",
                  contact: deliveryAddress.phone,
                }}
                onSuccess={handlePaymentSuccess}
                onFailure={handlePaymentFailure}
              />

              <Button variant="outline" onClick={() => setShowPaymentModal(false)} className="w-full">
                Cancel Payment
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <Footer />
    </main>
  )
}
