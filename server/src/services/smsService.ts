import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

let client: twilio.Twilio | null = null;
if (accountSid && authToken && accountSid !== 'your_account_sid') {
  client = twilio(accountSid, authToken);
}

export async function sendSmsOtp(toPhone: string, code: string): Promise<boolean> {
  const messageBody = `[Classroom Management App] Your verification code is: ${code}`;

  // Format phone number to E.164 standard required by Twilio (e.g. 039979... -> +8439979...)
  let formattedPhone = toPhone.trim();
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '+84' + formattedPhone.slice(1);
  } else if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+' + formattedPhone;
  }

  if (client) {
    try {
      if (verifySid) {
        await client.verify.v2.services(verifySid).verifications.create({
          to: formattedPhone,
          channel: 'sms',
        });
        console.log(`[Twilio Verify Sent] Verification SMS sent to ${formattedPhone}.`);
        return true;
      } else if (fromNumber) {
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

  console.log(`[SMS Mock Mode] OTP for ${toPhone} is: ${code}`);
  return true;
}
