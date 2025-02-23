import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import ProductDetails from "./ProductDetails";
import { notFound } from "next/navigation";
import { database } from "../../../lib/firebase";
import { get, ref } from "firebase/database";
import Header from "@/app/components/Header";
// Generate static params by fetching all companies and flattening their products
export async function generateStaticParams() {
  const companiesRef = ref(database, "companies");
  const snapshot = await get(companiesRef);
  const companiesData = snapshot.val();
  let paths = [];
  
  if (companiesData) {
    for (const companyId in companiesData) {
      const company = companiesData[companyId];
      if (company.products) {
        for (const productId in company.products) {
          paths.push({ id: productId.toString() });
        }
      }
    }
  }
  return paths;
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  // Fetch all companies from Firebase and search for the product by id
  const companiesRef = ref(database, "companies");
  const snapshot = await get(companiesRef);
  const companiesData = snapshot.val();
  
  let productFound = null;
  
  if (companiesData) {
    for (const companyId in companiesData) {
      const company = companiesData[companyId];
      if (company.products) {
        for (const productId in company.products) {
          if (productId === params.id) {
            productFound = {
              id: productId,
              ...company.products[productId],
              company: {
                name: company.companyName,
                logo: company.companyPhotoUrl,
              },
            };
            break;
          }
        }
      }
      if (productFound) break;
    }
  }
  
  if (!productFound) {
    return notFound();
  }
  
  // Map fields for compatibility with ProductDetails:
  // If there is a productPhotoUrls array, set the main thumbnail to its first element,
  // and also pass along all images as allImages.
  productFound.name = productFound.productName;
  if (productFound.productPhotoUrls && productFound.productPhotoUrls.length > 0) {
    productFound.image = productFound.productPhotoUrls[0]; // main thumbnail (index 0)
    productFound.allImages = productFound.productPhotoUrls; // full list of images
  } else {
    productFound.image = productFound.productPhotoUrl;
    productFound.allImages = [productFound.productPhotoUrl];
  }
  
  return (
    <>
    <Header/>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <ProductDetails product={productFound} />
      </div>
    </div>
    </>
  );
}
