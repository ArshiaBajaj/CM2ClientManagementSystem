import { createHmac, timingSafeEqual } from "crypto";

export function signPayload(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function verifyPayload(body: string, signature: string, secret: string) {
  const expected = Buffer.from(signPayload(body, secret), "hex");
  const received = Buffer.from(signature, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}
