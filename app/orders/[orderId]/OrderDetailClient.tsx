"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { onValue, ref as dbRef } from "firebase/database"
import { onAuthStateChanged } from "firebase/auth"
import { auth, database } from "../../../lib/firebase"
import {
  Calendar,
  MapPin,
  Package,
  ArrowLeft,
  Clock,
  Truck,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Receipt,
  User,
  Home,
  Download,
  FileText,
  Phone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

interface Order {
  id: string
  items: any[]
  subtotal: number
  shipping: number
  total: number
  status: string
  purchaseTime: number
  shippingAddress: string
  deliveryAddress?: {
    name: string
    phone: string
    street: string
    city: string
    state: string
    pincode: string
  }
  location?: {
    latitude: number
    longitude: number
  }
}

interface CartItem {
  id: string
  productId?: string
  name: string
  description: string
  price: number
  originalPrice: number
  quantity: number
  image: string
  nutrients: Array<{ name: string; value: string }>
}

interface OrderDetailClientProps {
  orderId: string
}

const statusConfig = {
  pending: {
    label: "Order Placed",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock,
    description: "Your order is being processed",
    bgColor: "bg-yellow-50",
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: CheckCircle,
    description: "Order confirmed and being prepared",
    bgColor: "bg-blue-50",
  },
  shipped: {
    label: "Shipped",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: Truck,
    description: "Your order is on the way",
    bgColor: "bg-purple-50",
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
    description: "Order delivered successfully",
    bgColor: "bg-green-50",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: AlertCircle,
    description: "Order has been cancelled",
    bgColor: "bg-red-50",
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
    description: "Order completed successfully",
    bgColor: "bg-green-50",
  },
}

export default function OrderDetailClient({ orderId }: OrderDetailClientProps) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingInvoice, setDownloadingInvoice] = useState(false)

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const orderRef = dbRef(database, `user/${user.uid}/order/${orderId}`)
        onValue(orderRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val()
            setOrder({ id: orderId, ...data })
          }
          setLoading(false)
        })
      } else {
        setOrder(null)
        setLoading(false)
      }
    })
    return () => unsubscribeAuth()
  }, [orderId])

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const generateInvoicePDF = async () => {
    if (!order) return

    setDownloadingInvoice(true)

    try {
      // Create invoice HTML content
      const invoiceContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice - Order #${order.id.slice(-8)}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; line-height: 1.4; color: #333; }
            .invoice { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { border-bottom: 2px solid #16a34a; padding-bottom: 20px; margin-bottom: 30px; }
            .company-info { display: flex; justify-content: space-between; align-items: flex-start; }
            .company-name { font-size: 24px; font-weight: bold; color: #16a34a; }
            .company-details { font-size: 11px; color: #666; margin-top: 5px; }
            .invoice-info { text-align: right; }
            .invoice-title { font-size: 20px; font-weight: bold; color: #333; }
            .invoice-number { font-size: 14px; color: #666; margin-top: 5px; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 14px; font-weight: bold; color: #333; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .two-column { display: flex; justify-content: space-between; gap: 30px; }
            .column { flex: 1; }
            .info-row { margin-bottom: 8px; }
            .label { font-weight: 600; color: #555; }
            .value { color: #333; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .items-table th { background: #f8f9fa; padding: 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #dee2e6; font-size: 11px; }
            .items-table td { padding: 12px 10px; border-bottom: 1px solid #dee2e6; font-size: 11px; }
            .items-table tr:hover { background: #f8f9fa; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .summary-row.total { font-weight: bold; font-size: 14px; border-top: 1px solid #dee2e6; padding-top: 8px; margin-top: 8px; }
            .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-confirmed { background: #dbeafe; color: #1e40af; }
            .status-shipped { background: #e9d5ff; color: #7c3aed; }
            .status-delivered { background: #d1fae5; color: #065f46; }
            .status-completed { background: #d1fae5; color: #065f46; }
            .status-cancelled { background: #fee2e2; color: #dc2626; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 10px; color: #666; }
            @media print { body { font-size: 11px; } .invoice { padding: 10px; } }
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="header">
              <div class="company-info">
                <div>
                  <div class="company-name">FreshMart</div>
                  <div class="company-details">
                    123 Business Street, City, State 12345<br>
                    Phone: +91 98765 43210 | Email: orders@freshmart.com<br>
                    GST: 22AAAAA0000A1Z5
                  </div>
                </div>
                <div class="invoice-info">
                  <div class="invoice-title">INVOICE</div>
                  <div class="invoice-number">#${order.id.slice(-8)}</div>
                  <div style="margin-top: 10px; font-size: 11px;">
                    Date: ${formatDate(order.purchaseTime)}
                  </div>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="two-column">
                <div class="column">
                  <div class="section-title">Bill To:</div>
                  ${
                    order.deliveryAddress
                      ? `
                    <div class="info-row"><span class="label">Name:</span> ${order.deliveryAddress.name}</div>
                    <div class="info-row"><span class="label">Phone:</span> ${order.deliveryAddress.phone}</div>
                    <div class="info-row"><span class="label">Address:</span> ${order.deliveryAddress.street}</div>
                    <div class="info-row">${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.pincode}</div>
                  `
                      : `
                    <div class="info-row">${order.shippingAddress}</div>
                  `
                  }
                </div>
                <div class="column">
                  <div class="section-title">Order Details:</div>
                  <div class="info-row"><span class="label">Order ID:</span> ${order.id}</div>
                  <div class="info-row"><span class="label">Order Date:</span> ${formatDate(order.purchaseTime)}</div>
                  <div class="info-row"><span class="label">Status:</span> <span class="status-badge status-${order.status}">${statusConfig[order.status as keyof typeof statusConfig]?.label || order.status}</span></div>
                  <div class="info-row"><span class="label">Items:</span> ${order.items.length}</div>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Order Items</div>
              <table class="items-table">
                <thead>
                  <tr>
                    <th style="width: 40%;">Item</th>
                    <th style="width: 15%;" class="text-center">Qty</th>
                    <th style="width: 20%;" class="text-right">Unit Price</th>
                    <th style="width: 25%;" class="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${order.items
                    .map(
                      (item: CartItem) => `
                    <tr>
                      <td>
                        <div style="font-weight: 600;">${item.name}</div>
                        <div style="font-size: 10px; color: #666; margin-top: 2px;">${item.description}</div>
                      </td>
                      <td class="text-center">${item.quantity}</td>
                      <td class="text-right">₹${item.price.toLocaleString()}</td>
                      <td class="text-right">₹${(item.price * item.quantity).toLocaleString()}</td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>
            </div>

            <div class="summary">
              <div class="summary-row">
                <span>Subtotal:</span>
                <span>₹${order.subtotal.toLocaleString()}</span>
              </div>
              <div class="summary-row">
                <span>Shipping:</span>
                <span>₹${order.shipping.toLocaleString()}</span>
              </div>
              <div class="summary-row total">
                <span>Total Amount:</span>
                <span>₹${order.total.toLocaleString()}</span>
              </div>
            </div>

            <div class="footer">
              <p>Thank you for your business!</p>
              <p>This is a computer-generated invoice. No signature required.</p>
            </div>
          </div>
        </body>
        </html>
      `

      // Create a new window for printing
      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(invoiceContent)
        printWindow.document.close()

        // Wait for content to load then print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print()
            printWindow.close()
          }, 250)
        }
      }
    } catch (error) {
      console.error("Error generating invoice:", error)
    } finally {
      setDownloadingInvoice(false)
    }
  }

  const LoadingSkeleton = () => (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="px-3 py-3">
          <Skeleton className="h-6 w-32" />
        </div>
      </div>
      <div className="p-3 space-y-3">
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-6 w-32 mb-3" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  if (loading) {
    return <LoadingSkeleton />
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-sm mx-auto text-center">
          <CardContent className="p-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-sm text-gray-600 mb-4">The order you're looking for doesn't exist.</p>
            <Button asChild size="sm" className="bg-green-600 hover:bg-green-700">
              <Link href="/orders">
                <ArrowLeft className="w-3 h-3 mr-1" />
                Back to Orders
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending
  const StatusIcon = status.icon

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between px-3 py-3">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="p-1">
              <Link href="/orders">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <h1 className="text-sm font-semibold text-gray-900">Order Details</h1>
          </div>
          <Button
            onClick={generateInvoicePDF}
            disabled={downloadingInvoice}
            size="sm"
            variant="outline"
            className="text-xs px-2 py-1 h-7"
          >
            {downloadingInvoice ? (
              <>
                <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin mr-1" />
                <span className="text-xs">Generating...</span>
              </>
            ) : (
              <>
                <Download className="w-3 h-3 mr-1" />
                <span className="text-xs">Invoice</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Order Status Card */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-gray-900">#{order.id.slice(-8)}</h2>
                  <Badge className={`${status.color} border text-xs px-2 py-0.5`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600">{status.description}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">₹{order.total.toLocaleString()}</p>
                <p className="text-xs text-gray-600">{order.items.length} items</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs font-medium text-gray-900">Order Date</p>
                  <p className="text-xs text-gray-600">{formatDate(order.purchaseTime)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <Receipt className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs font-medium text-gray-900">Order ID</p>
                  <p className="text-xs text-gray-600 font-mono">{order.id.slice(-12)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-green-600" />
              Items ({order.items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              {order.items.map((item: CartItem, index) => (
                <div key={item.id}>
                  <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                    {/* 1:1 Product Image */}
                    <div className="relative w-16 h-16 bg-white rounded-lg shadow-sm overflow-hidden flex-shrink-0">
                      <Image
                        src={item.image || "/placeholder.svg?height=64&width=64"}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <h3 className="text-sm font-semibold text-gray-900 leading-tight">{item.name}</h3>
                      <p className="text-xs text-gray-600 line-clamp-2">{item.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-600">Qty: {item.quantity}</span>
                          <span className="text-xs text-gray-600">₹{item.price}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">
                            ₹{(item.price * item.quantity).toLocaleString()}
                          </p>
                          {item.originalPrice > item.price && (
                            <p className="text-xs text-gray-500 line-through">
                              ₹{(item.originalPrice * item.quantity).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      {item.nutrients && item.nutrients.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-700 mb-1">Nutrition:</p>
                          <div className="grid grid-cols-3 gap-1">
                            {item.nutrients.slice(0, 3).map((nutrient, idx) => (
                              <div key={idx} className="text-xs bg-white p-1 rounded border">
                                <span className="font-medium text-gray-700">{nutrient.name}:</span>
                                <span className="text-gray-600 block">{nutrient.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {index < order.items.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-green-600" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">₹{order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">₹{order.shipping.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-bold">
                <span>Total</span>
                <span>₹{order.total.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Information */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-600" />
              Delivery Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {order.deliveryAddress ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.deliveryAddress.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-gray-400" />
                      <p className="text-xs text-gray-600">{order.deliveryAddress.phone}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Home className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-900">{order.deliveryAddress.street}</p>
                    <p className="text-xs text-gray-600">
                      {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.pincode}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <p className="text-sm text-gray-600">{order.shippingAddress}</p>
              </div>
            )}

            {order.location && (
              <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-700 mb-0.5">GPS Coordinates</p>
                <p className="text-xs text-gray-600">
                  {order.location.latitude}, {order.location.longitude}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-2 pb-4">
          <Button
            onClick={generateInvoicePDF}
            disabled={downloadingInvoice}
            className="w-full bg-green-600 hover:bg-green-700 text-sm py-2"
          >
            {downloadingInvoice ? (
              <>
                <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin mr-2" />
                Generating Invoice...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Download Invoice PDF
              </>
            )}
          </Button>
          <Button variant="outline" className="w-full text-sm py-2">
            <Truck className="w-4 h-4 mr-2" />
            Track Order
          </Button>
          {order.status === "delivered" && (
            <Button variant="outline" className="w-full text-sm py-2">
              Return Items
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
