const fs = require('fs');
const path = require('path');

async function sendMobileOtp(toPhone, otpCode) {
    // Log to local file
    const logPath = path.join(__dirname, '../../scratch/mobile_otps.log');
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] Mobile OTP to ${toPhone}: ${otpCode}\n`, 'utf8');

    console.log(`📱 [MOBILE OTP SENT to ${toPhone}]: ${otpCode}`);

    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!sid || !token || !fromPhone) {
        console.warn("⚠️ [SMS WARNING] Twilio credentials not configured. Bypassing real SMS delivery.");
        return { success: true, simulated: true };
    }

    try {
        const twilio = require('twilio');
        const client = twilio(sid, token);
        await client.messages.create({
            body: `⚠️ [SecureTrade Alert] Your Mobile Verification OTP code is: ${otpCode}. Valid for 10 minutes.`,
            from: fromPhone,
            to: toPhone.startsWith('+') ? toPhone : `+91${toPhone}`
        });
        return { success: true };
    } catch (err) {
        console.error("Twilio send error:", err.message);
        return { success: false, error: err.message };
    }
}

module.exports = { sendMobileOtp };
