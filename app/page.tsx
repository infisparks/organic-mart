"use client";

import { ShoppingCart, Heart, Search, Leaf, ArrowRight, Star, TrendingUp, ShieldCheck, Menu, ChevronDown, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import Footer from "./components/Footer";

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <main className="min-h-screen">
      {/* Announcement Bar */}
      <div className="bg-green-50 text-center py-2 text-xs sm:text-sm text-green-800 animate-fade-in-down px-4">
        <span className="hidden sm:inline">🌱 Free shipping on orders over ₹1000 | </span>
        Shop now and get 10% off your first order
      </div>

      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <Leaf className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 group-hover:rotate-12 transition-transform duration-300" />
              <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">EcoHarvest</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
              <Link href="/" className="text-gray-700 hover:text-green-600 font-medium transition-colors">Home</Link>
              <Link href="#" className="text-gray-700 hover:text-green-600 font-medium transition-colors">Shop</Link>
              <Link href="#" className="text-gray-700 hover:text-green-600 font-medium transition-colors">About</Link>
              <Link href="#" className="text-gray-700 hover:text-green-600 font-medium transition-colors">Contact</Link>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3 sm:gap-6">
              <div className="hidden sm:block relative group">
                <input
                  type="text"
                  placeholder="Search products..."
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent w-[140px] sm:w-[180px] lg:w-[220px] group-hover:w-[260px] transition-all duration-300"
                />
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
              <button className="sm:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Search className="w-6 h-6 text-gray-600" />
              </button>
              <Heart className="w-6 h-6 text-gray-600 cursor-pointer hover:text-green-600 transition-colors hover:scale-110 transform duration-300" />
              <Link href="/cart" className="relative">
                <ShoppingCart className="w-6 h-6 text-gray-600 cursor-pointer hover:text-green-600 transition-colors hover:scale-110 transform duration-300" />
                <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-bounce">3</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
            <div className="fixed inset-y-0 left-0 w-[80%] max-w-sm bg-white shadow-xl">
              <div className="p-4 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Leaf className="h-6 w-6 text-green-600" />
                  <span className="text-xl font-bold text-gray-900">EcoHarvest</span>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
              <div className="py-4">
                <div className="border-t mt-4 pt-4">
                  <Link href="/" className="block px-4 py-3 text-gray-700 hover:bg-gray-50">Home</Link>
                  <Link href="#" className="block px-4 py-3 text-gray-700 hover:bg-gray-50">Shop</Link>
                  <Link href="#" className="block px-4 py-3 text-gray-700 hover:bg-gray-50">About</Link>
                  <Link href="#" className="block px-4 py-3 text-gray-700 hover:bg-gray-50">Contact</Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Featured Banner */}
      <section className="relative bg-gradient-to-r from-amber-50 to-rose-50">
        <div className="max-w-[1500px] mx-auto">
          <div className="relative aspect-[2/1] sm:aspect-[3/1] lg:aspect-[4/1]">
            <Image
              src="https://images.unsplash.com/photo-1615485290382-441e4d049cb5?ixlib=rb-4.0.3"
              alt="Organic Products Banner"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute inset-0 flex items-center">
              <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-lg">
                  <div className="bg-white/95 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-2xl">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">
                      Summer Special Offer
                      <span className="block text-green-600 mt-2">Up to 40% Off</span>
                    </h1>
                    <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
                      Fresh organic fruits and vegetables delivered to your doorstep.
                    </p>
                    <button className="bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full font-medium
                      hover:bg-green-700 transition-all duration-300 flex items-center gap-2 group text-sm sm:text-base">
                      Shop Now
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Today's Deals */}
      <section className="py-6 sm:py-8 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Today's Deals</h2>
              <p className="text-sm sm:text-base text-gray-600">Get fresh organic products at best prices</p>
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
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 group"
              >
                <div className="relative aspect-square rounded-t-lg overflow-hidden">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {product.oldPrice && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs sm:text-sm px-2 py-1 rounded-full">
                      {Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}% OFF
                    </div>
                  )}
                  <button 
                    className="absolute top-2 right-2 p-1.5 sm:p-2 bg-white/90 backdrop-blur-sm rounded-full 
                      shadow-sm hover:bg-white transition-colors"
                  >
                    <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                  </button>
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
                    <span className="text-xs text-gray-600 truncate">{product.company.name}</span>
                  </div>
                  
                  <h3 className="font-medium text-gray-900 mb-1 text-sm sm:text-base line-clamp-2">{product.name}</h3>
                  
                  <div className="flex items-center gap-1 mb-2">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-current" />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">(120)</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-base sm:text-lg font-bold text-gray-900">₹{product.price}</span>
                    {product.oldPrice && (
                      <span className="text-xs sm:text-sm text-gray-400 line-through">₹{product.oldPrice}</span>
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
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Best Sellers</h2>
              <p className="text-sm sm:text-base text-gray-600">Most popular choices by our customers</p>
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
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 group"
              >
                <div className="relative aspect-square rounded-t-lg overflow-hidden">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {product.oldPrice && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs sm:text-sm px-2 py-1 rounded-full">
                      {Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}% OFF
                    </div>
                  )}
                  <button 
                    className="absolute top-2 right-2 p-1.5 sm:p-2 bg-white/90 backdrop-blur-sm rounded-full 
                      shadow-sm hover:bg-white transition-colors"
                  >
                    <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                  </button>
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
                    <span className="text-xs text-gray-600 truncate">{product.company.name}</span>
                  </div>
                  
                  <h3 className="font-medium text-gray-900 mb-1 text-sm sm:text-base line-clamp-2">{product.name}</h3>
                  
                  <div className="flex items-center gap-1 mb-2">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-current" />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">(120)</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-base sm:text-lg font-bold text-gray-900">₹{product.price}</span>
                    {product.oldPrice && (
                      <span className="text-xs sm:text-sm text-gray-400 line-through">₹{product.oldPrice}</span>
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

const mainCategories = [
  {
    name: "Fresh Vegetables",
    items: 45,
    icon: <span className="text-2xl">🥬</span>
  },
  {
    name: "Fresh Fruits",
    items: 38,
    icon: <span className="text-2xl">🍎</span>
  },
  {
    name: "Dairy & Eggs",
    items: 24,
    icon: <span className="text-2xl">🥛</span>
  },
  {
    name: "Organic Honey",
    items: 12,
    icon: <span className="text-2xl">🍯</span>
  },
  {
    name: "Nuts & Seeds",
    items: 28,
    icon: <span className="text-2xl">🥜</span>
  },
  {
    name: "Organic Spices",
    items: 32,
    icon: <span className="text-2xl">🌶️</span>
  }
];

const products = [
  {
    id: "1",
    name: "Organic Avocados",
    description: "Fresh, ripe avocados from certified organic farms",
    price: 299,
    oldPrice: 399,
    image: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?ixlib=rb-4.0.3",
    company: {
      name: "Green Valley Farms",
      logo: "https://i.pravatar.cc/150?img=1"
    }
  },
  {
    id: "2",
    name: "Fresh Strawberries",
    description: "Sweet and juicy organic strawberries",
    price: 199,
    oldPrice: 249,
    image: "https://images.unsplash.com/photo-1518635017480-01eb763f1fbb?ixlib=rb-4.0.3",
    company: {
      name: "Nature's Best",
      logo: "https://i.pravatar.cc/150?img=2"
    }
  },
  {
    id: "3",
    name: "Organic Honey",
    description: "Pure, raw honey from local organic beekeepers",
    price: 499,
    image: "https://images.unsplash.com/photo-1587049352847-81a56d773cae?ixlib=rb-4.0.3",
    company: {
      name: "Himalayan Organics",
      logo: "https://i.pravatar.cc/150?img=3"
    }
  },
  {
    id: "4",
    name: "Fresh Organic Spinach",
    description: "Farm-fresh organic spinach leaves",
    price: 89,
    oldPrice: 129,
    image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?ixlib=rb-4.0.3",
    company: {
      name: "Green Valley Farms",
      logo: "https://i.pravatar.cc/150?img=1"
    }
  },
  {
    id: "5",
    name: "Organic Almonds",
    description: "Premium quality organic almonds",
    price: 699,
    oldPrice: 899,
    image: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?ixlib=rb-4.0.3",
    company: {
      name: "Nature's Best",
      logo: "https://i.pravatar.cc/150?img=2"
    }
  },
  {
    id: "6",
    name: "Fresh Blueberries",
    description: "Organic blueberries rich in antioxidants",
    price: 299,
    image: "https://images.unsplash.com/photo-1498557850523-fd3d118b962e?ixlib=rb-4.0.3",
    company: {
      name: "Himalayan Organics",
      logo: "https://i.pravatar.cc/150?img=3"
    }
  },
  {
    id: "7",
    name: "Organic Turmeric Powder",
    description: "Pure organic turmeric powder",
    price: 199,
    oldPrice: 249,
    image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?ixlib=rb-4.0.3",
    company: {
      name: "Green Valley Farms",
      logo: "https://i.pravatar.cc/150?img=1"
    }
  },
  {
    id: "8",
    name: "Fresh Organic Eggs",
    description: "Free-range organic eggs",
    price: 149,
    image: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?ixlib=rb-4.0.3",
    company: {
      name: "Nature's Best",
      logo: "https://i.pravatar.cc/150?img=2"
    }
  }
];