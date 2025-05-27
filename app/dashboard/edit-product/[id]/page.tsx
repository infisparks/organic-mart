"use client"

import type React from "react"
import { useRef, useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { database, auth } from "../../../../lib/firebase"
import { ref as dbRef, get, update } from "firebase/database"
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  AlertCircle,
  Plus,
  Upload,
  X,
  Loader2,
  Package,
  DollarSign,
  Ruler,
  Tag,
  Camera,
  Eye,
  CheckCircle2,
  ArrowLeft,
  Save,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { onAuthStateChanged } from "firebase/auth"

const availableNutrients = ["Protein", "Fat", "Carbs", "Fiber", "Calcium", "Iron", "Vitamin C", "Vitamin D"]

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
  weight: string
  weightUnit: string
  length: string
  width: string
  height: string
  dimensionUnit: string
  nutrients: Array<{ name: string; value: string }>
  categories: Array<{ main: string; sub: string }>
}

interface Product {
  id: string
  productName?: string
  productDescription?: string
  originalPrice?: number
  discountPrice?: number
  stockQuantity?: number
  productPhotoUrls?: string[]
  nutrients?: Array<{ name: string; value: string }>
  categories?: Array<{ main: string; sub: string }>
  dimensions?: {
    weight?: number
    weightUnit?: string
    length?: number
    width?: number
    height?: number
    dimensionUnit?: string
  }
  createdAt?: number
}

const formSteps = [
  { id: "basic", title: "Basic Info", icon: Package },
  { id: "pricing", title: "Pricing", icon: DollarSign },
  { id: "dimensions", title: "Dimensions", icon: Ruler },
  { id: "details", title: "Details", icon: Tag },
  { id: "images", title: "Images", icon: Camera },
]

