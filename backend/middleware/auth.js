const jwt = require('jsonwebtoken');

// Yeh hamara Security Guard hai
const authMiddleware = (req, res, next) => {
    // 1. Header se token nikalna (Aisa dikhta hai: "Bearer eyJhb...")
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Access Denied: Missing or invalid authorization token." });
    }

    const token = authHeader.split(' ')[1];

    try {
        // 2. Token ki asliyat check karna (Signature match karna)
        // Agar yeh hacker ka banaya hua token hua, toh yeh line error phenk degi
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_trading_key_123');
        
        // 3. Asli user ki details req (request) object mein chipka dena
        req.user = decoded;
        
        // 4. Sab sahi hai, aage jaane do
        next(); 
    } catch (err) {
        res.status(401).json({ error: "Unauthorized: Token is invalid or has expired." });
    }
};

module.exports = authMiddleware;