import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { toEmail, otpCode, smtpUser, smtpPass } = await request.json();

    if (!toEmail || !otpCode || !smtpUser || !smtpPass) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Configure nodemailer transporter using NeuroNotes Gmail SMTP configuration
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const mailOptions = {
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

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully via Vercel:", info.response);
    return NextResponse.json({ success: true, response: info.response, messageId: info.messageId });
  } catch (err: any) {
    console.error("Vercel mailer error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
