const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'local_db.json');

// Helper to read database
function readDb() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            // Seed initial data from supabase if possible, or use defaults
            return { users: {}, portfolio: [] };
        }
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        console.error("Error reading local DB:", e);
        return { users: {}, portfolio: [] };
    }
}

// Helper to write database
function writeDb(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error("Error writing local DB:", e);
    }
}

module.exports = {
    getUserBalance: (userId, defaultBalance = 100000) => {
        const db = readDb();
        if (db.users[userId]) {
            return db.users[userId].balance;
        }
        return defaultBalance;
    },
    updateUserBalance: (userId, balance, email = "") => {
        const db = readDb();
        if (!db.users[userId]) {
            db.users[userId] = { id: userId, email: email, balance: balance };
        } else {
            db.users[userId].balance = balance;
        }
        writeDb(db);
    },
    getPortfolio: (userId) => {
        const db = readDb();
        return db.portfolio.filter(p => p.user_id === userId);
    },
    addTrade: (userId, symbol, quantity, price) => {
        const db = readDb();
        const trade = {
            id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            user_id: userId,
            symbol: symbol,
            quantity: quantity,
            average_price: price,
            created_at: new Date().toISOString(),
            status: 'open',
            stop_loss: null,
            take_profit: null,
            pnl: 0
        };
        db.portfolio.push(trade);
        writeDb(db);
        return trade;
    },
    syncFromSupabase: (userId, supabaseUser, supabasePortfolio) => {
        const db = readDb();
        if (supabaseUser) {
            const localUser = db.users[userId];
            const localTrades = db.portfolio.filter(p => p.user_id === userId);
            const supabaseTradesCount = Array.isArray(supabasePortfolio) ? supabasePortfolio.length : 0;
            
            // Only update balance from Supabase if we don't have a local record yet,
            // or if we have no unsynced local trades (i.e. local trades count matches Supabase count).
            if (!localUser || localTrades.length === supabaseTradesCount) {
                db.users[userId] = {
                    id: userId,
                    email: supabaseUser.email,
                    balance: supabaseUser.balance
                };
            }
        }
        if (Array.isArray(supabasePortfolio)) {
            // Keep only trades not already in local portfolio, or just overwrite for simplicity
            db.portfolio = db.portfolio.filter(p => p.user_id !== userId).concat(supabasePortfolio);
        }
        writeDb(db);
    },
    checkVerificationIdExists: (id) => {
        const db = readDb();
        return Object.values(db.users).some(u => 
            (u.verification_id && u.verification_id.toUpperCase() === id.toUpperCase()) ||
            (u.broker_client_id && u.broker_client_id.toUpperCase() === id.toUpperCase()) ||
            (u.government_id && u.government_id.toUpperCase() === id.toUpperCase())
        );
    },
    checkPhoneExists: (phone) => {
        const db = readDb();
        return Object.values(db.users).some(u => u.phone === phone);
    },
    registerUserConfig: (userId, email, balance, brokerClientId, governmentId, phone, verificationType = "PAN_CARD") => {
        const db = readDb();
        const codeSuffix = Math.floor(100 + Math.random() * 900);
        const prefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').substring(0, 7).toUpperCase();
        db.users[userId] = {
            id: userId,
            email: email,
            balance: balance,
            verification_type: verificationType,
            verification_id: governmentId,
            broker_client_id: brokerClientId,
            government_id: governmentId,
            phone: phone,
            referral_code: `${prefix}${codeSuffix}`,
            referral_days_earned: 0,
            referred_users: [],
            plan_type: 'commission',
            created_at: new Date().toISOString()
        };
        writeDb(db);
    },
    getUserConfig: (userId) => {
        const db = readDb();
        return db.users[userId];
    },
    deleteUserConfig: (userId) => {
        const db = readDb();
        if (db.users[userId]) {
            delete db.users[userId];
        }
        db.portfolio = db.portfolio.filter(p => p.user_id !== userId);
        if (db.limit_orders) {
            db.limit_orders = db.limit_orders.filter(o => o.user_id !== userId);
        }
        writeDb(db);
    },
    addLimitOrder: (userId, symbol, quantity, price, action) => {
        const db = readDb();
        if (!db.limit_orders) db.limit_orders = [];
        const order = {
            id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            user_id: userId,
            symbol: symbol,
            quantity: quantity,
            price: price,
            action: action, // "buy" or "sell"
            status: "pending",
            created_at: new Date().toISOString()
        };
        db.limit_orders.push(order);
        writeDb(db);
        return order;
    },
    getPendingLimitOrders: () => {
        const db = readDb();
        if (!db.limit_orders) return [];
        return db.limit_orders.filter(o => o.status === "pending");
    },
    getUserLimitOrders: (userId) => {
        const db = readDb();
        if (!db.limit_orders) return [];
        return db.limit_orders.filter(o => o.user_id === userId);
    },
    cancelLimitOrder: (orderId) => {
        const db = readDb();
        if (!db.limit_orders) return false;
        const order = db.limit_orders.find(o => o.id === orderId);
        if (order) {
            order.status = "cancelled";
            writeDb(db);
            return true;
        }
        return false;
    },
    executeLimitOrder: (orderId) => {
        const db = readDb();
        if (!db.limit_orders) return false;
        const order = db.limit_orders.find(o => o.id === orderId);
        if (order) {
            order.status = "executed";
            writeDb(db);
            return true;
        }
        return false;
    },
    addSupportRequest: (userId, email, phone, message) => {
        const db = readDb();
        if (!db.support_requests) db.support_requests = [];
        const req = {
            id: Math.random().toString(36).substring(2, 15),
            user_id: userId,
            email: email,
            phone: phone,
            message: message,
            status: "pending",
            created_at: new Date().toISOString()
        };
        db.support_requests.push(req);
        writeDb(db);
        return req;
    },
    getSupportRequests: () => {
        const db = readDb();
        return db.support_requests || [];
    },
    resolveSupportRequest: (reqId) => {
        const db = readDb();
        if (!db.support_requests) return false;
        const req = db.support_requests.find(r => r.id === reqId);
        if (req) {
            req.status = "resolved";
            writeDb(db);
            return true;
        }
        return false;
    },
    applyReferralCode: (newUserId, newEmail, referralCode) => {
        const db = readDb();
        if (!referralCode) return false;
        
        // Find referrer by referral_code
        const referrerId = Object.keys(db.users).find(uid => {
            const u = db.users[uid];
            return u.referral_code && u.referral_code.toUpperCase() === referralCode.trim().toUpperCase();
        });
        
        if (referrerId && referrerId !== newUserId) {
            const referrer = db.users[referrerId];
            if (!referrer.referred_users) referrer.referred_users = [];
            
            // Add to referred list and add 3 days to both
            if (!referrer.referred_users.includes(newEmail)) {
                referrer.referred_users.push(newEmail);
                referrer.referral_days_earned = (referrer.referral_days_earned || 0) + 3;
                
                // Add 3 days to new user config as well
                const newUser = db.users[newUserId];
                if (newUser) {
                    newUser.referral_days_earned = (newUser.referral_days_earned || 0) + 3;
                }
                
                writeDb(db);
                return true;
            }
        }
        return false;
    },
    getUserReferralDetails: (userId) => {
        const db = readDb();
        const u = db.users[userId];
        if (!u) return null;
        const isAdmin = u.email === "akshatmarwadi5@gmail.com";
        const createdTime = new Date(u.created_at || Date.now()).getTime();
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        const isTrialActive = (Date.now() - createdTime) < threeDaysMs;
        return {
            referralCode: u.referral_code || "N/A",
            daysEarned: u.referral_days_earned || 0,
            referredCount: u.referred_users ? u.referred_users.length : 0,
            unpaidInvoice: (isAdmin || isTrialActive) ? 0 : (u.unpaid_commission_invoice || 0),
            dailyProfit: (isAdmin || isTrialActive) ? 0 : (u.daily_profit_accumulated || 0)
        };
    },
    trackTradeProfit: (userId, profit) => {
        const db = readDb();
        const u = db.users[userId];
        if (!u) return null;
        
        const isAdmin = u.email === "akshatmarwadi5@gmail.com";
        const createdTime = new Date(u.created_at || Date.now()).getTime();
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        const isTrialActive = (Date.now() - createdTime) < threeDaysMs;
        if (isAdmin || isTrialActive) {
            writeDb(db);
            return {
                dailyProfit: 0,
                unpaidInvoice: 0
            };
        }
        
        const todayStr = new Date().toISOString().split('T')[0];
        if (u.last_profit_date !== todayStr) {
            u.daily_profit_accumulated = 0;
            u.last_profit_date = todayStr;
        }
        
        u.daily_profit_accumulated = (u.daily_profit_accumulated || 0) + profit;
        
        // Skip commission logic for monthly plan users
        if (u.plan_type === 'monthly') {
            writeDb(db);
            return {
                dailyProfit: u.daily_profit_accumulated,
                unpaidInvoice: 0
            };
        }
        
        // If daily profit hits or exceeds ₹2,000, we instantly generate an unpaid commission invoice (10% flat)
        if (u.daily_profit_accumulated >= 2000) {
            const comm = Math.round(u.daily_profit_accumulated * 0.10);
            u.unpaid_commission_invoice = (u.unpaid_commission_invoice || 0) + comm;
            console.log(`💰 [Invoice Generated] User ${u.email} daily profit ₹${u.daily_profit_accumulated} exceeded threshold. Unpaid invoice raised: ₹${comm}`);
            u.daily_profit_accumulated = 0; // Reset daily profit tracker since invoice is raised
        }
        
        writeDb(db);
        return {
            dailyProfit: u.daily_profit_accumulated,
            unpaidInvoice: u.unpaid_commission_invoice || 0
        };
    },
    payCommissionInvoice: (userId) => {
        const db = readDb();
        const u = db.users[userId];
        if (!u) return false;
        
        u.unpaid_commission_invoice = 0;
        writeDb(db);
        return true;
    },
    checkUserInvoiceLocked: (userId) => {
        const db = readDb();
        const u = db.users[userId];
        if (!u) return false;
        if (u.email === "akshatmarwadi5@gmail.com") return false;
        const createdTime = new Date(u.created_at || Date.now()).getTime();
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        if (Date.now() - createdTime < threeDaysMs) return false;
        return (u.unpaid_commission_invoice || 0) > 0;
    },
    addPaymentRequest: (userId, email, amount, utr, type = "commission") => {
        const db = readDb();
        if (!db.payment_requests) db.payment_requests = [];
        
        const u = db.users[userId];
        if (u && u.is_blocked) {
            throw new Error("⚠️ Account is suspended due to payment fraud.");
        }
        
        // 1. Check for Duplicate UTR
        const isDuplicate = db.payment_requests.some(r => r.utr === utr && r.status !== 'rejected');
        
        // 2. Check for Fake Number Patterns
        const isRepeatedDigits = /^(.)\1{11}$/.test(utr);
        const isSequential = utr === "123456789012" || utr === "987654321098" || utr.startsWith("123456");
        const isInvalidLength = utr.length !== 12;
        
        if (isDuplicate || isRepeatedDigits || isSequential || isInvalidLength) {
            if (u) {
                u.is_blocked = true;
                u.blocked_reason = isDuplicate ? `Duplicate UTR reuse: ${utr}` : `Fake UTR pattern: ${utr}`;
            }
            const req = {
                id: Math.random().toString(36).substring(2, 15),
                user_id: userId,
                email: email,
                amount: amount,
                utr: utr,
                type: type,
                status: "fraud",
                created_at: new Date().toISOString()
            };
            db.payment_requests.push(req);
            writeDb(db);
            throw new Error("⚠️ fraud_detected");
        }
        
        const req = {
            id: Math.random().toString(36).substring(2, 15),
            user_id: userId,
            email: email,
            amount: amount,
            utr: utr,
            type: type,
            status: "pending",
            created_at: new Date().toISOString()
        };
        db.payment_requests.push(req);
        writeDb(db);
        return req;
    },
    getPaymentRequests: () => {
        const db = readDb();
        return db.payment_requests || [];
    },
    approvePaymentRequest: (reqId) => {
        const db = readDb();
        if (!db.payment_requests) return false;
        const req = db.payment_requests.find(r => r.id === reqId);
        if (req) {
            req.status = "approved";
            const u = db.users[req.user_id];
            if (u) {
                if (req.type === "recharge") {
                    u.balance = 100000;
                    console.log(`💰 [Balance Recharged] User ${u.email} balance restored to ₹1,00,000 via manual approval.`);
                } else if (req.type === "monthly") {
                    u.plan_type = 'monthly';
                    u.unpaid_commission_invoice = 0;
                    console.log(`💰 [Plan Upgraded] User ${u.email} upgraded to flat ₹999/month monthly plan and bot unlocked.`);
                } else {
                    u.unpaid_commission_invoice = 0;
                    console.log(`💰 [Invoice Cleared] User ${u.email} bot unlocked.`);
                }
            }
            writeDb(db);
            return true;
        }
        return false;
    },
    rejectPaymentRequest: (reqId) => {
        const db = readDb();
        if (!db.payment_requests) return false;
        const req = db.payment_requests.find(r => r.id === reqId);
        if (req) {
            req.status = "rejected";
            writeDb(db);
            return true;
        }
        return false;
    },
    unblockUser: (userId) => {
        const db = readDb();
        const u = db.users[userId];
        if (u) {
            u.is_blocked = false;
            delete u.blocked_reason;
            writeDb(db);
            return true;
        }
        return false;
    },
    checkUserBlocked: (userId) => {
        const db = readDb();
        const u = db.users[userId];
        return u ? !!u.is_blocked : false;
    }
};
