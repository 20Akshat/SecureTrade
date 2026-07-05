const fs = require('fs');
const path = require('path');

async function sendEmailOtp(toEmail, otpCode) {
    // Log to local file for debug reference
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

    try {
        const response = await fetch("https://frontend-seven-weld-84.vercel.app/api/send-email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                toEmail,
                otpCode,
                smtpUser: user,
                smtpPass: pass
            })
        });

        const data = await response.json();
        if (response.ok && data.success) {
            console.log("Email successfully relayed via Vercel SMTP Bridge!");
            return { success: true, response: data.response, messageId: data.messageId };
        } else {
            console.error("Vercel SMTP Bridge returned error:", data.error || "Unknown error");
            return { success: false, simulated: false, error: data.error || "Bridge delivery failure" };
        }
    } catch (err) {
        console.error("Failed to connect to Vercel SMTP Bridge:", err.message);
        return { success: false, simulated: false, error: err.message };
    }
}

async function sendEmailNotification(toEmail, message) {
    // Log to local file for debug reference
    const logPath = path.join(__dirname, '../../scratch/email_alerts.log');
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] Alert to ${toEmail}: ${message}\n`, 'utf8');

    console.log(`✉️ [EMAIL ALERT SENT to ${toEmail}]: ${message}`);

    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
        console.warn("⚠️ [EMAIL WARNING] SMTP credentials not configured. Bypassing real email delivery.");
        return { success: true, simulated: true };
    }

    try {
        const response = await fetch("https://frontend-seven-weld-84.vercel.app/api/send-email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                toEmail,
                message,
                smtpUser: user,
                smtpPass: pass
            })
        });

        const data = await response.json();
        if (response.ok && data.success) {
            console.log("Notification email successfully relayed via Vercel SMTP Bridge!");
            return { success: true, response: data.response, messageId: data.messageId };
        } else {
            console.error("Vercel SMTP Bridge returned error for notification:", data.error || "Unknown error");
            return { success: false, simulated: false, error: data.error || "Bridge delivery failure" };
        }
    } catch (err) {
        console.error("Failed to connect to Vercel SMTP Bridge for notification:", err.message);
        return { success: false, simulated: false, error: err.message };
    }
}

module.exports = { sendEmailOtp, sendEmailNotification };
