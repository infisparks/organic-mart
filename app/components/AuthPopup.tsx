"use client";

import { useState, useEffect } from "react";
import { auth, database } from "../../lib/firebase";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { ref as dbRef, get, set } from "firebase/database";

type AuthPopupProps = {
  onClose: () => void;
  onSuccess: () => void;
};

export default function AuthPopup({ onClose, onSuccess }: AuthPopupProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  // mode "login" shows the Google sign-in, "register" shows the profile form
  const [mode, setMode] = useState<"login" | "register">("login");
  const [details, setDetails] = useState({
    name: "",
    phone: "",
    address: "",
    lat: 0,
    lng: 0,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check if the user's profile exists in the database
        const profileRef = dbRef(database, `user/${currentUser.uid}/profile`);
        const snapshot = await get(profileRef);
        if (snapshot.exists()) {
          // Profile exists – authentication is complete
          onSuccess();
          onClose();
        } else {
          setMode("register");
        }
      } else {
        setMode("login");
      }
    });
    return () => unsubscribe();
  }, [onClose, onSuccess]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      const profileRef = dbRef(database, `user/${result.user.uid}/profile`);
      const snapshot = await get(profileRef);
      if (!snapshot.exists()) {
        setMode("register");
      } else {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Google login error:", error);
    }
    setLoading(false);
  };

  const fetchLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setDetails((prev) => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }));
        },
        (error) => {
          console.error("Error fetching location", error);
        }
      );
    }
  };

  const handleRegisterSubmit = async (e: any) => {
    e.preventDefault();
    // Validate phone number: exactly 10 digits
    if (!/^\d{10}$/.test(details.phone)) {
      setError("Phone number must be 10 digits.");
      return;
    }
    if (!details.name || !details.address) {
      setError("Name and address are required.");
      return;
    }
    setError("");
    try {
      const profileRef = dbRef(database, `user/${user.uid}/profile`);
      await set(profileRef, details);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving profile details:", err);
      setError("Error saving details. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg w-96">
        {mode === "login" && (
          <>
            <h2 className="text-xl font-bold mb-4">Sign in</h2>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded w-full"
            >
              {loading ? "Signing in..." : "Sign in with Google"}
            </button>
            <button onClick={onClose} className="mt-4 text-gray-500 w-full">
              Cancel
            </button>
          </>
        )}
        {mode === "register" && (
          <>
            <h2 className="text-xl font-bold mb-4">Complete Your Profile</h2>
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={details.name}
                onChange={(e) =>
                  setDetails({ ...details, name: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md p-2"
                required
              />
              <input
                type="text"
                placeholder="Phone (10 digits)"
                value={details.phone}
                onChange={(e) =>
                  setDetails({ ...details, phone: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md p-2"
                required
              />
              <input
                type="text"
                placeholder="Address"
                value={details.address}
                onChange={(e) =>
                  setDetails({ ...details, address: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md p-2"
                required
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchLocation}
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Fetch Current Location
                </button>
                <span className="text-sm text-gray-600">
                  {details.lat && details.lng
                    ? `(${details.lat.toFixed(2)}, ${details.lng.toFixed(2)})`
                    : ""}
                </span>
              </div>
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <button
                type="submit"
                className="w-full bg-green-600 text-white px-4 py-2 rounded"
              >
                Save Details
              </button>
            </form>
            <button onClick={onClose} className="mt-4 text-gray-500 w-full">
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
