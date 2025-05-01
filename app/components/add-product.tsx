"use client"

import { useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { database, auth } from "../../lib/firebase"
import { ref as dbRef, push, set } from "firebase/database"
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Plus, Trash2, Upload, X, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const availableNutrients = ["Protein", "Fat", "Carbs", "Fiber"]

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
  "Organic Pet Care": ["Organic Pet Food", "Herbal Grooming & Skincare", "Natural Pet Supplements"],
  "Special Dietary & Lifestyle Products": [
    "Gluten-Free Foods",
    "Vegan & Plant-Based Alternatives",
    "Keto & Low-Carb Products",
    "Diabetic-Friendly Foods",
  ],
}

interface FormData {
  productName: string
  productDescription: string
  originalPrice: string
  discountPrice: string
  stockQuantity: string
  nutrients: Array<{ name: string; value: string }>
  categories: Array<{ main: string; sub: string }>
}

export default function AddProduct() {
  const router = useRouter()
  const { toast } = useToast()

  // Redirect to /login if user is not authenticated.
  useEffect(() => {
    if (!auth.currentUser) {
      router.push("/login")
    }
  }, [router])

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      productName: "",
      productDescription: "",
      originalPrice: "",
      discountPrice: "",
      stockQuantity: "",
      nutrients: [],
      categories: [],
    },
  })

  // Field arrays for nutrients and categories.
  const {
    fields: nutrientFields,
    append: appendNutrient,
    remove: removeNutrient,
  } = useFieldArray({ control, name: "nutrients" })

  const {
    fields: categoryFields,
    append: appendCategory,
    remove: removeCategory,
  } = useFieldArray({ control, name: "categories" })

  // Local states for nutrient and category selection.
  const [selectedNutrient, setSelectedNutrient] = useState(availableNutrients[0])
  const [nutrientValue, setNutrientValue] = useState("")

  const mainCategoryKeys = Object.keys(categoryOptions)
  const [selectedMainCategory, setSelectedMainCategory] = useState(mainCategoryKeys[0])
  const [selectedSubCategory, setSelectedSubCategory] = useState(categoryOptions[mainCategoryKeys[0]][0])

  // Local state for image uploads.
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [error, setError] = useState("")

  // Ref for file input.
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handler for adding a nutrient.
  const handleAddNutrient = () => {
    if (!nutrientValue) {
      toast({
        title: "Value required",
        description: "Please enter a value for the nutrient",
        variant: "destructive",
      })
      return
    }

    if (nutrientFields.find((n) => n.name === selectedNutrient)) {
      toast({
        title: "Nutrient already added",
        description: `${selectedNutrient} is already in the list`,
        variant: "destructive",
      })
      return
    }

    appendNutrient({ name: selectedNutrient, value: nutrientValue })
    setNutrientValue("")
    setError("")
  }

  // Handler for adding a category.
  const handleAddCategory = () => {
    if (categoryFields.find((cat) => cat.main === selectedMainCategory && cat.sub === selectedSubCategory)) {
      toast({
        title: "Category already added",
        description: `${selectedMainCategory} > ${selectedSubCategory} is already in the list`,
        variant: "destructive",
      })
      return
    }

    appendCategory({ main: selectedMainCategory, sub: selectedSubCategory })
    setError("")
  }

  // File input change handler for click selection.
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const fileArray = Array.from(files)
      if (fileArray.length > 3) {
        setError("You can upload maximum 3 images.")
        return
      }
      setSelectedImages(fileArray)
      setError("")
    }
  }

  // Handler for drag and drop.
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const files = e.dataTransfer.files
    if (files) {
      const fileArray = Array.from(files)
      if (fileArray.length > 3) {
        setError("You can upload maximum 3 images.")
        return
      }
      setSelectedImages(fileArray)
      setError("")
    }
  }

  // Prevent default behavior when dragging over.
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  // Remove image from preview.
  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index))
  }

  // Form submission handler.
  const onSubmit = async (data: FormData) => {
    // Double-check authentication (in case the user logs out mid-session).
    if (!auth.currentUser) {
      router.push("/login")
      return
    }

    if (selectedImages.length < 1) {
      setError("Please upload at least 1 image.")
      return
    }

    try {
      const storage = getStorage()
      const uid = auth.currentUser.uid

      // Upload images to Firebase Storage.
      const uploadPromises = selectedImages.map((file) => {
        const filePath = `product-photos/${crypto.randomUUID()}`
        const fileRef = storageRef(storage, filePath)
        return uploadBytes(fileRef, file).then((snapshot) => getDownloadURL(snapshot.ref))
      })
      const productPhotoUrls = await Promise.all(uploadPromises)

      // Prepare product data matching your JSON structure.
      const productData = {
        productName: data.productName,
        productDescription: data.productDescription,
        originalPrice: parseFloat(data.originalPrice),
        discountPrice: parseFloat(data.discountPrice),
        stockQuantity: parseInt(data.stockQuantity, 10),
        nutrients: data.nutrients,
        categories: data.categories,
        productPhotoUrls,
        createdAt: Date.now(),
      }

      // Push to `companies/{uid}/products`
      const productRef = dbRef(database, `companies/${uid}/products`)
      const newProductRef = push(productRef)
      await set(newProductRef, productData)

      toast({
        title: "Success!",
        description: "Product added successfully",
        variant: "default",
      })

      router.push("/dashboard/my-product")
    } catch (error: any) {
      console.error("Error adding product:", error)
      setError(error.message || "Error adding product. Please try again.")
    }
  }

  // Watch current form values for preview.
  const watchedValues = watch()

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Add New Product</CardTitle>
              <CardDescription>Fill in the details below to add a new product to your inventory</CardDescription>
            </CardHeader>

            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Basic Information</h3>

                  <div className="space-y-2">
                    <Label htmlFor="productName">Product Name</Label>
                    <Input
                      id="productName"
                      {...register("productName", { required: "Product name is required" })}
                      placeholder="Enter product name"
                      className={cn(errors.productName && "border-red-500")}
                    />
                    {errors.productName && <p className="text-red-500 text-xs mt-1">{errors.productName.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="productDescription">Product Description</Label>
                    <Textarea
                      id="productDescription"
                      {...register("productDescription", { required: "Product description is required" })}
                      placeholder="Enter product description"
                      className={cn("min-h-[120px] resize-y", errors.productDescription && "border-red-500")}
                    />
                    {errors.productDescription && (
                      <p className="text-red-500 text-xs mt-1">{errors.productDescription.message}</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Price Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Price Details</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="originalPrice">Original Price (₹)</Label>
                      <Input
                        id="originalPrice"
                        type="number"
                        step="0.01"
                        {...register("originalPrice", {
                          required: "Original price is required",
                          min: { value: 0, message: "Price cannot be negative" },
                        })}
                        placeholder="e.g. 100.00"
                        className={cn(errors.originalPrice && "border-red-500")}
                      />
                      {errors.originalPrice && (
                        <p className="text-red-500 text-xs mt-1">{errors.originalPrice.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="discountPrice">Discount Price (₹)</Label>
                      <Input
                        id="discountPrice"
                        type="number"
                        step="0.01"
                        {...register("discountPrice", {
                          required: "Discount price is required",
                          min: { value: 0, message: "Price cannot be negative" },
                        })}
                        placeholder="e.g. 90.00"
                        className={cn(errors.discountPrice && "border-red-500")}
                      />
                      {errors.discountPrice && (
                        <p className="text-red-500 text-xs mt-1">{errors.discountPrice.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Inventory Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Inventory</h3>
                  <div className="space-y-2">
                    <Label htmlFor="stockQuantity">Stock Quantity</Label>
                    <Input
                      id="stockQuantity"
                      type="number"
                      {...register("stockQuantity", {
                        required: "Stock quantity is required",
                        min: { value: 0, message: "Stock cannot be negative" },
                      })}
                      placeholder="Enter stock quantity"
                      className={cn(errors.stockQuantity && "border-red-500")}
                    />
                    {errors.stockQuantity && (
                      <p className="text-red-500 text-xs mt-1">{errors.stockQuantity.message}</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Nutrients Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Nutrients</h3>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={selectedNutrient} onValueChange={setSelectedNutrient}>
                      <SelectTrigger className="w-full sm:w-1/3">
                        <SelectValue placeholder="Select nutrient" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableNutrients.map((nutrient) => (
                          <SelectItem key={nutrient} value={nutrient}>
                            {nutrient}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      value={nutrientValue}
                      onChange={(e) => setNutrientValue(e.target.value)}
                      placeholder="Enter value (e.g., 2g)"
                      className="w-full sm:w-1/3"
                    />

                    <Button type="button" onClick={handleAddNutrient} className="w-full sm:w-auto">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Nutrient
                    </Button>
                  </div>

                  {nutrientFields.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {nutrientFields.map((nutrient, index) => (
                        <Badge
                          key={nutrient.id}
                          variant="secondary"
                          className="flex items-center gap-1 px-3 py-1.5 text-sm"
                        >
                          <span>
                            {nutrient.name}: {nutrient.value}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 ml-1 text-muted-foreground hover:text-foreground"
                            onClick={() => removeNutrient(index)}
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Categories Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Categories</h3>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select
                      value={selectedMainCategory}
                      onValueChange={(value) => {
                        setSelectedMainCategory(value)
                        setSelectedSubCategory(categoryOptions[value][0])
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-1/3">
                        <SelectValue placeholder="Main category" />
                      </SelectTrigger>
                      <SelectContent>
                        {mainCategoryKeys.map((main) => (
                          <SelectItem key={main} value={main}>
                            {main}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedSubCategory} onValueChange={setSelectedSubCategory}>
                      <SelectTrigger className="w-full sm:w-1/3">
                        <SelectValue placeholder="Sub category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions[selectedMainCategory].map((sub) => (
                          <SelectItem key={sub} value={sub}>
                            {sub}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button type="button" onClick={handleAddCategory} className="w-full sm:w-auto">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  </div>

                  {categoryFields.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {categoryFields.map((cat, index) => (
                        <Badge
                          key={cat.id}
                          variant="outline"
                          className="flex items-center gap-1 px-3 py-1.5 text-sm"
                        >
                          <span>
                            {cat.main} &gt; {cat.sub}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 ml-1 text-muted-foreground hover:text-foreground"
                            onClick={() => removeCategory(index)}
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Image Upload Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Product Images</h3>

                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed rounded-lg p-6 text-center"
                  >
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Drag and drop images here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Upload 1-3 high quality images (PNG, JPG)
                    </p>
                    {/* Hidden native file input with ref */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                      Select Images
                    </Button>
                  </div>

                  {selectedImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {selectedImages.map((file, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-md overflow-hidden border">
                            <img
                              src={URL.createObjectURL(file) || "/placeholder.svg"}
                              alt={`preview-${index}`}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveImage(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="sr-only">Remove image</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding Product...
                    </>
                  ) : (
                    "Add Product"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Product Preview Section */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Product Preview</CardTitle>
              <CardDescription>See how your product will appear</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {selectedImages.length > 0 && (
                <div className="aspect-square rounded-md overflow-hidden border mb-4">
                  <img
                    src={URL.createObjectURL(selectedImages[0]) || "/placeholder.svg"}
                    alt="Product preview"
                    className="object-cover w-full h-full"
                  />
                </div>
              )}

              <div>
                <h3 className="font-semibold text-lg">{watchedValues.productName || "Product Name"}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-lg font-bold">
                    {watchedValues.discountPrice ? `₹${watchedValues.discountPrice}` : "₹0.00"}
                  </span>
                  {watchedValues.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through">₹{watchedValues.originalPrice}</span>
                  )}
                  {watchedValues.originalPrice && watchedValues.discountPrice && (
                    <Badge variant="secondary" className="ml-auto">
                      {Math.round(
                        (1 -
                          Number.parseFloat(watchedValues.discountPrice) /
                            Number.parseFloat(watchedValues.originalPrice)) *
                          100,
                      )}
                      % OFF
                    </Badge>
                  )}
                </div>
                {/* Display Stock Quantity */}
                <div className="mt-1">
                  <p className="text-sm text-gray-600">
                    Stock: {watchedValues.stockQuantity || "0"} unit(s)
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium text-sm mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">
                  {watchedValues.productDescription || "No description provided"}
                </p>
              </div>

              {watchedValues.nutrients && watchedValues.nutrients.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-sm mb-2">Nutritional Information</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {watchedValues.nutrients.map((nutrient, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{nutrient.name}</span>
                          <span className="font-medium">{nutrient.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {watchedValues.categories && watchedValues.categories.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-sm mb-2">Categories</h4>
                    <div className="flex flex-wrap gap-1">
                      {watchedValues.categories.map((cat, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {cat.sub}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
