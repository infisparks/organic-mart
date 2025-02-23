"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ref, onValue, get, set, remove } from "firebase/database";
import { database, auth } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Star, ShieldCheck, Heart } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";

// Same FavButton logic as in the homepage
function FavButton({ product }) {
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const favRef = ref(database, `user/${user.uid}/addfav/${product.id}`);
        const favSnap = await get(favRef);
        setIsFav(favSnap.exists());
      } else {
        setIsFav(false);
      }
    });
    return () => {
      unsubscribeAuth();
    };
  }, [product.id]);

  const toggleFav = async (e) => {
    // Prevent link navigation
    e.stopPropagation();
    e.preventDefault();

    const currentUser = auth.currentUser;
    if (!currentUser) {
      // Optionally, show login prompt here.
      return;
    }
    try {
      const favRef = ref(database, `user/${currentUser.uid}/addfav/${product.id}`);
      const favSnap = await get(favRef);
      if (favSnap.exists()) {
        await remove(favRef);
        setIsFav(false);
      } else {
        await set(favRef, {
          productId: product.id,
          productName: product.productName,
          price: product.discountPrice ?? product.originalPrice,
          addedAt: Date.now(),
        });
        setIsFav(true);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  return (
    <button
      onClick={toggleFav}
      className={`absolute top-2 right-2 p-1.5 sm:p-2 rounded-full shadow-sm transition-colors ${
        isFav ? "bg-red-500 hover:bg-red-600" : "bg-white/90 hover:bg-white"
      }`}
    >
      <Heart
        className={`w-3 h-3 sm:w-4 sm:h-4 ${
          isFav ? "text-white" : "text-gray-600"
        }`}
      />
    </button>
  );
}

export default function ViewAllPage() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const companiesRef = ref(database, "companies");
    onValue(companiesRef, (snapshot) => {
      const data = snapshot.val();
      let loadedProducts = [];
      for (const companyId in data) {
        const company = data[companyId];
        if (company.products) {
          for (const productId in company.products) {
            const product = company.products[productId];
            loadedProducts.push({
              id: productId,
              ...product,
              company: {
                name: company.companyName,
                logo: company.companyPhotoUrl,
              },
            });
          }
        }
      }
      setProducts(loadedProducts);
    });
  }, []);

  return (
    <main className="min-h-screen">
      <Header />

      <section className="py-6 sm:py-8 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">All Products</h2>
            <Link
              href="/"
              className="text-green-600 font-medium hover:text-green-700 flex items-center gap-2 group text-sm sm:text-base"
            >
              Back to Home
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.id}`}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 group relative"
              >
                <div className="relative aspect-square rounded-t-lg overflow-hidden">
                  <Image
                    src={
                      product.productPhotoUrls
                        ? product.productPhotoUrls[0]
                        : product.productPhotoUrl
                    }
                    alt={product.productName}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {product.originalPrice && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs sm:text-sm px-2 py-1 rounded-full">
                      {Math.round(
                        ((product.originalPrice - product.discountPrice) /
                          product.originalPrice) *
                          100
                      )}
                      % OFF
                    </div>
                  )}
                  {/* FavButton just like on home page */}
                  <FavButton product={product} />
                </div>

                <div className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                    <Image
                      src={product.company.logo}
                      alt={product.company.name}
                      width={16}
                      height={16}
                      className="rounded-full"
                    />
                    <span className="text-xs text-gray-600 truncate">
                      {product.company.name}
                    </span>
                  </div>

                  <h3 className="font-medium text-gray-900 mb-1 text-sm sm:text-base line-clamp-2">
                    {product.productName}
                  </h3>

                  <div className="flex items-center gap-1 mb-2">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-current" />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">(120)</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-base sm:text-lg font-bold text-gray-900">
                      ₹{product.discountPrice}
                    </span>
                    {product.originalPrice && (
                      <span className="text-xs sm:text-sm text-gray-400 line-through">
                        ₹{product.originalPrice}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 sm:mt-3 flex items-center gap-1 sm:gap-2 text-xs text-gray-600">
                    <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                    <span>Certified Organic</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
