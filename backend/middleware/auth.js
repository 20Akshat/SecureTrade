const jwt = require('jsonwebtoken');
const localDb = require('../localDb');
const supabase = require('../db');

// Yeh hamara Security Guard hai
const authMiddleware = async (req, res, next) => {
    // 1. Header se token nikalna (Aisa dikhta hai: "Bearer eyJhb...")
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Access Denied: Missing or invalid authorization token." });
    }

    const token = authHeader.split(' ')[1];

    try {
        // 2. Token ki asliyat check karna (Signature match karna)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_trading_key_123');
        
        // Single-device login check (enforces only one login session)
        const u = localDb.getUserConfig(decoded.userId);
        if (u && u.active_token && u.active_token !== token && decoded.email !== "akshatmarwadi5@gmail.com") {
            return res.status(401).json({ error: "Logged in on another device." });
        }

        // 3. Asli user ki details req (request) object mein chipka dena
        req.user = decoded;

        // 4. Strict Identity Verification Check (Backend Gate)
        // Except for document upload / OTP trigger / balance check / admin account
        const exemptedPaths = [
            '/api/user/verify-documents',
            '/api/user/request-otp',
            '/api/balance',
            '/api/support-request'
        ];
        
        const isExempted = exemptedPaths.some(path => req.originalUrl && req.originalUrl.startsWith(path));
        const isAdmin = decoded.email && decoded.email.toLowerCase() === "akshatmarwadi5@gmail.com";

        if (!isExempted && !isAdmin) {
            const userConfig = localDb.getUserConfig(decoded.userId);
            let isVerified = userConfig ? !!userConfig.documents_verified : false;
            
            // Lazy-sync verification status from Supabase Cloud if local database got wiped on Render restart
            if (!isVerified) {
                const { data: kyc } = await supabase.from('portfolio').select('id').eq('user_id', decoded.userId).eq('symbol', 'KYC_VERIFIED').limit(1);
                if (kyc && kyc.length > 0) {
                    isVerified = true;
                    localDb.updateUserDocuments(decoded.userId, decoded.email, "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", true);
                }
            }
            
            if (!isVerified) {
                return res.status(403).json({ 
                    error: "⚠️ Access Denied: Please complete your Email OTP and Aadhaar/PAN Card Identity Verification to unlock trading features!" 
                });
            }
        }
        
        // Sab sahi hai, aage jaane do
        next(); 
    } catch (err) {
        res.status(401).json({ error: "Unauthorized: Token is invalid or has expired." });
    }
};

module.exports = authMiddleware;