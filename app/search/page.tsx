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

// Define a type for product categories
interface Category {
  main: string;
}

// Define a type for our product
export interface Product {
  id: string;
  productName: string;
  productPhotoUrls?: string[];
  productPhotoUrl?: string;
  originalPrice?: number;
  discountPrice?: number;
  categories?: Category[];
  company: {
    name: string;
    logo: string;
  };
  // Add any other fields as needed
}

// Define a type for companies from Firebase
interface Company {
  companyName: string;
  companyPhotoUrl: string;
  products?: {
    [key: string]: {
      productName: string;
      productPhotoUrls?: string[];
      productPhotoUrl?: string;
      originalPrice?: number;
      discountPrice?: number;
      categories?: Category[];
      // Other product properties...
    };
  };
}

// FavButton component props type
interface FavButtonProps {
  product: Product;
}

function FavButton({ product }: FavButtonProps) {
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

  const toggleFav = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();

    const currentUser = auth.currentUser;
    if (!currentUser) {
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

// Mapping for main categories (for the dropdown filter)
const mainCategories = [
  "Organic Groceries & Superfoods",
  "Herbal & Natural Personal Care",
  "Health & Wellness Products",
  "Sustainable Home & Eco-Friendly Living",
  "Sustainable Fashion & Accessories",
  "Organic Baby & Kids Care",
  "Organic Pet Care",
  "Special Dietary & Lifestyle Products",
];

export default function SearchPage() {
  // Annotate state with the proper type
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Load products from "companies" in Firebase
  useEffect(() => {
    const companiesRef = ref(database, "companies");
    onValue(companiesRef, (snapshot) => {
      const data = snapshot.val();
      let loadedProducts: Product[] = [];
      if (data) {
        for (const companyId in data) {
          const company: Company = data[companyId];
          if (company.products) {
            for (const productId in company.products) {
              const productData = company.products[productId];
              loadedProducts.push({
                id: productId,
                ...productData,
                company: {
                  name: company.companyName,
                  logo: company.companyPhotoUrl,
                },
              });
            }
          }
        }
      }
      setProducts(loadedProducts);
      setFilteredProducts(loadedProducts);
    });
  }, []);

  // Filter products based on product name and selected category
  useEffect(() => {
    const filtered = products.filter((product) => {
      const matchesName = product.productName
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory
        ? product.categories &&
          product.categories.some((cat) => cat.main === selectedCategory)
        : true;
      return matchesName && matchesCategory;
    });
    setFilteredProducts(filtered);
  }, [searchTerm, products, selectedCategory]);

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Search Banner */}
      <section className="bg-gradient-to-r from-green-100 to-blue-100 py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Find Your Perfect Product
          </h1>
          <p className="text-lg sm:text-xl text-gray-700 mb-8">
            Search by product name and filter by category.
          </p>
          <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-lg flex flex-col sm:flex-row gap-4 items-center">
            <input
              type="text"
              placeholder="Search by product name..."
              className="w-full sm:w-2/3 border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-1/3 border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Categories</option>
              {mainCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Search Results */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {filteredProducts.length === 0 ? (
            <p className="text-center text-gray-600">No products found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="bg-white rounded-lg shadow-lg overflow-hidden group relative transition transform hover:-translate-y-1 hover:shadow-2xl"
                >
                  {/* Image Section */}
                  <div className="relative h-64">
                    <Image
                      src={
                        product.productPhotoUrls
                          ? product.productPhotoUrls[0]
                          : product.productPhotoUrl || ""
                      }
                      alt={product.productName}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {product.originalPrice && product.discountPrice && (
                      <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded">
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
                  {/* Product Details */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Image
                        src={product.company.logo}
                        alt={product.company.name}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                      <span className="text-sm text-gray-600">
                        {product.company.name}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-2">
                      {product.productName}
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-green-600">
                        ₹{product.discountPrice ?? product.originalPrice}
                      </span>
                      {product.originalPrice && (
                        <span className="text-sm text-gray-400 line-through">
                          ₹{product.originalPrice}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-xs text-gray-600">
                      <ShieldCheck className="w-4 h-4 text-green-600" />
                      <span>Certified Organic</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
