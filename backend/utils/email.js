const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

// Dynamically resolve smtp.gmail.com strictly to its IPv4 address (A-Record)
function resolveGmailIpv4() {
    return new Promise((resolve) => {
        dns.resolve4('smtp.gmail.com', (err, addresses) => {
            if (err || !addresses || addresses.length === 0) {
                console.warn("⚠️ DNS resolution for smtp.gmail.com failed, falling back to hostname.");
                resolve('smtp.gmail.com');
            } else {
                console.log(`📡 Resolved smtp.gmail.com to IPv4: ${addresses[0]}`);
                resolve(addresses[0]);
            }
        });
    });
}

async function sendEmailOtp(toEmail, otpCode) {
    // Log to local file
    const logPath = path.join(__dirname, '../../scratch/email_otps.log');
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] OTP to ${toEmail}: ${otpCode}\n`, 'utf8');

    console.log(`✉️ [EMAIL OTP SENT to ${toEmail}]: ${otpCode}`);

    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
        console.warn("⚠️ [EMAIL WARNING] SMTP credentials not configured. Bypassing real email delivery.");
        return { success: true, simulated: true };
    }

    const ipAddress = await resolveGmailIpv4();

    // Configure transport with dynamic IPv4 IP, Port 587 & STARTTLS secure false
    const transporter = nodemailer.createTransport({
        host: ipAddress,
        port: 587,
        secure: false, // TLS
        auth: { user, pass },
        connectionTimeout: 10000, 
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: {
            rejectUnauthorized: false // Avoid SSL handshake failure since host is an IP instead of domain name
        }
    });

    const mailOptions = {
        from: `"SecureTrade Verification" <${user}>`,
        to: toEmail,
        subject: 'SecureTrade Registration - Email Verification OTP 🔐',
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <h2 style="color: #2563eb;">SecureTrade Registration</h2>
                <p>Bhai, thank you for signing up on SecureTrade! Please use the following One-Time Password (OTP) to complete your registration:</p>
                <div style="font-size: 24px; font-weight: bold; background: #f1f5f9; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0; color: #0f172a; letter-spacing: 4px;">
                    ${otpCode}
                </div>
                <p style="font-size: 13px; color: #64748b;">This OTP is valid for 10 minutes. Please do not share it with anyone.</p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Nodemailer response success:", info.response);
        return { success: true, response: info.response, messageId: info.messageId };
    } catch (err) {
        console.error("Nodemailer error:", err.message);
        return { success: false, simulated: false, error: err.message };
    }
}

module.exports = { sendEmailOtp };
