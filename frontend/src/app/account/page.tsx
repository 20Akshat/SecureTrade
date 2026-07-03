"use client";
import { useAuth } from "@/context/AuthContext";
import { User, LogOut, Shield, Settings, CreditCard } from "lucide-react";

export default function AccountPage() {
  const { logout, balance } = useAuth();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Header */}
      <header className="mb-4">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">Account & Settings</h1>
        <p className="text-slate-450 text-xs font-semibold">Manage your profile, security limits, and funding preference.</p>
      </header>

      {/* Profile Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        
        {/* User header details */}
        <div className="flex items-center space-x-4 pb-5 border-b border-slate-100">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-black">
            PT
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 leading-tight">Pro Trader</h2>
            <p className="text-xs text-slate-450 font-semibold">trader@secure.com · Client Code: ST189704</p>
          </div>
        </div>

        {/* Info panel grid */}
        <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
            <span className="text-[10px] text-slate-400 font-bold block uppercase mb-1">Segment Status</span>
            <span className="text-slate-850 font-extrabold block">F&O: ACTIVE</span>
            <span className="text-slate-850 font-extrabold block">Equity: ACTIVE</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
            <span className="text-[10px] text-slate-400 font-bold block uppercase mb-1">Trading Limit Balance</span>
            <span className="text-green-600 font-black text-sm font-mono block">
              ₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* List settings mock links */}
        <div className="space-y-1 pt-2">
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-xs font-semibold text-slate-700">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-slate-400" />
              <span>Two-Factor Authentication (2FA)</span>
            </div>
            <span className="text-green-600 text-[10px] uppercase font-black">Configured</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-xs font-semibold text-slate-700">
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Order Execution Settings</span>
            </div>
            <span className="text-slate-400 text-[10px] uppercase font-black">Manage</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-xs font-semibold text-slate-700">
            <div className="flex items-center gap-3">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <span>Funds Withdrawal & Deposits</span>
            </div>
            <span className="text-slate-450 text-[10px] uppercase font-black">History</span>
          </div>
        </div>

        {/* Logout */}
        <div className="pt-4 border-t border-slate-100">
          <button 
            onClick={() => logout()} 
            className="w-full py-3 bg-red-50 hover:bg-red-100/70 active:scale-98 text-red-655 rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout from Session
          </button>
        </div>

      </div>
    </div>
  );
}