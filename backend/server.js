require('dotenv').config();
require('./db');

// Automatic Console Unfreeze: Disables QuickEdit mode on Windows to prevent terminal clicks from freezing Node.js
if (process.platform === 'win32') {
    const { spawnSync } = require('child_process');
    const psCommand = `
    $code = '
    [DllImport("kernel32.dll")] public static extern IntPtr GetStdHandle(int nStdHandle); 
    [DllImport("kernel32.dll")] public static extern bool GetConsoleMode(IntPtr hConsoleHandle, out uint lpMode); 
    [DllImport("kernel32.dll")] public static extern bool SetConsoleMode(IntPtr hConsoleHandle, uint dwMode);
    ';
    $type = Add-Type -MemberDefinition $code -Name "Win32Utils" -Namespace "Win32" -PassThru;
    $handle = $type::GetStdHandle(-10);
    $mode = 0;
    if ($type::GetConsoleMode($handle, [ref]$mode)) {
        $mode = $mode -band -not 0x0040; // Remove ENABLE_QUICK_EDIT (0x0040)
        $type::SetConsoleMode($handle, $mode);
        Write-Host "✅ QuickEdit console mode disabled successfully!";
    }
    `;
    spawnSync('powershell', ['-Command', psCommand], { stdio: 'inherit' });
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { WebSocketServer } = require('ws');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const speakeasy = require('speakeasy');
const supabase = require('./db');
const localDb = require('./localDb');
const authMiddleware = require('./middleware/auth');
const kyc = require('./utils/kyc');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const vision = require('./utils/vision');
const http = require('http');
const https = require('https');

// Initialize keep-alive HTTP/HTTPS Agents to reuse TCP connections and prevent socket pool starvation
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 100 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 100 });
axios.defaults.httpAgent = httpAgent;
axios.defaults.httpsAgent = httpsAgent;
axios.defaults.timeout = 4000; // 4s default timeout for all HTTP requests

const app = express();
const PORT = process.env.PORT || 5001;

// Database query caches to prevent Supabase query spamming
const userPortfolioCache = {};
const userTradesCache = {};
const activePortfolioQueries = {};
const activeTradesQueries = {};

// Load & Index Angel One Scrip Master
const scripMap = {};
const scripMasterPath = require('path').join(__dirname, 'OpenAPIScripMaster.json');
console.log("⏳ Loading and indexing OpenAPIScripMaster.json...");
if (require('fs').existsSync(scripMasterPath)) {
    try {
        const scrips = JSON.parse(require('fs').readFileSync(scripMasterPath, 'utf8'));
        scrips.forEach(s => {
            if (s.instrumenttype === 'OPTIDX' && (s.name === 'NIFTY' || s.name === 'BANKNIFTY' || s.name === 'SENSEX')) {
                const strikeVal = Math.round(parseFloat(s.strike) / 100);
                const optionType = s.symbol.endsWith('CE') ? 'CE' : 'PE';
                const key = `${s.name}_${s.expiry}_${strikeVal}_${optionType}`;
                scripMap[key] = {
                    token: s.token,
                    symbol: s.symbol,
                    exch_seg: s.exch_seg,
                    lotsize: Number(s.lotsize)
                };
            }
        });
        console.log(`✅ Indexed ${Object.keys(scripMap).length} option contracts successfully!`);
    } catch (err) {
        console.error("❌ Failed to parse OpenAPIScripMaster.json:", err.message);
    }
} else {
    console.error("❌ OpenAPIScripMaster.json not found in backend directory!");
}

app.use(helmet());
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (
            origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:') ||
            origin === 'http://localhost' ||
            origin === 'http://127.0.0.1' ||
            origin === process.env.FRONTEND_URL
        ) {
            return callback(null, true);
        }
        callback(null, origin);
    },
    credentials: true
}));
app.use(rateLimit({ max: 1000000 }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => res.json({ message: "SecureTrade API is running! 📈🔒" }));

const tempOtps = {};

// TEST EMAIL ENDPOINT
app.get('/api/debug/test-email', async (req, res) => {
    try {
        const result = await require('./utils/email').sendEmailOtp("akshatmarwadi5@gmail.com", "999999");
        res.json({ message: "Test trigger completed", result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const { validateEmail, validatePhone } = require('./utils/validators');

// REQUEST OTP FOR EXISTING USER (Login verification)
app.post('/api/user/request-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email is required!" });
        }

        // Verify user exists
        const userRes = await supabase.from('users').select('id').eq('email', email).single();
        if (!userRes.data) {
            return res.status(404).json({ error: "User not found. Please signup first." });
        }

        // Generate Email OTP
        const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP
        tempOtps[email] = {
            emailOtp,
            attempts: 0,
            expires: Date.now() + 10 * 60 * 1000 // 10 minutes
        };

        // Send Email OTP
        const emailResult = await require('./utils/email').sendEmailOtp(email, emailOtp);

        const emailConfigured = !!process.env.EMAIL_USER;

        res.status(200).json({
            message: "Verification OTP triggered successfully!",
            simulated: !emailConfigured,
            emailOtp: emailConfigured ? undefined : emailOtp
        });
    } catch (err) {
        console.error("OTP request error:", err.message);
        res.status(500).json({ error: "Failed to trigger OTPs. Please try again." });
    }
});

// REQUEST SIGNUP OTP
app.post('/api/signup/request-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email address is required!" });
        }

        // Validate email format + check for disposable domains
        const emailCheck = validateEmail(email);
        if (!emailCheck.valid) {
            return res.status(400).json({ error: emailCheck.error });
        }

        // Check if email already registered in Supabase
        const emailExists = await supabase.from('users').select('id').eq('email', email);
        if (emailExists.data && emailExists.data.length > 0) {
            return res.status(400).json({ error: "Email is already registered!" });
        }

        // Generate 6-digit verification code
        const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP
        tempOtps[email] = {
            emailOtp,
            attempts: 0,
            expires: Date.now() + 10 * 60 * 1000 // 10 minutes
        };

        // Send Email OTP
        await require('./utils/email').sendEmailOtp(email, emailOtp);

        const emailConfigured = !!process.env.EMAIL_USER;

        res.status(200).json({ 
            message: "Verification OTP triggered successfully! Please check your Email.",
            simulated: !emailConfigured,
            emailOtp: emailConfigured ? undefined : emailOtp
        });
    } catch (err) {
        console.error("OTP request error:", err.message);
        res.status(500).json({ error: "Failed to trigger OTPs. Please try again." });
    }
});

// SIGNUP
app.post('/api/signup', upload.fields([{ name: 'panFile', maxCount: 1 }, { name: 'aadhaarFile', maxCount: 1 }]), async (req, res) => {
    try {
        const { email, password, phone, brokerClientId, panNumber, aadhaarNumber, emailOtp, referralCode } = req.body;
        if (!email || !password || !phone || !aadhaarNumber || !emailOtp) {
            return res.status(400).json({ error: "All profile and verification OTP fields are required!" });
        }
        if (!panNumber && !brokerClientId) {
            return res.status(400).json({ error: "Either PAN Card Number or Broker Client ID is required!" });
        }

        // Validate email format + block disposable domains
        const emailCheck = validateEmail(email);
        if (!emailCheck.valid) {
            return res.status(400).json({ error: emailCheck.error });
        }

        // Validate Indian phone number
        const phoneCheck = validatePhone(phone);
        if (!phoneCheck.valid) {
            return res.status(400).json({ error: phoneCheck.error });
        }

        // Check if blocklisted
        if (localDb.isBlocklisted(email)) {
            return res.status(403).json({ error: "This user email is blocked due to security reasons!" });
        }

        // 1. Verify OTPs and increment attempts on failure
        const stored = tempOtps[email];
        if (!stored || stored.phone !== phone) {
            return res.status(400).json({ error: "Session expired or mobile mismatch. Please request OTP again." });
        }
        if (Date.now() > stored.expires) {
            delete tempOtps[email];
            return res.status(400).json({ error: "OTP expired. Please request a new OTP." });
        }

        const failCheck = (errMsg) => {
            stored.attempts += 1;
            if (stored.attempts >= 3) {
                localDb.blockUser(email, "Not Provided", "Failed signup verification attempts 3 times.");
                delete tempOtps[email];
                return res.status(403).json({ error: "You have failed verification 3 times and your identity is now blocked!" });
            }
            return res.status(400).json({ error: `${errMsg} (Attempts: ${stored.attempts}/3)` });
        };

        if (stored.emailOtp !== emailOtp) {
            return failCheck("Invalid Email verification OTP!");
        }
        if (stored.mobileOtp !== mobileOtp) {
            return failCheck("Invalid Mobile verification OTP!");
        }

        // Clear verified OTP
        delete tempOtps[email];

        // 2. Validate Aadhaar using Verhoeff checksum algorithm
        if (!kyc.validateAadhaar(aadhaarNumber)) {
            return failCheck("Invalid Aadhaar Card Number! Please enter a real 12-digit Aadhaar (must not start with 0 or 1).");
        }

        // 3. Validate PAN or Broker ID
        if (panNumber) {
            if (!kyc.validatePANFormat(panNumber)) {
                return failCheck("Invalid PAN Card format! Must be 10 characters like ABCDE1234F.");
            }
            // Verify PAN live with Government registry (if API configured)
            const panCheck = await kyc.verifyPanWithGov(panNumber);
            if (!panCheck.success) {
                return failCheck(panCheck.error);
            }
        }
        if (brokerClientId) {
            const brokerCheck = kyc.validateBrokerClientId(brokerClientId);
            if (!brokerCheck.valid) {
                return failCheck(brokerCheck.error);
            }
        }

        // 4. Verify screenshots upload
        const panFile = req.files?.['panFile']?.[0]; // Reused as secondDocFile
        const aadhaarFile = req.files?.['aadhaarFile']?.[0];
        if (!panFile || !aadhaarFile) {
            return failCheck("Both Aadhaar Card screenshot and your secondary document (PAN or Broker screenshot) are mandatory!");
        }

        // 5. Gemini Vision Verification
        const panBuffer = fs.readFileSync(panFile.path);
        const expectedText = panNumber || brokerClientId;
        const docTypeLabel = panNumber ? "PAN Card" : "Broker Profile";
        const panVerify = await vision.verifyDocumentImage(panBuffer, panFile.mimetype, expectedText, docTypeLabel);
        if (!panVerify.success || !panVerify.isAuthentic || !panVerify.matched) {
            fs.unlinkSync(panFile.path);
            fs.unlinkSync(aadhaarFile.path);
            return failCheck(`${docTypeLabel} image verification failed: ${panVerify.reason || "Details do not match or manipulation detected!"}`);
        }

        const aadhaarBuffer = fs.readFileSync(aadhaarFile.path);
        const aadhaarVerify = await vision.verifyDocumentImage(aadhaarBuffer, aadhaarFile.mimetype, aadhaarNumber, "Aadhaar Card");
        if (!aadhaarVerify.success || !aadhaarVerify.isAuthentic || !aadhaarVerify.matched) {
            fs.unlinkSync(panFile.path);
            fs.unlinkSync(aadhaarFile.path);
            return failCheck(`Aadhaar image verification failed: ${aadhaarVerify.reason || "Details do not match or manipulation detected!"}`);
        }

        // Anti-bypass duplicate locks
        if (brokerClientId && localDb.checkVerificationIdExists(brokerClientId)) {
            fs.unlinkSync(panFile.path);
            fs.unlinkSync(aadhaarFile.path);
            return failCheck("This Broker Client ID is already registered!");
        }
        if (panNumber && localDb.checkVerificationIdExists(panNumber)) {
            fs.unlinkSync(panFile.path);
            fs.unlinkSync(aadhaarFile.path);
            return failCheck("This PAN Card Number is already registered!");
        }
        if (localDb.checkVerificationIdExists(aadhaarNumber)) {
            fs.unlinkSync(panFile.path);
            fs.unlinkSync(aadhaarFile.path);
            return failCheck("This Aadhaar Card Number is already registered!");
        }

        // Move files to permanent location
        const panDest = path.join(__dirname, 'uploads/verified', `${email.replace(/[^a-zA-Z0-9]/g, '')}_pan.png`);
        const aadhaarDest = path.join(__dirname, 'uploads/verified', `${email.replace(/[^a-zA-Z0-9]/g, '')}_aadhaar.png`);
        fs.mkdirSync(path.dirname(panDest), { recursive: true });
        fs.renameSync(panFile.path, panDest);
        fs.renameSync(aadhaarFile.path, aadhaarDest);

        const hashedPassword = await bcrypt.hash(password, 10);
        const { data, error } = await supabase.from('users').insert([{ email, password: hashedPassword }]).select();
        if (error) {
            fs.unlinkSync(panDest);
            fs.unlinkSync(aadhaarDest);
            return res.status(400).json({ error: "Email already registered!" });
        }

        // Save local configs (verified status true)
        localDb.registerUserConfig(data[0].id, data[0].email, data[0].balance, brokerClientId || "N/A", panNumber || "N/A", aadhaarNumber, "N/A", true, panDest, aadhaarDest);

        // Apply referral code if present
        if (referralCode) {
            const applied = localDb.applyReferralCode(data[0].id, data[0].email, referralCode);
            if (applied) {
                console.log(`🎁 [Referral Applied] New user ${data[0].email} signed up with code ${referralCode}`);
            }
        }

        res.status(201).json({ message: "Account created! 🎉", user: data[0].email });
    } catch (err) { 
        console.error("Signup error details:", err.message);
        res.status(500).json({ error: "Signup error." }); 
    }
});

// EXISTING USER REQUEST OTP
app.post('/api/user/request-otp', authMiddleware, async (req, res) => {
    try {
        const email = req.user.email;

        // Generate 6-digit verification code
        const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP in tempOtps using email
        tempOtps[email] = {
            emailOtp,
            attempts: 0,
            expires: Date.now() + 10 * 60 * 1000 // 10 minutes
        };

        // Send Email OTP
        await require('./utils/email').sendEmailOtp(email, emailOtp);

        const emailConfigured = !!process.env.EMAIL_USER;

        res.status(200).json({ 
            message: "Verification OTP triggered successfully! Please check your Email.",
            simulated: !emailConfigured,
            emailOtp: emailConfigured ? undefined : emailOtp
        });
    } catch (err) {
        console.error("User OTP request error:", err.message);
        res.status(500).json({ error: "Failed to trigger OTPs. Please try again." });
    }
});

