import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { db, UserProfile } from "../db.ts";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "pulse-super-secret-key-2026";

// Pure TS implementation of HS256 JWT
function base64url(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

export function signToken(payload: object): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify({ 
    ...payload, 
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 // Valid for 24 hours
  }));
  
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(signatureInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
    
  return `${signatureInput}.${signature}`;
}

export function verifyToken(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, signature] = parts;
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(signatureInput)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
      
    if (signature !== expectedSignature) return null;
    
    const payload = JSON.parse(base64urlDecode(encodedPayload));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }
    return payload;
  } catch (err) {
    return null;
  }
}

// OTP store map: email -> { code, expiresAt }
const otpStore = new Map<string, { code: string; expiresAt: number }>();

// Auth Middleware to protect other backend endpoints
export const authenticateJwt = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. Bearer token missing." });
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(403).json({ error: "Access denied. Invalid or expired session JWT." });
  }

  const users = db.findUsers(u => u.id === payload.id);
  if (users.length === 0) {
    return res.status(403).json({ error: "Associated user account was not found." });
  }

  (req as any).user = payload;
  next();
};

// POST: Signup
router.post("/signup", (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Please supply name, email, and password." });
  }

  const emailLower = email.toLowerCase().trim();
  const existingUsers = db.findUsers(u => u.email.toLowerCase() === emailLower);
  if (existingUsers.length > 0) {
    return res.status(400).json({ error: "An account with this email address already exists." });
  }

  // Create clean initial user record
  const newUser: Omit<UserProfile, "id"> = {
    name: name.trim(),
    email: emailLower,
    password, // Stored safely in sandbox plain text for easy debugging
    gender: "Other",
    age: 25,
    country: "Pakistan",
    weight: 70,
    height: 175,
    goal: "Stay Active",
    bmi: 22.9,
    bmiStatus: "Normal",
    units: "metric",
    waterGoal: 2000,
    calorieBurnGoal: 500,
    calorieIntakeGoal: 2000,
    stepGoal: 10000,
    isRegistered: true,
    onboarded: false,
    createdAt: new Date().toISOString()
  };

  const savedUser = db.insert("users", newUser) as UserProfile;
  const token = signToken({ id: savedUser.id, email: savedUser.email, name: savedUser.name });

  res.status(201).json({
    message: "User signed up successfully.",
    token,
    user: {
      id: savedUser.id,
      name: savedUser.name,
      email: savedUser.email,
      onboarded: savedUser.onboarded,
      profile: savedUser
    }
  });
});

// POST: Login
router.post("/login", (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Please provide both email and password." });
  }

  const emailLower = email.toLowerCase().trim();
  const matchedUsers = db.findUsers(u => u.email.toLowerCase() === emailLower && u.password === password);

  if (matchedUsers.length === 0) {
    return res.status(401).json({ error: "Invalid email address or incorrect password." });
  }

  const user = matchedUsers[0];
  const token = signToken({ id: user.id, email: user.email, name: user.name });

  res.json({
    message: "Login successful.",
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      onboarded: user.onboarded,
      profile: user
    }
  });
});

// POST: Social Login (Google / Apple simulation)
router.post("/social-login", (req: Request, res: Response) => {
  const { provider, email, name, uid } = req.body;

  if (!provider || !email || !name) {
    return res.status(400).json({ error: "Invalid social login payload." });
  }

  const emailLower = email.toLowerCase().trim();
  let users = db.findUsers(u => u.email.toLowerCase() === emailLower);
  let user: UserProfile;

  if (users.length === 0) {
    const newUser: Omit<UserProfile, "id"> = {
      name: name.trim(),
      email: emailLower,
      password: `social-${provider}-${Math.random().toString(36).slice(2)}`,
      gender: "Other",
      age: 26,
      country: "Pakistan",
      weight: 75,
      height: 180,
      goal: "Stay Active",
      bmi: 23.1,
      bmiStatus: "Normal",
      units: "metric",
      waterGoal: 2500,
      calorieBurnGoal: 500,
      calorieIntakeGoal: 2200,
      stepGoal: 10000,
      isRegistered: true,
      onboarded: true, // Social users skip onboarding by default
      createdAt: new Date().toISOString()
    };
    user = db.insert("users", newUser) as UserProfile;
  } else {
    user = users[0];
  }

  const token = signToken({ id: user.id, email: user.email, name: user.name });

  res.json({
    message: `Connected successfully with ${provider}.`,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      onboarded: user.onboarded,
      profile: user
    }
  });
});

// POST: Forgot Password OTP trigger
router.post("/forgot-password", (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email address is required." });
  }

  const emailLower = email.toLowerCase().trim();
  const matchedUsers = db.findUsers(u => u.email.toLowerCase() === emailLower);
  const userExists = matchedUsers.length > 0;

  // Generate 4-digit OTP
  const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
  otpStore.set(emailLower, {
    code: otpCode,
    expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes validity
  });

  console.log(`[AUTH SYSTEM] Forgot password request for ${emailLower}. OTP: ${otpCode}`);

  res.json({
    message: "OTP recovery code triggered.",
    otpCode, // Include code in response for simple/frictionless automated UI matching
    simulatedEmailText: `Your OTP to reset your Pulse fitness password is ${otpCode}. Valid for 5 minutes.`,
    userExists
  });
});

// POST: Verify OTP
router.post("/verify-otp", (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP code are required." });
  }

  const emailLower = email.toLowerCase().trim();
  const storedOtp = otpStore.get(emailLower);

  if (!storedOtp) {
    return res.status(400).json({ error: "No recovery session found for this email address." });
  }

  if (Date.now() > storedOtp.expiresAt) {
    otpStore.delete(emailLower);
    return res.status(400).json({ error: "The OTP verification code has expired." });
  }

  if (storedOtp.code !== otp.toString().trim()) {
    return res.status(400).json({ error: "Incorrect OTP code. Please check and try again." });
  }

  res.json({
    message: "OTP verified successfully.",
    success: true
  });
});

// POST: Reset Password
router.post("/reset-password", (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and new password are required." });
  }

  const emailLower = email.toLowerCase().trim();
  const matchedUsers = db.findUsers(u => u.email.toLowerCase() === emailLower);

  if (matchedUsers.length === 0) {
    return res.status(404).json({ error: "No user found with this email address." });
  }

  const user = matchedUsers[0];
  db.update("users", user.id, { password });
  otpStore.delete(emailLower);

  res.json({
    message: "Password changed successfully. You can now login.",
    success: true
  });
});

// GET: Session validation
router.get("/session", (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized. Missing token header." });
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: "Session expired or invalid. Please login again." });
  }

  const matchedUsers = db.findUsers(u => u.id === payload.id);
  if (matchedUsers.length === 0) {
    return res.status(404).json({ error: "Associated user not found." });
  }

  const user = matchedUsers[0];
  // Do not expose password to frontend
  const { password, ...userProfile } = user;

  res.json({
    valid: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      onboarded: user.onboarded,
      profile: userProfile
    }
  });
});

// POST: Logout
router.post("/logout", (req: Request, res: Response) => {
  res.json({ message: "Session logged out." });
});

export default router;
