"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { auth, database } from "../../lib/firebase"
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { ref as dbRef, get, set } from "firebase/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MapPin, Loader2, Chrome } from "lucide-react"

type AuthPopupProps = {
  onClose: () => void
  onSuccess: () => void
}

interface UserDetails {
  name: string
  phone: string
  street: string
  city: string
  state: string
  pincode: string
  lat: number
  lng: number
  fullAddress?: string
}

export default function AuthPopup({ onClose, onSuccess }: AuthPopupProps) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [mode, setMode] = useState<"login" | "register">("login")
  const [details, setDetails] = useState<UserDetails>({
    name: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    lat: 0,
    lng: 0,
  })
  const [error, setError] = useState("")

  // Automatically fetch location when component mounts
  useEffect(() => {
    if (mode === "register") {
      fetchLocationSilently()
    }
  }, [mode])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        const profileRef = dbRef(database, `user/${currentUser.uid}/profile`)
        const snapshot = await get(profileRef)
        if (snapshot.exists()) {
          onSuccess()
          onClose()
        } else {
          setMode("register")
        }
      } else {
        setMode("login")
      }
    })
    return () => unsubscribe()
  }, [onClose, onSuccess])

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      setUser(result.user)

      // Pre-fill name from Google account
      setDetails((prev) => ({
        ...prev,
        name: result.user.displayName || "",
      }))

      const profileRef = dbRef(database, `user/${result.user.uid}/profile`)
      const snapshot = await get(profileRef)
      if (!snapshot.exists()) {
        setMode("register")
      } else {
        onSuccess()
        onClose()
      }
    } catch (error) {
      console.error("Google login error:", error)
      setError("Failed to sign in with Google. Please try again.")
    }
    setLoading(false)
  }

  const fetchLocationSilently = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setDetails((prev) => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }))
        },
        (error) => {
          console.error("Error fetching location silently:", error)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      )
    }
  }

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      // Using a free reverse geocoding service
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

  const fetchLocationAndAddress = async () => {
    setLocationLoading(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude

          setDetails((prev) => ({
            ...prev,
            lat,
            lng,
          }))

          // Fetch address details
          const addressData = await reverseGeocode(lat, lng)
          if (addressData) {
            setDetails((prev) => ({
              ...prev,
              street: addressData.street || prev.street,
              city: addressData.city || prev.city,
              state: addressData.state || prev.state,
              pincode: addressData.pincode || prev.pincode,
              fullAddress: addressData.fullAddress,
            }))
          }
          setLocationLoading(false)
        },
        (error) => {
          console.error("Error fetching location:", error)
          setError("Unable to fetch location. Please enter address manually.")
          setLocationLoading(false)
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
      )
    } else {
      setError("Geolocation is not supported by this browser.")
      setLocationLoading(false)
    }
  }

  const validateForm = () => {
    if (!details.name.trim()) {
      setError("Name is required.")
      return false
    }
    if (!/^\d{10}$/.test(details.phone)) {
      setError("Phone number must be exactly 10 digits.")
      return false
    }
    if (!details.street.trim()) {
      setError("Street address is required.")
      return false
    }
    if (!details.city.trim()) {
      setError("City is required.")
      return false
    }
    if (!details.state.trim()) {
      setError("State is required.")
      return false
    }
    if (!/^\d{6}$/.test(details.pincode)) {
      setError("Pincode must be exactly 6 digits.")
      return false
    }
    return true
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setError("")
    setLoading(true)

    try {
      const profileData = {
        ...details,
        createdAt: new Date().toISOString(),
        email: user.email,
        photoURL: user.photoURL,
      }

      const profileRef = dbRef(database, `user/${user.uid}/profile`)
      await set(profileRef, profileData)

      onSuccess()
      onClose()
    } catch (err) {
      console.error("Error saving profile details:", err)
      setError("Error saving details. Please try again.")
    }
    setLoading(false)
  }

  const handleInputChange = (field: keyof UserDetails, value: string) => {
    setDetails((prev) => ({ ...prev, [field]: value }))
    if (error) setError("") // Clear error when user starts typing
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 shadow-2xl">
        {mode === "login" && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-green-700">Welcome to Organixa</CardTitle>
              <CardDescription>Sign in to continue to your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                size="lg"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />}
                {loading ? "Signing in..." : "Continue with Google"}
              </Button>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button variant="outline" onClick={onClose} className="w-full">
                Cancel
              </Button>
            </CardContent>
          </>
        )}

        {mode === "register" && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-green-700">Complete Your Profile</CardTitle>
              <CardDescription>Please provide your details to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={details.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="10-digit phone number"
                    value={details.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    required
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Address Details</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={fetchLocationAndAddress}
                      disabled={locationLoading}
                      className="text-xs"
                    >
                      {locationLoading ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <MapPin className="mr-1 h-3 w-3" />
                      )}
                      {locationLoading ? "Fetching..." : "Auto-fill"}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="street">Street Address *</Label>
                    <Input
                      id="street"
                      type="text"
                      placeholder="House/Building number, Street name"
                      value={details.street}
                      onChange={(e) => handleInputChange("street", e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        type="text"
                        placeholder="City"
                        value={details.city}
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
                        value={details.state}
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
                      value={details.pincode}
                      onChange={(e) => handleInputChange("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                    />
                  </div>
                </div>

                {details.lat !== 0 && details.lng !== 0 && (
                  <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                    ✓ Location detected: {details.lat.toFixed(4)}, {details.lng.toFixed(4)}
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading} size="lg">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Complete Registration"
                  )}
                </Button>
              </form>

              <Button variant="ghost" onClick={onClose} className="w-full mt-2">
                Cancel
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
