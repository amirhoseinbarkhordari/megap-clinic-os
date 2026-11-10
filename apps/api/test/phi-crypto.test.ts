import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { PhiCryptoService } from "../src/common/phi-crypto";

test("clinical text is authenticated ciphertext and remains decryptable by key version", () => {
  const previousKeys = process.env.MEGAP_PHI_ENCRYPTION_KEYS;
  const previousActive = process.env.MEGAP_PHI_ACTIVE_KEY_VERSION;
  const keyV1 = randomBytes(32).toString("base64");
  const keyV2 = randomBytes(32).toString("base64");
  process.env.MEGAP_PHI_ENCRYPTION_KEYS = JSON.stringify({ v1: keyV1, v2: keyV2 });

  try {
    process.env.MEGAP_PHI_ACTIVE_KEY_VERSION = "v1";
    const oldKeyring = new PhiCryptoService();
    const context = "tenant:patient:encounter:note";
    const encrypted = oldKeyring.encrypt("clinical note text", context);
    assert.notEqual(encrypted.ciphertext, "clinical note text");
    assert.equal(oldKeyring.decrypt(encrypted, context), "clinical note text");
    assert.throws(() => oldKeyring.decrypt(encrypted, "another-record"));

    process.env.MEGAP_PHI_ACTIVE_KEY_VERSION = "v2";
    const rotatedKeyring = new PhiCryptoService();
    assert.equal(rotatedKeyring.decrypt(encrypted, context), "clinical note text");
    assert.equal(rotatedKeyring.encrypt("new note", context).keyVersion, "v2");
  } finally {
    if (previousKeys === undefined) delete process.env.MEGAP_PHI_ENCRYPTION_KEYS;
    else process.env.MEGAP_PHI_ENCRYPTION_KEYS = previousKeys;
    if (previousActive === undefined) delete process.env.MEGAP_PHI_ACTIVE_KEY_VERSION;
    else process.env.MEGAP_PHI_ACTIVE_KEY_VERSION = previousActive;
  }
});
