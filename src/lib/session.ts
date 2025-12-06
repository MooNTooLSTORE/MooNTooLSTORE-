
import { type SessionOptions } from "iron-session";
import { randomBytes } from "crypto";

export interface SessionData {
  isLoggedIn: boolean;
}

const secret = process.env.AUTH_SECRET || randomBytes(32).toString("hex");

if (!process.env.AUTH_SECRET && process.env.NODE_ENV === 'production') {
  console.warn(
    '⚠️ WARNING: No AUTH_SECRET environment variable found. A temporary secret has been generated. ' +
    'Sessions will not persist across server restarts. ' +
    'For production, it is STRONGLY recommended to set a permanent AUTH_SECRET in your environment variables.'
  );
}

export const sessionOptions: SessionOptions = {
  password: secret,
  cookieName: "moontoolstore-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    maxAge: undefined, // Session cookie by default
  },
};
