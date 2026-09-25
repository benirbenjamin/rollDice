import crypto from 'crypto';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || 'FLWSECK_TEST_DEFAULT_SECRET_KEY';
const FLUTTERWAVE_ENCRYPTION_KEY = process.env.FLUTTERWAVE_ENCRYPTION_KEY || 'FLWSECK_TEST_ENCRYPTION_KEY';
const FLUTTERWAVE_SECRET_HASH = process.env.FLUTTERWAVE_SECRET_HASH || 'rolldice_secret_webhook_hash';

// 3DES Encryption helper for Flutterwave Direct Card Payload (if used)
export function encryptPayload(data: string): string {
  const cipher = crypto.createCipheriv(
    'des-ede3',
    Buffer.from(FLUTTERWAVE_ENCRYPTION_KEY, 'utf-8'),
    ''
  );
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

// Verify Flutterwave Webhook Hash Signature
export function verifyWebhookSignature(headerSignature: string | null): boolean {
  if (!headerSignature) return false;
  return headerSignature === FLUTTERWAVE_SECRET_HASH;
}

// Verify Flutterwave Transaction Status via API
export async function verifyFlutterwaveTransaction(transactionId: string) {
  try {
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Flutterwave transaction verification error:', error);
    return null;
  }
}

// Initiate Automated Withdrawal / Transfer to Bank or Mobile Money
export async function initiateBankTransfer(payload: {
  account_bank: string;
  account_number: string;
  amount: number;
  narration: string;
  currency: string;
  reference: string;
}) {
  try {
    const response = await fetch('https://api.flutterwave.com/v3/transfers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Flutterwave transfer error:', error);
    return null;
  }
}
