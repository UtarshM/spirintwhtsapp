import { test } from "node:test";
import assert from "node:assert/strict";
import { mimeEmail } from "../src/lib/providers";
test("MIME encoding preserves unicode content and rejects header injection", () => {
  const raw = Buffer.from(
    mimeEmail(
      "a@example.com",
      "b@example.com",
      "Hello नमस्ते",
      "Hi there",
      "stable@example.com",
    ),
    "base64url",
  ).toString();
  assert.match(raw, /Message-ID: <stable@example.com>/);
  assert.match(raw, /Content-Transfer-Encoding: base64/);
  assert.throws(
    () =>
      mimeEmail(
        "a@example.com\r\nBcc: other@example.com",
        "b@example.com",
        "Hi",
        "x",
        "id",
      ),
    /invalid_email_header/,
  );
});
