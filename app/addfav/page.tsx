"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth, database } from "../../lib/firebase";
import { ref, onValue, remove } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any>({});
  const router = useRouter();

  // Load companies data from Firebase.
  useEffect(() => {
    const companiesRef = ref(database, "companies");
    onValue(companiesRef, (snapshot) => {
      const data = snapshot.val();
      setCompanies(data || {});
    });
  }, []);

  // Load favorites for the current user.
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const favRef = ref(database, `user/${user.uid}/addfav`);
        onValue(favRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            // Convert favorites object to an array.
            const favArray = Object.keys(data).map((key) => ({
              id: key,
              ...data[key],
            }));
            setFavorites(favArray);
          } else {
            setFavorites([]);
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

  // Helper: Given a product ID, find its thumbnail from companies data.
  const getThumbnailForProduct = (productId: string) => {
    for (const companyId in companies) {
      const company = companies[companyId];
      if (company.products && company.products[productId]) {
        const product = company.products[productId];
        if (
          product.productPhotoUrls &&
          Array.isArray(product.productPhotoUrls) &&
          product.productPhotoUrls.length > 0
        ) {
          return product.productPhotoUrls[0];
        }
      }
    }
    // Fallback placeholder image.
    return "/placeholder.png";
  };

  const handleRemove = async (favId: string) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const favItemRef = ref(database, `user/${currentUser.uid}/addfav/${favId}`);
      await remove(favItemRef);
    }
  };

  const handleBuy = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Favorites</h1>
        {favorites.length === 0 ? (
          <p className="text-gray-600">You have no favorite products yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {favorites.map((item) => (
              <div
                key={item.id}
                className="bg-white shadow rounded-lg p-4 flex flex-col"
              >
                <div className="relative h-48 w-full mb-4">
                  <Image
                    src={getThumbnailForProduct(item.productId)}
                    alt={item.productName}
                    fill
                    className="object-contain object-center rounded"
                  />
                </div>
                <h2 className="text-lg font-semibold mb-2">
                  {item.productName}
                </h2>
                <p className="text-gray-600 mb-4">₹{item.price}</p>
                <div className="mt-auto flex justify-between items-center">
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => handleBuy(item.productId)}
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    Buy
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
