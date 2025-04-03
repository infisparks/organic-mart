"use client";

import { useState, useEffect, useCallback } from "react";
import { Heart, ArrowRight, Star, ShieldCheck, Truck, Clock, Filter } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
    title: "Organic Groceries",
    subtitle: "Fresh & Healthy",
    icon: "🥦",
    image: "https://www.pricechopper.com/wp-content/uploads/2022/07/072222_OrganicPage.png",
  },
  {
    id: 2,
    title: "Natural Personal Care",
    subtitle: "Pure & Gentle",
    icon: "🧴",
    image: "https://media.ahmedabadmirror.com/am/uploads/mediaGallery/image/1679590753548.jpg-org",
  },
  {
    id: 3,
    title: "Health & Wellness",
    subtitle: "Boost Wellbeing",
    icon: "🌿",
    image: "https://media.ahmedabadmirror.com/am/uploads/mediaGallery/image/1679590753548.jpg-org",
  },
  {
    id: 4,
    title: "Eco-Friendly Living",
    subtitle: "Green Living",
    icon: "♻️",
    image: "https://previews.123rf.com/images/baibakova/baibakova2007/baibakova200700306/152273705-bowls-of-various-superfoods-on-gray-background-healthy-organic-food-clean-eating-top-view.jpg",
  },
  {
    id: 5,
    title: "Sustainable Fashion",
    subtitle: "Eco-Chic Styles",
    icon: "👕",
    image: "https://previews.123rf.com/images/baibakova/baibakova2007/baibakova200700306/152273705-bowls-of-various-superfoods-on-gray-background-healthy-organic-food-clean-eating-top-view.jpg",
  },
  {
    id: 6,
    title: "Organic Baby Care",
    subtitle: "For Little Ones",
    icon: "👶",
    image: "https://previews.123rf.com/images/baibakova/baibakova2007/baibakova200700306/152273705-bowls-of-various-superfoods-on-gray-background-healthy-organic-food-clean-eating-top-view.jpg",
  },
  {
    id: 7,
    title: "Organic Pet Care",
    subtitle: "For Your Pets",
    icon: "🐾",
    image: "https://previews.123rf.com/images/baibakova/baibakova2007/baibakova200700306/152273705-bowls-of-various-superfoods-on-gray-background-healthy-organic-food-clean-eating-top-view.jpg",
  },
  {
    id: 8,
    title: "Special Dietary",
    subtitle: "For Your Lifestyle",
    icon: "🥗",
    image: "https://previews.123rf.com/images/baibakova/baibakova2007/baibakova200700306/152273705-bowls-of-various-superfoods-on-gray-background-healthy-organic-food-clean-eating-top-view.jpg",
  },
];

// Product type definition
type Product = {
  id: string;
  productName: string;
  productPhotoUrl?: string;
  productPhotoUrls?: string[];
  originalPrice?: number;
  discountPrice: number;
  category?: string;
  company: {
    name: string;
    logo: string;
  };
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isOrganic?: boolean;
  stockStatus?: "in-stock" | "low-stock" | "out-of-stock";
};

// Category type definition
type CategoryProps = {
  selectedCategory: string | null;
  onCategoryClick: (category: string) => void;
};

