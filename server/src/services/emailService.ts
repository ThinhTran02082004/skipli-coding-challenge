import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

let transporter: nodemailer.Transporter | null = null;
if (emailUser && emailPass && emailUser !== 'your_email@gmail.com') {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
}

export async function sendEmailOtp(toEmail: string, code: string): Promise<boolean> {
  const subject = 'Classroom App - Access Code';
  const text = `Your verification code is: ${code}`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2>Classroom Management App</h2>
      <p>Your access code is:</p>
      <h1 style="color: #4F46E5; letter-spacing: 4px;">${code}</h1>
      <p>This code will expire in 10 minutes.</p>
    </div>
  `;

  if (transporter && emailUser) {
    try {
      await transporter.sendMail({
        from: emailUser,
        to: toEmail,
        subject,
        text,
        html,
      });
      console.log(`[Email Sent] OTP ${code} sent to ${toEmail}.`);
      return true;
    } catch (error: unknown) {
      console.error('[Email Error] Nodemailer sending failed:', error);
      console.log(`[Email Mock Fallback] OTP for ${toEmail} is: ${code}`);
      return false;
    }
  } else {
    console.log(`[Email Mock Mode] OTP for ${toEmail} is: ${code}`);
    return true;
  }
}

export async function sendStudentCredentialEmail(toEmail: string, name: string, phone: string): Promise<boolean> {
  const subject = 'Welcome to Classroom App - Account Setup';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2>Hello ${name},</h2>
      <p>You have been enrolled as a student in the Classroom App!</p>
      <p>You can log in using your phone number: <strong>${phone}</strong> or email: <strong>${toEmail}</strong>.</p>
    </div>
  `;

  if (transporter && emailUser) {
    try {
      await transporter.sendMail({
        from: emailUser,
        to: toEmail,
        subject,
        html,
      });
      console.log(`[Email Sent] Student welcome email sent to ${toEmail}.`);
      return true;
    } catch (error: unknown) {
      console.error('[Email Error] Welcome email sending failed:', error);
      return false;
    }
  } else {
    console.log(`[Email Mock Mode] Welcome email for ${toEmail} (${phone}).`);
    return true;
  }
}
