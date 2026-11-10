import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type EncryptedPhi = {
  ciphertext: string;
  nonce: string;
  authTag: string;
  keyVersion: string;
};

@Injectable()
export class PhiCryptoService {
  private readonly keys: Map<string, Buffer>;
  private readonly activeVersion: string;

  constructor() {
    const configuredKeys = process.env.MEGAP_PHI_ENCRYPTION_KEYS;
    this.activeVersion = process.env.MEGAP_PHI_ACTIVE_KEY_VERSION ?? "v1";
    if (!configuredKeys) {
      throw new Error("MEGAP_PHI_ENCRYPTION_KEYS must be configured before the API starts.");
    }

    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(configuredKeys) as Record<string, string>;
    } catch {
      throw new Error("MEGAP_PHI_ENCRYPTION_KEYS must be a JSON object of key versions.");
    }
    if (
      !parsed ||
      Array.isArray(parsed) ||
      typeof parsed !== "object" ||
      Object.values(parsed).some((value) => typeof value !== "string")
    ) {
      throw new Error("MEGAP_PHI_ENCRYPTION_KEYS must map key version strings to base64 values.");
    }
    this.keys = new Map(
      Object.entries(parsed).map(([version, value]) => [version, Buffer.from(value, "base64")]),
    );
    if ([...this.keys.values()].some((key) => key.byteLength !== 32)) {
      throw new Error("Every MEGAP_PHI_ENCRYPTION_KEYS entry must decode to exactly 32 bytes.");
    }
    if (!this.keys.has(this.activeVersion)) {
      throw new Error("MEGAP_PHI_ACTIVE_KEY_VERSION must exist in MEGAP_PHI_ENCRYPTION_KEYS.");
    }
  }

  encrypt(plaintext: string, associatedData: string): EncryptedPhi {
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.keys.get(this.activeVersion)!, nonce);
    cipher.setAAD(Buffer.from(associatedData, "utf8"));
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    return {
      ciphertext: ciphertext.toString("base64"),
      nonce: nonce.toString("base64"),
      authTag: cipher.getAuthTag().toString("base64"),
      keyVersion: this.activeVersion,
    };
  }

  decrypt(value: EncryptedPhi, associatedData: string): string {
    const key = this.keys.get(value.keyVersion);
    if (!key) throw new InternalServerErrorException("نسخهٔ کلید رمزگذاری پرونده در دسترس نیست.");
    try {
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(value.nonce, "base64"));
      decipher.setAAD(Buffer.from(associatedData, "utf8"));
      decipher.setAuthTag(Buffer.from(value.authTag, "base64"));
      return Buffer.concat([
        decipher.update(Buffer.from(value.ciphertext, "base64")),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      throw new InternalServerErrorException("رمزگشایی پرونده با موفقیت انجام نشد.");
    }
  }
}
