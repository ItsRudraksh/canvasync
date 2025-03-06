import nodemailer from 'nodemailer';
import { db } from './db';

// Create a test account using Ethereal for development
// For production, use your actual SMTP credentials
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
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
    from: process.env.SMTP_FROM || 'noreply@canvasync.com',
    to: email,
    subject: 'Email Verification - Canvasync',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify Your Email</h2>
        <p>Thank you for registering with Canvasync. Please use the following OTP to verify your email address:</p>
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
    from: process.env.SMTP_FROM || 'noreply@canvasync.com',
    to: email,
    subject: 'Account Deletion Request - Canvasync',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Account Deletion Request</h2>
        <p>We received a request to delete your Canvasync account. To confirm this action, please use the following verification code:</p>
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

interface SendCollaborationInviteParams {
  to: string;
  whiteboardTitle: string;
  whiteboardUrl: string;
  inviterName: string;
  canEdit: boolean;
}

export async function sendCollaborationInvite({
  to,
  whiteboardTitle,
  whiteboardUrl,
  inviterName,
  canEdit,
}: SendCollaborationInviteParams) {
  const role = canEdit ? "editor" : "viewer";
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">You've been invited to collaborate!</h2>
      <p style="font-size: 16px; color: #374151;">
        ${inviterName} has invited you to collaborate on a whiteboard in CanvaSync.
      </p>
      <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <p style="margin: 0; color: #374151;">
          <strong>Whiteboard:</strong> ${whiteboardTitle}<br>
          <strong>Your Role:</strong> ${role}<br>
          <strong>Invited by:</strong> ${inviterName}
        </p>
      </div>
      <div style="margin: 32px 0;">
        <a href="${whiteboardUrl}" 
           style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Open Whiteboard
        </a>
      </div>
      <p style="color: #6B7280; font-size: 14px;">
        If you're new to CanvaSync, you'll need to create an account with this email address to access the whiteboard.
      </p>
    </div>
  `;

  const text = `
You've been invited to collaborate!

${inviterName} has invited you to collaborate on a whiteboard in CanvaSync.

Whiteboard: ${whiteboardTitle}
Your Role: ${role}
Invited by: ${inviterName}

Access the whiteboard here: ${whiteboardUrl}

If you're new to CanvaSync, you'll need to create an account with this email address to access the whiteboard.
  `;

  await transporter.sendMail({
    from: `"CanvaSync" <${process.env.SMTP_FROM}>`,
    to,
    subject: `${inviterName} invited you to collaborate on "${whiteboardTitle}"`,
    text,
    html,
  });
} 