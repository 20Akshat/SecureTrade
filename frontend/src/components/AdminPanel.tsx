"use client";

import { useState, useEffect } from "react";
import { Users, RotateCcw, Trash2, ShieldAlert, Check, PhoneCall, CheckSquare } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  phone: string;
  angelClientCode: string;
  balance: number;
  createdAt: string;
  is_blocked?: boolean;
  is_free_service?: boolean;
  todayProfit: number;
}

interface SupportRequest {
  id: string;
  user_id: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  created_at: string;
}

interface PaymentRequest {
  id: string;
  user_id: string;
  email: string;
  amount: number;
  utr: string;
  status: string;
  created_at: string;
}

export default function AdminPanel({ token }: { token: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch Users
      const userRes = await fetch("https://securetrade-n3qh.onrender.com/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userData = await userRes.json();
      if (!userRes.ok) throw new Error(userData.error || "Failed to fetch users.");
      setUsers(userData);

      // 2. Fetch Support Callback Tickets
      const supportRes = await fetch("https://securetrade-n3qh.onrender.com/api/admin/support-requests", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (supportRes.ok) {
        setSupportRequests(await supportRes.json());
      }

      // 3. Fetch Pending Payments
      const paymentRes = await fetch("https://securetrade-n3qh.onrender.com/api/admin/payment-requests", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (paymentRes.ok) {
        setPaymentRequests(await paymentRes.json());
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleResetBalance = async (userId: string) => {
    if (!confirm("Are you sure you want to restore this user's balance to ₹1,00,000?")) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch("https://securetrade-n3qh.onrender.com/api/admin/reset-balance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess("Balance restored successfully!");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("⚠️ WARNING: Deleting this user will permanently erase their credentials and trading logs. Continue?")) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`https://securetrade-n3qh.onrender.com/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess("User account deleted successfully.");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleFreeService = async (userId: string) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`https://securetrade-n3qh.onrender.com/api/admin/users/${userId}/toggle-free`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess("User free service status toggled successfully!");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResolveSupport = async (reqId: string) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`https://securetrade-n3qh.onrender.com/api/admin/support-requests/${reqId}/resolve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess("Support request marked as resolved!");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleApprovePayment = async (reqId: string) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch("https://securetrade-n3qh.onrender.com/api/admin/approve-payment", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reqId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess("Payment approved successfully! Bot is now unlocked.");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRejectPayment = async (reqId: string) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch("https://securetrade-n3qh.onrender.com/api/admin/reject-payment", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reqId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess("Payment request rejected.");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUnblockUser = async (userId: string) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch("https://securetrade-n3qh.onrender.com/api/admin/unblock-user", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess("User account unblocked successfully! 🚀");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const pendingRequests = supportRequests.filter(r => r.status === "pending");

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
            <Users className="w-5.5 h-5.5" />
          </div>
          <div>
            <h2 className="text-slate-800 font-black text-lg tracking-tight">Admin User Control Panel</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Monitor and Manage Accounts</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-all uppercase tracking-wider cursor-pointer"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Success/Error Alerts */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2 animate-pulse">
          <ShieldAlert className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{success}</span>
        </div>
      )}

      {/* Users List Table */}
      <div className="space-y-3">
        <h3 className="text-slate-850 font-black text-sm uppercase tracking-wide">Registered Accounts ({users.length})</h3>
        <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
          <table className="w-full border-collapse text-left text-xs font-semibold text-slate-600">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">User Email</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Verification ID / Code</th>
                <th className="py-3 px-4 text-right">Paper Balance</th>
                <th className="py-3 px-4 text-right">Today's Profit</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-bold uppercase">
                    {loading ? "Loading registered accounts..." : "No users registered yet."}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{user.email}</span>
                        {user.is_blocked && (
                          <span className="bg-red-100 text-red-750 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md">
                            Blocked
                          </span>
                        )}
                        {user.is_free_service && (
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md">
                            Free
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{user.phone}</td>
                    <td className="py-3.5 px-4 font-mono uppercase text-slate-500">{user.angelClientCode}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-slate-800">
                      ₹{user.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`py-3.5 px-4 text-right font-mono font-black ${
                      user.todayProfit > 0 ? "text-green-600" :
                      user.todayProfit < 0 ? "text-red-500" : "text-slate-450"
                    }`}>
                      {user.todayProfit > 0 ? "+" : ""}₹{user.todayProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 flex items-center justify-center gap-3">
                      {user.is_blocked && (
                        <button
                          onClick={() => handleUnblockUser(user.id)}
                          title="Unblock Account"
                          className="px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-all cursor-pointer font-bold text-[9px] uppercase tracking-wider"
                        >
                          Unblock
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleFreeService(user.id)}
                        title={user.is_free_service ? "Disable Free Service" : "Enable Free Service (Exempt Billing)"}
                        className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer font-bold text-[9px] uppercase tracking-wider ${
                          user.is_free_service
                            ? "bg-amber-100 hover:bg-amber-200 text-amber-700"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-650"
                        }`}
                      >
                        {user.is_free_service ? "Exempted" : "Exempt"}
                      </button>
                      <button
                        onClick={() => handleResetBalance(user.id)}
                        title="Restore Balance to ₹1,00,000"
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={user.email === "akshatmarwadi5@gmail.com"}
                        title="Delete User Account"
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-655 rounded-lg disabled:opacity-30 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Support Callback Tickets Table */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <PhoneCall className="w-4 h-4 text-slate-700" />
          <h3 className="text-slate-850 font-black text-sm uppercase tracking-wide">
            Support Callbacks ({pendingRequests.length} Pending)
          </h3>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
          <table className="w-full border-collapse text-left text-xs font-semibold text-slate-600">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Issue Message</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Resolve</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-bold uppercase">
                    No pending callback requests.
                  </td>
                </tr>
              ) : (
                pendingRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="py-3 px-4 font-bold text-slate-800">{req.email}</td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-650">{req.phone}</td>
                    <td className="py-3 px-4 text-slate-500 italic max-w-xs truncate" title={req.message}>
                      "{req.message}"
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-amber-100 text-amber-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-md">
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleResolveSupport(req.id)}
                        title="Mark resolved"
                        className="p-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-all cursor-pointer"
                      >
                        <CheckSquare className="w-4.5 h-4.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Pending UPI Payments Table */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-slate-700" />
          <h3 className="text-slate-850 font-black text-sm uppercase tracking-wide">
            Pending UPI Payments ({paymentRequests.filter(p => p.status === "pending").length} Pending)
          </h3>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
          <table className="w-full border-collapse text-left text-xs font-semibold text-slate-600">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4 text-center">Type</th>
                <th className="py-3 px-4 text-center">Invoice Amount</th>
                <th className="py-3 px-4">UTR Reference ID</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paymentRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-bold uppercase">
                    No payment requests recorded.
                  </td>
                </tr>
              ) : (
                paymentRequests.map((req: any) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="py-3 px-4 font-bold text-slate-800">{req.email}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                        req.type === "recharge" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {req.type || "commission"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-green-600">₹{req.amount}</td>
                    <td className="py-3 px-4 font-mono font-black text-blue-600 select-all cursor-pointer">{req.utr}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                        req.status === "approved" ? "bg-green-100 text-green-700" :
                        req.status === "rejected" ? "bg-red-100 text-red-700" :
                        req.status === "fraud" ? "bg-red-950 text-red-200 border border-red-500" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {req.status === "pending" ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleApprovePayment(req.id)}
                            title="Approve & Unlock"
                            className="p-1 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-all cursor-pointer font-bold text-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectPayment(req.id)}
                            title="Reject"
                            className="p-1 bg-red-50 hover:bg-red-100 text-red-655 rounded-lg transition-all cursor-pointer font-bold text-xs"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Processed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