export default function EditProduct() {
  const router = useRouter()
  const params = useParams()
  const productId = params?.id as string
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [product, setProduct] = useState<Product | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    trigger,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      productName: "",
      productDescription: "",
      originalPrice: "",
      discountPrice: "",
      stockQuantity: "",
      weight: "",
      weightUnit: "kg",
      length: "",
      width: "",
      height: "",
      dimensionUnit: "cm",
      nutrients: [],
      categories: [],
    },
  })

  // Field arrays for nutrients and categories.
  const {
    fields: nutrientFields,
    append: appendNutrient,
    remove: removeNutrient,
    replace: replaceNutrients,
  } = useFieldArray({ control, name: "nutrients" })

  const {
    fields: categoryFields,
    append: appendCategory,
    remove: removeCategory,
    replace: replaceCategories,
  } = useFieldArray({ control, name: "categories" })

  // Local states for nutrient and category selection.
  const [selectedNutrient, setSelectedNutrient] = useState(availableNutrients[0])
  const [nutrientValue, setNutrientValue] = useState("")

  const mainCategoryKeys = Object.keys(categoryOptions)
  const [selectedMainCategory, setSelectedMainCategory] = useState(mainCategoryKeys[0])
  const [selectedSubCategory, setSelectedSubCategory] = useState(categoryOptions[mainCategoryKeys[0]][0])

  // Local state for image uploads.
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([])
  const [error, setError] = useState("")
  const [isDragOver, setIsDragOver] = useState(false)

  // Ref for file input.
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Watch current form values for preview.
  const watchedValues = watch()

  // Calculate progress
  const progress = ((currentStep + 1) / formSteps.length) * 100

  // Load product data
  useEffect(() => {
    const loadProduct = async () => {
      // Wait for auth state to be determined
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user) {
          router.push("/login")
          return
        }

        if (!productId) {
          toast({
            title: "Invalid product ID",
            description: "No product ID provided",
            variant: "destructive",
          })
          router.push("/dashboard/my-product")
          return
        }

        try {
          const uid = user.uid
          const productRef = dbRef(database, `companies/${uid}/products/${productId}`)
          const snapshot = await get(productRef)

          if (snapshot.exists()) {
            const productData = { id: productId, ...snapshot.val() } as Product
            setProduct(productData)

            // Safely populate form with existing data, providing defaults for undefined values
            setValue("productName", productData.productName || "")
            setValue("productDescription", productData.productDescription || "")
            setValue("originalPrice", productData.originalPrice?.toString() || "0")
            setValue("discountPrice", productData.discountPrice?.toString() || "0")
            setValue("stockQuantity", productData.stockQuantity?.toString() || "0")

            // Handle dimensions with safe defaults
            if (productData.dimensions) {
              setValue("weight", productData.dimensions.weight?.toString() || "0")
              setValue("weightUnit", productData.dimensions.weightUnit || "kg")
              setValue("length", productData.dimensions.length?.toString() || "0")
              setValue("width", productData.dimensions.width?.toString() || "0")
              setValue("height", productData.dimensions.height?.toString() || "0")
              setValue("dimensionUnit", productData.dimensions.dimensionUnit || "cm")
            } else {
              // Set default dimensions if none exist
              setValue("weight", "0")
              setValue("weightUnit", "kg")
              setValue("length", "0")
              setValue("width", "0")
              setValue("height", "0")
              setValue("dimensionUnit", "cm")
            }

            // Handle nutrients and categories safely
            if (productData.nutrients && Array.isArray(productData.nutrients)) {
              replaceNutrients(productData.nutrients)
            } else {
              replaceNutrients([])
            }

            if (productData.categories && Array.isArray(productData.categories)) {
              replaceCategories(productData.categories)
            } else {
              replaceCategories([])
            }

            // Handle product images safely
            if (productData.productPhotoUrls && Array.isArray(productData.productPhotoUrls)) {
              setExistingImages(productData.productPhotoUrls)
            } else {
              setExistingImages([])
            }
          } else {
            toast({
              title: "Product not found",
              description: "The product you're trying to edit doesn't exist",
              variant: "destructive",
            })
            router.push("/dashboard/my-product")
          }
        } catch (error: any) {
          console.error("Error loading product:", error)
          toast({
            title: "Error",
            description: "Failed to load product data",
            variant: "destructive",
          })
          router.push("/dashboard/my-product")
        } finally {
          setLoading(false)
        }
      })

      return () => unsubscribe()
    }

    loadProduct()
  }, [productId, router, setValue, replaceNutrients, replaceCategories, toast])

  // Step validation
  const validateStep = async (step: number) => {
    let isValid = true

    switch (step) {
      case 0: // Basic Info
        isValid = await trigger(["productName", "productDescription"])
        break
      case 1: // Pricing
        isValid = await trigger(["originalPrice", "discountPrice", "stockQuantity"])
        break
      case 2: // Dimensions
        isValid = await trigger(["weight", "length", "width", "height"])
        break
      case 3: // Details (nutrients and categories are optional)
        isValid = true
        break
      case 4: // Images
        isValid = existingImages.length + selectedImages.length >= 1
        if (!isValid) {
          setError("Please keep at least 1 product image")
        }
        break
    }

    return isValid
  }

  const nextStep = async () => {
    const isValid = await validateStep(currentStep)
    if (isValid) {
      setCompletedSteps((prev) => [...prev, currentStep])
      setCurrentStep((prev) => Math.min(prev + 1, formSteps.length - 1))
      setError("")
    }
  }

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
    setError("")
  }

  const goToStep = async (step: number) => {
    if (step <= currentStep || completedSteps.includes(step - 1)) {
      setCurrentStep(step)
      setError("")
    }
  }

  // Handler for adding a nutrient.
  const handleAddNutrient = () => {
    if (!nutrientValue.trim()) {
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
      const totalImages = existingImages.length + selectedImages.length + fileArray.length
      if (totalImages > 5) {
        setError("You can have maximum 5 images total.")
        return
      }
      setSelectedImages((prev) => [...prev, ...fileArray])
      setError("")
    }
  }

  // Handler for drag and drop.
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files) {
      const fileArray = Array.from(files)
      const totalImages = existingImages.length + selectedImages.length + fileArray.length
      if (totalImages > 5) {
        setError("You can have maximum 5 images total.")
        return
      }
      setSelectedImages((prev) => [...prev, ...fileArray])
      setError("")
    }
  }

  // Prevent default behavior when dragging over.
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  // Remove new image from preview.
  const handleRemoveNewImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index))
  }

  // Mark existing image for deletion
  const handleRemoveExistingImage = (imageUrl: string) => {
    setExistingImages((prev) => prev.filter((url) => url !== imageUrl))
    setImagesToDelete((prev) => [...prev, imageUrl])
  }

  // Form submission handler.
  const onSubmit = async (data: FormData) => {
    if (!auth.currentUser || !productId) {
      router.push("/login")
      return
    }

    const totalImages = existingImages.length + selectedImages.length
    if (totalImages < 1) {
      setError("Please keep at least 1 image.")
      return
    }

    try {
      const storage = getStorage()
      const uid = auth.currentUser.uid

      // Delete removed images from storage
      for (const imageUrl of imagesToDelete) {
        try {
          const imageRef = storageRef(storage, imageUrl)
          await deleteObject(imageRef)
        } catch (error) {
          console.warn("Failed to delete image:", imageUrl, error)
        }
      }

      // Upload new images to Firebase Storage.
      const uploadPromises = selectedImages.map((file) => {
        const filePath = `product-photos/${crypto.randomUUID()}`
        const fileRef = storageRef(storage, filePath)
        return uploadBytes(fileRef, file).then((snapshot) => getDownloadURL(snapshot.ref))
      })
      const newImageUrls = await Promise.all(uploadPromises)

      // Combine existing and new image URLs
      const allImageUrls = [...existingImages, ...newImageUrls]

      // Prepare product data
      const productData = {
        productName: data.productName,
        productDescription: data.productDescription,
        originalPrice: Number.parseFloat(data.originalPrice),
        discountPrice: Number.parseFloat(data.discountPrice),
        stockQuantity: Number.parseInt(data.stockQuantity, 10),
        dimensions: {
          weight: Number.parseFloat(data.weight),
          weightUnit: data.weightUnit,
          length: Number.parseFloat(data.length),
          width: Number.parseFloat(data.width),
          height: Number.parseFloat(data.height),
          dimensionUnit: data.dimensionUnit,
        },
        nutrients: data.nutrients,
        categories: data.categories,
        productPhotoUrls: allImageUrls,
        updatedAt: Date.now(),
      }

      // Update product in database
      const productRef = dbRef(database, `companies/${uid}/products/${productId}`)
      await update(productRef, productData)

      toast({
        title: "Product updated!",
        description: "Your product has been successfully updated",
        variant: "default",
      })

      router.push("/dashboard/my-product")
    } catch (error: any) {
      console.error("Error updating product:", error)
      setError(error.message || "Error updating product. Please try again.")
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Information
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="productName" className="text-sm font-medium">
                  Product Name *
                </Label>
                <Input
                  id="productName"
                  {...register("productName", { required: "Product name is required" })}
                  placeholder="Enter a descriptive product name"
                  className={cn(
                    "h-11 transition-all duration-200",
                    errors.productName && "border-red-500 focus:border-red-500",
                  )}
                />
                {errors.productName && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.productName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="productDescription" className="text-sm font-medium">
                  Product Description *
                </Label>
                <Textarea
                  id="productDescription"
                  {...register("productDescription", { required: "Product description is required" })}
                  placeholder="Describe your product in detail. Include key features, benefits, and usage instructions."
                  className={cn(
                    "min-h-[120px] resize-y transition-all duration-200",
                    errors.productDescription && "border-red-500 focus:border-red-500",
                  )}
                />
                {errors.productDescription && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.productDescription.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        )

      case 1: // Pricing & Inventory
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="originalPrice" className="text-sm font-medium">
                  Original Price (₹) *
                </Label>
                <Input
                  id="originalPrice"
                  type="number"
                  step="0.01"
                  {...register("originalPrice", {
                    required: "Original price is required",
                    min: { value: 0, message: "Price cannot be negative" },
                  })}
                  placeholder="0.00"
                  className={cn(
                    "h-11 transition-all duration-200",
                    errors.originalPrice && "border-red-500 focus:border-red-500",
                  )}
                />
                {errors.originalPrice && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.originalPrice.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountPrice" className="text-sm font-medium">
                  Selling Price (₹) *
                </Label>
                <Input
                  id="discountPrice"
                  type="number"
                  step="0.01"
                  {...register("discountPrice", {
                    required: "Selling price is required",
                    min: { value: 0, message: "Price cannot be negative" },
                  })}
                  placeholder="0.00"
                  className={cn(
                    "h-11 transition-all duration-200",
                    errors.discountPrice && "border-red-500 focus:border-red-500",
                  )}
                />
                {errors.discountPrice && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.discountPrice.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stockQuantity" className="text-sm font-medium">
                Stock Quantity *
              </Label>
              <Input
                id="stockQuantity"
                type="number"
                {...register("stockQuantity", {
                  required: "Stock quantity is required",
                  min: { value: 0, message: "Stock cannot be negative" },
                })}
                placeholder="Enter available stock quantity"
                className={cn(
                  "h-11 transition-all duration-200",
                  errors.stockQuantity && "border-red-500 focus:border-red-500",
                )}
              />
              {errors.stockQuantity && (
                <p className="text-red-500 text-sm flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.stockQuantity.message}
                </p>
              )}
            </div>

            {watchedValues.originalPrice && watchedValues.discountPrice && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-800">Discount</span>
                  <span className="text-lg font-bold text-green-600">
                    {Math.round(
                      (1 -
                        Number.parseFloat(watchedValues.discountPrice) /
                          Number.parseFloat(watchedValues.originalPrice)) *
                        100,
                    )}
                    % OFF
                  </span>
                </div>
                <div className="text-sm text-green-700 mt-1">
                  Customers save ₹
                  {(
                    Number.parseFloat(watchedValues.originalPrice) - Number.parseFloat(watchedValues.discountPrice)
                  ).toFixed(2)}
                </div>
              </div>
            )}
          </div>
        )

      case 2: // Dimensions
        return (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Why dimensions matter:</strong> Accurate dimensions help calculate shipping costs and ensure
                proper packaging for delivery.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weight" className="text-sm font-medium">
                  Weight *
                </Label>
                <div className="flex">
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    {...register("weight", {
                      required: "Weight is required",
                      min: { value: 0, message: "Weight cannot be negative" },
                    })}
                    placeholder="0.00"
                    className={cn(
                      "h-11 rounded-r-none transition-all duration-200",
                      errors.weight && "border-red-500 focus:border-red-500",
                    )}
                  />
                  <Select value={watchedValues.weightUnit} onValueChange={(value) => setValue("weightUnit", value)}>
                    <SelectTrigger className="w-24 rounded-l-none h-11">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="lb">lb</SelectItem>
                      <SelectItem value="oz">oz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {errors.weight && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.weight.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="length" className="text-sm font-medium">
                    Length *
                  </Label>
                  <Input
                    id="length"
                    type="number"
                    step="0.1"
                    {...register("length", {
                      required: "Length is required",
                      min: { value: 0, message: "Length cannot be negative" },
                    })}
                    placeholder="0.0"
                    className={cn(
                      "h-11 transition-all duration-200",
                      errors.length && "border-red-500 focus:border-red-500",
                    )}
                  />
                  {errors.length && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.length.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="width" className="text-sm font-medium">
                    Width *
                  </Label>
                  <Input
                    id="width"
                    type="number"
                    step="0.1"
                    {...register("width", {
                      required: "Width is required",
                      min: { value: 0, message: "Width cannot be negative" },
                    })}
                    placeholder="0.0"
                    className={cn(
                      "h-11 transition-all duration-200",
                      errors.width && "border-red-500 focus:border-red-500",
                    )}
                  />
                  {errors.width && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.width.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height" className="text-sm font-medium">
                    Height *
                  </Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    {...register("height", {
                      required: "Height is required",
                      min: { value: 0, message: "Height cannot be negative" },
                    })}
                    placeholder="0.0"
                    className={cn(
                      "h-11 transition-all duration-200",
                      errors.height && "border-red-500 focus:border-red-500",
                    )}
                  />
                  {errors.height && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.height.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="w-full md:w-1/3">
                <Label htmlFor="dimensionUnit" className="text-sm font-medium">
                  Dimension Unit
                </Label>
                <Select value={watchedValues.dimensionUnit} onValueChange={(value) => setValue("dimensionUnit", value)}>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cm">cm</SelectItem>
                    <SelectItem value="m">m</SelectItem>
                    <SelectItem value="in">in</SelectItem>
                    <SelectItem value="ft">ft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )

      case 3: // Details (Nutrients & Categories)
        return (
          <div className="space-y-8">
            {/* Nutrients Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Nutritional Information</h3>
                <p className="text-sm text-muted-foreground">
                  Add nutritional details to help customers make informed choices (optional)
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={selectedNutrient} onValueChange={setSelectedNutrient}>
                  <SelectTrigger className="w-full sm:w-1/3 h-11">
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
                  placeholder="Enter value (e.g., 2g, 150mg)"
                  className="w-full sm:w-1/3 h-11"
                />

                <Button type="button" onClick={handleAddNutrient} className="w-full sm:w-auto h-11">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>

              {nutrientFields.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {nutrientFields.map((nutrient, index) => (
                    <Badge key={nutrient.id} variant="secondary" className="flex items-center gap-2 px-3 py-2 text-sm">
                      <span className="font-medium">{nutrient.name}:</span>
                      <span>{nutrient.value}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1 text-muted-foreground hover:text-foreground"
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
              <div>
                <h3 className="text-lg font-semibold mb-2">Product Categories</h3>
                <p className="text-sm text-muted-foreground">
                  Categorize your product to help customers find it easily
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Select
                  value={selectedMainCategory}
                  onValueChange={(value) => {
                    setSelectedMainCategory(value)
                    setSelectedSubCategory(categoryOptions[value][0])
                  }}
                >
                  <SelectTrigger className="w-full sm:w-1/3 h-11">
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
                  <SelectTrigger className="w-full sm:w-1/3 h-11">
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

                <Button type="button" onClick={handleAddCategory} className="w-full sm:w-auto h-11">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>

              {categoryFields.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {categoryFields.map((cat, index) => (
                    <Badge key={cat.id} variant="outline" className="flex items-center gap-2 px-3 py-2 text-sm">
                      <span>
                        {cat.main} → {cat.sub}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1 text-muted-foreground hover:text-foreground"
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
          </div>
        )

      case 4: // Images
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Product Images</h3>
              <p className="text-sm text-muted-foreground">
                Upload high-quality images to showcase your product (1-5 images total)
              </p>
            </div>

            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium">Current Images</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {existingImages.map((imageUrl, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                        <img
                          src={imageUrl || "/placeholder.svg"}
                          alt={`Current ${index + 1}`}
                          className="object-cover w-full h-full transition-transform group-hover:scale-105"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        onClick={() => handleRemoveExistingImage(imageUrl)}
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove image</span>
                      </Button>
                      {index === 0 && <Badge className="absolute bottom-2 left-2 text-xs">Primary</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload New Images */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200",
                isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-300",
                selectedImages.length > 0 && "border-green-500 bg-green-50",
              )}
            >
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors",
                    isDragOver ? "bg-blue-100" : selectedImages.length > 0 ? "bg-green-100" : "bg-gray-100",
                  )}
                >
                  {selectedImages.length > 0 ? (
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  ) : (
                    <Upload className="h-8 w-8 text-gray-600" />
                  )}
                </div>

                <h4 className="text-lg font-medium mb-2">
                  {selectedImages.length > 0 ? `${selectedImages.length} new image(s) selected` : "Add More Images"}
                </h4>

                <p className="text-sm text-muted-foreground mb-4">Drag and drop images here or click to browse</p>

                <p className="text-xs text-muted-foreground mb-6">
                  Supports PNG, JPG, JPEG • Max 5 images total • Recommended: 1000x1000px
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />

                <Button
                  type="button"
                  variant={selectedImages.length > 0 ? "outline" : "default"}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-11"
                  disabled={existingImages.length + selectedImages.length >= 5}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {selectedImages.length > 0 ? "Add More Images" : "Select Images"}
                </Button>
              </div>
            </div>

            {/* New Images Preview */}
            {selectedImages.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium">New Images Preview</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {selectedImages.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                        <img
                          src={URL.createObjectURL(file) || "/placeholder.svg"}
                          alt={`New ${index + 1}`}
                          className="object-cover w-full h-full transition-transform group-hover:scale-105"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        onClick={() => handleRemoveNewImage(index)}
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove image</span>
                      </Button>
                      <Badge variant="secondary" className="absolute bottom-2 left-2 text-xs">
                        New
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-lg text-gray-600">Loading product data...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/my-product">
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Edit Product</h1>
                <p className="text-sm text-muted-foreground">
                  Step {currentStep + 1} of {formSteps.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Live preview</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                {/* Step Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4 overflow-x-auto">
                    {formSteps.map((step, index) => {
                      const Icon = step.icon
                      const isActive = index === currentStep
                      const isCompleted = completedSteps.includes(index)
                      const isAccessible = index <= currentStep || completedSteps.includes(index - 1)

                      return (
                        <button
                          key={step.id}
                          onClick={() => isAccessible && goToStep(index)}
                          disabled={!isAccessible}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
                            isActive && "bg-blue-100 text-blue-700 border border-blue-200",
                            isCompleted && !isActive && "bg-green-100 text-green-700 border border-green-200",
                            !isActive && !isCompleted && isAccessible && "text-gray-600 hover:bg-gray-100",
                            !isAccessible && "text-gray-400 cursor-not-allowed",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="hidden sm:inline">{step.title}</span>
                          {isCompleted && <CheckCircle2 className="h-4 w-4" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <CardTitle className="text-xl">{formSteps[currentStep].title}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)}>
                  {renderStepContent()}

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-6 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevStep}
                      disabled={currentStep === 0}
                      className="h-11"
                    >
                      Previous
                    </Button>

                    {currentStep === formSteps.length - 1 ? (
                      <Button type="submit" disabled={isSubmitting} className="h-11 min-w-[140px]">
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Update Product
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button type="button" onClick={nextStep} className="h-11">
                        Next Step
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Product Preview Section */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Live Preview
                </CardTitle>
                <CardDescription>See how your updated product will appear</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Product Image */}
                <div className="aspect-square rounded-lg overflow-hidden border bg-gray-50">
                  {existingImages.length > 0 || selectedImages.length > 0 ? (
                    <img
                      src={
                        selectedImages.length > 0
                          ? URL.createObjectURL(selectedImages[0])
                          : existingImages[0] || "/placeholder.svg"
                      }
                      alt="Product preview"
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <div className="text-center">
                        <Camera className="h-12 w-12 mx-auto mb-2" />
                        <p className="text-sm">No image uploaded</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg leading-tight">{watchedValues.productName || "Product Name"}</h3>

                  {/* Price Display */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-2xl font-bold text-green-600">₹{watchedValues.discountPrice || "0.00"}</span>
                    {watchedValues.originalPrice && watchedValues.originalPrice !== watchedValues.discountPrice && (
                      <>
                        <span className="text-lg text-gray-500 line-through">₹{watchedValues.originalPrice}</span>
                        <Badge variant="destructive" className="text-xs">
                          {Math.round(
                            (1 -
                              Number.parseFloat(watchedValues.discountPrice || "0") /
                                Number.parseFloat(watchedValues.originalPrice)) *
                              100,
                          )}
                          % OFF
                        </Badge>
                      </>
                    )}
                  </div>

                  {/* Stock Info */}
                  {watchedValues.stockQuantity && (
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          Number.parseInt(watchedValues.stockQuantity) > 10
                            ? "bg-green-500"
                            : Number.parseInt(watchedValues.stockQuantity) > 0
                              ? "bg-yellow-500"
                              : "bg-red-500",
                        )}
                      />
                      <span className="text-sm text-gray-600">
                        {Number.parseInt(watchedValues.stockQuantity) > 0
                          ? `${watchedValues.stockQuantity} in stock`
                          : "Out of stock"}
                      </span>
                    </div>
                  )}

                  {/* Dimensions */}
                  {watchedValues.weight && (
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Weight:</span>
                        <span className="font-medium">
                          {watchedValues.weight} {watchedValues.weightUnit}
                        </span>
                      </div>
                      {watchedValues.length && watchedValues.width && watchedValues.height && (
                        <div className="flex justify-between">
                          <span>Dimensions:</span>
                          <span className="font-medium">
                            {watchedValues.length} × {watchedValues.width} × {watchedValues.height}{" "}
                            {watchedValues.dimensionUnit}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Description */}
                <div>
                  <h4 className="font-medium text-sm mb-2">Description</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {watchedValues.productDescription || "No description provided yet..."}
                  </p>
                </div>

                {/* Nutrients */}
                {nutrientFields.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium text-sm mb-3">Nutritional Information</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {nutrientFields.map((nutrient, idx) => (
                          <div key={idx} className="flex justify-between text-sm py-1">
                            <span className="text-gray-600">{nutrient.name}</span>
                            <span className="font-medium">{nutrient.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Categories */}
                {categoryFields.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium text-sm mb-2">Categories</h4>
                      <div className="flex flex-wrap gap-1">
                        {categoryFields.map((cat, idx) => (
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
    </div>
  )
}
