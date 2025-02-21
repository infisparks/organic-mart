import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import ProductDetails from "./ProductDetails";
import { notFound } from "next/navigation";

// Local products array used only in this file.
// Remove the "export" keyword to avoid Next.js interpreting it as a page export.
const products = [
  {
    id: "1",
    name: "Organic Avocados",
    description:
      "Our premium organic avocados are hand-picked from certified organic farms. Rich in healthy fats, fiber, and essential nutrients, these creamy delights are perfect for your healthy lifestyle. Each avocado is carefully selected at peak ripeness to ensure the best taste and texture.",
    price: 299,
    oldPrice: 399,
    image:
      "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?ixlib=rb-4.0.3",
    company: {
      name: "Green Valley Farms",
      logo: "https://i.pravatar.cc/150?img=1"
    },
    nutrients: [
      { name: "Protein", value: "2g" },
      { name: "Fat", value: "15g" },
      { name: "Carbs", value: "9g" },
      { name: "Fiber", value: "7g" }
    ]
  },
  {
    id: "2",
    name: "Fresh Strawberries",
    description:
      "Sweet and juicy organic strawberries, perfect for a healthy snack or dessert.",
    price: 199,
    oldPrice: 249,
    image:
      "https://images.unsplash.com/photo-1518635017480-01eb763f1fbb?ixlib=rb-4.0.3",
    company: {
      name: "Nature's Best",
      logo: "https://i.pravatar.cc/150?img=2"
    },
    nutrients: [
      { name: "Vitamin C", value: "50mg" },
      { name: "Fiber", value: "3g" }
    ]
  },
  {
    id: "3",
    name: "Organic Honey",
    description:
      "Pure, raw honey from local organic beekeepers, offering a natural sweetness.",
    price: 499,
    image:
      "https://images.unsplash.com/photo-1587049352847-81a56d773cae?ixlib=rb-4.0.3",
    company: {
      name: "Himalayan Organics",
      logo: "https://i.pravatar.cc/150?img=3"
    },
    nutrients: [
      { name: "Carbs", value: "17g" },
      { name: "Sugar", value: "16g" }
    ]
  }
];

export async function generateStaticParams() {
  return products.map((product) => ({
    id: product.id.toString(),
  }));
}

export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = products.find((p) => p.id === params.id);

  if (!product) {
    return notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex items-center gap-2 mb-8">
        <Link
          href="/"
          className="text-green-600 hover:text-green-700 flex items-center gap-2 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Products
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-600">{product.name}</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <ProductDetails product={product} />
      </div>
    </div>
  );
}