// EXISTING USER DOCUMENT UPLOAD & AI VERIFICATION
app.post('/api/user/verify-documents', authMiddleware, upload.fields([{ name: 'panFile', maxCount: 1 }, { name: 'aadhaarFile', maxCount: 1 }]), async (req, res) => {
    try {
        const { panNumber, aadhaarNumber, brokerClientId, emailOtp } = req.body;
        const userId = req.user.userId;
        const email = req.user.email;

        if (!aadhaarNumber || !emailOtp) {
            return res.status(400).json({ error: "Aadhaar number and Email verification OTP are required!" });
        }
        if (!panNumber && !brokerClientId) {
            return res.status(400).json({ error: "Either PAN Card or Broker Client ID is required!" });
        }

        // Check if blocklisted
        if (localDb.isBlocklisted(email, phone)) {
            return res.status(403).json({ error: "This user/mobile number is blocked due to security reasons!" });
        }

        // 1. Verify OTPs
        const stored = tempOtps[email];
        if (!stored) {
            return res.status(400).json({ error: "Session expired. Please login again to get fresh OTPs." });
        }
        if (Date.now() > stored.expires) {
            delete tempOtps[email];
            return res.status(400).json({ error: "OTP expired. Please login again to get new OTPs." });
        }

        const failCheck = (errMsg) => {
            stored.attempts += 1;
            if (stored.attempts >= 3) {
                localDb.blockUser(email, phone || "Not Provided", "Failed signup verification attempts 3 times.");
                delete tempOtps[email];
                return res.status(403).json({ error: "You have failed verification 3 times and your identity is now blocked!" });
            }
            return res.status(400).json({ error: `${errMsg} (Attempts: ${stored.attempts}/3)` });
        };

        if (stored.emailOtp !== emailOtp) {
            return failCheck("Invalid Email verification OTP!");
        }

        // Clear verified OTP
        delete tempOtps[email];

        // 2. Validate Aadhaar using Verhoeff checksum algorithm
        if (!kyc.validateAadhaar(aadhaarNumber)) {
            return failCheck("Invalid Aadhaar Card Number! Please enter a real 12-digit Aadhaar (must not start with 0 or 1).");
        }

        // 3. Validate PAN format or Broker ID
        if (panNumber && !kyc.validatePANFormat(panNumber)) {
            return failCheck("Invalid PAN Card format! Must be like ABCDE1234F.");
        }
        if (brokerClientId) {
            const brokerCheck = kyc.validateBrokerClientId(brokerClientId);
            if (!brokerCheck.valid) {
                return failCheck(brokerCheck.error);
            }
        }

        // 3. Verify files present
        const panFile = req.files?.['panFile']?.[0];
        const aadhaarFile = req.files?.['aadhaarFile']?.[0];
        if (!panFile || !aadhaarFile) {
            return failCheck("Both Aadhaar screenshot and your secondary document (PAN or Broker screenshot) are required!");
        }

        // 4. Gemini Vision AI validation
        const panBuffer = fs.readFileSync(panFile.path);
        const expectedText = panNumber || brokerClientId;
        const docTypeLabel = panNumber ? "PAN Card" : "Broker Profile";
        const panVerify = await vision.verifyDocumentImage(panBuffer, panFile.mimetype, expectedText, docTypeLabel);
        if (!panVerify.success || !panVerify.isAuthentic || !panVerify.matched) {
            fs.unlinkSync(panFile.path);
            fs.unlinkSync(aadhaarFile.path);
            return failCheck(`${docTypeLabel} verification failed: ${panVerify.reason || "Details do not match!"}`);
        }

        const aadhaarBuffer = fs.readFileSync(aadhaarFile.path);
        const aadhaarVerify = await vision.verifyDocumentImage(aadhaarBuffer, aadhaarFile.mimetype, aadhaarNumber, "Aadhaar Card");
        if (!aadhaarVerify.success || !aadhaarVerify.isAuthentic || !aadhaarVerify.matched) {
            fs.unlinkSync(panFile.path);
            fs.unlinkSync(aadhaarFile.path);
            return failCheck(`Aadhaar verification failed: ${aadhaarVerify.reason || "Details do not match!"}`);
        }

        // Move to verified uploads folder
        const panDest = path.join(__dirname, 'uploads/verified', `${userId}_pan.png`);
        const aadhaarDest = path.join(__dirname, 'uploads/verified', `${userId}_aadhaar.png`);
        fs.mkdirSync(path.dirname(panDest), { recursive: true });
        fs.renameSync(panFile.path, panDest);
        fs.renameSync(aadhaarFile.path, aadhaarDest);

        // Update in localDb
        localDb.updateUserDocuments(userId, email, phone, brokerClientId || "N/A", panNumber || "N/A", aadhaarNumber, panDest, aadhaarDest, true);

        res.status(200).json({ message: "Documents verified successfully! Access granted.", verified: true });
    } catch (err) {
        console.error("User verify document error:", err.message);
        res.status(500).json({ error: "Failed to verify documents." });
    }
});

// LOGIN
// LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
        if (error || !data) return res.status(401).json({ error: "Invalid email or password." });
        const isPasswordCorrect = await bcrypt.compare(password, data.password);
        if (!isPasswordCorrect) return res.status(401).json({ error: "Invalid email or password." });
        const token = jwt.sign({ userId: data.id, email: data.email }, process.env.JWT_SECRET || 'super_secret_trading_key_123', { expiresIn: '1d' });
        localDb.saveActiveToken(data.id, token);

        // Retrieve user config to check verification status
        const userConfig = localDb.getUserConfig(data.id) || {};
        const isVerified = !!userConfig.documents_verified;

        // If not verified, generate and send Email OTP
        let otpInfo = { otpSent: false };
        if (!isVerified) {
            const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
            tempOtps[email] = {
                emailOtp,
                attempts: 0,
                expires: Date.now() + 10 * 60 * 1000
            };
            const emailResult = await require('./utils/email').sendEmailOtp(email, emailOtp);
            otpInfo = {
                otpSent: true,
                simulatedEmail: emailResult.simulated || false
            };
        }

        // Respond with verification status and OTP info
        res.status(200).json({
            message: "Login Successful! 🚀",
            token,
            balance: data.balance,
            email: data.email,
            phone: userConfig.phone || "",
            documents_verified: isVerified,
            ...otpInfo
        });
    } catch (err) { res.status(500).json({ error: "Login error." }); }
});

const otpStore = {};

// FORGOT PASSWORD - REQUEST OTP
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required!" });

        // Verify user exists
        const { data: user, error } = await supabase.from('users').select('id').eq('email', email).single();
        if (error || !user) return res.status(404).json({ error: "Account not found!" });

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[email] = {
            otp,
            expiry: Date.now() + 10 * 60 * 1000 // 10 minutes
        };

        // Print to console and save to local debug file
        console.log(`🔑 [DEBUG OTP] Forgot password code for ${email}: ${otp}`);
        const debugPath = path.join(__dirname, '../scratch/otp_debug.log');
        fs.appendFileSync(debugPath, `[${new Date().toISOString()}] OTP for ${email}: ${otp}\n`, 'utf8');

        // Send OTP via email (if SMTP configured) and get simulated flag
        const emailResult = await require('./utils/email').sendEmailOtp(email, otp);

        // Respond indicating whether real email was sent or simulated
        res.status(200).json({
            message: emailResult.simulated
                ? "OTP generated in demo mode. Check console logs or otp_debug.log."
                : "OTP sent to your email successfully!",
            simulated: emailResult.simulated,
            emailOtp: emailResult.simulated ? otp : undefined
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to request OTP." });
    }
});

// VERIFY OTP AND RESET PASSWORD
app.post('/api/auth/verify-otp-reset', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ error: "All fields are required!" });
        }

        const storedRecord = otpStore[email];
        if (!storedRecord) return res.status(400).json({ error: "OTP not requested or expired!" });
        if (Date.now() > storedRecord.expiry) {
            delete otpStore[email];
            return res.status(400).json({ error: "OTP expired!" });
        }
        if (storedRecord.otp !== otp) return res.status(400).json({ error: "Invalid OTP code!" });

        // Update password in Supabase
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const { error } = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('email', email);

        if (error) throw error;
        
        // Clean up OTP store
        delete otpStore[email];

        res.status(200).json({ message: "Password reset successful! 🎉 Please login." });
    } catch (err) {
        console.error("Password reset error:", err.message);
        res.status(500).json({ error: "Password reset error." });
    }
});

