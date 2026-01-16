import type { EncryptedData } from './types';

/**
 * HIPAA-compliant AES-256-GCM encryption
 * Ported from Asclepius/MediXAI
 *
 * Note: This module uses Web Crypto API for browser/edge runtime compatibility.
 * For Node.js, you can use the crypto module directly.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 128;

/**
 * Convert string to ArrayBuffer
 */
function stringToBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}

/**
 * Convert ArrayBuffer to string
 */
function bufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

/**
 * Convert ArrayBuffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to ArrayBuffer
 */
function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

/**
 * Import encryption key from string
 */
async function importKey(keyString: string): Promise<CryptoKey> {
  // Ensure key is 32 bytes (256 bits)
  const keyBuffer = stringToBuffer(keyString.padEnd(32, '0').slice(0, 32));

  return crypto.subtle.importKey('raw', keyBuffer, { name: ALGORITHM, length: KEY_LENGTH }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Generate random IV
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * HIPAA compliant encryption for PHI (Protected Health Information)
 */
export async function encryptPHI(plaintext: string, encryptionKey: string): Promise<EncryptedData> {
  const key = await importKey(encryptionKey);
  const iv = generateIV();
  const ivBuffer = new Uint8Array(iv.buffer.slice(0)) as BufferSource;

  const encrypted = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: ivBuffer,
      tagLength: AUTH_TAG_LENGTH,
    },
    key,
    stringToBuffer(plaintext)
  );

  // In Web Crypto, the auth tag is appended to the ciphertext
  const encryptedArray = new Uint8Array(encrypted);
  const authTagStart = encryptedArray.length - AUTH_TAG_LENGTH / 8;

  const ciphertext = encryptedArray.slice(0, authTagStart);
  const authTag = encryptedArray.slice(authTagStart);

  return {
    encrypted: bufferToHex(ciphertext.buffer as ArrayBuffer),
    iv: bufferToHex(iv.buffer as ArrayBuffer),
    authTag: bufferToHex(authTag.buffer as ArrayBuffer),
  };
}

/**
 * Decrypt data encrypted with encryptPHI
 */
export async function decryptPHI(data: EncryptedData, encryptionKey: string): Promise<string> {
  const key = await importKey(encryptionKey);
  const ivBuffer = hexToBuffer(data.iv);
  const iv = new Uint8Array(ivBuffer.slice(0)) as BufferSource;

  // Reconstruct the encrypted data with auth tag appended
  const ciphertext = new Uint8Array(hexToBuffer(data.encrypted));
  const authTag = new Uint8Array(hexToBuffer(data.authTag));

  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);
  const combinedBuffer = new Uint8Array(combined.buffer.slice(0)) as BufferSource;

  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv,
      tagLength: AUTH_TAG_LENGTH,
    },
    key,
    combinedBuffer
  );

  return bufferToString(decrypted);
}

/**
 * Hash sensitive data for comparison without exposing plaintext
 */
export async function hashPHI(data: string): Promise<string> {
  const buffer = stringToBuffer(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return bufferToHex(hashBuffer);
}
