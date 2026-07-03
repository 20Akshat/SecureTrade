const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

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

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
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
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (err) {
        console.error("Nodemailer error:", err.message);
        return { success: false, error: err.message };
    }
}

module.exports = { sendEmailOtp };
