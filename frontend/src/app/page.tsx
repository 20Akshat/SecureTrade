"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AuthForm from "@/components/AuthForm";

export default function Home() {
  const { token, login } = useAuth();
  const router = useRouter();

  // 1. Agar token mil gaya (yani user logged in hai), toh automatically /dashboard pe bhej do
  useEffect(() => {
    if (token) {
      router.push("/dashboard");
    }
  }, [token, router]);

  // 2. AuthForm chalega, aur jaise hi login hoga, hum Context wala `login` function call karenge
  return (
    <main className="min-h-screen bg-black">
      <AuthForm onLogin={(newToken, newBalance) => login(newToken, newBalance)} />
    </main>
  );
}