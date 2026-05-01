import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;

export interface EncryptedBlob {
  iv: string;
  ciphertext: string;
  tag: string;
}

function getKey(): Buffer {
  const hex = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY env var is not set");
  }
  if (hex.length !== 64) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY must be 64 hex characters (32 bytes)"
    );
  }
  return Buffer.from(hex, "hex");
}

export function encryptCredentials(plaintext: Record<string, unknown>): EncryptedBlob {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const data = JSON.stringify(plaintext);
  const ciphertext = Buffer.concat([cipher.update(data, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptCredentials<T = Record<string, unknown>>(blob: EncryptedBlob): T {
  const key = getKey();
  const iv = Buffer.from(blob.iv, "base64");
  const ciphertext = Buffer.from(blob.ciphertext, "base64");
  const tag = Buffer.from(blob.tag, "base64");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}