// SEND SMS NOTIFICATION ALERT
app.post('/api/send-sms', authMiddleware, async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user.userId;

        if (!message) return res.status(400).json({ error: "Message content is required!" });

        // Lookup phone number from localDb
        const user = localDb.getUserConfig(userId);
        const phone = user ? user.phone : null;
        if (!phone) {
            return res.status(400).json({ error: "Mobile number not registered for SMS alerts!" });
        }

        console.log(`📱 [SMS TRIGGERED to ${phone}]: ${message}`);
        
        // Write to local scratch log
        const logPath = path.join(__dirname, '../scratch/sms_alerts.log');
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] To ${phone}: ${message}\n`, 'utf8');

        // Twilio SMS Integration
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
            try {
                const twilio = require('twilio');
                const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                await client.messages.create({
                    body: message,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: phone.startsWith('+') ? phone : `+91${phone}`
                });
                console.log("Twilio SMS sent successfully!");
            } catch (err) {
                console.error("Twilio SMS failed:", err.message);
            }
        }

        res.json({ success: true, message: "SMS Alert dispatched." });
    } catch (err) {
        console.error("Send SMS endpoint error:", err.message);
        res.status(500).json({ error: "Failed to dispatch SMS." });
    }
});

const adminMiddleware = (req, res, next) => {
    if (!req.user || req.user.email !== 'akshatmarwadi5@gmail.com') {
        return res.status(403).json({ error: "Access denied. Admins only." });
    }
    next();
};

// ADMIN: GET ALL USERS
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase.from('users').select('id, email, balance, created_at');
        if (error) throw error;

        const users = data.map(u => {
            const config = localDb.getUserConfig(u.id) || {};
            const clientVal = config.verification_id || config.angel_client_code || "Not Set";
            const typeLabel = config.verification_type ? ` [${config.verification_type.replace('_', ' ')}]` : '';
            return {
                id: u.id,
                email: u.email,
                balance: u.balance,
                createdAt: u.created_at,
                phone: config.phone || "Not Set",
                angelClientCode: `${clientVal}${typeLabel}`
            };
        });

        res.json(users);
    } catch (err) {
        console.error("Admin fetch users error:", err.message);
        res.status(500).json({ error: "Failed to fetch users." });
    }
});

// ADMIN: DELETE USER
app.delete('/api/admin/users/:userId', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const { error } = await supabase.from('users').delete().eq('id', userId);
        if (error) throw error;

        localDb.deleteUserConfig(userId);
        res.json({ success: true, message: "User deleted successfully." });
    } catch (err) {
        console.error("Admin delete user error:", err.message);
        res.status(550).json({ error: "Failed to delete user." });
    }
});

// ADMIN: RESET USER BALANCE
app.post('/api/admin/reset-balance', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "User ID required." });

        const resetVal = 100000;
        const { error } = await supabase.from('users').update({ balance: resetVal }).eq('id', userId);
        if (error) throw error;

        const userConfig = localDb.getUserConfig(userId);
        localDb.updateUserBalance(userId, resetVal, userConfig ? userConfig.email : "");

        res.json({ success: true, message: `Balance reset to ₹1,00,000 for user.` });
    } catch (err) {
        console.error("Admin reset balance error:", err.message);
        res.status(500).json({ error: "Failed to reset balance." });
    }
});

// PLACE LIMIT ORDER
app.post('/api/limit-order', authMiddleware, async (req, res) => {
    try {
        const { symbol, quantity, price, action } = req.body;
        const userId = req.user.userId;

        if (!symbol || !quantity || !price || !action) {
            return res.status(400).json({ error: "All fields (symbol, quantity, price, action) are required!" });
        }

        const parsedPrice = parseFloat(price);
        const parsedQty = parseInt(quantity);
        if (isNaN(parsedPrice) || parsedPrice <= 0 || isNaN(parsedQty) || parsedQty <= 0) {
            return res.status(400).json({ error: "Invalid price or quantity." });
        }

        // Add to local limit orders list
        const order = localDb.addLimitOrder(userId, symbol, parsedQty, parsedPrice, action);
        console.log(`🎯 [Limit Order Placed] User ${req.user.email} placed ${action.toUpperCase()} limit order for ${symbol} @ ₹${parsedPrice}`);

        res.status(201).json({ message: "Limit order placed successfully! 🎯", order });
    } catch (err) {
        console.error("Limit order error:", err.message);
        res.status(500).json({ error: "Failed to place limit order." });
    }
});

// GET USER'S LIMIT ORDERS
app.get('/api/limit-orders', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const orders = localDb.getUserLimitOrders(userId);
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch limit orders." });
    }
});

// CANCEL LIMIT ORDER
app.delete('/api/limit-order/:orderId', authMiddleware, async (req, res) => {
    try {
        const { orderId } = req.params;
        const success = localDb.cancelLimitOrder(orderId);
        if (!success) return res.status(404).json({ error: "Limit order not found or already processed." });
        res.json({ success: true, message: "Limit order cancelled successfully." });
    } catch (err) {
        res.status(500).json({ error: "Failed to cancel limit order." });
    }
});

// CREATE SUPPORT CALLBACK REQUEST
app.post('/api/support-request', authMiddleware, async (req, res) => {
    try {
        const { message, phone } = req.body;
        const userId = req.user.userId;
        
        const request = localDb.addSupportRequest(
            userId,
            req.user.email,
            phone || "Not Provided",
            message || "Tech support query from terminal"
        );
        console.log(`🔧 [Support Request Raised] User ${req.user.email} requested callback: ${message} (Contact: ${phone})`);
        res.status(201).json({ success: true, message: "Callback request registered. Admin will contact you shortly! 📞", request });
    } catch (err) {
        res.status(500).json({ error: "Failed to submit support request." });
    }
});

// ADMIN: GET ALL SUPPORT REQUESTS
app.get('/api/admin/support-requests', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const requests = localDb.getSupportRequests();
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch support requests." });
    }
});

// ADMIN: RESOLVE SUPPORT REQUEST
app.post('/api/admin/support-requests/:requestId/resolve', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { requestId } = req.params;
        const success = localDb.resolveSupportRequest(requestId);
        if (!success) return res.status(404).json({ error: "Support request not found." });
        res.json({ success: true, message: "Support request resolved." });
    } catch (err) {
        res.status(500).json({ error: "Failed to resolve support request." });
    }
});

// Background Limit Order Execution engine (every 1 second)
setInterval(async () => {
    try {
        const pendingOrders = localDb.getPendingLimitOrders();
        if (pendingOrders.length === 0) return;

        for (const order of pendingOrders) {
            const { id, user_id, symbol, quantity, price: limitPrice, action } = order;

            // Fetch current LTP of this option/index
            let ltp = 0;
            const parsed = parseOptionSymbol(symbol);
            if (parsed) {
                const key = `${parsed.scripName}_${parsed.scripExpiry}_${parsed.strike}_${parsed.type}`;
                const item = scripMap[key];
                if (item && optionQuotesCache[item.token]) {
                    ltp = optionQuotesCache[item.token].price || 0;
                }
            } else {
                // It is an index
                const underlying = symbol === "NIFTY" ? "NIFTY50" : symbol.toUpperCase();
                if (marketState[underlying]) {
                    ltp = marketState[underlying].currentPrice || 0;
                }
            }

            if (ltp <= 0) continue; // Skip if price not available

            let shouldTrigger = false;
            if (action === "buy" && ltp <= limitPrice) {
                shouldTrigger = true;
            } else if (action === "sell" && ltp >= limitPrice) {
                shouldTrigger = true;
            }

            if (shouldTrigger) {
                console.log(`⚡ [Limit Order Triggered!] Order ${id} for ${symbol} matches LTP ₹${ltp} vs Limit ₹${limitPrice}`);
                
                // Set the limit order status to executed
                localDb.executeLimitOrder(id);

                const userConfig = localDb.getUserConfig(user_id);
                const currentBalance = userConfig ? userConfig.balance : 100000;
                const cost = ltp * quantity;

                if (action === "buy") {
                    if (currentBalance >= cost) {
                        const newBalance = currentBalance - cost;
                        const { error: balanceErr } = await supabase.from('users').update({ balance: newBalance }).eq('id', user_id);
                        if (!balanceErr) {
                            // Insert trade into Supabase portfolio table
                            await supabase.from('portfolio').insert([{ user_id, symbol, quantity, average_price: ltp }]);
                            localDb.updateUserBalance(user_id, newBalance, userConfig ? userConfig.email : "");
                            const addedTrade = localDb.addTrade(user_id, symbol, quantity, ltp);
                            
                            // Update local portfolio cache
                            if (userPortfolioCache[user_id]) {
                                userPortfolioCache[user_id].push(addedTrade);
                            } else {
                                userPortfolioCache[user_id] = localDb.getPortfolio(user_id);
                            }
                            delete userTradesCache[user_id];
                            
                            console.log(`✅ [Limit Order Executed] Bought ${quantity} shares of ${symbol} @ ₹${ltp} for user ${user_id}`);
                        }
                    } else {
                        console.warn(`❌ [Limit Order Failed] Insufficient balance for user ${user_id} to buy ${symbol}`);
                        // Mark order failed
                        const db = localDb.readDb();
                        const ord = db.limit_orders.find(o => o.id === id);
                        if (ord) ord.status = "failed";
                        localDb.writeDb(db);
                    }
                } else {
                    const portfolio = localDb.getPortfolio(user_id);
                    const openPos = portfolio.filter(p => p.symbol === symbol && p.status === 'open');
                    
                    if (openPos.length > 0) {
                        const totalOpenQty = openPos.reduce((sum, p) => sum + p.quantity, 0);
                        const sellQty = Math.min(totalOpenQty, quantity);
                        
                        const newBalance = currentBalance + (ltp * sellQty);
                        const { error: balanceErr } = await supabase.from('users').update({ balance: newBalance }).eq('id', user_id);
                        if (!balanceErr) {
                            // Insert trade into Supabase portfolio table
                            await supabase.from('portfolio').insert([{ user_id, symbol, quantity: -sellQty, average_price: ltp }]);
                            localDb.updateUserBalance(user_id, newBalance, userConfig ? userConfig.email : "");
                            const addedTrade = localDb.addTrade(user_id, symbol, -sellQty, ltp);
                            
                            // Update local portfolio cache
                            if (userPortfolioCache[user_id]) {
                                userPortfolioCache[user_id].push(addedTrade);
                            } else {
                                userPortfolioCache[user_id] = localDb.getPortfolio(user_id);
                            }
                            delete userTradesCache[user_id];
                            
                            console.log(`✅ [Limit Order Executed] Sold ${sellQty} shares of ${symbol} @ ₹${ltp} for user ${user_id}`);
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error("Limit order background scanning error:", err.message);
    }
}, 1000);

// Daily Loss Limit (Max 5% of 1 Lakh = ₹5,000) check to prevent major drawdown
async function checkDailyLossLimit(userId) {
    try {
        const { data: trades, error } = await supabase
            .from('portfolio')
            .select('*')
            .eq('user_id', userId);
        if (error || !trades) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTrades = trades.filter(t => new Date(t.created_at) >= today);

        const symbolStats = {};
        let totalPnl = 0;

        todayTrades.forEach(t => {
            const qty = Number(t.quantity);
            const price = Number(t.average_price);
            const symbol = t.symbol;

            if (!symbolStats[symbol]) {
                symbolStats[symbol] = { runningQty: 0, runningAvgBuyPrice: 0 };
            }

            const stats = symbolStats[symbol];
            if (qty > 0) {
                const totalCost = (stats.runningAvgBuyPrice * stats.runningQty) + (qty * price);
                stats.runningQty += qty;
                stats.runningAvgBuyPrice = stats.runningQty > 0 ? totalCost / stats.runningQty : 0;
            } else {
                const buyPrice = stats.runningAvgBuyPrice;
                const pnl = Math.abs(qty) * (price - buyPrice);
                totalPnl += pnl;
                stats.runningQty += qty;
                if (stats.runningQty <= 0) {
                    stats.runningQty = 0;
                    stats.runningAvgBuyPrice = 0;
                }
            }
        });

        return totalPnl <= -5000;
    } catch (err) {
        console.error("Error checking daily loss limit:", err);
        return false;
    }
}

const userLocks = {};

async function acquireLock(userId) {
    while (userLocks[userId]) {
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    userLocks[userId] = true;
}

function releaseLock(userId) {
    delete userLocks[userId];
}

// BUY
app.post('/api/buy', authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    const { symbol, quantity, isAutoTrade } = req.body;
    console.log(`📥 [API BUY] Received: User=${userId}, Symbol=${symbol}, Qty=${quantity}, Auto=${isAutoTrade}`);
    if (localDb.checkUserBlocked(userId)) {
        return res.status(403).json({ error: "⚠️ Your account has been permanently blocked due to a payment fraud attempt (Fake UTR Ref). Contact admin for review." });
    }
    if (!checkIsMarketOpen()) {
        return res.status(400).json({ error: "Market is closed. Trading is only allowed between 9:15 AM and 3:30 PM IST on weekdays." });
    }
    if (isAutoTrade && localDb.checkUserInvoiceLocked(userId)) {
        return res.status(403).json({ error: "Your bot is locked due to an unpaid commission invoice! Please pay the flat 10% commission on your Admin panel or support chat to unlock." });
    }
    try {
        await acquireLock(userId);
        let executionPrice;
        if (req.body.price && !isNaN(Number(req.body.price)) && Number(req.body.price) > 0) {
            executionPrice = Number(req.body.price);
            console.log(`⚡ [API BUY] Using client-provided price: ₹${executionPrice}`);
        } else {
            try {
                executionPrice = await getLivePriceForSymbol(symbol);
            } catch (priceErr) {
                console.error(`❌ [API BUY] Price fetch error: ${priceErr.message}`);
                // Last resort fallback: Black-Scholes calculation
                try {
                    const parsed = parseOptionSymbol(symbol);
                    if (parsed) {
                        const spotSymbol = parsed.scripName === 'NIFTY' ? 'NIFTY50' : parsed.scripName;
                        const spot = marketState[spotSymbol]?.currentPrice || marketState[spotSymbol]?.realPrice || 24500;
                        const isCall = parsed.type === "CE";
                        const strike = parseFloat(parsed.strike);
                        const dte = parseDteFromSymbol(symbol);
                        const iv = parsed.scripName === "BANKNIFTY" ? 0.16 : 0.13;
                        executionPrice = runBlackScholes(spot, strike, dte, isCall, iv);
                        console.log(`⚠️ [API BUY] Fallback: Computed Black-Scholes price: ₹${executionPrice}`);
                    }
                } catch (calcErr) {
                    console.error(`❌ Fallback Black-Scholes calculation failed: ${calcErr.message}`);
                }
                if (!executionPrice) {
                    executionPrice = 100;
                }
            }
        }

        const totalCost = quantity * executionPrice;
        
        let balance = 200000;
        let userData = null;
        let dbFailed = false;
        
        try {
            const balancePromise = supabase.from('users').select('balance, email').eq('id', req.user.userId).single();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000));
            const result = await Promise.race([balancePromise, timeoutPromise]);
            
            if (result.error || !result.data) {
                dbFailed = true;
            } else {
                userData = result.data;
                balance = userData.balance;
                localDb.updateUserBalance(req.user.userId, balance, userData.email);
            }
        } catch (e) {
            dbFailed = true;
        }
        
        if (dbFailed) {
            console.log(`⚠️ Supabase connection failed or timed out. Falling back to local database.`);
            balance = localDb.getUserBalance(req.user.userId, 200000);
        }
        
        if (balance < totalCost) return res.status(400).json({ error: "Insufficient Balance!" });
        const newBalance = balance - totalCost;
        
        let addedTrade;
        if (!dbFailed) {
            try {
                const updatePromise = Promise.all([
                    supabase.from('users').update({ balance: newBalance }).eq('id', req.user.userId),
                    supabase.from('portfolio').insert([{ user_id: req.user.userId, symbol, quantity, average_price: executionPrice }])
                ]);
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));
                const [userUpdateRes, portfolioInsertRes] = await Promise.race([updatePromise, timeoutPromise]);
                
                if (userUpdateRes.error || portfolioInsertRes.error) {
                    console.error("❌ Supabase update failed, falling back to local DB");
                    localDb.updateUserBalance(req.user.userId, newBalance);
                    addedTrade = localDb.addTrade(req.user.userId, symbol, quantity, executionPrice);
                } else {
                    localDb.updateUserBalance(req.user.userId, newBalance);
                    addedTrade = localDb.addTrade(req.user.userId, symbol, quantity, executionPrice);
                }
            } catch (err) {
                console.error("❌ Supabase update timed out/failed, falling back to local DB:", err.message);
                localDb.updateUserBalance(req.user.userId, newBalance);
                addedTrade = localDb.addTrade(req.user.userId, symbol, quantity, executionPrice);
            }
        } else {
            localDb.updateUserBalance(req.user.userId, newBalance);
            addedTrade = localDb.addTrade(req.user.userId, symbol, quantity, executionPrice);
        }
        
        if (userPortfolioCache[req.user.userId]) {
            userPortfolioCache[req.user.userId].push(addedTrade);
        } else {
            userPortfolioCache[req.user.userId] = localDb.getPortfolio(req.user.userId);
        }
        delete userTradesCache[req.user.userId];
        
        console.log(`✅ [API BUY] Success: User=${userId}, Symbol=${symbol}, Price=${executionPrice}`);
        res.status(200).json({ message: `Bought ${quantity} lots of ${symbol} at ₹${executionPrice}! 🚀`, newBalance, executedPrice: executionPrice });
    } catch (err) { 
        console.error(`❌ [API BUY] Global Error:`, err);
        res.status(500).json({ error: "Buy error." }); 
    } finally {
        releaseLock(userId);
    }
});

// SELL
app.post('/api/sell', authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    const { symbol, quantity, isAutoTrade } = req.body;
    console.log(`📥 [API SELL] Received: User=${userId}, Symbol=${symbol}, Qty=${quantity}, Auto=${isAutoTrade}`);
    if (localDb.checkUserBlocked(userId)) {
        return res.status(403).json({ error: "⚠️ Your account has been permanently blocked due to a payment fraud attempt (Fake UTR Ref). Contact admin for review." });
    }
    if (!checkIsMarketOpen()) {
        return res.status(400).json({ error: "Market is closed. Trading is only allowed between 9:15 AM and 3:30 PM IST on weekdays." });
    }
    if (isAutoTrade && localDb.checkUserInvoiceLocked(userId)) {
        return res.status(403).json({ error: "Your bot is locked due to an unpaid commission invoice! Please pay the flat 10% commission on your Admin panel or support chat to unlock." });
    }
    try {
        await acquireLock(userId);
        let executionPrice;
        if (req.body.price && !isNaN(Number(req.body.price)) && Number(req.body.price) > 0) {
            executionPrice = Number(req.body.price);
            console.log(`⚡ [API SELL] Using client-provided price: ₹${executionPrice}`);
        } else {
            try {
                executionPrice = await getLivePriceForSymbol(symbol);
            } catch (priceErr) {
                console.error(`❌ [API SELL] Price fetch error: ${priceErr.message}`);
                // Last resort fallback: Black-Scholes calculation
                try {
                    const parsed = parseOptionSymbol(symbol);
                    if (parsed) {
                        const spotSymbol = parsed.scripName === 'NIFTY' ? 'NIFTY50' : parsed.scripName;
                        const spot = marketState[spotSymbol]?.currentPrice || marketState[spotSymbol]?.realPrice || 24500;
                        const isCall = parsed.type === "CE";
                        const strike = parseFloat(parsed.strike);
                        const dte = parseDteFromSymbol(symbol);
                        const iv = parsed.scripName === "BANKNIFTY" ? 0.16 : 0.13;
                        executionPrice = runBlackScholes(spot, strike, dte, isCall, iv);
                        console.log(`⚠️ [API SELL] Fallback: Computed Black-Scholes price: ₹${executionPrice}`);
                    }
                } catch (calcErr) {
                    console.error(`❌ Fallback Black-Scholes calculation failed: ${calcErr.message}`);
                }
                if (!executionPrice) {
                    executionPrice = 100;
                }
            }
        }

        let portfolioData = [];
        let userData = null;
        let dbFailed = false;
        
        try {
            const fetchPromise = Promise.all([
                userPortfolioCache[req.user.userId]
                    ? Promise.resolve({ data: userPortfolioCache[req.user.userId], error: null })
                    : supabase.from('portfolio').select('*').eq('user_id', req.user.userId),
                supabase.from('users').select('balance, email').eq('id', req.user.userId).single()
            ]);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000));
            const [portRes, userRes] = await Promise.race([fetchPromise, timeoutPromise]);
            
            if (portRes.error || userRes.error) {
                dbFailed = true;
            } else {
                portfolioData = portRes.data || [];
                userData = userRes.data;
                localDb.syncFromSupabase(req.user.userId, userData, portfolioData);
            }
        } catch (e) {
            dbFailed = true;
        }
        
        if (dbFailed) {
            portfolioData = localDb.getPortfolio(req.user.userId);
            userData = { balance: localDb.getUserBalance(req.user.userId, 200000) };
        }

        const matchedHoldings = (portfolioData || []).filter(p => p.symbol === symbol);
        if (matchedHoldings.length === 0) return res.status(400).json({ error: "No holding found." });

        let totalShares = 0;
        matchedHoldings.forEach(p => totalShares += Number(p.quantity));
        
        let quantityToSell = quantity;
        if (totalShares < quantity) {
            console.log(`⚠️ [Quantity Cap] Adjusted sell quantity from ${quantity} to current holdings size ${totalShares}`);
            quantityToSell = totalShares;
        }
        if (quantityToSell <= 0) {
            return res.status(400).json({ error: "No active position holdings to sell." });
        }

        const balance = userData.balance;
        const newBalance = Number(balance) + (quantityToSell * executionPrice);

        let addedTrade;
        if (!dbFailed) {
            try {
                const updatePromise = Promise.all([
                    supabase.from('users').update({ balance: newBalance }).eq('id', req.user.userId),
                    supabase.from('portfolio').insert([{ user_id: req.user.userId, symbol, quantity: -quantityToSell, average_price: executionPrice }])
                ]);
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));
                const [userUpdateRes, portfolioInsertRes] = await Promise.race([updatePromise, timeoutPromise]);
                
                if (userUpdateRes.error || portfolioInsertRes.error) {
                    localDb.updateUserBalance(req.user.userId, newBalance);
                    addedTrade = localDb.addTrade(req.user.userId, symbol, -quantityToSell, executionPrice);
                } else {
                    localDb.updateUserBalance(req.user.userId, newBalance);
                    addedTrade = localDb.addTrade(req.user.userId, symbol, -quantityToSell, executionPrice);
                }
            } catch (err) {
                localDb.updateUserBalance(req.user.userId, newBalance);
                addedTrade = localDb.addTrade(req.user.userId, symbol, -quantityToSell, executionPrice);
            }
        } else {
            localDb.updateUserBalance(req.user.userId, newBalance);
            addedTrade = localDb.addTrade(req.user.userId, symbol, -quantityToSell, executionPrice);
        }
        
        // Calculate average entry price using only the active open holdings (FIFO/LIFO style)
        let avgEntry = executionPrice;
        if (totalShares > 0) {
            let collected = 0;
            let costSum = 0;
            const buys = (portfolioData || []).filter(p => p.symbol === symbol && Number(p.quantity) > 0);
            for (let i = buys.length - 1; i >= 0; i--) {
                const buy = buys[i];
                const qty = Number(buy.quantity);
                const price = Number(buy.average_price);
                const remaining = totalShares - collected;
                if (remaining <= 0) break;
                const take = Math.min(qty, remaining);
                costSum += take * price;
                collected += take;
            }
            avgEntry = collected > 0 ? (costSum / collected) : executionPrice;
        }

        const tradePnl = quantityToSell * (executionPrice - avgEntry);
        const billing = localDb.trackTradeProfit(req.user.userId, tradePnl) || { dailyProfit: 0, unpaidInvoice: 0 };

        if (userPortfolioCache[req.user.userId]) {
            userPortfolioCache[req.user.userId].push(addedTrade);
        } else {
            userPortfolioCache[req.user.userId] = localDb.getPortfolio(req.user.userId);
        }
        delete userTradesCache[req.user.userId];
        
        console.log(`✅ [API SELL] Success: User=${req.user.userId}, Symbol=${symbol}, Price=${executionPrice}, PnL=₹${tradePnl.toFixed(2)}`);
        res.status(200).json({ 
            message: `Sold ${quantityToSell} shares of ${symbol} at ₹${executionPrice}! 💸`, 
            newBalance, 
            executedPrice: executionPrice,
            tradePnl,
            billing
        });
    } catch (err) { 
        console.error(`❌ [API SELL] Global Error:`, err);
        res.status(500).json({ error: "Sell error." }); 
    } finally {
        releaseLock(userId);
    }
});

function parseOptionSymbol(symbol) {
    const match = symbol.trim().match(/^(NIFTY50|NIFTY|BANKNIFTY|SENSEX)\s+(.+)\s+(\d+)\s+(CE|PE)$/i);
    if (!match) return null;

    const underlying = match[1].toUpperCase();
    const rawExpiry = match[2];
    const strike = match[3];
    const type = match[4].toUpperCase();

    let scripName = underlying;
    if (underlying === 'NIFTY50' || underlying === 'NIFTY') scripName = 'NIFTY';

    const cleanExpiry = rawExpiry.replace(/[\s-,\.]/g, '').toUpperCase();
    if (cleanExpiry.length !== 7) return null;

    const day = cleanExpiry.substring(0, 2);
    const month = cleanExpiry.substring(2, 5);
    const year = cleanExpiry.substring(5, 7);
    const scripExpiry = `${day}${month}20${year}`;

    return { scripName, scripExpiry, strike, type };
}

function checkIsOptionExpired(symbol) {
    const parsed = parseOptionSymbol(symbol);
    if (!parsed) return false;
    
    const scripExpiry = parsed.scripExpiry; // format: "DDMMMYYYY"
    if (!scripExpiry || scripExpiry.length !== 9) return false;
    
    const day = parseInt(scripExpiry.substring(0, 2), 10);
    const monthStr = scripExpiry.substring(2, 5).toUpperCase();
    const year = parseInt(scripExpiry.substring(5, 9), 10);
    
    const months = {
        JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
        JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
    };
    
    const month = months[monthStr];
    if (month === undefined) return false;
    
    // Market closes at 3:30 PM (15:30) IST, which is 10:00 UTC.
    const expiryDate = new Date(Date.UTC(year, month, day, 10, 0, 0));
    const now = new Date();
    
    return now > expiryDate;
}

// GET USER BALANCE
app.get('/api/balance', authMiddleware, async (req, res) => {
    try {
        let balance;
        try {
            const balancePromise = supabase
                .from('users')
                .select('balance')
                .eq('id', req.user.userId)
                .single();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000));
            const { data, error } = await Promise.race([balancePromise, timeoutPromise]);
            
            if (error || !data) {
                balance = localDb.getUserBalance(req.user.userId, 200000);
            } else {
                balance = data.balance;
                localDb.updateUserBalance(req.user.userId, balance);
            }
        } catch (err) {
            balance = localDb.getUserBalance(req.user.userId, 200000);
        }

        const userConfig = localDb.getUserConfig(req.user.userId);
        const email = userConfig ? userConfig.email : "";
        const isVerified = userConfig ? !!userConfig.documents_verified : false;
        const phone = userConfig ? userConfig.phone : "";
        const isAdmin = email && email.toLowerCase() === "akshatmarwadi5@gmail.com";

        res.status(200).json({ 
            balance,
            email,
            phone,
            documents_verified: isVerified || isAdmin, // Admin Akshat is exempted!
            isAdmin
        });
    } catch (err) {
        console.error("Error fetching balance:", err);
        res.status(500).json({ error: "Failed to fetch balance" });
    }
});

// GET REFERRALS DATA
app.get('/api/referrals', authMiddleware, async (req, res) => {
    try {
        const details = localDb.getUserReferralDetails(req.user.userId);
        if (!details) return res.status(404).json({ error: "User configuration not found." });
        res.json(details);
    } catch (err) {
        res.status(550).json({ error: "Failed to fetch referral details." });
    }
});

// POST APPLY REFERRAL CODE AFTER SIGNUP
app.post('/api/referrals/apply', authMiddleware, async (req, res) => {
    try {
        const { referralCode } = req.body;
        if (!referralCode) return res.status(400).json({ error: "Referral code is required!" });
        
        const success = localDb.applyReferralCode(req.user.userId, req.user.email, referralCode);
        if (!success) {
            return res.status(400).json({ error: "Invalid referral code, already applied, or cannot refer yourself." });
        }
        res.json({ message: "Referral code applied successfully! 🎉 +3 Days added to your bot trial." });
    } catch (err) {
        res.status(500).json({ error: "Failed to apply referral code." });
    }
});

// POST PAY COMMISSION INVOICE
app.post('/api/pay-commission', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const success = localDb.payCommissionInvoice(userId);
        if (!success) return res.status(404).json({ error: "User configuration not found." });
        res.json({ success: true, message: "Commission invoice paid! Bot is now unlocked. 🚀" });
    } catch (err) {
        res.status(500).json({ error: "Failed to pay commission invoice." });
    }
});

// SUBMIT UPI PAYMENT REQUEST
app.post('/api/pay-request', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { amount, utr } = req.body;
        if (!amount || !utr) return res.status(400).json({ error: "Amount and UTR Reference ID are required!" });
        
        const reqDetail = localDb.addPaymentRequest(userId, req.user.email, Number(amount), utr);
        res.json({ success: true, message: "Payment details submitted! Verification takes 5-10 minutes. ⌛", request: reqDetail });
    } catch (err) {
        res.status(500).json({ error: "Failed to submit payment request." });
    }
});

// GET ALL PENDING UPI PAYMENTS (ADMIN)
app.get('/api/admin/payment-requests', authMiddleware, async (req, res) => {
    try {
        const isAdmin = req.user.email === "akshatmarwadi5@gmail.com";
        if (!isAdmin) return res.status(403).json({ error: "Unauthorized access." });
        
        const list = localDb.getPaymentRequests();
        res.json(list);
    } catch (err) {
        res.status(550).json({ error: "Failed to fetch payment list." });
    }
});

// APPROVE UPI PAYMENT (ADMIN)
app.post('/api/admin/approve-payment', authMiddleware, async (req, res) => {
    try {
        const isAdmin = req.user.email === "akshatmarwadi5@gmail.com";
        if (!isAdmin) return res.status(403).json({ error: "Unauthorized access." });
        
        const { reqId } = req.body;
        const success = localDb.approvePaymentRequest(reqId);
        if (!success) return res.status(404).json({ error: "Payment request not found." });
        res.json({ success: true, message: "Payment approved and user bot unlocked! 🚀" });
    } catch (err) {
        res.status(500).json({ error: "Failed to approve payment." });
    }
});

// REJECT UPI PAYMENT (ADMIN)
app.post('/api/admin/reject-payment', authMiddleware, async (req, res) => {
    try {
        const isAdmin = req.user.email === "akshatmarwadi5@gmail.com";
        if (!isAdmin) return res.status(403).json({ error: "Unauthorized access." });
        
        const { reqId } = req.body;
        const success = localDb.rejectPaymentRequest(reqId);
        if (!success) return res.status(404).json({ error: "Payment request not found." });
        res.json({ success: true, message: "Payment request rejected." });
    } catch (err) {
        res.status(500).json({ error: "Failed to reject payment." });
    }
});

// UNBLOCK USER (ADMIN)
app.post('/api/admin/unblock-user', authMiddleware, async (req, res) => {
    try {
        const isAdmin = req.user.email === "akshatmarwadi5@gmail.com";
        if (!isAdmin) return res.status(403).json({ error: "Unauthorized access." });
        
        const { userId } = req.body;
        const success = localDb.unblockUser(userId);
        if (!success) return res.status(404).json({ error: "User not found." });
        res.json({ success: true, message: "User account unblocked successfully! 🚀" });
    } catch (err) {
        res.status(500).json({ error: "Failed to unblock user." });
    }
});

// GET PORTFOLIO
app.get('/api/portfolio', authMiddleware, async (req, res) => {
    try {
        let portfolioData = userPortfolioCache[req.user.userId];
        if (!portfolioData) {
            try {
                if (!activePortfolioQueries[req.user.userId]) {
                    activePortfolioQueries[req.user.userId] = supabase
                        .from('portfolio')
                        .select('*')
                        .eq('user_id', req.user.userId)
                        .order('created_at', { ascending: true })
                        .then(({ data, error }) => {
                            delete activePortfolioQueries[req.user.userId];
                            if (error) throw error;
                            userPortfolioCache[req.user.userId] = data;
                            localDb.syncFromSupabase(req.user.userId, null, data);
                            return data;
                        });
                }
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000));
                portfolioData = await Promise.race([activePortfolioQueries[req.user.userId], timeoutPromise]);
            } catch (err) {
                console.warn("⚠️ Supabase portfolio fetch failed, using local DB:", err.message);
                portfolioData = localDb.getPortfolio(req.user.userId);
            }
        }
        
        const positions = {};
        portfolioData.forEach(trade => {
            const symbol = trade.symbol;
            if (!positions[symbol]) {
                positions[symbol] = { symbol, quantity: 0, averagePrice: 0 };
            }
            
            const pos = positions[symbol];
            const qty = Number(trade.quantity);
            const price = Number(trade.average_price);
            
            if (pos.quantity === 0) {
                pos.quantity = qty;
                pos.averagePrice = price;
            } else if (pos.quantity > 0) {
                // We currently have a Long position
                if (qty > 0) {
                    // Adding to Long position
                    pos.averagePrice = ((pos.quantity * pos.averagePrice) + (qty * price)) / (pos.quantity + qty);
                    pos.quantity += qty;
                } else {
                    // Reducing Long position (selling part or all of it)
                    pos.quantity += qty; // qty is negative
                    if (pos.quantity < 0) {
                        // Reversal: position turned into a Short position
                        pos.averagePrice = price;
                    }
                }
            } else {
                // We currently have a Short position (pos.quantity < 0)
                if (qty < 0) {
                    // Adding to Short position (selling more)
                    pos.averagePrice = ((Math.abs(pos.quantity) * pos.averagePrice) + (Math.abs(qty) * price)) / (Math.abs(pos.quantity) + Math.abs(qty));
                    pos.quantity += qty;
                } else {
                    // Reducing Short position (covering/buying part or all of it)
                    pos.quantity += qty; // qty is positive
                    if (pos.quantity > 0) {
                        // Reversal: position turned into a Long position
                        pos.averagePrice = price;
                    }
                }
            }
        });
        
        // Filter out closed positions (quantity === 0)
        const activePositions = Object.values(positions)
            .filter(pos => pos.quantity !== 0)
            .map(pos => ({
                symbol: pos.symbol,
                quantity: pos.quantity,
                averagePrice: pos.averagePrice
            }));
        
        // Enrich activePositions with actual live prices
        const tokensNFO = [];
        const tokensBFO = [];

        activePositions.forEach(pos => {
            pos.livePrice = pos.averagePrice; // default fallback
            pos.high = 0;
            pos.low = 0;
            pos.close = 0;

            // 1. Check if index
            if (marketState[pos.symbol]) {
                pos.livePrice = marketState[pos.symbol].currentPrice;
                return;
            }

            // 2. Check if option
            const parsed = parseOptionSymbol(pos.symbol);
            if (parsed) {
                // If market is closed, calculate premium dynamically using Black-Scholes so it fluctuates in real-time
                if (!checkIsMarketOpen()) {
                    const key = `${parsed.scripName}_${parsed.scripExpiry}_${parsed.strike}_${parsed.type}`;
                    const item = scripMap[key];
                    const cached = item ? optionQuotesCache[item.token] : null;
                    
                    if (cached) {
                        // Use real cached broker prices when market is closed!
                        pos.livePrice = cached.price;
                        pos.high = cached.high || (cached.price * 1.08);
                        pos.low = cached.low || (cached.price * 0.92);
                        pos.close = cached.close || (cached.price * 1.01);
                        return; // Skip batch fetch from broker
                    }
                    
                    const spotSymbol = parsed.scripName === 'NIFTY' ? 'NIFTY50' : parsed.scripName;
                    const spot = marketState[spotSymbol]?.currentPrice || marketState[spotSymbol]?.realPrice;
                    if (spot) {
                        const isCall = parsed.type === "CE";
                        const strike = parseFloat(parsed.strike);
                        const dte = parseDteFromSymbol(pos.symbol);
                        const iv = parsed.scripName === "BANKNIFTY" ? 0.16 : 0.13;
                        
                        const calcPrice = runBlackScholes(spot, strike, dte, isCall, iv);
                        pos.livePrice = calcPrice;
                        pos.high = calcPrice * 1.08;
                        pos.low = calcPrice * 0.92;
                        pos.close = calcPrice * 1.01;
                        return; // Skip batch fetch from broker
                    }
                }

                const key = `${parsed.scripName}_${parsed.scripExpiry}_${parsed.strike}_${parsed.type}`;
                const item = scripMap[key];
                if (item) {
                    const cached = optionQuotesCache[item.token];
                    if (cached) {
                        pos.livePrice = cached.price;
                        pos.high = cached.high || 0;
                        pos.low = cached.low || 0;
                        pos.close = cached.close || 0;
                        
                        // Stale-While-Revalidate: trigger async background fetch if cache is older than 300ms
                        if (Date.now() - cached.timestamp >= 300) {
                            if (item.exch_seg === 'BFO') tokensBFO.push(item.token);
                            else tokensNFO.push(item.token);
                        }
                    } else {
                        // Use default fallback (pos.averagePrice)
                        if (item.exch_seg === 'BFO') tokensBFO.push(item.token);
                        else tokensNFO.push(item.token);
                    }
                }
            }
        });

        // Trigger non-blocking async background fetch if cache needs update or is missing
        if (tokensNFO.length > 0 || tokensBFO.length > 0) {
            fetchAndCacheOptionPrices(tokensNFO, tokensBFO);
        }

        res.status(200).json(activePositions);
    } catch (err) { 
        console.error("Portfolio fetch error:", err);
        res.status(500).json({ error: "Portfolio fetch error." }); 
    }
});

// GET OPTIONS CHAIN QUOTES
app.post('/api/options-chain/quotes', async (req, res) => {
    try {
        const { underlying, expiryLabel, strikes } = req.body;
        if (!underlying || !expiryLabel || !strikes || !Array.isArray(strikes)) {
            return res.status(400).json({ error: "Missing required fields underlying, expiryLabel, strikes" });
        }

        let scripName = underlying;
        if (underlying === 'NIFTY50') scripName = 'NIFTY';
        
        const cleanExpiry = expiryLabel.replace(/[\s-,\.]/g, '').toUpperCase();
        if (cleanExpiry.length !== 7) {
            return res.status(400).json({ error: "Invalid expiryLabel format" });
        }
        const day = cleanExpiry.substring(0, 2);
        const month = cleanExpiry.substring(2, 5);
        const year = cleanExpiry.substring(5, 7);
        const scripExpiry = `${day}${month}20${year}`;

        const quotes = {};

        // If market is closed, calculate premium dynamically using Black-Scholes so it fluctuates in real-time
        if (!checkIsMarketOpen()) {
            const spotSymbol = scripName === 'NIFTY' ? 'NIFTY50' : scripName;
            const spot = marketState[spotSymbol]?.currentPrice || marketState[spotSymbol]?.realPrice;
            if (spot) {
                const dte = parseDteFromSymbol(`${underlying} ${expiryLabel} ${strikes[0]} CE`);
                const iv = scripName === "BANKNIFTY" ? 0.16 : 0.13;
                
                strikes.forEach(strike => {
                    const cePrice = runBlackScholes(spot, strike, dte, true, iv);
                    const pePrice = runBlackScholes(spot, strike, dte, false, iv);
                    
                    quotes[strike] = { CE: cePrice, PE: pePrice };
                    
                    // Also populate cache for single LTP queries
                    const keyCE = `${scripName}_${scripExpiry}_${strike}_CE`;
                    const keyPE = `${scripName}_${scripExpiry}_${strike}_PE`;
                    const itemCE = scripMap[keyCE];
                    const itemPE = scripMap[keyPE];
                    if (itemCE) {
                        const existing = optionQuotesCache[itemCE.token];
                        optionQuotesCache[itemCE.token] = {
                            price: cePrice,
                            high: cePrice * 1.08,
                            low: cePrice * 0.92,
                            close: existing?.close || (cePrice * 1.01),
                            timestamp: Date.now()
                        };
                    }
                    if (itemPE) {
                        const existing = optionQuotesCache[itemPE.token];
                        optionQuotesCache[itemPE.token] = {
                            price: pePrice,
                            high: pePrice * 1.08,
                            low: pePrice * 0.92,
                            close: existing?.close || (pePrice * 1.01),
                            timestamp: Date.now()
                        };
                    }
                });
                return res.status(200).json({ quotes });
            }
        }

        const tokensNFO = [];
        const tokensBFO = [];
        const tokenToStrikeMap = {};

        strikes.forEach(strike => {
            quotes[strike] = { CE: null, PE: null };

            const keyCE = `${scripName}_${scripExpiry}_${strike}_CE`;
            const keyPE = `${scripName}_${scripExpiry}_${strike}_PE`;

            const itemCE = scripMap[keyCE];
            const itemPE = scripMap[keyPE];

            if (itemCE) {
                const cached = optionQuotesCache[itemCE.token];
                if (cached && (Date.now() - cached.timestamp < 8000)) {
                    quotes[strike].CE = cached.price;
                } else {
                    if (itemCE.exch_seg === 'BFO') tokensBFO.push(itemCE.token);
                    else tokensNFO.push(itemCE.token);
                    tokenToStrikeMap[itemCE.token] = { strike, type: 'CE' };
                }
            }
            if (itemPE) {
                const cached = optionQuotesCache[itemPE.token];
                if (cached && (Date.now() - cached.timestamp < 8000)) {
                    quotes[strike].PE = cached.price;
                } else {
                    if (itemPE.exch_seg === 'BFO') tokensBFO.push(itemPE.token);
                    else tokensNFO.push(itemPE.token);
                    tokenToStrikeMap[itemPE.token] = { strike, type: 'PE' };
                }
            }
        });

        const exchangeTokens = {};
        if (tokensNFO.length > 0) exchangeTokens["NFO"] = tokensNFO;
        if (tokensBFO.length > 0) exchangeTokens["BFO"] = tokensBFO;

        if (Object.keys(exchangeTokens).length > 0) {
            if (!angelJwtToken) {
                await angelLogin();
            }
            if (angelJwtToken) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                try {
                    const quoteRes = await axios.post('https://apiconnect.angelbroking.com/rest/secure/angelbroking/market/v1/quote/', {
                        mode: "LTP",
                        exchangeTokens
                    }, {
                        headers: {
                            'Authorization': `Bearer ${angelJwtToken}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'X-UserType': 'USER',
                            'X-SourceID': 'WEB',
                            'X-PrivateKey': process.env.ANGEL_API_KEY
                        },
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    const data = quoteRes.data;
                    if (typeof data === 'string') {
                        if (data.includes("Access denied") || data.includes("Access Denied")) {
                            console.warn("⚠️ Angel One returned Access Denied (Rate limit hit) in option chain query. Keeping token.");
                        }
                        throw new Error(`Non-JSON option chain response: ${data.substring(0, 50)}`);
                    }
                    const fetched = data?.data?.fetched || [];
                    fetched.forEach(item => {
                        const match = tokenToStrikeMap[item.symbolToken];
                        if (match && item.ltp !== undefined) {
                            quotes[match.strike][match.type] = item.ltp;
                            optionQuotesCache[item.symbolToken] = {
                                ...(optionQuotesCache[item.symbolToken] || {}),
                                price: item.ltp,
                                timestamp: Date.now()
                            };
                        }
                    });
                } catch {
                    clearTimeout(timeoutId);
                    // On timeout, use stale cache
                    Object.entries(tokenToStrikeMap).forEach(([token, match]) => {
                        const stale = optionQuotesCache[token];
                        if (stale && !quotes[match.strike][match.type]) {
                            quotes[match.strike][match.type] = stale.price;
                        }
                    });
                }
            }
        }

        res.status(200).json({ quotes });
    } catch (err) {
        console.error("Error in options quotes route:", err.message);
        res.status(500).json({ error: "Failed to fetch option prices" });
    }
});

