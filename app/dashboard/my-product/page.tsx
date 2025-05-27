"use client"

import { useState, useEffect } from "react"
import { auth, database } from "../../../lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { ref as dbRef, onValue, remove, update } from "firebase/database"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Search, Package, Edit, Trash2, MoreVertical, Plus, AlertTriangle, Eye, ShoppingCart, Loader2, PackageX, Filter, TrendingUp, Archive, CheckCircle2, XCircle, BarChart3 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface Product {
  id: string
  productName: string
  productDescription: string
  originalPrice: number
  discountPrice: number
  stockQuantity: number
  productPhotoUrls: string[]
  nutrients?: Array<{ name: string; value: string }>
  categories?: Array<{ main: string; sub: string }>
  outOfStock?: boolean
  createdAt: number
  dimensions?: {
    weight: number
    weightUnit: string
    length: number
    width: number
    height: number
    dimensionUnit: string
  }
}

export default function MyProduct() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const [updatingStock, setUpdatingStock] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const uid = user.uid
        const productsRef = dbRef(database, `companies/${uid}/products`)

        const unsubscribeProducts = onValue(productsRef, (snapshot) => {
          const data = snapshot.val()
          if (data) {
            const productsArray = Object.entries(data as Record<string, any>).map(([id, product]) => ({
              id,
              ...(product as Record<string, any>),
              productName: product.productName,
              productDescription: product.productDescription,
              originalPrice: product.originalPrice,
              discountPrice: product.discountPrice,
              stockQuantity: product.stockQuantity,
              productPhotoUrls: product.productPhotoUrls,
              nutrients: product.nutrients,
              categories: product.categories,
              outOfStock: product.outOfStock,
              createdAt: product.createdAt,
              dimensions: product.dimensions,
            }))
            setProducts(productsArray)
          } else {
            setProducts([])
          }
          setLoading(false)
        })

        return () => {
          unsubscribeProducts()
        }
      } else {
        router.push("/login")
        setLoading(false)
      }
    })

    return () => {
      unsubscribeAuth()
    }
  }, [router])

  const handleDeleteClick = (productId: string) => {
    setProductToDelete(productId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!productToDelete || !auth.currentUser) return

    const uid = auth.currentUser.uid
    try {
      await remove(dbRef(database, `companies/${uid}/products/${productToDelete}`))
      toast({
        title: "Product deleted",
        description: "Product has been successfully removed from your inventory",
        variant: "default",
      })
      setDeleteDialogOpen(false)
      setProductToDelete(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      })
    }
  }

  const handleStockToggle = async (productId: string, currentStatus: boolean) => {
    if (!auth.currentUser) return

    setUpdatingStock(productId)
    const uid = auth.currentUser.uid

    try {
      await update(dbRef(database, `companies/${uid}/products/${productId}`), {
        outOfStock: !currentStatus,
      })

      toast({
        title: "Stock status updated",
        description: `Product marked as ${!currentStatus ? "out of stock" : "in stock"}`,
        variant: "default",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update stock status",
        variant: "destructive",
      })
    } finally {
      setUpdatingStock(null)
    }
  }

  const getFilteredProducts = (filter: string) => {
    return products.filter((product) => {
      const matchesSearch =
        product.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.productDescription?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesFilter =
        filter === "all" ||
        (filter === "inStock" && !product.outOfStock) ||
        (filter === "outOfStock" && product.outOfStock)

      return matchesSearch && matchesFilter
    })
  }

  const getDiscountPercentage = (original: number, discount: number) => {
    return Math.round((1 - discount / original) * 100)
  }

  const getThumbnailImage = (product: Product) => {
    if (product.productPhotoUrls && product.productPhotoUrls.length > 0) {
      return product.productPhotoUrls[0]
    }
    return "/placeholder.svg?height=300&width=300"
  }

  const getStockStats = () => {
    const total = products.length
    const inStock = products.filter((p) => !p.outOfStock).length
    const outOfStock = products.filter((p) => p.outOfStock).length
    return { total, inStock, outOfStock }
  }

  const stats = getStockStats()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-lg text-gray-600">Loading your products...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const ProductCard = ({ product }: { product: Product }) => (
    <Card className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white">
      <div className="relative">
        <div className="aspect-square overflow-hidden bg-gray-50">
          <img
            src={getThumbnailImage(product) || "/placeholder.svg"}
            alt={product.productName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          {product.outOfStock ? (
            <Badge className="bg-red-500 hover:bg-red-600 text-white border-0 shadow-sm">
              <XCircle className="h-3 w-3 mr-1" />
              Out of Stock
            </Badge>
          ) : (
            <Badge className="bg-green-500 hover:bg-green-600 text-white border-0 shadow-sm">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              In Stock
            </Badge>
          )}
        </div>

        {/* Discount Badge */}
        {product.originalPrice > product.discountPrice && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-sm font-semibold">
              {getDiscountPercentage(product.originalPrice, product.discountPrice)}% OFF
            </Badge>
          </div>
        )}

        {/* Quick Actions */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="flex gap-2">
            <Link href={`/dashboard/edit-product/${product.id}`}>
              <Button size="sm" className="h-8 w-8 p-0 bg-white/90 hover:bg-white text-gray-700 border-0 shadow-md">
                <Edit className="h-3 w-3" />
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-8 w-8 p-0 bg-white/90 hover:bg-white text-gray-700 border-0 shadow-md">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href={`/product/${product.id}`} className="flex items-center">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                <Separator />
                <DropdownMenuItem
                  onClick={() => handleDeleteClick(product.id)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Product
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <CardContent className="p-5">
        <div className="space-y-4">
          {/* Product Info */}
          <div>
            <h3 className="font-semibold text-lg text-gray-900 leading-tight mb-2 line-clamp-1">
              {product.productName}
            </h3>
            <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">{product.productDescription}</p>
          </div>

          {/* Pricing */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">₹{product.discountPrice.toLocaleString()}</span>
            {product.originalPrice > product.discountPrice && (
              <span className="text-lg text-gray-500 line-through">₹{product.originalPrice.toLocaleString()}</span>
            )}
          </div>

          {/* Stock Info */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <ShoppingCart className="h-4 w-4" />
              <span>Stock: {product.stockQuantity} units</span>
            </div>
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                product.stockQuantity > 10
                  ? "bg-green-100 text-green-700"
                  : product.stockQuantity > 0
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700",
              )}
            >
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  product.stockQuantity > 10
                    ? "bg-green-500"
                    : product.stockQuantity > 0
                      ? "bg-yellow-500"
                      : "bg-red-500",
                )}
              />
              {product.stockQuantity > 10 ? "High" : product.stockQuantity > 0 ? "Low" : "Empty"}
            </div>
          </div>

          {/* Categories */}
          {product.categories && product.categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.categories.slice(0, 2).map((category, idx) => (
                <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  {category.sub}
                </Badge>
              ))}
              {product.categories.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{product.categories.length - 2}
                </Badge>
              )}
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id={`stock-${product.id}`}
                checked={!product.outOfStock}
                onCheckedChange={() => handleStockToggle(product.id, product.outOfStock || false)}
                disabled={updatingStock === product.id}
                className="data-[state=checked]:bg-green-500"
              />
              <Label htmlFor={`stock-${product.id}`} className="text-sm font-medium cursor-pointer">
                {product.outOfStock ? "Out of Stock" : "Available"}
              </Label>
              {updatingStock === product.id && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
            </div>

            <Link href={`/dashboard/edit-product/${product.id}`}>
              <Button size="sm" variant="outline" className="h-8 border-gray-200 hover:border-blue-300">
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-xl text-gray-900">Product Manager</span>
              </div>

              <div className="hidden md:flex space-x-1">
                <Link
                  href="/dashboard"
                  className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-all duration-200"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/add-product"
                  className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-all duration-200"
                >
                  Add Product
                </Link>
                <Link
                  href="/dashboard/my-product"
                  className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg font-medium"
                >
                  My Products
                </Link>
                <Link
                  href="/dashboard/my-order"
                  className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-all duration-200"
                >
                  Orders
                </Link>
              </div>
            </div>

            <Link href="/dashboard/add-product">
              <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Product Inventory</h1>
              <p className="text-gray-600">Manage and organize your product catalog</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Products</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">In Stock</p>
                    <p className="text-2xl font-bold text-green-600">{stats.inStock}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                    <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
                  </div>
                  <div className="p-2 bg-red-100 rounded-lg">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6 border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search products by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs for filtering */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-xl">
            <TabsTrigger
              value="all"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
            >
              <Package className="h-4 w-4 mr-2" />
              All Products ({stats.total})
            </TabsTrigger>
            <TabsTrigger
              value="inStock"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              In Stock ({stats.inStock})
            </TabsTrigger>
            <TabsTrigger
              value="outOfStock"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Out of Stock ({stats.outOfStock})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {getFilteredProducts("all").length === 0 ? (
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-12 text-center">
                  <div className="flex flex-col items-center">
                    <div className="p-4 bg-gray-100 rounded-full mb-4">
                      <Package className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
                    <p className="text-gray-600 mb-6">
                      {searchTerm ? "Try adjusting your search terms" : "Start by adding your first product"}
                    </p>
                    <Link href="/dashboard/add-product">
                      <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Product
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {getFilteredProducts("all").map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="inStock" className="space-y-6">
            {getFilteredProducts("inStock").length === 0 ? (
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-12 text-center">
                  <div className="flex flex-col items-center">
                    <div className="p-4 bg-green-100 rounded-full mb-4">
                      <CheckCircle2 className="h-12 w-12 text-green-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No products in stock</h3>
                    <p className="text-gray-600 mb-6">All your products are currently out of stock</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {getFilteredProducts("inStock").map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="outOfStock" className="space-y-6">
            {getFilteredProducts("outOfStock").length === 0 ? (
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-12 text-center">
                  <div className="flex flex-col items-center">
                    <div className="p-4 bg-red-100 rounded-full mb-4">
                      <XCircle className="h-12 w-12 text-red-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No out of stock products</h3>
                    <p className="text-gray-600 mb-6">Great! All your products are currently available</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {getFilteredProducts("outOfStock").map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <DialogTitle className="text-lg">Delete Product</DialogTitle>
                  <DialogDescription className="text-gray-600">
                    This action cannot be undone. The product will be permanently removed from your inventory.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} className="flex-1">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
