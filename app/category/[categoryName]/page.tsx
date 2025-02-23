"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ref, onValue, get, set, remove } from "firebase/database";
import { database, auth } from "../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Heart } from "lucide-react";
import Footer from "@/app/components/Footer";
import Header from "@/app/components/Header";

interface Product {
  id: string;
  productName: string;
  productDescription: string;
  productPhotoUrls?: string[];
  productPhotoUrl?: string;
  discountPrice: number;
  originalPrice: number;
  categories?: { main: string; sub: string }[];
  company: { name: string; logo: string };
}

// Mapping of main category to sub categories
const categoryOptions: { [key: string]: string[] } = {
  "Organic Groceries & Superfoods": [
    "Organic Staples & Grains",
    "Cold-Pressed Oils & Ghee",
    "Organic Spices & Condiments",
    "Superfoods & Immunity Boosters",
    "Natural Sweeteners",
    "Organic Snacks & Beverages",
    "Dairy & Plant-Based Alternatives",
  ],
  "Herbal & Natural Personal Care": [
    "Organic Skincare",
    "Herbal Haircare",
    "Natural Oral Care",
    "Chemical-Free Cosmetics",
    "Organic Fragrances",
  ],
  "Health & Wellness Products": [
    "Ayurvedic & Herbal Supplements",
    "Nutritional Supplements",
    "Detox & Gut Health",
    "Immunity Boosters",
    "Essential Oils & Aromatherapy",
  ],
  "Sustainable Home & Eco-Friendly Living": [
    "Organic Cleaning Products",
    "Reusable & Biodegradable Kitchen Essentials",
    "Organic Gardening",
    "Sustainable Home Décor",
  ],
  "Sustainable Fashion & Accessories": [
    "Organic Cotton & Hemp Clothing",
    "Eco-Friendly Footwear",
    "Bamboo & Wooden Accessories",
    "Handmade & Sustainable Jewelry",
  ],
  "Organic Baby & Kids Care": [
    "Organic Baby Food",
    "Natural Baby Skincare",
    "Eco-Friendly Baby Clothing",
    "Non-Toxic Toys & Accessories",
  ],
  "Organic Pet Care": [
    "Organic Pet Food",
    "Herbal Grooming & Skincare",
    "Natural Pet Supplements",
  ],
  "Special Dietary & Lifestyle Products": [
    "Gluten-Free Foods",
    "Vegan & Plant-Based Alternatives",
    "Keto & Low-Carb Products",
    "Diabetic-Friendly Foods",
  ],
};

// FavButton Component
function FavButton({ product }: { product: Product }) {
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

export default function CategoryPage() {
  const { categoryName } = useParams() as { categoryName: string };
  const decodedCategoryName = decodeURIComponent(categoryName);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<string>("");

  useEffect(() => {
    const companiesRef = ref(database, "companies");
    onValue(companiesRef, (snapshot) => {
      const data = snapshot.val();
      let loadedProducts: Product[] = [];
      for (const companyId in data) {
        const company = data[companyId];
        if (company.products) {
          for (const productId in company.products) {
            const product = company.products[productId];
            if (
              product.categories &&
              Array.isArray(product.categories) &&
              product.categories.some((cat: any) => cat.main === decodedCategoryName)
            ) {
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
      }
      setProducts(loadedProducts);
      setLoading(false);
    });
  }, [decodedCategoryName]);

  const filteredProducts = selectedSub
    ? products.filter((product) =>
        product.categories?.some((cat) => cat.sub === selectedSub)
      )
    : products;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  const subCategories = categoryOptions[decodedCategoryName] || [];

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">{decodedCategoryName}</h1>

          {subCategories.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {subCategories.map((subCat) => (
                <button
                  key={subCat}
                  onClick={() =>
                    setSelectedSub((prev) => (prev === subCat ? "" : subCat))
                  }
                  className={`px-4 py-2 rounded-full border transition-colors ${
                    selectedSub === subCat
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-green-100"
                  }`}
                >
                  {subCat}
                </button>
              ))}
              {selectedSub && (
                <button
                  onClick={() => setSelectedSub("")}
                  className="px-4 py-2 rounded-full border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Clear Filter
                </button>
              )}
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <p className="text-gray-600">No products found in this category.</p>
          ) : (
            // Updated grid: Two cards per row on mobile, two on small screens, three on medium, four on large screens.
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="bg-white rounded-lg shadow-lg overflow-hidden group relative transition transform hover:-translate-y-1 hover:shadow-2xl"
                >
                  {/* Image Section using 1:1 aspect ratio */}
                  <div className="relative aspect-square rounded-t-lg overflow-hidden">
                    <Image
                      src={
                        product.productPhotoUrls?.[0] ??
                        product.productPhotoUrl ??
                        "/placeholder.png"
                      }
                      alt={product.productName}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {product.originalPrice && (
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
                        ₹{product.discountPrice}
                      </span>
                      {product.originalPrice && (
                        <span className="text-sm text-gray-400 line-through">
                          ₹{product.originalPrice}
                        </span>
                      )}
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