// GET REAL LTP AND OHLC FOR A SINGLE OPTION SYMBOL (used by bot)
app.post('/api/option-ltp', async (req, res) => {
    try {
        const { symbol } = req.body;
        if (!symbol) return res.status(400).json({ error: "Symbol required" });

        const parsed = parseOptionSymbol(symbol);
        if (!parsed) return res.status(400).json({ error: "Invalid option symbol", ltp: null });

        const key = `${parsed.scripName}_${parsed.scripExpiry}_${parsed.strike}_${parsed.type}`;
        const item = scripMap[key];
        if (!item) return res.status(404).json({ error: "Symbol not found in scripMap", ltp: null });

        // Check cache first
        const cached = optionQuotesCache[item.token];
        const isStale = cached && checkIsMarketOpen() && (Date.now() - cached.timestamp >= 5000);
        
        if (cached && !isStale) {
            return res.json({ 
                ltp: cached.price, 
                high: cached.high || 0,
                low: cached.low || 0,
                close: cached.close || 0,
                cached: true 
            });
        }

        // Try to fetch synchronously to get real price if cache is missing or stale
        try {
            const nfo = item.exch_seg !== 'BFO' ? [item.token] : [];
            const bfo = item.exch_seg === 'BFO' ? [item.token] : [];
            await fetchAndCacheOptionPrices(nfo, bfo);
            const freshCached = optionQuotesCache[item.token];
            if (freshCached) {
                return res.json({
                    ltp: freshCached.price,
                    high: freshCached.high || 0,
                    low: freshCached.low || 0,
                    close: freshCached.close || 0,
                    cached: false
                });
            }
        } catch (fetchErr) {
            console.error(`❌ Sync fetch failed in option-ltp route: ${fetchErr.message}`);
        }

        // Cache does not exist. Compute a fallback price using Black-Scholes model instantly.
        const spotSymbol = parsed.scripName === 'NIFTY' ? 'NIFTY50' : parsed.scripName;
        const spot = marketState[spotSymbol]?.currentPrice || marketState[spotSymbol]?.realPrice || 24500;
        const isCall = parsed.type === "CE";
        const strike = parseFloat(parsed.strike);
        const dte = parseDteFromSymbol(symbol);
        const iv = parsed.scripName === "BANKNIFTY" ? 0.16 : 0.13;
        const calcPrice = runBlackScholes(spot, strike, dte, isCall, iv);
        
        // Trigger async background fetch to populate cache with real broker prices
        const nfo = item.exch_seg !== 'BFO' ? [item.token] : [];
        const bfo = item.exch_seg === 'BFO' ? [item.token] : [];
        fetchAndCacheOptionPrices(nfo, bfo);

        return res.json({ 
            ltp: calcPrice, 
            high: calcPrice * 1.08,
            low: calcPrice * 0.92,
            close: calcPrice * 1.01,
            cached: false 
        });
    } catch (err) {
        res.status(500).json({ error: err.message, ltp: null });
    }
});

