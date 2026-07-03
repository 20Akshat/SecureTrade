"use client";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "./Sidebar";
import ChatBot from "./ChatBot";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Briefcase, FileText, User } from "lucide-react";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const pathname = usePathname();

  if (!token) {
    return <div className="bg-background text-foreground min-h-screen">{children}</div>;
  }

  const navItems = [
    { name: "Home", icon: LayoutDashboard, path: "/dashboard" },
    { name: "Portfolio", icon: Briefcase, path: "/portfolio" },
    { name: "Orders", icon: FileText, path: "/orders" },
    { name: "Account", icon: User, path: "/account" },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background text-foreground">
      {/* Sidebar for Desktop */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 min-h-screen flex flex-col pb-20 lg:pb-0">
        <main className="flex-1 p-3 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Bottom Nav Bar for Mobile / Tablet */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] flex items-center justify-around py-2 px-4 z-40">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-all ${
                isActive ? "text-blue-600 font-bold" : "text-slate-450 hover:text-slate-600"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{item.name}</span>
            </Link>
          );
        })}
      </div>
      
      {/* Global AI Chatbot floating widget */}
      <ChatBot />
    </div>
  );
}