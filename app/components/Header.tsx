"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingCart, Heart, Search, Leaf, Menu, X } from "lucide-react";
import { auth, database } from "../../lib/firebase";
import { ref, onValue } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [productCount, setProductCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let unsubscribeCart: (() => void) | undefined;
    let unsubscribeFav: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Subscribe to cart items.
        const cartRef = ref(database, `user/${user.uid}/addtocart`);
        unsubscribeCart = onValue(cartRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            // Count distinct products.
            const count = Object.keys(data).length;
            setProductCount(count);
          } else {
            setProductCount(0);
          }
        });
        // Subscribe to favorites.
        const favRef = ref(database, `user/${user.uid}/addfav`);
        unsubscribeFav = onValue(favRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const count = Object.keys(data).length;
            setFavCount(count);
          } else {
            setFavCount(0);
          }
        });
      } else {
        setProductCount(0);
        setFavCount(0);
      }
    });
    return () => {
      if (unsubscribeCart) unsubscribeCart();
      if (unsubscribeFav) unsubscribeFav();
      unsubscribeAuth();
    };
  }, []);

  // Handler to navigate to the search page.
  const handleSearchClick = () => {
    router.push("/search");
  };

  return (
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
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
          <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
            EcoHarvest
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
          <Link href="/" className="text-gray-700 hover:text-green-600 font-medium transition-colors">
            Home
          </Link>
          <Link href="/search" className="text-gray-700 hover:text-green-600 font-medium transition-colors">
            Shop
          </Link>
          <Link href="/orders" className="text-gray-700 hover:text-green-600 font-medium transition-colors">
            Order
          </Link>
          <Link href="profile" className="text-gray-700 hover:text-green-600 font-medium transition-colors">
            Profile
          </Link>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Desktop Search Container (clickable) */}
          <div 
            className="hidden sm:block relative group cursor-pointer"
            onClick={handleSearchClick}
          >
            <div className="pl-10 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none w-[140px] sm:w-[180px] lg:w-[220px] group-hover:w-[260px] transition-all duration-300">
              Search products...
            </div>
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>
          {/* Mobile Search Button */}
          <Link href="/search" className="sm:hidden p-2 hover:bg-gray-100 rounded-lg">
            <Search className="w-6 h-6 text-gray-600" />
          </Link>
          {/* Favorites Icon - wrapped in a Link to /addfav */}
          <Link href="/addfav" className="relative">
            <Heart className="w-6 h-6 text-gray-600 cursor-pointer hover:text-green-600 transition-colors hover:scale-110 transform duration-300" />
            {favCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-pink-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
                {favCount}
              </span>
            )}
          </Link>
          <Link href="/cart" className="relative">
            <ShoppingCart className="w-6 h-6 text-gray-600 cursor-pointer hover:text-green-600 transition-colors hover:scale-110 transform duration-300" />
            {productCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
                {productCount}
              </span>
            )}
          </Link>
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
  );
}