// GET TODAY'S TRADES
app.get('/api/trades', authMiddleware, async (req, res) => {
    try {
        let allTrades = userTradesCache[req.user.userId];
        if (!allTrades) {
            try {
                if (!activeTradesQueries[req.user.userId]) {
                    activeTradesQueries[req.user.userId] = supabase
                        .from('portfolio')
                        .select('*')
                        .eq('user_id', req.user.userId)
                        .order('created_at', { ascending: true })
                        .then(({ data, error }) => {
                            delete activeTradesQueries[req.user.userId];
                            if (error) throw error;
                            userTradesCache[req.user.userId] = data;
                            localDb.syncFromSupabase(req.user.userId, null, data);
                            return data;
                        });
                }
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000));
                allTrades = await Promise.race([activeTradesQueries[req.user.userId], timeoutPromise]);
            } catch (err) {
                console.warn("⚠️ Supabase trades fetch failed, using local DB:", err.message);
                allTrades = localDb.getPortfolio(req.user.userId);
            }
        }

        const symbolStats = {};
        const enrichedTrades = [];

        allTrades.forEach(t => {
            const qty = Number(t.quantity);
            const price = Number(t.average_price);
            const symbol = t.symbol;

            if (!symbolStats[symbol]) {
                symbolStats[symbol] = { runningQty: 0, runningAvgBuyPrice: 0 };
            }

            const stats = symbolStats[symbol];
            let pnl = 0;
            const prevPos = stats.runningQty || 0;
            const prevAvg = stats.runningAvgBuyPrice || 0;
            let buyPrice = prevAvg;

            if (prevPos === 0) {
                // Flat: opening a new position (either long or short)
                stats.runningQty = qty;
                stats.runningAvgBuyPrice = price;
                pnl = 0;
                buyPrice = price;
            } else if (prevPos > 0) {
                // Currently Long
                if (qty > 0) {
                    // Adding to Long
                    const totalCost = (prevAvg * prevPos) + (qty * price);
                    stats.runningQty += qty;
                    stats.runningAvgBuyPrice = stats.runningQty > 0 ? totalCost / stats.runningQty : 0;
                    pnl = 0;
                    buyPrice = price;
                } else {
                    // Selling (reducing or reversing Long)
                    const exitQty = Math.min(prevPos, Math.abs(qty));
                    pnl = exitQty * (price - prevAvg);
                    stats.runningQty += qty; // qty is negative, so this reduces runningQty
                    buyPrice = prevAvg;
                    
                    if (stats.runningQty < 0) {
                        // Reversal: remainder becomes a short position
                        stats.runningAvgBuyPrice = price;
                    } else if (stats.runningQty === 0) {
                        stats.runningAvgBuyPrice = 0;
                    }
                }
            } else {
                // Currently Short (prevPos < 0)
                if (qty < 0) {
                    // Adding to Short (selling more)
                    const totalCost = (prevAvg * Math.abs(prevPos)) + (Math.abs(qty) * price);
                    stats.runningQty += qty; // qty is negative, runningQty becomes more negative
                    stats.runningAvgBuyPrice = stats.runningQty !== 0 ? totalCost / Math.abs(stats.runningQty) : 0;
                    pnl = 0;
                    buyPrice = price;
                } else {
                    // Buying to cover (reducing or reversing Short)
                    const exitQty = Math.min(Math.abs(prevPos), qty);
                    pnl = exitQty * (prevAvg - price); // Profit = entry (prevAvg) - exit (price)
                    stats.runningQty += qty; // qty is positive, runningQty moves towards 0 or positive
                    buyPrice = prevAvg;
                    
                    if (stats.runningQty > 0) {
                        // Reversal: remainder becomes a long position
                        stats.runningAvgBuyPrice = price;
                    } else if (stats.runningQty === 0) {
                        stats.runningAvgBuyPrice = 0;
                    }
                }
            }

            enrichedTrades.push({
                id: t.id,
                symbol: t.symbol,
                quantity: qty,
                entryPrice: price,
                averageBuyPrice: buyPrice,
                type: qty > 0 ? 'BUY' : 'SELL',
                pnl: pnl,
                createdAt: t.created_at
            });
        });

        // Optional: return all history if query param ?all=true is present
        const showAll = req.query.all === 'true';
        if (showAll) {
            const historicalTrades = [...enrichedTrades].reverse();
            return res.status(200).json(historicalTrades);
        }

        // Today's trades only, in descending order (newest first)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Calculate currently active holdings
        const positions = {};
        allTrades.forEach(trade => {
            const symbol = trade.symbol;
            if (!positions[symbol]) {
                positions[symbol] = { symbol, quantity: 0, averagePrice: 0 };
            }
            const pos = positions[symbol];
            const qty = Number(trade.quantity);
            const price = Number(trade.average_price);
            
            if (pos.quantity === 0) {
                pos.quantity = qty;
                pos.averagePrice = price;
            } else if (pos.quantity > 0) {
                if (qty > 0) {
                    pos.averagePrice = ((pos.quantity * pos.averagePrice) + (qty * price)) / (pos.quantity + qty);
                    pos.quantity += qty;
                } else {
                    pos.quantity += qty;
                }
            } else { // Short position
                if (qty < 0) {
                    pos.averagePrice = ((Math.abs(pos.quantity) * pos.averagePrice) + (Math.abs(qty) * price)) / (Math.abs(pos.quantity) + Math.abs(qty));
                    pos.quantity += qty;
                } else {
                    pos.quantity += qty;
                }
            }
        });

        const activeHoldings = Object.values(positions).filter(pos => pos.quantity !== 0 && !checkIsOptionExpired(pos.symbol));

        const todayTrades = enrichedTrades
            .filter(t => new Date(t.createdAt) >= today)
            .reverse();

        // Sort todayTrades by createdAt in descending order so newest trades are shown first
        todayTrades.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.status(200).json(todayTrades);
    } catch (err) {
        console.error("Trades fetch error:", err);
        res.status(500).json({ error: "Trades fetch error." });
    }
});

const INDEX_TOKENS = {
    "NIFTY50": { token: "99926000", exch: "NSE" },
    "BANKNIFTY": { token: "99926009", exch: "NSE" },
    "SENSEX": { token: "99919000", exch: "BSE" }
};
const historicalCache = {};

function getISTDateTimeStrings(range) {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    
    const toStr = formatDate(ist);
    
    let fromStr;
    if (range === '1Y') {
        const fromDate = new Date(ist);
        fromDate.setFullYear(fromDate.getFullYear() - 1);
        fromStr = formatDate(fromDate);
    } else if (range === '1M') {
        const fromDate = new Date(ist);
        fromDate.setMonth(fromDate.getMonth() - 1);
        fromStr = formatDate(fromDate);
    } else {
        const fromDate = new Date(ist);
        const day = ist.getDay();
        const daysBack = (day === 1) ? 3 : (day === 0 ? 2 : 1);
        fromDate.setDate(fromDate.getDate() - daysBack);
        fromDate.setHours(9, 15, 0, 0);
        fromStr = formatDate(fromDate);
    }
    return { fromStr, toStr };
}

function formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

async function formatOptionCandlesIfNeeded(indexCandles, symbol) {
    const parsed = parseOptionSymbol(symbol);
    if (!parsed) return indexCandles;

    const strike = parseFloat(parsed.strike);
    const isCall = parsed.type === "CE";
    const dte = parseDteFromSymbol(symbol);
    const iv = parsed.scripName === "BANKNIFTY" ? 0.16 : 0.13;

    // Fetch real high and low for scaling
    let realHigh = 0;
    let realLow = 0;
    
    const key = `${parsed.scripName}_${parsed.scripExpiry}_${parsed.strike}_${parsed.type}`;
    const item = scripMap[key];
    if (item) {
        let cached = optionQuotesCache[item.token];
        const isStale = !cached || (checkIsMarketOpen() && (Date.now() - cached.timestamp > 5000));
        if (isStale) {
            try {
                const nfo = item.exch_seg !== 'BFO' ? [item.token] : [];
                const bfo = item.exch_seg === 'BFO' ? [item.token] : [];
                await fetchAndCacheOptionPrices(nfo, bfo);
                cached = optionQuotesCache[item.token];
            } catch (err) {
                console.error("Failed to fetch option quotes for scaling:", err.message);
            }
        }
        if (cached) {
            realHigh = cached.high || 0;
            realLow = cached.low || 0;
        }
    }

    const calculatedCandles = indexCandles.map(c => {
        const open = runBlackScholes(c.open, strike, dte, isCall, iv);
        const close = runBlackScholes(c.close, strike, dte, isCall, iv);
        
        const optionH1 = runBlackScholes(c.high, strike, dte, isCall, iv);
        const optionH2 = runBlackScholes(c.low, strike, dte, isCall, iv);
        const high = Math.max(open, close, optionH1, optionH2);
        const low = Math.min(open, close, optionH1, optionH2);

        return {
            time: c.time,
            open,
            high,
            low,
            close
        };
    });

    // If we have actual high/low values, scale the Black-Scholes premium candles mathematically
    if (realHigh > 0 && realLow > 0 && calculatedCandles.length > 0) {
        // Calculate 9:15 AM IST today in UTC epoch timestamp
        const formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const parts = formatter.formatToParts(new Date());
        const dayPart = parts.find(p => p.type === 'day')?.value || '12';
        const monthPart = parts.find(p => p.type === 'month')?.value || '06';
        const yearPart = parts.find(p => p.type === 'year')?.value || '2026';
        const todayStartTimeRaw = Date.UTC(parseInt(yearPart), parseInt(monthPart) - 1, parseInt(dayPart), 3, 45, 0) / 1000;

        const todayCandles = calculatedCandles.filter(c => c.time >= todayStartTimeRaw);

        if (todayCandles.length > 0) {
            let calcMin = Infinity;
            let calcMax = -Infinity;
            todayCandles.forEach(c => {
                if (c.low < calcMin) calcMin = c.low;
                if (c.high > calcMax) calcMax = c.high;
            });

            const calcRange = calcMax - calcMin;
            const realRange = realHigh - realLow;

            if (calcRange > 0) {
                calculatedCandles.forEach(c => {
                    if (c.time >= todayStartTimeRaw) {
                        const pctOpen = (c.open - calcMin) / calcRange;
                        const pctHigh = (c.high - calcMin) / calcRange;
                        const pctLow = (c.low - calcMin) / calcRange;
                        const pctClose = (c.close - calcMin) / calcRange;

                        c.open = Math.max(0.05, Math.round((realLow + pctOpen * realRange) * 20) / 20);
                        c.high = Math.max(0.05, Math.round((realLow + pctHigh * realRange) * 20) / 20);
                        c.low = Math.max(0.05, Math.round((realLow + pctLow * realRange) * 20) / 20);
                        c.close = Math.max(0.05, Math.round((realLow + pctClose * realRange) * 20) / 20);
                    }
                });
            }
        }
    }

    return calculatedCandles;
}

