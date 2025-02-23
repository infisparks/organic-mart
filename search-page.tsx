"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { ref, onValue, get, set, remove } from "firebase/database"
import { database, auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Heart, ShieldCheck, Store, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

// Define a Category type (if your products include categories)
interface Category {
  main: string
}

// Define a Product interface that describes your product objects
interface Product {
  id: string
  productName: string
  productPhotoUrls?: string[]
  productPhotoUrl?: string
  originalPrice?: number
  discountPrice?: number
  categories?: Category[]
  company: {
    name: string
    logo: string
  }
}

const mainCategories = [
  "Organic Groceries & Superfoods",
  "Herbal & Natural Personal Care",
  "Health & Wellness Products",
  "Sustainable Home & Eco-Friendly Living",
  "Sustainable Fashion & Accessories",
  "Organic Baby & Kids Care",
  "Organic Pet Care",
  "Special Dietary & Lifestyle Products",
]

function FavButton({ product }: { product: Product }) {
  const [isFav, setIsFav] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const favRef = ref(database, `user/${user.uid}/addfav/${product.id}`)
        const favSnap = await get(favRef)
        setIsFav(favSnap.exists())
      } else {
        setIsFav(false)
      }
    })
    return () => unsubscribeAuth()
  }, [product.id])

  const toggleFav = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    e.preventDefault()

    const currentUser = auth.currentUser
    if (!currentUser) return

    setIsLoading(true)
    try {
      const favRef = ref(database, `user/${currentUser.uid}/addfav/${product.id}`)
      const favSnap = await get(favRef)

      if (favSnap.exists()) {
        await remove(favRef)
        setIsFav(false)
      } else {
        await set(favRef, {
          productId: product.id,
          productName: product.productName,
          price: product.discountPrice ?? product.originalPrice,
          addedAt: Date.now(),
        })
        setIsFav(true)
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={toggleFav}
      disabled={isLoading}
      className={cn(
        "absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 hover:bg-white",
        isFav && "bg-red-500 hover:bg-red-600",
      )}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart className={cn("h-4 w-4", isFav ? "text-white" : "text-gray-600")} />
      )}
      <span className="sr-only">
        {isFav ? "Remove from favorites" : "Add to favorites"}
      </span>
    </Button>
  )
}

export default function SearchPage() {
  // Annotate the state as an array of Product
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const companiesRef = ref(database, "companies")
    const unsubscribe = onValue(companiesRef, (snapshot) => {
      const data = snapshot.val()
      const loadedProducts: Product[] = []

      for (const companyId in data) {
        const company = data[companyId]
        if (company.products) {
          for (const productId in company.products) {
            const product = company.products[productId]
            loadedProducts.push({
              id: productId,
              ...product,
              company: {
                name: company.companyName,
                logo: company.companyPhotoUrl,
              },
            })
          }
        }
      }

      setProducts(loadedProducts)
      setFilteredProducts(loadedProducts)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const filtered = products.filter((product) => {
      const matchesName = product.productName
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory
        ? product.categories?.some((cat) => cat.main === selectedCategory)
        : true
      return matchesName && matchesCategory
    })
    setFilteredProducts(filtered)
  }, [searchTerm, selectedCategory, products])

  return (
    <main className="min-h-screen bg-gray-50/50">
      <div className="relative isolate">
        <div className="absolute inset-x-0 top-0 -z-10 h-96 bg-gradient-to-b from-gray-100" />

        {/* Search Section */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                Find Your Perfect Product
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Search through our curated collection of organic and sustainable products
              </p>
            </div>

            <div className="mx-auto mt-12 max-w-2xl">
              <div className="flex flex-col gap-4 sm:flex-row">
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="sm:flex-1"
                />
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-[280px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {mainCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="mt-2 text-lg font-semibold text-gray-900">No products found</h3>
                <p className="mt-1 text-gray-500">
                  Try adjusting your search or filter to find what you're looking for.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <Link key={product.id} href={`/product/${product.id}`}>
                    <Card className="group h-full overflow-hidden transition-all hover:shadow-lg">
                      <CardHeader className="p-0">
                        <div className="relative aspect-square">
                          <Image
                            src={
                              product.productPhotoUrls?.[0] ||
                              product.productPhotoUrl ||
                              ""
                            }
                            alt={product.productName}
                            fill
                            className="object-cover transition duration-300 group-hover:scale-105"
                          />
                          {product.originalPrice !== undefined &&
                            product.discountPrice !== undefined && (
                              <Badge variant="destructive" className="absolute left-2 top-2">
                                {Math.round(
                                  ((product.originalPrice - product.discountPrice) /
                                    product.originalPrice) *
                                    100,
                                )}
                                % OFF
                              </Badge>
                            )}
                          <FavButton product={product} />
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Store className="h-4 w-4" />
                          <span>{product.company.name}</span>
                        </div>
                        <h3 className="mt-2 line-clamp-2 text-lg font-semibold">
                          {product.productName}
                        </h3>
                      </CardContent>
                      <CardFooter className="flex items-center justify-between p-4 pt-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-bold text-green-600">
                            ₹{product.discountPrice ?? product.originalPrice}
                          </span>
                          {product.originalPrice !== undefined && (
                            <span className="text-sm text-gray-400 line-through">
                              ₹{product.originalPrice}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <ShieldCheck className="h-4 w-4 text-green-600" />
                          <span className="sr-only">Certified Organic</span>
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