// Category Carousel Component (updated with professional styling)
function CategoryCarousel({ selectedCategory, onCategoryClick }: CategoryProps) {
  const settings = {
    dots: true,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 4000,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  return (
    <section className="py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Shop by Category</h2>
          <Button variant="ghost" className="text-green-600 hover:text-green-700 gap-1">
            All Categories <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
        <Slider {...settings} className="category-slider">
          {categories.map((cat) => (
            <div key={cat.id} className="px-2 cursor-pointer" onClick={() => onCategoryClick(cat.title)}>
              <Card className={`h-full transition-all duration-300 hover:shadow-md ${
                selectedCategory === cat.title ? "ring-2 ring-green-500 shadow-md" : ""
              }`}>
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="w-12 h-12 flex items-center justify-center bg-green-100 rounded-full mb-4 text-2xl">
                    {cat.icon}
                  </div>
                  <h3 className="font-medium text-gray-900">{cat.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{cat.subtitle}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </Slider>
      </div>
    </section>
  );
}

// Updated FavButton component with authentication popup support
function FavButton({ product }: { product: Product }) {
  const [isFav, setIsFav] = useState(false);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const favRef = ref(database, `user/${user.uid}/addfav/${product.id}`);
        try {
          const favSnap = await get(favRef);
          setIsFav(favSnap.exists());
        } catch (error) {
          console.error("Error checking favorite status:", error);
        }
      } else {
        setIsFav(false);
      }
      setIsLoading(false);
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
      setShowAuthPopup(true);
      return;
    }
    
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={toggleFav}
        disabled={isLoading}
        className={`absolute top-2 right-2 p-2 rounded-full shadow-sm transition-all duration-300 ${
          isLoading ? "opacity-50" : "opacity-100"
        } ${
          isFav ? "bg-red-500 hover:bg-red-600" : "bg-white/90 hover:bg-white"
        }`}
        aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart
          className={`w-4 h-4 ${isFav ? "text-white fill-current" : "text-gray-600"}`}
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

// Product Card Component – updated to fetch and display actual review data
function ProductCard({ product }: { product: Product }) {
  const [reviewData, setReviewData] = useState({ count: 0, average: 0 });

  useEffect(() => {
    const reviewsRef = ref(database, `products/${product.id}/reviews`);
    const unsubscribe = onValue(reviewsRef, (snapshot) => {
      const reviews = snapshot.val();
      if (reviews) {
        const reviewsArray = Object.values(reviews) as { rating: number }[];
        const count = reviewsArray.length;
        const sum = reviewsArray.reduce((acc, review) => acc + review.rating, 0);
        const average = count ? sum / count : 0;
        setReviewData({ count, average });
      } else {
        setReviewData({ count: 0, average: 0 });
      }
    });
    return () => unsubscribe();
  }, [product.id]);

  return (
    <Link
      href={`/product/${product.id}`}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 group relative flex flex-col h-full"
    >
      <div className="relative aspect-square rounded-t-lg overflow-hidden">
        <Image
          src={
            product.productPhotoUrls
              ? product.productPhotoUrls[0]
              : product.productPhotoUrl || "/placeholder.svg"
          }
          alt={product.productName}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {product.originalPrice && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            {Math.round(
              ((product.originalPrice - product.discountPrice) /
                product.originalPrice) *
                100
            )}
            % OFF
          </div>
        )}
        {product.stockStatus === "low-stock" && (
          <div className="absolute bottom-2 left-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
            Low Stock
          </div>
        )}
        {product.stockStatus === "out-of-stock" && (
          <div className="absolute bottom-2 left-2 bg-gray-700 text-white text-xs px-2 py-1 rounded-full">
            Out of Stock
          </div>
        )}
        <FavButton product={product} />
      </div>

      <div className="p-4 flex-grow flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <Image
            src={product.company.logo || "/placeholder.svg"}
            alt={product.company.name}
            width={16}
            height={16}
            className="rounded-full"
          />
          <span className="text-xs text-gray-600 truncate">
            {product.company.name}
          </span>
        </div>

        <h3 className="font-medium text-gray-900 mb-1 text-sm sm:text-base line-clamp-2 flex-grow">
          {product.productName}
        </h3>

        {/* Display actual aggregated review stars and review count */}
        <div className="flex items-center gap-1 mb-2">
          <div className="flex text-yellow-400">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${i < Math.round(reviewData.average) ? "fill-current" : "text-gray-300"}`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">({reviewData.count})</span>
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

        <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
          {product.isOrganic !== false && (
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-green-600" />
              <span>Certified Organic</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// Product Skeleton for loading state
function ProductSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm h-full">
      <Skeleton className="aspect-square rounded-t-lg w-full" />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-full mb-1" />
        <Skeleton className="h-5 w-3/4 mb-4" />
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-6 w-16 mb-3" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

// Main Home Component
export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "deals" | "bestsellers">("all");

  // Toggle filter: clicking the same category clears the selection
  const handleCategoryClick = useCallback((cat: string) => {
    setSelectedCategory((prevCat) => (prevCat === cat ? null : cat));
  }, []);

  // Filter products based on the selected category and active filter
  const getFilteredProducts = useCallback(() => {
    let filtered = [...products];
    
    if (selectedCategory) {
      filtered = filtered.filter((product) => product.category === selectedCategory);
    }
    
    if (activeFilter === "deals") {
      filtered = filtered.filter((product) => product.originalPrice && product.discountPrice);
    } else if (activeFilter === "bestsellers") {
      filtered = filtered.filter((product) => product.isBestSeller);
    }
    
    return filtered;
  }, [products, selectedCategory, activeFilter]);

  useEffect(() => {
    setIsLoading(true);
    const companiesRef = ref(database, "companies");
    
    const unsubscribe = onValue(companiesRef, (snapshot) => {
      const data = snapshot.val();
      let loadedProducts: Product[] = [];
      
      if (data) {
        for (const companyId in data) {
          const company = data[companyId];
          if (company.products) {
            for (const productId in company.products) {
              const product = company.products[productId];
              
              // For demo, remove dummy random ratings so that ProductCard fetches actual review data.
              loadedProducts.push({
                id: productId,
                ...product,
                company: {
                  name: company.companyName,
                  logo: company.companyPhotoUrl,
                },
                isFeatured: product.isFeatured ?? false,
                isBestSeller: product.isBestSeller ?? false,
                stockStatus: product.stockStatus ?? "in-stock",
                isOrganic: product.isOrganic ?? true,
              });
            }
          }
        }
      }
      
      setProducts(loadedProducts);
      setIsLoading(false);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Announcement Bar */}
      <div className="bg-green-600 text-center py-2 text-xs sm:text-sm text-white px-4">
        <span className="hidden sm:inline">
          🌱 Free shipping on orders over ₹1000 |{" "}
        </span>
        Shop now and get 10% off your first order with code: <span className="font-bold">ORGANIC10</span>
      </div>

      {/* Header Component */}
      <Header />

      {/* Category Carousel */}
      <CategoryCarousel
        selectedCategory={selectedCategory}
        onCategoryClick={handleCategoryClick}
      />

      {/* Products Section */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Explore Our Products
              </h2>
              <p className="text-gray-600">
                Fresh organic products at the best prices
              </p>
            </div>
            
            <div className="flex items-center gap-2 bg-white p-1 rounded-lg shadow-sm">
              <Button 
                variant={activeFilter === "all" ? "default" : "ghost"} 
                size="sm"
                onClick={() => setActiveFilter("all")}
                className={activeFilter === "all" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                All Products
              </Button>
              <Button 
                variant={activeFilter === "deals" ? "default" : "ghost"} 
                size="sm"
                onClick={() => setActiveFilter("deals")}
                className={activeFilter === "deals" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                Today's Deals
              </Button>
              <Button 
                variant={activeFilter === "bestsellers" ? "default" : "ghost"} 
                size="sm"
                onClick={() => setActiveFilter("bestsellers")}
                className={activeFilter === "bestsellers" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                Best Sellers
              </Button>
            </div>
          </div>

          {selectedCategory && (
            <div className="mb-6 flex items-center">
              <Badge variant="outline" className="bg-green-50 text-green-800 px-3 py-1">
                {selectedCategory}
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-500 ml-2 h-7 w-7 p-0" 
                onClick={() => setSelectedCategory(null)}
              >
                ✕
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {isLoading ? (
              Array(8).fill(0).map((_, index) => (
                <ProductSkeleton key={index} />
              ))
            ) : getFilteredProducts().length > 0 ? (
              getFilteredProducts().map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-full py-12 text-center">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Filter className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No products found</h3>
                <p className="text-gray-500 mb-4">Try changing your filter criteria</p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedCategory(null);
                    setActiveFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
          
          {getFilteredProducts().length > 0 && (
            <div className="mt-10 text-center">
              <Button variant="outline" size="lg" className="border-green-600 text-green-600 hover:bg-green-50">
                Load More Products
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 bg-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">What Our Customers Say</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover why thousands of customers trust us for their organic needs
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-white">
                <CardContent className="p-6">
                  <div className="flex text-yellow-400 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6">
                    "I've been using organic products for years, but the quality and freshness from this store is unmatched. 
                    The delivery is always on time and the packaging is eco-friendly too!"
                  </p>
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-medium mr-3">
                      {String.fromCharCode(65 + i)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Happy Customer {i}</h4>
                      <p className="text-sm text-gray-500">Loyal Customer</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="text-white">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">Join Our Newsletter</h2>
                <p className="mb-6 opacity-90">
                  Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="email" 
                    placeholder="Your email address" 
                    className="px-4 py-3 rounded-lg text-gray-900 w-full sm:w-auto flex-grow"
                  />
                  <Button className="bg-white text-green-600 hover:bg-gray-50">
                    Subscribe
                  </Button>
                </div>
                <p className="mt-4 text-sm opacity-80">
                  We respect your privacy. Unsubscribe at any time.
                </p>
              </div>
              <div className="hidden md:block">
                <Image 
                  src="/placeholder.svg?height=300&width=400" 
                  alt="Newsletter" 
                  width={400} 
                  height={300} 
                  className="rounded-lg object-cover mx-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </main>
  );
}
