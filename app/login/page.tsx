"use client";

import React from "react";
import AuthPopup from "../components/AuthPopup";
import { useRouter } from "next/navigation";

const Page = () => {
  const router = useRouter();

  const handleClose = () => {
    // Redirect user when popup is closed.
    router.push("/");
  };

  const handleSuccess = () => {
    // Redirect user after successful authentication.
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <AuthPopup onClose={handleClose} onSuccess={handleSuccess} />
    </div>
  );
};

export default Page;
