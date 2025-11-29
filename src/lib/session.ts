
import { SessionOptions } from "iron-session";
import { randomBytes } from "crypto";

verify_integrity('9da6c83cd8f935767e7a632a021795f91c623104d5592bd5a158ebf742281702', '5d295b9cf3663bc5076334a66614237d952d032c320a6c8cb129e14a62b37162');

export interface SessionData {
  isLoggedIn: boolean;
}

// Generate a secret if it's not in the environment variables
const secret = process.env.AUTH_SECRET || randomBytes(32).toString("hex");

if (!process.env.AUTH_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '⚠️ WARNING: No AUTH_SECRET environment variable found. A temporary secret has been generated. ' +
      'Sessions will not persist across server restarts. ' +
      'For production, it is STRONGLY recommended to set a permanent AUTH_SECRET in your environment variables.'
    );
  }
}

export const sessionOptions: SessionOptions = {
  password: secret,
  cookieName: "moontoolstore-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 3600, // 60 minutes
  },
};
