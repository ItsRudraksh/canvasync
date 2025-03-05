import nodemailer from 'nodemailer';
import { db } from './db';

// Create a test account using Ethereal for development
// For production, use your actual SMTP credentials
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendVerificationEmail = async (email: string, otp: string) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@whiteboard-app.com',
    to: email,
    subject: 'Email Verification - Whiteboard App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify Your Email</h2>
        <p>Thank you for registering with Whiteboard App. Please use the following OTP to verify your email address:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this verification, please ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const sendDeletionEmail = async (email: string, otp: string) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@whiteboard-app.com',
    to: email,
    subject: 'Account Deletion Request - Whiteboard App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Account Deletion Request</h2>
        <p>We received a request to delete your Whiteboard App account. To confirm this action, please use the following verification code:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p style="color: #dc2626; margin-top: 20px;">Warning: This action cannot be undone. All your whiteboards and data will be permanently deleted.</p>
        <p>If you didn't request this deletion, please secure your account and contact support immediately.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const sendPasswordResetEmail = async (email: string, otp: string) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@whiteboard-app.com',
    to: email,
    subject: 'Password Reset Request - Whiteboard App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>We received a request to reset your Whiteboard App password. Please use the following verification code to reset your password:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this password reset, please ignore this email and make sure you can still login to your account.</p>
        <p>For security reasons, please do not share this code with anyone.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const storeOTP = async (email: string, otp: string) => {
  // Delete any existing OTP for this email
  await db.otp.deleteMany({
    where: { identifier: email },
  });

  // Create new OTP record
  await db.otp.create({
    data: {
      identifier: email,
      code: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
    },
  });
};

export const verifyOTP = async (email: string, otp: string) => {
  const otpRecord = await db.otp.findUnique({
    where: { identifier: email },
  });

  if (!otpRecord) {
    return false;
  }

  if (otpRecord.expiresAt < new Date()) {
    // Delete expired OTP
    await db.otp.delete({
      where: { identifier: email },
    });
    return false;
  }

  if (otpRecord.code !== otp) {
    return false;
  }

  // Delete used OTP
  await db.otp.delete({
    where: { identifier: email },
  });

  return true;
}; 