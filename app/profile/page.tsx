"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Link from "next/link";
import Image from "next/image";
import { ref, onValue, update } from "firebase/database";
import { auth, database } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

// Updated Profile type to include pincode.
interface Profile {
  name?: string;
  phone?: string;
  address?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  photo?: string;
}

// Updated props for EditProfileModal to include pincode.
interface EditProfileModalProps {
  profile: Profile;
  onClose: () => void;
  onSave: (updatedProfile: {
    name: string;
    phone: string;
    address: string;
    pincode: string;
    lat: number;
    lng: number;
  }) => void;
}

function EditProfileModal({ profile, onClose, onSave }: EditProfileModalProps) {
  const [name, setName] = useState(profile?.name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [pincode, setPincode] = useState(profile?.pincode || "");
  const [lat, setLat] = useState(profile?.lat || 0);
  const [lng, setLng] = useState(profile?.lng || 0);
  const [updatingLocation, setUpdatingLocation] = useState(false);

  // Dummy reverse geocode function; in production, replace with an API call.
  const reverseGeocode = async (lat: number, lng: number) => {
    return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
  };

  const handleUpdateLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setUpdatingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        const newAddress = await reverseGeocode(newLat, newLng);
        setLat(newLat);
        setLng(newLng);
        setAddress(newAddress);
        setUpdatingLocation(false);
      },
      (error) => {
        console.error("Error fetching location:", error);
        setUpdatingLocation(false);
      }
    );
  };

  const handleSave = () => {
    onSave({ name, phone, address, pincode, lat, lng });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6 relative">
        <h2 className="text-2xl font-bold mb-4">Edit Profile</h2>
        <label className="block mb-2">
          <span className="text-gray-700">Name</span>
          <input
            type="text"
            className="mt-1 block w-full rounded border-gray-300 p-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block mb-2">
          <span className="text-gray-700">Phone</span>
          <input
            type="text"
            className="mt-1 block w-full rounded border-gray-300 p-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <label className="block mb-2">
          <span className="text-gray-700">Address</span>
          <textarea
            className="mt-1 block w-full rounded border-gray-300 p-2"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </label>
        <label className="block mb-2">
          <span className="text-gray-700">Pincode</span>
          <input
            type="text"
            className="mt-1 block w-full rounded border-gray-300 p-2"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
          />
        </label>
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={handleUpdateLocation}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            {updatingLocation ? "Updating..." : "Update Location"}
          </button>
          <button
            onClick={handleSave}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          >
            Save Changes
          </button>
        </div>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          X
        </button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Fetch profile.
        const profileRef = ref(database, `user/${user.uid}/profile`);
        onValue(profileRef, (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.val());
          }
        });

        // Fetch cart count.
        const cartRef = ref(database, `user/${user.uid}/addtocart`);
        onValue(cartRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            setCartCount(Object.keys(data).length);
          } else {
            setCartCount(0);
          }
        });

        // Fetch favorites count.
        const favRef = ref(database, `user/${user.uid}/addfav`);
        onValue(favRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            setFavCount(Object.keys(data).length);
          } else {
            setFavCount(0);
          }
        });

        // Fetch orders count.
        const orderRef = ref(database, `user/${user.uid}/order`);
        onValue(orderRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            setOrderCount(Object.keys(data).length);
          } else {
            setOrderCount(0);
          }
        });
      } else {
        router.push("/login");
      }
    });
    return () => {
      unsubscribeAuth();
    };
  }, [router]);

  const handleSaveProfile = async (newProfile: {
    name: string;
    phone: string;
    address: string;
    pincode: string;
    lat: number;
    lng: number;
  }) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const profileRef = ref(database, `user/${currentUser.uid}/profile`);
      await update(profileRef, newProfile);
      setProfile((prev) => ({ ...prev, ...newProfile }));
      setShowEditModal(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              {profile?.photo ? (
                <Image
                  src={profile.photo}
                  alt={profile.name || "User Photo"}
                  width={80}
                  height={80}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center text-2xl font-bold text-gray-700">
                  {profile?.name ? profile.name[0] : "U"}
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {profile?.name || "Your Name"}
                </h1>
                <p className="text-gray-600">
                  {profile?.address || "Your Address"}
                </p>
                <p className="text-gray-600">
                  {profile?.pincode || "Your Pincode"}
                </p>
                <p className="text-gray-600">
                  {profile?.phone || "Your Phone"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowEditModal(true)}
              className="mt-4 sm:mt-0 bg-green-600 text-white px-6 py-3 rounded-full font-medium hover:bg-green-700 transition"
            >
              Edit Profile
            </button>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Link href="/cart">
              <div className="bg-gray-50 p-4 rounded-lg text-center cursor-pointer">
                <p className="text-2xl font-bold text-gray-900">{cartCount}</p>
                <p className="text-gray-600">Items in Cart</p>
              </div>
            </Link>
            <Link href="/addfav">
              <div className="bg-gray-50 p-4 rounded-lg text-center cursor-pointer">
                <p className="text-2xl font-bold text-gray-900">{favCount}</p>
                <p className="text-gray-600">Favorites</p>
              </div>
            </Link>
            <Link href="/orders">
              <div className="bg-gray-50 p-4 rounded-lg text-center cursor-pointer">
                <p className="text-2xl font-bold text-gray-900">{orderCount}</p>
                <p className="text-gray-600">Total Orders</p>
              </div>
            </Link>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Update Location
            </h2>
            <p className="text-gray-600">
              Latitude: {profile?.lat ? profile.lat.toFixed(4) : "N/A"}, Longitude:{" "}
              {profile?.lng ? profile.lng.toFixed(4) : "N/A"}
            </p>
          </div>
        </div>
      </main>
      <Footer />

      {showEditModal && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
}
