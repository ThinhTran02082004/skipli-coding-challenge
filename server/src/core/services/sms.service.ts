import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

// khởi tạo twilio client nếu có cấu hình sid và token hợp lệ
let client: twilio.Twilio | null = null;
if (accountSid && authToken && accountSid !== 'your_account_sid') {
  client = twilio(accountSid, authToken);
}

// hàm gửi mã otp qua sms sử dụng dịch vụ twilio
export async function sendSmsOtp(toPhone: string, code: string): Promise<boolean> {
  const messageBody = `[Classroom Management App] Your verification code is: ${code}`;

  // chuẩn hóa sđt về định dạng e.164 
  let formattedPhone = toPhone.trim();
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '+84' + formattedPhone.slice(1);
  } else if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+' + formattedPhone;
  }

  // gửi tin nhắn nếu client khả dụng
  if (client) {
    try {
      if (verifySid) {
        // sử dụng dịch vụ twilio verify service api nếu có verify sid
        await client.verify.v2.services(verifySid).verifications.create({
          to: formattedPhone,
          channel: 'sms',
        });
        console.log(`[Twilio Verify Sent] Verification SMS sent to ${formattedPhone}.`);
        return true;
      } else if (fromNumber) {
        // gửi qua dịch vụ sms chuẩn của twilio
        await client.messages.create({
          body: messageBody,
          from: fromNumber,
          to: formattedPhone,
        });
        console.log(`[SMS Sent] OTP ${code} sent to ${formattedPhone} via Twilio.`);
        return true;
      }
    } catch (error: unknown) {
      console.error('[SMS Error] Twilio sending failed:', error);
      console.log(`[SMS Mock Fallback] OTP for ${formattedPhone} is: ${code}`);
      return false;
    }
  }

  // mode mock
  console.log(`[SMS Mock Mode] OTP for ${toPhone} is: ${code}`);
  return true;
}
