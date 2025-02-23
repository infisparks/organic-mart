"use client";

import { useState } from "react";

type UserProfile = {
  name: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
};

type OrderConfirmationPopupProps = {
  userProfile: UserProfile;
  onConfirm: (updatedProfile?: UserProfile) => void;
  onCancel: () => void;
};

export default function OrderConfirmationPopup({
  userProfile,
  onConfirm,
  onCancel,
}: OrderConfirmationPopupProps) {
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(userProfile);
  const [error, setError] = useState("");

  const handleFetchLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setProfile({
            ...profile,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error fetching location", error);
        }
      );
    }
  };

  const handleSave = () => {
    // Validate phone number must be 10 digits
    if (!/^\d{10}$/.test(profile.phone)) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }
    if (!profile.name || !profile.address) {
      setError("Name and address cannot be empty.");
      return;
    }
    setError("");
    setEditing(false);
    onConfirm(profile); // Pass updated profile along with confirmation
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg w-96">
        {!editing ? (
          <>
            <h2 className="text-xl font-bold mb-4">Confirm Order</h2>
            <p className="mb-2">Please check your details:</p>
            <div className="mb-4">
              <p>
                <strong>Name:</strong> {profile.name}
              </p>
              <p>
                <strong>Phone:</strong> {profile.phone}
              </p>
              <p>
                <strong>Address:</strong> {profile.address}
              </p>
              {profile.lat !== 0 && profile.lng !== 0 && (
                <p>
                  <strong>Location:</strong> (
                  {profile.lat.toFixed(2)}, {profile.lng.toFixed(2)})
                </p>
              )}
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Edit Details
              </button>
              <button
                onClick={() => onConfirm()}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Confirm Order
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4">Edit Your Details</h2>
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            <input
              type="text"
              placeholder="Name"
              value={profile.name}
              onChange={(e) =>
                setProfile({ ...profile, name: e.target.value })
              }
              className="w-full border border-gray-300 rounded p-2 mb-2"
            />
            <input
              type="text"
              placeholder="Phone (10 digits)"
              value={profile.phone}
              onChange={(e) =>
                setProfile({ ...profile, phone: e.target.value })
              }
              className="w-full border border-gray-300 rounded p-2 mb-2"
            />
            <input
              type="text"
              placeholder="Address"
              value={profile.address}
              onChange={(e) =>
                setProfile({ ...profile, address: e.target.value })
              }
              className="w-full border border-gray-300 rounded p-2 mb-2"
            />
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={handleFetchLocation}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Fetch Current Location
              </button>
              {profile.lat !== 0 && profile.lng !== 0 && (
                <span className="text-sm text-gray-600">
                  ({profile.lat.toFixed(2)}, {profile.lng.toFixed(2)})
                </span>
              )}
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Save & Confirm
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
