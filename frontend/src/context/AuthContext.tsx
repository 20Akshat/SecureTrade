"use client";
import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";

// 1. Types batate hain ki AuthContext mein kya-kya hoga
interface AuthContextType {
  token: string | null;
  balance: number;
  login: (token: string, balance: number) => void;
  logout: (isExpired?: boolean) => void;
  updateBalance: (newBalance: number) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

// 2. Ek khali Context (Dabba) banaya
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Provider Component jo saare app ko lapet lega
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Load theme preference on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("st_theme") as "light" | "dark" | null;
      const effectiveTheme = savedTheme || "dark";
      setTheme(effectiveTheme);
      document.documentElement.classList.toggle("dark", effectiveTheme === "dark");
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("st_theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }, []);

  // Load persisted auth data on client mount to avoid Next.js hydration mismatches
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedToken = localStorage.getItem("st_token");
      const savedBalance = localStorage.getItem("st_balance");
      if (savedToken) setToken(savedToken);
      if (savedBalance) setBalance(parseFloat(savedBalance));
    }
  }, []);

  // Sync balance with backend on mount/token change and poll every 5 seconds
  useEffect(() => {
    if (!token) return;

    const fetchBalance = async () => {
      try {
        const res = await fetch("https://securetrade-n3qh.onrender.com/api/balance", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.balance === "number") {
            setBalance(data.balance);
            localStorage.setItem("st_balance", data.balance.toString());
          }
        }
      } catch (err: any) {
        console.warn("Failed to sync balance with backend:", err?.message || err);
      }
    };

    fetchBalance();

    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const login = useCallback((newToken: string, newBalance: number) => {
    setToken(newToken);
    setBalance(newBalance);
    if (typeof window !== "undefined") {
      localStorage.setItem("st_token", newToken);
      localStorage.setItem("st_balance", newBalance.toString());
    }
  }, []);

  const logout = useCallback((isExpired = false) => {
    setToken(null);
    setBalance(0);
    if (typeof window !== "undefined") {
      localStorage.removeItem("st_token");
      localStorage.removeItem("st_balance");
      if (isExpired) {
        localStorage.setItem("st_session_expired", "true");
      }
    }
  }, []);

  const updateBalance = useCallback((newBalance: number) => {
    setBalance(newBalance);
    if (typeof window !== "undefined") {
      localStorage.setItem("st_balance", newBalance.toString());
    }
  }, []);

  // Global fetch interceptor to catch 401 Unauthorized token expiry/invalidity
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      try {
        const response = await originalFetch(input, init);
        
        if (response.status === 401) {
          const urlStr = typeof input === "string" 
            ? input 
            : input instanceof URL 
              ? input.toString() 
              : (input as Request).url;
              
          const isAuthRoute = urlStr.includes("/api/login") || urlStr.includes("/api/signup");
          
          if (!isAuthRoute) {
            // Force logout and record session expiration
            logout(true);
          }
        }
        return response;
      } catch (err: any) {
        console.warn("Global fetch interceptor caught network error (backend might be offline):", err?.message || err);
        return new Response(JSON.stringify({ error: "Server offline or network error." }), {
          status: 503,
          headers: { "Content-Type": "application/json" }
        });
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [logout]);

  return (
    <AuthContext.Provider value={{ token, balance, login, logout, updateBalance, theme, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  );
}

// 4. Custom Hook taaki kisi bhi page par `useAuth()` likh kar data mil jaye
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}