// GET REAL HISTORICAL CANDLES FOR INDEX OR OPTION
app.get('/api/historical-candles', async (req, res) => {
    try {
        const { symbol, timeframe, range } = req.query;
        if (!symbol) return res.status(400).json({ error: "Symbol required" });

        const tf = parseInt(timeframe) || 5;
        const rng = range || 'Y';

        let underlying = symbol.split(' ')[0].toUpperCase();
        if (underlying === 'NIFTY') underlying = 'NIFTY50';
        if (!['NIFTY50', 'BANKNIFTY', 'SENSEX'].includes(underlying)) {
            underlying = 'NIFTY50';
        }

        const cacheKey = `${underlying}_${tf}_${rng}`;
        const cached = historicalCache[cacheKey];
        const cacheLimit = checkIsMarketOpen() ? 60000 : (30 * 60 * 1000); // 1 min when open, 30 min when closed
        if (cached && (Date.now() - cached.timestamp < cacheLimit)) {
            const formatted = await formatOptionCandlesIfNeeded(cached.data, symbol);
            return res.json(formatted);
        }

        let interval = 'FIVE_MINUTE';
        if (rng === '1M' || rng === '1Y') {
            interval = 'ONE_DAY';
        } else {
            if (tf === 1) interval = 'ONE_MINUTE';
            else if (tf === 3) interval = 'THREE_MINUTE';
            else if (tf === 5) interval = 'FIVE_MINUTE';
            else if (tf === 15) interval = 'FIFTEEN_MINUTE';
            else if (tf === 30) interval = 'THIRTY_MINUTE';
        }

        const dateRange = getISTDateTimeStrings(rng);
        const indexConfig = INDEX_TOKENS[underlying];

        if (!angelJwtToken) {
            await angelLogin();
        }

        if (!angelJwtToken) {
            throw new Error("Angel One session token is missing");
        }

        console.log(`📡 Fetching historical candles from Angel One for ${underlying} (${interval}, ${dateRange.fromStr} to ${dateRange.toStr})...`);
        const response = await axios.post(
            'https://apiconnect.angelone.in/rest/secure/angelbroking/historical/v1/getCandleData',
            {
                exchange: indexConfig.exch,
                symboltoken: indexConfig.token,
                interval: interval,
                fromdate: dateRange.fromStr,
                todate: dateRange.toStr
            },
            {
                headers: {
                    'Authorization': `Bearer ${angelJwtToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-UserType': 'USER',
                    'X-SourceID': 'WEB',
                    'X-PrivateKey': process.env.ANGEL_API_KEY,
                    'X-ClientLocalIP': '192.168.1.1',
                    'X-ClientPublicIP': '106.202.70.114',
                    'X-MACAddress': '00:00:00:00:00:00'
                }
            }
        );

        if (response.data && response.data.status && response.data.data) {
            const rawCandles = response.data.data;
            const indexCandles = rawCandles.map(c => {
                const time = Math.floor(new Date(c[0]).getTime() / 1000);
                return {
                    time,
                    open: c[1],
                    high: c[2],
                    low: c[3],
                    close: c[4]
                };
            });

            historicalCache[cacheKey] = {
                data: indexCandles,
                timestamp: Date.now()
            };

            const formatted = await formatOptionCandlesIfNeeded(indexCandles, symbol);
            return res.json(formatted);
        } else {
            console.warn(`⚠️ Angel One historical API failed:`, response.data);
            checkIfTokenInvalid(response);
            throw new Error(response.data?.message || "Failed to fetch historical data");
        }
    } catch (err) {
        checkIfTokenInvalid(err);
        console.error(`❌ Historical candles fetch error:`, err.message);
        return res.json([]);
    }
});

// ============================================================
// SERVER + WEBSOCKET START (pehle define karo!)
// ============================================================
const server = app.listen(PORT, () => console.log(`🚀 SecureTrade running on port ${PORT}`));
const wss = new WebSocketServer({ server }); // wss yahan define hoga

// ============================================================
// 📡 ANGEL ONE SMARTAPI - REAL TIME PRICES
// ============================================================
const marketState = {
    "NIFTY50":   { history: [], candles: [], currentPrice: 24500, realPrice: 24500, tickCount: 0, lastRsi: 50, lastSignal: "WAIT", lastSignal5ema: "WAIT", lastTargetPct5ema: 20, lastSlPct5ema: 15, isRealHistorySeeded: false },
    "SENSEX":    { history: [], candles: [], currentPrice: 81000, realPrice: 81000, tickCount: 0, lastRsi: 50, lastSignal: "WAIT", lastSignal5ema: "WAIT", lastTargetPct5ema: 20, lastSlPct5ema: 15, isRealHistorySeeded: false },
    "BANKNIFTY": { history: [], candles: [], currentPrice: 60661, realPrice: 60661, tickCount: 0, lastRsi: 50, lastSignal: "WAIT", lastSignal5ema: "WAIT", lastTargetPct5ema: 20, lastSlPct5ema: 15, isRealHistorySeeded: false }
};

// Load last prices to maintain closed market simulation values across restarts
const lastPricesPath = require('path').join(__dirname, 'last_prices.json');
if (require('fs').existsSync(lastPricesPath)) {
    try {
        const saved = JSON.parse(require('fs').readFileSync(lastPricesPath, 'utf8'));
        if (saved.NIFTY50) {
            marketState['NIFTY50'].currentPrice = saved.NIFTY50;
            marketState['NIFTY50'].realPrice = saved.NIFTY50;
        }
        if (saved.SENSEX) {
            marketState['SENSEX'].currentPrice = saved.SENSEX;
            marketState['SENSEX'].realPrice = saved.SENSEX;
        }
        if (saved.BANKNIFTY) {
            marketState['BANKNIFTY'].currentPrice = saved.BANKNIFTY;
            marketState['BANKNIFTY'].realPrice = saved.BANKNIFTY;
        }
        console.log("✅ Loaded last market prices from last_prices.json:", saved);
    } catch (err) {
        console.error("Failed to load last prices:", err.message);
    }
}

let angelJwtToken = null;

let optionQuotesCache = {}; // Cache format: { token: { price, timestamp } }
try {
    if (require('fs').existsSync('option_quotes_cache.json')) {
        optionQuotesCache = JSON.parse(require('fs').readFileSync('option_quotes_cache.json', 'utf8'));
        console.log(`✅ Loaded ${Object.keys(optionQuotesCache).length} option quotes from cache file.`);
        
        // Clean up expired option tokens
        const activeTokens = new Set();
        for (const key in scripMap) {
            const item = scripMap[key];
            if (item && item.token) activeTokens.add(item.token);
        }
        let removedCount = 0;
        for (const token in optionQuotesCache) {
            if (!activeTokens.has(token)) {
                delete optionQuotesCache[token];
                removedCount++;
            }
        }
        if (removedCount > 0) {
            console.log(`🧹 [Cache Cleanup] Removed ${removedCount} expired option tokens from cache.`);
            try {
                require('fs').writeFileSync('option_quotes_cache.json', JSON.stringify(optionQuotesCache, null, 2));
            } catch (err) {}
        }
    }
} catch (err) {
    console.warn("⚠️ Failed to load option quotes cache file:", err.message);
}

// Periodically persist quotes cache to file
setInterval(() => {
    try {
        require('fs').writeFileSync('option_quotes_cache.json', JSON.stringify(optionQuotesCache, null, 2));
    } catch (err) {
        console.warn("⚠️ Failed to save option quotes cache:", err.message);
    }
}, 15000); // every 15 seconds

let lastGlobalFetchTime = 0;
const pendingFetches = new Set();
async function fetchAndCacheOptionPrices(tokensNFO, tokensBFO) {
    const now = Date.now();
    if (now - lastGlobalFetchTime < 1000) {
        return; // Global throttle: rate limit broker calls to at most once per 1 second
    }
    const key = [...tokensNFO, ...tokensBFO].sort().join(',');
    if (key.length === 0 || pendingFetches.has(key)) return;
    pendingFetches.add(key);
    lastGlobalFetchTime = now;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
        const exchangeTokens = {};
        if (tokensNFO.length > 0) exchangeTokens["NFO"] = tokensNFO;
        if (tokensBFO.length > 0) exchangeTokens["BFO"] = tokensBFO;

        if (!angelJwtToken) await angelLogin();
        if (angelJwtToken) {
            const quoteRes = await axios.post('https://apiconnect.angelbroking.com/rest/secure/angelbroking/market/v1/quote/', {
                mode: "OHLC",
                exchangeTokens
            }, {
                headers: {
                    'Authorization': `Bearer ${angelJwtToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-UserType': 'USER',
                    'X-SourceID': 'WEB',
                    'X-PrivateKey': process.env.ANGEL_API_KEY
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            const data = quoteRes.data;
            checkIfTokenInvalid(quoteRes);
            if (typeof data === 'string') {
                if (data.includes("Access denied") || data.includes("Access Denied")) {
                    console.warn("⚠️ Angel One returned Access Denied (Rate limit hit) in background query. Keeping token.");
                }
                throw new Error(`Non-JSON background quote response: ${data.substring(0, 50)}`);
            }
            const fetched = data?.data?.fetched || [];
            fetched.forEach(item => {
                optionQuotesCache[item.symbolToken] = {
                    price: item.ltp,
                    high: item.high || 0,
                    low: item.low || 0,
                    close: item.close || 0,
                    timestamp: Date.now()
                };
            });
        }
    } catch (err) {
        clearTimeout(timeoutId);
        checkIfTokenInvalid(err);
        console.error("Background quote fetch error:", err.message);
    } finally {
        pendingFetches.delete(key);
    }
}

async function getLivePriceForSymbol(symbol) {
    // 1. Check if index
    if (marketState[symbol]) {
        return marketState[symbol].currentPrice || marketState[symbol].realPrice;
    }

    // 2. Parse option contract
    const parsed = parseOptionSymbol(symbol);
    if (!parsed) {
        throw new Error(`Symbol format is not recognized: ${symbol}`);
    }

    const key = `${parsed.scripName}_${parsed.scripExpiry}_${parsed.strike}_${parsed.type}`;
    const item = scripMap[key];
    if (!item) {
        throw new Error(`Option contract not found in Master Scrip: ${key}`);
    }

    // 3. Check Cache
    const cached = optionQuotesCache[item.token];
    if (cached) {
        // If market is open, use 300ms cache. If closed, use 12 hours to freeze at real close prices.
        const maxAge = checkIsMarketOpen() ? 300 : (12 * 60 * 60 * 1000);
        if (Date.now() - cached.timestamp < maxAge) {
            console.log(`⚡ [Cache Hit] Live Price for ${symbol}: ₹${cached.price}`);
            return cached.price;
        } else {
            // Stale-While-Revalidate: Use stale price immediately, trigger background refresh!
            console.log(`♻️ [SWR Cache Hit] Stale Price for ${symbol}: ₹${cached.price}. Refreshing background cache...`);
            const nfo = item.exch_seg !== 'BFO' ? [item.token] : [];
            const bfo = item.exch_seg === 'BFO' ? [item.token] : [];
            fetchAndCacheOptionPrices(nfo, bfo).catch(() => {});
            return cached.price;
        }
    }

    // 4. If market is closed and no cache, fetch synchronously to get real close price first!
    if (!checkIsMarketOpen()) {
        try {
            console.log(`🔍 [Market Closed Cache Miss] Fetching real close price for ${symbol} synchronously...`);
            const nfo = item.exch_seg !== 'BFO' ? [item.token] : [];
            const bfo = item.exch_seg === 'BFO' ? [item.token] : [];
            await fetchAndCacheOptionPrices(nfo, bfo);
            
            // Check cache again after synchronous fetch
            const freshCached = optionQuotesCache[item.token];
            if (freshCached) {
                console.log(`⚡ [Post-Sync Cache Hit] Real Close Price for ${symbol}: ₹${freshCached.price}`);
                return freshCached.price;
            }
        } catch (fetchErr) {
            console.error(`❌ Sync fetch failed for closed market: ${fetchErr.message}`);
        }
    }

    // 5. If sync fetch fails or is open, calculate using Black-Scholes as last fallback
    if (!checkIsMarketOpen()) {
        const spotSymbol = parsed.scripName === 'NIFTY' ? 'NIFTY50' : parsed.scripName;
        const spot = marketState[spotSymbol]?.currentPrice || marketState[spotSymbol]?.realPrice;
        if (spot) {
            const isCall = parsed.type === "CE";
            const strike = parseFloat(parsed.strike);
            const dte = parseDteFromSymbol(symbol);
            const iv = parsed.scripName === "BANKNIFTY" ? 0.16 : 0.13;
            
            // Standard Normal Cumulative Distribution Function approximation
            const stdNormalCDF = (x) => {
                const t = 1 / (1 + 0.2316419 * Math.abs(x));
                const d = 0.3989423 * Math.exp(-x * x / 2);
                const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
                if (x > 0) return 1 - prob;
                return prob;
            };
            
            const T = Math.max(dte, 0.5) / 365;
            const sigma = iv;
            const r = 0.07;
            
            const d1 = (Math.log(spot / strike) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
            const d2 = d1 - sigma * Math.sqrt(T);
            
            const Nd1 = stdNormalCDF(d1);
            const Nd2 = stdNormalCDF(d2);
            const N_d1 = stdNormalCDF(-d1);
            const N_d2 = stdNormalCDF(-d2);
            
            const discount = Math.exp(-r * T);
            
            const premium = isCall 
                ? (spot * Nd1 - strike * discount * Nd2) 
                : (strike * discount * N_d2 - spot * N_d1);
                
            const calcPrice = Math.max(0.05, Math.round(premium * 20) / 20);
            return calcPrice;
        }
    }

    // 5. Fetch from Angel One API
    if (!angelJwtToken) {
        await angelLogin();
    }
    if (!angelJwtToken) {
        throw new Error("Angel One session token is missing");
    }

    const exchangeTokens = {};
    if (item.exch_seg === 'BFO') {
        exchangeTokens["BFO"] = [item.token];
    } else {
        exchangeTokens["NFO"] = [item.token];
    }

    console.log(`📡 [Cache Miss] Fetching live price from Angel One for ${symbol}...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
        const quoteRes = await axios.post('https://apiconnect.angelbroking.com/rest/secure/angelbroking/market/v1/quote/', {
            mode: "LTP",
            exchangeTokens
        }, {
            headers: {
                'Authorization': `Bearer ${angelJwtToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-UserType': 'USER',
                'X-SourceID': 'WEB',
                'X-PrivateKey': process.env.ANGEL_API_KEY
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = quoteRes.data;
        checkIfTokenInvalid(quoteRes);
        if (typeof data === 'string') {
            if (data.includes("Access denied") || data.includes("Access Denied")) {
                console.warn("⚠️ Angel One returned Access Denied in direct query. Clearing token.");
                angelJwtToken = null;
            }
            throw new Error(`Non-JSON direct quote response: ${data.substring(0, 50)}`);
        }
        const fetched = data?.data?.fetched || [];
        if (fetched.length > 0 && fetched[0].ltp !== undefined) {
            const ltp = fetched[0].ltp;
            // Update cache, preserving existing OHLC details
            optionQuotesCache[item.token] = {
                ...(optionQuotesCache[item.token] || {}),
                price: ltp,
                timestamp: Date.now()
            };
            return ltp;
        }
    } catch (err) {
        clearTimeout(timeoutId);
        checkIfTokenInvalid(err);
        console.error(`⚠️ Direct broker fetch failed for ${symbol}: ${err.message}`);
        if (cached) {
            console.log(`♻️ [Fallback to Cache] Using stale price of ₹${cached.price} for ${symbol} due to broker error.`);
            return cached.price;
        }
        throw err;
    }

    if (cached) {
        console.log(`♻️ [Fallback to Cache] Using stale price of ₹${cached.price} for ${symbol} due to empty response.`);
        return cached.price;
    }
    throw new Error(`No LTP quote returned from Angel One for token ${item.token}`);
}

function checkIfTokenInvalid(obj) {
    if (!obj) return false;
    const data = obj.data || obj;
    if (data && (data.errorCode === 'AG8001' || data.message === 'Invalid Token')) {
        console.log("🚨 [Token Guard] Invalid Token/Session detected. Resetting angelJwtToken to force re-login.");
        angelJwtToken = null;
        return true;
    }
    if (obj.response && obj.response.data) {
        const errData = obj.response.data;
        if (errData.errorCode === 'AG8001' || errData.message === 'Invalid Token') {
            console.log("🚨 [Token Guard] Invalid Token/Session in Axios error response. Resetting angelJwtToken to force re-login.");
            angelJwtToken = null;
            return true;
        }
    }
    return false;
}

let loginPromise = null;
let lastLoginAttemptTime = 0;
const LOGIN_COOLDOWN_MS = 15000;

async function angelLogin() {
    if (angelJwtToken) {
        return true;
    }
    if (loginPromise) {
        return loginPromise;
    }
    
    const now = Date.now();
    const timeSinceLastAttempt = now - lastLoginAttemptTime;
    if (timeSinceLastAttempt < LOGIN_COOLDOWN_MS) {
        if (!angelLogin.lastSpamTime || (now - angelLogin.lastSpamTime > 15000)) {
            console.log(`⏳ [angelLogin] Cooldown active. Please wait ${Math.ceil((LOGIN_COOLDOWN_MS - timeSinceLastAttempt)/1000)}s.`);
            angelLogin.lastSpamTime = now;
        }
        return false;
    }

    lastLoginAttemptTime = now;
    loginPromise = (async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        try {
            const totp = speakeasy.totp({
                secret: process.env.ANGEL_TOTP_SECRET,
                encoding: 'base32'
            });
            console.log(`🔐 Angel One Login... TOTP: ${totp}`);
            const res = await axios.post('https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1/loginByPassword', {
                clientcode: process.env.ANGEL_CLIENT_ID,
                password: process.env.ANGEL_PASSWORD,
                totp
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-UserType': 'USER',
                    'X-SourceID': 'WEB',
                    'X-ClientLocalIP': '192.168.1.1',
                    'X-ClientPublicIP': '106.202.70.114',
                    'X-MACAddress': '00:00:00:00:00:00',
                    'X-PrivateKey': process.env.ANGEL_API_KEY
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            const data = res.data;
            if (data?.status && data?.data?.jwtToken) {
                angelJwtToken = data.data.jwtToken;
                console.log('✅ Angel One Login Successful!');
                return true;
            }
            console.log('⚠️ Login Failed:', data?.message);
            return false;
        } catch (err) {
            clearTimeout(timeoutId);
            console.log('⚠️ Angel One Login Error:', err.message);
            return false;
        } finally {
            loginPromise = null;
        }
    })();
    
    return loginPromise;
}

function saveLastPrices() {
    try {
        const prices = {
            NIFTY50: marketState['NIFTY50'].realPrice,
            SENSEX: marketState['SENSEX'].realPrice,
            BANKNIFTY: marketState['BANKNIFTY'].realPrice
        };
        require('fs').writeFileSync(require('path').join(__dirname, 'last_prices.json'), JSON.stringify(prices), 'utf8');
    } catch (err) {
        console.error("Failed to save last prices:", err.message);
    }
}

async function fetchAngelPrices() {
    if (fetchAngelPrices.inProgress) {
        return;
    }
    const open = checkIsMarketOpen();
    if (!open) {
        // Fetch only once every 30 seconds when closed to keep the final closing price accurate
        const now = Date.now();
        if (fetchAngelPrices.lastClosedFetch && (now - fetchAngelPrices.lastClosedFetch < 30000)) {
            return;
        }
        fetchAngelPrices.lastClosedFetch = now;
    }
    if (!angelJwtToken) { await angelLogin(); return; }
    
    fetchAngelPrices.inProgress = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
        const res = await axios.post('https://apiconnect.angelbroking.com/rest/secure/angelbroking/market/v1/quote/', {
            mode: "OHLC",
            exchangeTokens: { "NSE": ["26000", "26009"], "BSE": ["1"] }
        }, {
            headers: {
                'Authorization': `Bearer ${angelJwtToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-UserType': 'USER',
                'X-SourceID': 'WEB',
                'X-PrivateKey': process.env.ANGEL_API_KEY
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        const data = res.data;
        if (typeof data === 'string') {
            if (data.includes("Access denied") || data.includes("Access Denied")) {
                console.warn("⚠️ Angel One returned Access Denied (Rate limit hit) in index fetch. Keeping token.");
            }
            throw new Error(`Non-JSON index price response: ${data.substring(0, 50)}`);
        }
        const fetched = data?.data?.fetched || [];
        fetched.forEach(item => {
            if (item.symbolToken === '26000' && item.ltp) {
                marketState['NIFTY50'].realPrice = item.ltp;
                if (item.close) marketState['NIFTY50'].close = item.close;
                console.log(`📡 NIFTY50: ₹${item.ltp} (Prev Close: ₹${item.close})`);
            } else if (item.symbolToken === '26009' && item.ltp) {
                marketState['BANKNIFTY'].realPrice = item.ltp;
                if (item.close) marketState['BANKNIFTY'].close = item.close;
                console.log(`📡 BANKNIFTY: ₹${item.ltp} (Prev Close: ₹${item.close})`);
            } else if (item.symbolToken === '1' && item.ltp) {
                marketState['SENSEX'].realPrice = item.ltp;
                if (item.close) marketState['SENSEX'].close = item.close;
                console.log(`📡 SENSEX: ₹${item.ltp} (Prev Close: ₹${item.close})`);
            }
        });
        if (fetched.length > 0) {
            saveLastPrices();
        }
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            console.log('⚠️ Price fetch timed out');
        } else if (err.status === 401) {
            console.log('🔄 Token expired, re-logging...');
            angelJwtToken = null;
        } else {
            console.log('⚠️ Price fetch error:', err.message);
        }
    } finally {
        fetchAngelPrices.inProgress = false;
    }
}

angelLogin().then(() => {
    seedRealHistory().then(() => fetchAngelPrices());
});
const priceInterval = setInterval(fetchAngelPrices, 1500);
const loginInterval = setInterval(angelLogin, 8 * 60 * 60 * 1000);

// ============================================================
// 🤖 RSI + MA SIGNAL
// ============================================================
const RSI_PERIOD = 14;

function calculateRSI(prices) {
    if (prices.length < RSI_PERIOD + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = prices.length - RSI_PERIOD; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    const avgGain = gains / RSI_PERIOD;
    const avgLoss = Math.abs(losses / RSI_PERIOD);
    if (avgLoss === 0) return 100;
    return 100 - (100 / (1 + avgGain / avgLoss));
}

function calculateEMA(prices, period) {
    if (prices.length === 0) return 0;
    if (prices.length < period) return prices[prices.length - 1];
    
    const sma = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let ema = sma;
    const multiplier = 2 / (period + 1);
    
    for (let i = period; i < prices.length; i++) {
        ema = (prices[i] - ema) * multiplier + ema;
    }
    return ema;
}

function calculateATR(candles, period = 14) {
    if (!candles || candles.length < period + 1) return 0;
    const trs = [];
    for (let i = candles.length - period - 1; i < candles.length; i++) {
        if (i === 0) continue;
        const h = candles[i].high;
        const l = candles[i].low;
        const prevClose = candles[i - 1].close;
        const tr = Math.max(h - l, Math.abs(h - prevClose), Math.abs(l - prevClose));
        trs.push(tr);
    }
    if (trs.length === 0) return 0;
    return trs.reduce((a, b) => a + b, 0) / trs.length;
}

function generateSignalGainz(rsi, prices, symbol) {
    if (prices.length < 50) return "WAIT";
    const ema9 = calculateEMA(prices, 9);
    const ema21 = calculateEMA(prices, 21);
    const ema50 = calculateEMA(prices, 50);

    const prevPrices = prices.slice(0, prices.length - 1);
    const prevEma9 = calculateEMA(prevPrices, 9);
    const prevEma21 = calculateEMA(prevPrices, 21);
    
    const isBullishTrend = ema9 > ema50 && ema21 > ema50;
    const isBearishTrend = ema9 < ema50 && ema21 < ema50;
    
    const currentClose = prices[prices.length - 1];
    const prevClose = prices[prices.length - 2];
    
    const isBullishBreakout = (prevClose <= prevEma9) && (currentClose > ema9) && isBullishTrend;
    const isBearishBreakout = (prevClose >= prevEma9) && (currentClose < ema9) && isBearishTrend;
    
    // Optimized RSI bounds (49 and 51 instead of 53 and 47) for early entry
    if (isBullishBreakout && rsi > 49) {
        return "BUY (Gainz Breakout)";
    }
    if (isBearishBreakout && rsi < 51) {
        return "SELL (Gainz Breakdown)";
    }
    return "WAIT";
}

function generateSignal(rsi, prices, symbol) {
    if (prices.length < 50) return "WAIT";
    
    const ema9 = calculateEMA(prices, 9);
    const ema21 = calculateEMA(prices, 21);
    const ema50 = calculateEMA(prices, 50);

    // Calculate previous state to detect fresh crossovers (state-change events)
    const prevPrices = prices.slice(0, prices.length - 1);
    const prevEma9 = calculateEMA(prevPrices, 9);
    const prevEma21 = calculateEMA(prevPrices, 21);
    const prevEma50 = calculateEMA(prevPrices, 50);
    
    // Flat Market Filter disabled to enter crossovers early. Trusting frontend dynamic regime switcher.
    const isFlatMarket = false; 
    
    // Pure crossover execution (no 50 EMA lag filter) for early entry
    const isBullishTrend = true;
    const isBearishTrend = true;

    const isFreshBullishCross = (prevEma9 <= prevEma21) && (ema9 > ema21);
    const isFreshBearishCross = (prevEma9 >= prevEma21) && (ema9 < ema21);
    
    // 1. Extreme Reversals (Requires a fresh crossover in the oversold/overbought zone)
    if (rsi < 32 && isFreshBullishCross) {
        return "STRONG BUY (Oversold Reversal)";
    }
    if (rsi > 68 && isFreshBearishCross) {
        return "STRONG SELL (Overbought Reversal)";
    }
    
    // 2. Trend-Following Crosses (Optimized RSI bounds for early entry)
    if (!isFlatMarket) {
        if (isBullishTrend && rsi >= 46 && isFreshBullishCross) {
            return "BUY (Bullish Trend Cross)";
        }
        if (isBearishTrend && rsi <= 54 && isFreshBearishCross) {
            return "SELL (Bearish Trend Cross)";
        }
    }
    
    return "WAIT";
}

async function seedRealHistory() {
    console.log("⏳ Seeding real market history from Angel One...");
    try {
        if (!angelJwtToken) {
            await angelLogin();
        }
        if (!angelJwtToken) {
            throw new Error("Angel One session token missing");
        }

        const dateRange = getISTDateTimeStrings('Y'); // Yesterday to Today

        for (const symbol in INDEX_TOKENS) {
            if (marketState[symbol].isRealHistorySeeded) {
                continue; // Skip if already seeded!
            }
            const config = INDEX_TOKENS[symbol];
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            try {
                const response = await axios.post(
                    'https://apiconnect.angelone.in/rest/secure/angelbroking/historical/v1/getCandleData',
                    {
                        exchange: config.exch,
                        symboltoken: config.token,
                        interval: "FIVE_MINUTE",
                        fromdate: dateRange.fromStr,
                        todate: dateRange.toStr
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${angelJwtToken}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'X-UserType': 'USER',
                            'X-SourceID': 'WEB',
                            'X-PrivateKey': process.env.ANGEL_API_KEY,
                            'X-ClientLocalIP': '192.168.1.1',
                            'X-ClientPublicIP': '106.202.70.114',
                            'X-MACAddress': '00:00:00:00:00:00'
                        },
                        signal: controller.signal
                    }
                );
                clearTimeout(timeoutId);

                if (response.data && response.data.status && response.data.data && response.data.data.length > 0) {
                    const rawCandles = response.data.data.slice(-80); // Take last 80 candles
                    const history = rawCandles.map(c => c[4]); // Close prices
                    const candles = rawCandles.map(c => ({
                        open: c[1],
                        high: c[2],
                        low: c[3],
                        close: c[4]
                    }));

                    marketState[symbol].history = history;
                    marketState[symbol].candles = candles;
                    marketState[symbol].isRealHistorySeeded = true;
                    
                    const basePrice = history[history.length - 1];
                    marketState[symbol].currentCandleOpen = basePrice;
                    marketState[symbol].currentCandleHigh = basePrice;
                    marketState[symbol].currentCandleLow = basePrice;

                    const rsi = calculateRSI(history);
                    const signal = generateSignal(rsi, history, symbol);
                    marketState[symbol].lastRsi = rsi;
                    marketState[symbol].lastSignal = signal;

                    console.log(`🌱 [${symbol}] Seeded REAL history: ${history.length} candles, Initial RSI: ${rsi.toFixed(2)}, Signal: ${signal}`);
                } else {
                    checkIfTokenInvalid(response);
                    throw new Error("Empty historical response");
                }
            } catch (err) {
                clearTimeout(timeoutId);
                checkIfTokenInvalid(err);
                console.warn(`⚠️ [${symbol}] Real history seeding failed, falling back to mock generation: ${err.message}`);
                marketState[symbol].isRealHistorySeeded = false;
                seedFallbackHistory(symbol);
            }
            
            // Wait 1 second between requests to respect rate limits (max 3/sec)
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (err) {
        console.error("❌ Real history seeding failed entirely, using mock fallback:", err.message);
        for (const symbol in marketState) {
            seedFallbackHistory(symbol);
        }
    }
}

function seedFallbackHistory(symbol) {
    const basePrice = marketState[symbol].realPrice;
    const history = [];
    const candles = [];
    let tempPrice = basePrice;
    for (let i = 0; i < 80; i++) {
        const prevPrice = tempPrice;
        tempPrice += (Math.random() - 0.5) * (basePrice * 0.0001);
        history.push(tempPrice);
        
        const open = prevPrice;
        const close = tempPrice;
        const high = Math.max(open, close) + Math.random() * (basePrice * 0.0001);
        const low = Math.min(open, close) - Math.random() * (basePrice * 0.0001);
        candles.push({ open, high, low, close });
    }
    marketState[symbol].history = history;
    marketState[symbol].candles = candles;
    marketState[symbol].currentCandleOpen = basePrice;
    marketState[symbol].currentCandleHigh = basePrice;
    marketState[symbol].currentCandleLow = basePrice;
    marketState[symbol].isRealHistorySeeded = false;
    
    const rsi = calculateRSI(history);
    const signal = generateSignal(rsi, history, symbol);
    marketState[symbol].lastRsi = rsi;
    marketState[symbol].lastSignal = signal;
    console.log(`🌱 [${symbol}] Seeded MOCK fallback history: ${history.length} points, Initial RSI: ${rsi.toFixed(2)}, Signal: ${signal}`);
}
for (const symbol in marketState) {
    seedFallbackHistory(symbol);
}

// ============================================================
// 🌐 WEBSOCKET
// ============================================================
function checkIsMarketOpen() {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    
    const day = ist.getDay(); // 0 = Sunday, 6 = Saturday
    if (day === 0 || day === 6) return false;
    
    // Format date as YYYY-MM-DD in IST
    const yyyy = ist.getFullYear();
    const mm = String(ist.getMonth() + 1).padStart(2, '0');
    const dd = String(ist.getDate()).padStart(2, '0');
    const dateString = `${yyyy}-${mm}-${dd}`;
    
    // NSE Holidays 2026 List
    const holidays = [
        "2026-01-26", // Republic Day
        "2026-03-03", // Holi
        "2026-03-26", // Shri Ram Navami
        "2026-03-31", // Shri Mahavir Jayanti
        "2026-04-03", // Good Friday
        "2026-04-14", // Ambedkar Jayanti
        "2026-05-01", // Maharashtra Day
        "2026-05-28", // Bakri Id
        "2026-06-26", // Muharram
        "2026-09-14", // Ganesh Chaturthi
        "2026-10-02", // Gandhi Jayanti
        "2026-10-20", // Dussehra
        "2026-11-10", // Diwali-Balipratipada
        "2026-11-24", // Prakash Gurpurb Sri Guru Nanak Dev
        "2026-12-25"  // Christmas
    ];
    
    if (holidays.includes(dateString)) return false;
    
    const hours = ist.getHours();
    const minutes = ist.getMinutes();
    const timeVal = hours * 100 + minutes; // e.g. 9:15 -> 915, 15:30 -> 1530
    
    return timeVal >= 915 && timeVal <= 1530;
}

const SIMULATE_CLOSED_MARKET = process.env.SIMULATE_CLOSED_MARKET === "true";

let lastSeededDate = null;
let lastSeedingAttemptTime = 0;

const globalUpdateInterval = setInterval(async () => {
    const updates = {};
    const open = checkIsMarketOpen();
    
    // Automatic Daily Re-seeding logic
    if (open) {
        const d = new Date();
        const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        const ist = new Date(utc + (3600000 * 5.5));
        const todayStr = ist.toISOString().split('T')[0]; // "YYYY-MM-DD"
        
        if (lastSeededDate !== todayStr) {
            console.log(`🌞 New market day detected (${todayStr}). Automatically re-seeding history...`);
            lastSeededDate = todayStr;
            // Run in background without blocking the main tick loop
            seedRealHistory().catch(err => {
                console.error("❌ Automatic daily re-seeding failed:", err.message);
            });
        }
    }

    // Self-healing: if login succeeded but real history hasn't been seeded yet, seed it!
    if (angelJwtToken && (Date.now() - lastSeedingAttemptTime > 30000)) {
        let needsSeeding = false;
        for (const symbol in marketState) {
            if (!marketState[symbol].isRealHistorySeeded) {
                needsSeeding = true;
                break;
            }
        }
        if (needsSeeding && !fetchAngelPrices.inProgress) {
            lastSeedingAttemptTime = Date.now();
            console.log("🔄 Real history is missing or incomplete. Seeding pending indices now that token is active...");
            seedRealHistory().catch(err => {
                console.error("❌ Seeding real history on token update failed:", err.message);
            });
        }
    }
    
    for (const symbol in marketState) {
        const base = marketState[symbol].realPrice;
        
        let price;
        if (open) {
            price = base;
            marketState[symbol].currentDrift = 0;
        } else {
            if (SIMULATE_CLOSED_MARKET) {
                const maxDrift = base * 0.001;
                const step = base * 0.00003;
                let drift = marketState[symbol].currentDrift || 0;
                drift += (Math.random() - 0.5) * step;
                if (Math.abs(drift) > maxDrift) {
                    drift = Math.sign(drift) * maxDrift;
                }
                marketState[symbol].currentDrift = drift;
                price = base + drift;
            } else {
                price = base;
                marketState[symbol].currentDrift = 0;
            }
        }
        marketState[symbol].currentPrice = price;
        
        const curState = marketState[symbol];
        curState.tickCount = (curState.tickCount || 0) + 1;
        
        if (curState.currentCandleOpen === undefined) {
            curState.currentCandleOpen = price;
            curState.currentCandleHigh = price;
            curState.currentCandleLow = price;
        }
        curState.currentCandleHigh = Math.max(curState.currentCandleHigh, price);
        curState.currentCandleLow = Math.min(curState.currentCandleLow, price);
        
        if (curState.tickCount >= 300 || curState.history.length === 0) {
            curState.history.push(price);
            if (curState.history.length > 100) {
                curState.history.shift();
            }
            
            const openVal = curState.currentCandleOpen;
            const highVal = curState.currentCandleHigh;
            const lowVal = curState.currentCandleLow;
            const closeVal = price;
            curState.candles = curState.candles || [];
            curState.candles.push({ open: openVal, high: highVal, low: lowVal, close: closeVal });
            if (curState.candles.length > 100) {
                curState.candles.shift();
            }
            
            curState.currentCandleOpen = price;
            curState.currentCandleHigh = price;
            curState.currentCandleLow = price;
            curState.tickCount = 0;

            if (curState.history.length >= 5 && curState.candles.length >= 1) {
                const ema5 = calculateEMA(curState.history, 5);
                const lastCandle = curState.candles[curState.candles.length - 1];
                
                if (lastCandle.low > ema5) {
                    curState.peAlertLow = lastCandle.low;
                    curState.peAlertHigh = lastCandle.high;
                    curState.ceAlertHigh = null;
                    console.log(`🕯️ [5EMA PE Alert] ${symbol} candle low ${lastCandle.low} is above 5EMA ${ema5.toFixed(2)}`);
                } else if (lastCandle.high < ema5) {
                    curState.ceAlertHigh = lastCandle.high;
                    curState.ceAlertLow = lastCandle.low;
                    curState.peAlertLow = null;
                    console.log(`🕯️ [5EMA CE Alert] ${symbol} candle high ${lastCandle.high} is below 5EMA ${ema5.toFixed(2)}`);
                }
            }
        }
        
        const activeHistory = [...curState.history, price];
        const rsi = calculateRSI(activeHistory);
        const signal = generateSignal(rsi, activeHistory, symbol);
        const signalGainz = generateSignalGainz(rsi, activeHistory, symbol);
        
        curState.lastRsi = rsi;
        curState.lastSignal = signal;
        curState.lastSignalGainz = signalGainz;

        let signal5ema = "WAIT";
        let targetPct5ema = 20;
        let slPct5ema = 15;
        
        if (curState.ceAlertHigh && price > curState.ceAlertHigh) {
            signal5ema = "BUY (5EMA Breakout)";
            const rawSl = ((price - curState.ceAlertLow) / price) * 100;
            slPct5ema = Math.max(1.5, Math.min(20, rawSl));
            targetPct5ema = slPct5ema * 3;
            curState.ceAlertHigh = null;
            console.log(`🎯 [5EMA Buy Trigger] ${symbol} price ${price} broke high (SL: -${slPct5ema.toFixed(1)}%)`);
        } else if (curState.peAlertLow && price < curState.peAlertLow) {
            signal5ema = "SELL (5EMA Breakout)";
            const rawSl = ((curState.peAlertHigh - price) / price) * 100;
            slPct5ema = Math.max(1.5, Math.min(20, rawSl));
            targetPct5ema = slPct5ema * 3;
            curState.peAlertLow = null;
            console.log(`🎯 [5EMA Sell Trigger] ${symbol} price ${price} broke low (SL: -${slPct5ema.toFixed(1)}%)`);
        }
        
        curState.lastSignal5ema = signal5ema;
        if (signal5ema !== "WAIT") {
            curState.lastTargetPct5ema = targetPct5ema;
            curState.lastSlPct5ema = slPct5ema;
        }

        const ema9 = calculateEMA(activeHistory, 9);
        const ema21 = calculateEMA(activeHistory, 21);
        const prevHistory = activeHistory.slice(0, activeHistory.length - 1);
        const prevEma9 = calculateEMA(prevHistory, 9);
        const prevEma21 = calculateEMA(prevHistory, 21);
        
        const ema50 = calculateEMA(activeHistory, 50);
        const prevEma50 = calculateEMA(prevHistory, 50);
        const ema50Slope = Math.abs(ema50 - prevEma50);
        
        let slopeLimit = 1.0;
        if (symbol === "BANKNIFTY") slopeLimit = 3.0;
        else if (symbol === "SENSEX") slopeLimit = 4.0;
        
        const slopeRatio = slopeLimit > 0 ? ema50Slope / slopeLimit : 1;
        let targetMultiplier = 1.8;
        let slMultiplier = 1.2;
        
        if (slopeRatio <= 1.2) {
            targetMultiplier = 1.2;
            slMultiplier = 1.0;
        } else if (slopeRatio > 2.2) {
            targetMultiplier = 2.8;
            slMultiplier = 1.4;
        }
        
        const atr = calculateATR(curState.candles || [], 14);
        
        updates[symbol] = { 
            price: price.toFixed(2), 
            close: (curState.close || price).toFixed(2), // Send real previous close price!
            rsi: curState.lastRsi.toFixed(2), 
            signal: curState.lastSignal,
            isMarketOpen: open,
            ema9: ema9.toFixed(2),
            ema21: ema21.toFixed(2),
            prevEma9: prevEma9.toFixed(2),
            prevEma21: prevEma21.toFixed(2),
            signal5ema: curState.lastSignal5ema,
            targetPct5ema: curState.lastTargetPct5ema || 20,
            slPct5ema: curState.lastSlPct5ema || 15,
            atr: atr.toFixed(2),
            signalGainz: curState.lastSignalGainz || "WAIT",
            targetMultiplier,
            slMultiplier
        };
    }
    
    // Broadcast updates to all connected clients
    const messageStr = JSON.stringify(updates);
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(messageStr);
        }
    });
}, 200);

wss.on('connection', (ws) => {
    console.log("🟢 New Trader Connected!");
    
    // Send initial update immediately so the UI doesn't display empty cards
    const initialUpdates = {};
    const open = checkIsMarketOpen();
    for (const symbol in marketState) {
        const curState = marketState[symbol];
        const activeHistory = [...curState.history, curState.currentPrice];
        const ema9 = calculateEMA(activeHistory, 9);
        const ema21 = calculateEMA(activeHistory, 21);
        const prevHistory = activeHistory.slice(0, activeHistory.length - 1);
        const prevEma9 = calculateEMA(prevHistory, 9);
        const prevEma21 = calculateEMA(prevHistory, 21);

        const ema50 = calculateEMA(activeHistory, 50);
        const prevEma50 = calculateEMA(prevHistory, 50);
        const ema50Slope = Math.abs(ema50 - prevEma50);
        
        let slopeLimit = 1.0;
        if (symbol === "BANKNIFTY") slopeLimit = 3.0;
        else if (symbol === "SENSEX") slopeLimit = 4.0;
        
        const slopeRatio = slopeLimit > 0 ? ema50Slope / slopeLimit : 1;
        let targetMultiplier = 1.8;
        let slMultiplier = 1.2;
        
        if (slopeRatio <= 1.2) {
            targetMultiplier = 1.2;
            slMultiplier = 1.0;
        } else if (slopeRatio > 2.2) {
            targetMultiplier = 2.8;
            slMultiplier = 1.4;
        }

        const atr = calculateATR(curState.candles || [], 14);

        initialUpdates[symbol] = {
            price: curState.currentPrice.toFixed(2),
            rsi: curState.lastRsi.toFixed(2),
            signal: curState.lastSignal,
            isMarketOpen: open,
            ema9: ema9.toFixed(2),
            ema21: ema21.toFixed(2),
            prevEma9: prevEma9.toFixed(2),
            prevEma21: prevEma21.toFixed(2),
            signal5ema: curState.lastSignal5ema,
            targetPct5ema: curState.lastTargetPct5ema || 20,
            slPct5ema: curState.lastSlPct5ema || 15,
            atr: atr.toFixed(2),
            signalGainz: curState.lastSignalGainz || "WAIT",
            targetMultiplier,
            slMultiplier
        };
    }
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(initialUpdates));
    }
    
    ws.on('close', () => { 
        console.log("🔴 Disconnected"); 
    });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`\nReceived ${signal}. Shutting down SecureTrade backend...`);
    
    // Clear intervals
    if (typeof priceInterval !== 'undefined') clearInterval(priceInterval);
    if (typeof loginInterval !== 'undefined') clearInterval(loginInterval);
    if (typeof globalUpdateInterval !== 'undefined') clearInterval(globalUpdateInterval);
    
    // Close WebSocket Server
    if (typeof wss !== 'undefined' && wss) {
        console.log("Closing WebSocket Server...");
        wss.close(() => {
            console.log("WebSocket Server closed.");
        });
    }
    
    // Close HTTP Server
    if (typeof server !== 'undefined' && server) {
        server.close(() => {
            console.log("HTTP server closed. Process exited.");
            process.exit(0);
        });
    } else {
        process.exit(0);
    }

    // Force exit after 3 seconds if connections close slowly
    setTimeout(() => {
        console.error("Forced shutdown due to timeout.");
        process.exit(1);
    }, 3000);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Windows terminal Ctrl+C catcher
if (process.platform === "win32") {
    const readline = require("readline");
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.on("SIGINT", () => {
        process.emit("SIGINT");
    });
}

// Helper to compute DTE on backend
function parseDteFromSymbol(symbol) {
    const parsed = parseOptionSymbol(symbol);
    if (!parsed) return 1;
    
    const cleanExpiry = parsed.scripExpiry; // e.g. "09JUN2026"
    const day = cleanExpiry.substring(0, 2);
    const monthStr = cleanExpiry.substring(2, 5);
    const year = cleanExpiry.substring(5, 9);
    
    const months = {
        JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
        JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
    };
    
    const month = months[monthStr.toUpperCase()] || 0;
    const expiryDate = new Date(parseInt(year), month, parseInt(day), 15, 30, 0);
    
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const dte = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, dte);
}

// Helper to run Black-Scholes calculation on backend
function runBlackScholes(spot, strike, dte, isCall, iv) {
    const T = Math.max(dte, 0.5) / 365;
    const sigma = iv;
    const r = 0.07;
    
    const stdNormalCDF = (x) => {
        const t = 1 / (1 + 0.2316419 * Math.abs(x));
        const d = 0.3989423 * Math.exp(-x * x / 2);
        const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        if (x > 0) return 1 - prob;
        return prob;
    };
    
    const d1 = (Math.log(spot / strike) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    
    const Nd1 = stdNormalCDF(d1);
    const Nd2 = stdNormalCDF(d2);
    const N_d1 = stdNormalCDF(-d1);
    const N_d2 = stdNormalCDF(-d2);
    
    const discount = Math.exp(-r * T);
    
    const premium = isCall 
        ? (spot * Nd1 - strike * discount * Nd2) 
        : (strike * discount * N_d2 - spot * N_d1);
        
    return Math.max(0.05, Math.round(premium * 20) / 20);
}