"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Briefcase, FileText, User, LogOut } from "lucide-react";

export default function Sidebar() {
  const { logout } = useAuth();
  const pathname = usePathname();

  const menuItems = [
    { name: "Home", icon: LayoutDashboard, path: "/dashboard" },
    { name: "Portfolio", icon: Briefcase, path: "/portfolio" },
    { name: "Orders", icon: FileText, path: "/orders" },
    { name: "Account", icon: User, path: "/account" },
  ];

  return (
    <div className="hidden lg:flex flex-col w-64 h-screen bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-850 p-6 fixed left-0 top-0 z-30 transition-colors">
      
      {/* App Logo */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-sm text-white">ST</div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-zinc-100 tracking-tight leading-none">
              Secure<span className="text-blue-600 font-extrabold">Trade</span>
            </h1>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold tracking-wider uppercase">Pro Trading</span>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;

          return (
            <Link 
              key={item.name} 
              href={item.path}
              className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl transition-all duration-150 group ${
                isActive 
                  ? "bg-blue-50 dark:bg-blue-950/30 text-blue-650 dark:text-blue-400 font-bold" 
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-zinc-100"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-350"}`} />
              <span className="text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <button 
        onClick={() => logout()}
        className="flex items-center space-x-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all mt-auto font-medium text-sm"
      >
        <LogOut className="w-5 h-5" />
        <span>Logout</span>
      </button>

    </div>
  );
}