import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { toEmail, otpCode, message, smtpUser, smtpPass } = await request.json();

    if (!toEmail || !smtpUser || !smtpPass) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    if (!otpCode && !message) {
      return NextResponse.json({ error: "Either otpCode or message is required" }, { status: 400 });
    }

    // Configure nodemailer transporter using NeuroNotes Gmail SMTP configuration
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    let mailOptions;
    if (otpCode) {
      mailOptions = {
        from: `"SecureTrade Verification" <${smtpUser}>`,
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
    } else {
      mailOptions = {
        from: `"SecureTrade Alerts" <${smtpUser}>`,
        to: toEmail,
        subject: 'SecureTrade Trading Alert 📈🔔',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; max-width: 500px;">
              <h2 style="color: #2563eb; margin-top: 0;">SecureTrade Alert 📈</h2>
              <div style="font-size: 15px; line-height: 1.6; background: #ffffff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; color: #0f172a; margin: 15px 0; font-weight: 500;">
                  ${message}
              </div>
              <p style="font-size: 11px; color: #64748b; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
                  This is an automated trading notification alert. Please do not reply directly to this email.
              </p>
          </div>
        `
      };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully via Vercel:", info.response);
    return NextResponse.json({ success: true, response: info.response, messageId: info.messageId });
  } catch (err: any) {
    console.error("Vercel mailer error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
