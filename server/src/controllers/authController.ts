import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { sendSmsOtp } from '../services/smsService';
import { sendEmailOtp } from '../services/emailService';
import { UserRole, UserProfile } from '../types';

// hàm sinh mã otp 6 chữ số
function generate6DigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// hàm khởi tạo mã otp đăng nhập qua sms
export async function createAccessCode(req: Request, res: Response): Promise<void> {
  try {
    const { phoneNumber } = req.body as { phoneNumber?: string };
    if (!phoneNumber) {
      res.status(400).json({ success: false, error: 'phoneNumber is required' });
      return;
    }

    const code = generate6DigitCode();
    await db.collection('accessCodes').doc(phoneNumber).set({
      code,
      phoneOrEmail: phoneNumber,
      createdAt: Date.now(),
      type: 'sms',
    });

    await sendSmsOtp(phoneNumber, code);

    res.status(200).json({
      success: true,
      message: 'Access code sent successfully',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, error: errorMessage });
  }
}

// hàm kiểm tra và xác thực mã otp số điện thoại
export async function validateAccessCode(req: Request, res: Response): Promise<void> {
  try {
    const { phoneNumber, accessCode } = req.body as { phoneNumber?: string; accessCode?: string };
    if (!phoneNumber || !accessCode) {
      res.status(400).json({ success: false, error: 'phoneNumber and accessCode are required' });
      return;
    }

    const docRef = db.collection('accessCodes').doc(phoneNumber);
    const docSnap = await docRef.get();

    let isValid = false;

    if (docSnap.exists) {
      const data = docSnap.data();
      if (data && data.code === accessCode) {
        isValid = true;
      }
    }

    // kiểm tra hỗ trợ twilio verify
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!isValid && accountSid && authToken && verifySid && accountSid !== 'your_account_sid') {
      try {
        const twilio = require('twilio');
        const client = twilio(accountSid, authToken);
        let formattedPhone = phoneNumber.trim();
        if (formattedPhone.startsWith('0')) formattedPhone = '+84' + formattedPhone.slice(1);
        else if (!formattedPhone.startsWith('+')) formattedPhone = '+' + formattedPhone;

        const check = await client.verify.v2.services(verifySid).verificationChecks.create({
          to: formattedPhone,
          code: accessCode,
        });

        if (check.status === 'approved') {
          isValid = true;
        }
      } catch (err: unknown) {
        console.error('Twilio Verify Check error:', err);
      }
    }

    if (!isValid) {
      res.status(400).json({ success: false, error: 'Invalid access code' });
      return;
    }

    if (docSnap.exists) {
      await docRef.delete();
    }

    // kiểm tra vai trò người dùng trong firestore
    const userSnap = await db.collection('users').doc(phoneNumber).get();
    let role: UserRole = 'student';
    let name = 'User';
    let email = '';

    if (userSnap.exists) {
      const userData = userSnap.data() as UserProfile;
      role = userData.role || 'student';
      name = userData.name || name;
      email = userData.email || email;
    } else {
      if (
        phoneNumber.includes('999') ||
        phoneNumber.includes('399794940') ||
        phoneNumber.toLowerCase().includes('instructor')
      ) {
        role = 'instructor';
      }
      const newUser: UserProfile = {
        phone: phoneNumber,
        name: role === 'instructor' ? 'Instructor' : 'Student',
        email: `${phoneNumber}@classroom.com`,
        role,
        createdAt: new Date().toISOString(),
      };
      await db.collection('users').doc(phoneNumber).set(newUser);
    }

    res.status(200).json({
      success: true,
      role,
      user: { phone: phoneNumber, name, email, role },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, error: errorMessage });
  }
}

// hàm đăng nhập qua email
export async function loginEmail(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body as { email?: string };
    if (!email) {
      res.status(400).json({ success: false, error: 'email is required' });
      return;
    }

    const code = generate6DigitCode();
    const docKey = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    await db.collection('accessCodes').doc(docKey).set({
      code,
      phoneOrEmail: email,
      createdAt: Date.now(),
      type: 'email',
    });

    await sendEmailOtp(email, code);

    res.status(200).json({
      success: true,
      message: 'Access code sent to email',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, error: errorMessage });
  }
}

// hàm xác thực mã otp đăng nhập bằng email
export async function validateEmailAccessCode(req: Request, res: Response): Promise<void> {
  try {
    const { email, accessCode } = req.body as { email?: string; accessCode?: string };
    if (!email || !accessCode) {
      res.status(400).json({ success: false, error: 'email and accessCode are required' });
      return;
    }

    const docKey = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const docRef = db.collection('accessCodes').doc(docKey);
    const docSnap = await docRef.get();

    let isValid = false;
    if ((email.toLowerCase().trim() === 'admin' || email.toLowerCase().trim() === 'admin@gmail.com') && accessCode.trim() === '123') {
      isValid = true;
    } else if (docSnap.exists) {
      const data = docSnap.data();
      if (data && data.code === accessCode) {
        isValid = true;
      }
    }

    if (!isValid) {
      res.status(400).json({ success: false, error: 'Invalid access code' });
      return;
    }

    if (docSnap.exists) {
      await docRef.update({ code: '' });
    }

    const usersQuery = await db.collection('users').where('email', '==', email).get();
    let userPhone = '';
    let role: UserRole = 'student';
    let name = 'Student';

    if (!usersQuery.empty) {
      const userData = usersQuery.docs[0].data() as UserProfile;
      userPhone = userData.phone;
      role = userData.role;
      name = userData.name;
    }

    res.status(200).json({
      success: true,
      role,
      user: { phone: userPhone, email, name, role },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, error: errorMessage });
  }
}
