"use client";

import { useState, useEffect } from "react";
import { Heart, ArrowRight, Star, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Footer from "./components/Footer";
import Header from "./components/Header";

// Import react-slick and its CSS
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// Firebase imports
import { database, auth } from "../lib/firebase";
import { ref, onValue, get, set, remove } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";

// Import AuthPopup for handling unauthenticated favorite actions
import AuthPopup from "@/app/components/AuthPopup";

// Custom categories for carousel
const categories = [
  {
    id: 1,
    title: "Organic Groceries & Superfoods",
    subtitle: "Fresh & Healthy Food",
    image:
      "https://www.pricechopper.com/wp-content/uploads/2022/07/072222_OrganicPage.png",
  },
  {
    id: 2,
    title: "Herbal & Natural Personal Care",
    subtitle: "Pure & Gentle Care",
    image:
      "https://media.ahmedabadmirror.com/am/uploads/mediaGallery/image/1679590753548.jpg-org",
  },
  {
    id: 3,
    title: "Health & Wellness Products",
    subtitle: "Boost Your Wellbeing",
    image:
      "https://media.ahmedabadmirror.com/am/uploads/mediaGallery/image/1679590753548.jpg-org",
  },
  {
    id: 4,
    title: "Sustainable Home & Eco-Friendly Living",
    subtitle: "Green & Clean Living",
    image:
      "https://previews.123rf.com/images/baibakova/baibakova2007/baibakova200700306/152273705-bowls-of-various-superfoods-on-gray-background-healthy-organic-food-clean-eating-top-view.jpg",
  },
  {
    id: 5,
    title: "Sustainable Fashion & Accessories",
    subtitle: "Eco-Chic Styles",
    image:
      "https://previews.123rf.com/images/baibakova/baibakova2007/baibakova200700306/152273705-bowls-of-various-superfoods-on-gray-background-healthy-organic-food-clean-eating-top-view.jpg",
  },
  {
    id: 6,
    title: "Organic Baby & Kids Care",
    subtitle: "Gentle Care for Little Ones",
    image:
      "https://previews.123rf.com/images/baibakova/baibakova2007/baibakova200700306/152273705-bowls-of-various-superfoods-on-gray-background-healthy-organic-food-clean-eating-top-view.jpg",
  },
  {
    id: 7,
    title: "Organic Pet Care",
    subtitle: "Natural Care for Your Pets",
    image:
      "https://previews.123rf.com/images/baibakova/baibakova2007/baibakova200700306/152273705-bowls-of-various-superfoods-on-gray-background-healthy-organic-food-clean-eating-top-view.jpg",
  },
  {
    id: 8,
    title: "Special Dietary & Lifestyle Products",
    subtitle: "Tailored for Your Lifestyle",
    image:
      "https://previews.123rf.com/images/baibakova/baibakova2007/baibakova200700306/152273705-bowls-of-various-superfoods-on-gray-background-healthy-organic-food-clean-eating-top-view.jpg",
  },
];

// Category Carousel Component
function CategoryCarousel() {
  const settings = {
    dots: true,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 4000,
    speed: 500,
    slidesToShow: 3, // Show 3 cards at a time on PC
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 640, // On mobile devices show 1 card
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  return (
    <section className="py-6 sm:py-8 lg:py-12 bg-gradient-to-r from-amber-50 to-rose-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Slider {...settings}>
          {categories.map((cat) => (
            <div key={cat.id} className="px-2">
              <div className="relative bg-white rounded-2xl overflow-hidden shadow-lg">
                {/* Reduced card height */}
                <div className="relative h-40 sm:h-44 md:h-48">
                  <Image
                    src={`${cat.image}?w=800&h=600&fit=crop`}
                    alt={cat.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30" />
                </div>
                <div className="p-4">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                    {cat.title}
                  </h3>
                  <p className="text-green-600 font-medium mt-1 text-sm">
                    {cat.subtitle}
                  </p>
                  <Link
                    href={`/category/${encodeURIComponent(cat.title)}`}
                    className="mt-4 inline-flex items-center gap-2 text-green-600 font-medium hover:text-green-700 transition-colors text-sm"
                  >
                    Explore
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </div>
    </section>
  );
}

// Updated FavButton component with authentication popup support.
function FavButton({ product }: { product: any }) {
  const [isFav, setIsFav] = useState(false);
  const [showAuthPopup, setShowAuthPopup] = useState(false);

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

  const toggleFav = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();

    const currentUser = auth.currentUser;
    if (!currentUser) {
      // If not logged in, show the AuthPopup.
      setShowAuthPopup(true);
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
    <>
      <button
        onClick={toggleFav}
        className={`absolute top-2 right-2 p-1.5 sm:p-2 rounded-full shadow-sm transition-colors ${
          isFav ? "bg-red-500 hover:bg-red-600" : "bg-white/90 hover:bg-white"
        }`}
      >
        <Heart
          className={`w-3 h-3 sm:w-4 sm:h-4 ${isFav ? "text-white" : "text-gray-600"}`}
        />
      </button>
      {showAuthPopup && (
        <AuthPopup
          onClose={() => setShowAuthPopup(false)}
          onSuccess={() => setShowAuthPopup(false)}
        />
      )}
    </>
  );
}

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const companiesRef = ref(database, "companies");
    onValue(companiesRef, (snapshot) => {
      const data = snapshot.val();
      let loadedProducts: any[] = [];
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
      {/* Announcement Bar */}
      <div className="bg-green-50 text-center py-2 text-xs sm:text-sm text-green-800 animate-fade-in-down px-4">
        <span className="hidden sm:inline">
          🌱 Free shipping on orders over ₹1000 |{" "}
        </span>
        Shop now and get 10% off your first order
      </div>

      {/* Header Component */}
      <Header />

      {/* Category Carousel */}
      <CategoryCarousel />

      {/* Today's Deals */}
      <section className="py-6 sm:py-8 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Today's Deals
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                Get fresh organic products at best prices
              </p>
            </div>
            <Link
              href="/viewall"
              className="text-green-600 font-medium hover:text-green-700 flex items-center gap-2 group text-sm sm:text-base"
            >
              View All
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
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

      {/* Best Sellers */}
      <section className="py-6 sm:py-8 lg:py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Best Sellers
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                Most popular choices by our customers
              </p>
            </div>
            <Link
              href="#"
              className="text-green-600 font-medium hover:text-green-700 flex items-center gap-2 group text-sm sm:text-base"
            >
              View All
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
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
