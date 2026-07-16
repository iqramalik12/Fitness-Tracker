import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  LogIn, 
  Key, 
  Mail, 
  ShieldCheck, 
  Zap, 
  Activity, 
  ArrowLeft, 
  Lock, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Chrome, 
  Apple, 
  UserPlus, 
  Check
} from "lucide-react";
import { UserProfile } from "../types";

interface LoginSignupScreenProps {
  onSuccess: (token: string, profile: UserProfile) => void;
  onGoToOnboarding: () => void;
}

type AuthMode = "SIGN_IN" | "SIGN_UP" | "FORGOT" | "OTP_VERIFY" | "RESET_PASSWORD" | "SOCIAL_LOADING";

export default function LoginSignupScreen({ onSuccess, onGoToOnboarding }: LoginSignupScreenProps) {
  // Navigation & Screen states
  const [mode, setMode] = useState<AuthMode>("SIGN_IN");
  
  // Input fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpInputs, setOtpInputs] = useState<string[]>(["", "", "", ""]);
  
  // Flow logs
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(120); // 2 minute countdown
  const [socialProvider, setSocialProvider] = useState<"Google" | "Apple" | null>(null);

  // Focus simulation
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Handle OTP Resend countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mode === "OTP_VERIFY" && otpCountdown > 0) {
      interval = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mode, otpCountdown]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // 1. EMAIL SIGN IN
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all standard credentials.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login credentials rejected.");
      }

      setSuccess("Handshake successful! Restoring session parameters...");
      setTimeout(() => {
        onSuccess(data.token, data.user.profile);
      }, 1200);

    } catch (err: any) {
      setError(err.message || "Network error. Failed to authenticate.");
    } finally {
      setLoading(false);
    }
  };

  // 2. EMAIL SIGN UP
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in your name, email, and password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify your entries.");
      return;
    }

    if (password.length < 5) {
      setError("Password should be at least 5 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create account.");
      }

      setSuccess("Account registered! Directing to onboarding dashboard...");
      
      // Simulate writing JWT and passing down profile
      setTimeout(() => {
        // Direct to onboarding so they can populate Pakistan, USA, etc.
        localStorage.setItem("pulse_auth_token", data.token);
        onGoToOnboarding();
      }, 1500);

    } catch (err: any) {
      setError(err.message || "Failed to register user account.");
    } finally {
      setLoading(false);
    }
  };

  // 3. TRIGGER FORGOT PASSWORD OTP
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to request recovery code.");
      }

      // Pre-populate simulated OTP inputs with the code for rapid testing
      if (data.otpCode) {
        const chars = data.otpCode.split("");
        setOtpInputs(chars);
      }

      setSuccess(`Verification token sent! Simulated code: ${data.otpCode}`);
      setOtpCountdown(120);

      setTimeout(() => {
        setMode("OTP_VERIFY");
        setSuccess("");
      }, 2500);

    } catch (err: any) {
      setError(err.message || "Failed to trigger password recovery.");
    } finally {
      setLoading(false);
    }
  };

  // 4. VERIFY OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const fullOtp = otpInputs.join("");
    if (fullOtp.length < 4) {
      setError("Please fill out the full 4-digit code.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: fullOtp }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "The OTP code provided is invalid.");
      }

      setSuccess("Code authenticated! Prepare to update password.");
      setTimeout(() => {
        setMode("RESET_PASSWORD");
        setSuccess("");
      }, 1500);

    } catch (err: any) {
      setError(err.message || "OTP check failed.");
    } finally {
      setLoading(false);
    }
  };

  // 5. UPDATE PASSWORD
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!password.trim()) {
      setError("Please input a valid password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update security credentials.");
      }

      setSuccess("Password updated! Access restored. Sign in to continue.");
      setTimeout(() => {
        setMode("SIGN_IN");
        setPassword("");
        setConfirmPassword("");
        setSuccess("");
      }, 2000);

    } catch (err: any) {
      setError(err.message || "Password update error.");
    } finally {
      setLoading(false);
    }
  };

  // 6. SIMULATED INTERACTIVE SOCIAL AUTH (Google / Apple)
  const triggerSocialAuth = (provider: "Google" | "Apple") => {
    setError("");
    setSuccess("");
    setSocialProvider(provider);
    setMode("SOCIAL_LOADING");
    setLoading(true);

    // Dynamic duration simulating user interacting with OAuth popup sheet
    setTimeout(async () => {
      try {
        const dummyEmail = provider === "Google" 
          ? "google.user@gmail.com" 
          : "apple.id.user@icloud.com";
        const dummyName = provider === "Google" 
          ? "Google Sync Account" 
          : "Apple ID Account";

        const res = await fetch("/api/auth/social-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            email: dummyEmail,
            name: dummyName,
            uid: `soc-${provider.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Social authentication handshake failed.");
        }

        setSuccess(`Connected successfully with ${provider}! Synchronizing profile...`);
        setTimeout(() => {
          onSuccess(data.token, data.user.profile);
        }, 1200);

      } catch (err: any) {
        setError(err.message || "Failed to handshake with social service.");
        setMode("SIGN_IN");
      } finally {
        setLoading(false);
        setSocialProvider(null);
      }
    }, 2200);
  };

  const handleOtpInput = (index: number, val: string) => {
    const newVal = val.slice(-1); // Only allow single character
    const nextOtp = [...otpInputs];
    nextOtp[index] = newVal;
    setOtpInputs(nextOtp);

    // Auto-focus next field
    if (newVal && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement | null;
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpInputs[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement | null;
      prevInput?.focus();
    }
  };

  // Quick One-Tap demo login handler
  const handleOneTapDemo = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "iqra@pulse.fit",
          password: "password123"
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess("Demo Session authenticated! Logging in Iqra Malik...");
      setTimeout(() => {
        onSuccess(data.token, data.user.profile);
      }, 1200);

    } catch (err: any) {
      setError("Demo authentication failure. Checking fallback...");
      // Fallback
      setTimeout(() => {
        onSuccess("demo-fallback-token", {
          name: "Iqra Malik",
          age: 26,
          gender: "Female",
          country: "Pakistan",
          weight: 74,
          height: 178,
          goal: "Build Muscle",
          bmi: 23.4,
          bmiStatus: "Normal",
          units: "metric",
          waterGoal: 2500,
          calorieBurnGoal: 600,
          calorieIntakeGoal: 2400,
          stepGoal: 10000,
          isRegistered: true,
          onboarded: true,
        });
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 flex flex-col justify-between py-6 px-5 h-full text-slate-100 overflow-y-auto font-sans">
      
      {/* 1. Header with dynamic title and conditional Back Button */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center h-8">
          {mode !== "SIGN_IN" && mode !== "SOCIAL_LOADING" && (
            <button
              onClick={() => {
                setError("");
                setSuccess("");
                if (mode === "OTP_VERIFY") setMode("FORGOT");
                else if (mode === "RESET_PASSWORD") setMode("OTP_VERIFY");
                else setMode("SIGN_IN");
              }}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
          <div className="flex items-center gap-1 ml-auto text-[9px] font-mono text-slate-500 font-bold uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70" />
            <span>SSL Secured</span>
          </div>
        </div>

        {/* Brand visual anchor */}
        {mode !== "SOCIAL_LOADING" && (
          <div className="flex flex-col items-center mt-3 text-center">
            <div className="w-11 h-11 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/10 mb-2.5">
              <Activity className="w-5.5 h-5.5 text-slate-950 stroke-[2.5]" />
            </div>
            
            <h2 className="text-xl font-extrabold tracking-tight text-white font-display">
              {mode === "SIGN_IN" && "Welcome Back"}
              {mode === "SIGN_UP" && "Create Account"}
              {mode === "FORGOT" && "Account Recovery"}
              {mode === "OTP_VERIFY" && "Two-Step Authentication"}
              {mode === "RESET_PASSWORD" && "Configure Password"}
            </h2>

            <p className="text-[11px] text-slate-400 mt-1 max-w-[240px] leading-relaxed">
              {mode === "SIGN_IN" && "Sign in to securely resume calorie logs, workout routines, and chats with Pulse AI Coach."}
              {mode === "SIGN_UP" && "Join Pulse to experience customized fitness plans, local macro breakdowns, and real-time support."}
              {mode === "FORGOT" && "Input your account email to receive a secure 4-digit verification code immediately."}
              {mode === "OTP_VERIFY" && `We sent a code to ${email}. Confirm below to unlock security parameters.`}
              {mode === "RESET_PASSWORD" && "Please declare a highly robust new security password for your account access."}
            </p>
          </div>
        )}
      </div>

      {/* 2. Error/Success Notification toasts inside frame */}
      <div className="my-2 min-h-[36px] flex flex-col justify-center max-w-sm w-full mx-auto shrink-0">
        {error && (
          <div className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/15 p-2.5 rounded-xl flex items-start gap-1.5 font-semibold animate-shake">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 p-2.5 rounded-xl flex items-start gap-1.5 font-semibold animate-pulse">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}
      </div>

      {/* 3. Main Form body states */}
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        
        {/* VIEW: SIGN IN */}
        {mode === "SIGN_IN" && (
          <form onSubmit={handleSignIn} className="flex flex-col gap-3.5">
            {/* Email */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-slate-500 uppercase font-mono font-bold tracking-wider">Email Address</span>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full bg-slate-900 border border-slate-800/80 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-500 uppercase font-mono font-bold tracking-wider">Password</span>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    setMode("FORGOT");
                  }}
                  className="text-[10px] text-emerald-400 font-bold hover:underline"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-800/80 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Action buttons */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 disabled:from-slate-800 disabled:to-slate-900 hover:opacity-95 text-slate-950 font-black py-3 rounded-xl text-xs shadow-md transition-all cursor-pointer mt-1"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
              <span>{loading ? "Establishing handshake..." : "Sign In with Credentials"}</span>
            </button>

            <div className="text-center mt-1">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setMode("SIGN_UP");
                }}
                className="text-[11px] text-emerald-400 font-bold hover:underline"
              >
                New to Pulse? Create an Account
              </button>
            </div>
          </form>
        )}

        {/* VIEW: SIGN UP */}
        {mode === "SIGN_UP" && (
          <form onSubmit={handleSignUp} className="flex flex-col gap-3">
            {/* Full Name */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-slate-500 uppercase font-mono font-bold tracking-wider">Full Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Iqra Malik"
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 outline-none transition-colors"
                required
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-slate-500 uppercase font-mono font-bold tracking-wider">Email Address</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="iqra@pulse.fit"
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 outline-none transition-colors"
                required
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-slate-500 uppercase font-mono font-bold tracking-wider">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 outline-none transition-colors"
                required
              />
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-slate-500 uppercase font-mono font-bold tracking-wider">Confirm Password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 outline-none transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-95 text-slate-950 font-black py-2.5 rounded-xl text-xs mt-2 transition-all cursor-pointer shadow-md"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
              <span>Create Free Account</span>
            </button>

            <div className="text-center mt-1">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setMode("SIGN_IN");
                }}
                className="text-[11px] text-emerald-400 font-bold hover:underline"
              >
                Already have an account? Sign In
              </button>
            </div>
          </form>
        )}

        {/* VIEW: FORGOT PASSWORD */}
        {mode === "FORGOT" && (
          <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-slate-500 uppercase font-mono font-bold tracking-wider">Email Address</span>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="iqra@pulse.fit"
                  className="w-full bg-slate-900 border border-slate-800/80 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-600 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-slate-950 font-black py-3 rounded-xl text-xs shadow-md transition-all cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              <span>Send Recovery Code</span>
            </button>
          </form>
        )}

        {/* VIEW: OTP VERIFY */}
        {mode === "OTP_VERIFY" && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5 items-center">
            {/* Split Pin Inputs */}
            <div className="flex gap-2 justify-center">
              {otpInputs.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-${idx}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpInput(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  onFocus={() => setFocusedIndex(idx)}
                  onBlur={() => setFocusedIndex(null)}
                  className={`w-11 h-12 text-center text-lg font-black bg-slate-900 border rounded-xl text-white outline-none transition-all ${
                    focusedIndex === idx ? "border-emerald-500 shadow-sm shadow-emerald-500/15" : "border-slate-800"
                  }`}
                />
              ))}
            </div>

            {/* Countdown timer */}
            <div className="text-center">
              <span className="text-[10px] text-slate-500 font-mono block">RESEND OTP COUNTDOWN</span>
              <span className={`text-xs font-bold font-mono mt-1 ${otpCountdown > 0 ? "text-slate-300" : "text-emerald-400"}`}>
                {otpCountdown > 0 ? formatCountdown(otpCountdown) : "Code can be resent!"}
              </span>
            </div>

            <div className="w-full flex flex-col gap-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-slate-950 font-black py-3 rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Verify Token</span>
              </button>

              {otpCountdown === 0 && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[10px] text-slate-400 hover:text-white uppercase font-mono font-bold tracking-wider py-1.5"
                >
                  Resend Code
                </button>
              )}
            </div>
          </form>
        )}

        {/* VIEW: RESET PASSWORD */}
        {mode === "RESET_PASSWORD" && (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-slate-500 uppercase font-mono font-bold tracking-wider">New Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-slate-500 uppercase font-mono font-bold tracking-wider">Confirm New Password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 text-slate-950 font-black py-3 rounded-xl text-xs shadow-md mt-2 transition-all cursor-pointer"
            >
              Save New Credentials
            </button>
          </form>
        )}

        {/* VIEW: SOCIAL LOADING OVERLAY */}
        {mode === "SOCIAL_LOADING" && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="relative mb-5">
              <div className="w-16 h-16 rounded-full border-4 border-slate-900 border-t-emerald-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-white font-mono text-xs">
                {socialProvider === "Google" ? (
                  <Chrome className="w-6 h-6 text-emerald-400" />
                ) : (
                  <Apple className="w-6 h-6 text-slate-300" />
                )}
              </div>
            </div>

            <span className="text-xs font-black text-white font-mono uppercase tracking-widest block">
              Contacting {socialProvider}
            </span>
            <span className="text-[10px] text-slate-400 font-mono mt-1 px-4 leading-relaxed">
              Establishing TLS connection handshake, requesting user token parameters, and configuring secure session container...
            </span>
          </div>
        )}

      </div>

      {/* 4. Bottom Social Logins and Demo Login Options */}
      {mode !== "SOCIAL_LOADING" && mode !== "OTP_VERIFY" && mode !== "RESET_PASSWORD" && (
        <div className="flex flex-col gap-3.5 mt-auto max-w-sm w-full mx-auto select-none shrink-0 pt-4 border-t border-slate-900/40">
          
          {mode === "SIGN_IN" && (
            <>
              {/* Divider */}
              <div className="relative flex items-center">
                <div className="flex-grow border-t border-slate-900" />
                <span className="flex-shrink mx-3 text-[8px] text-slate-500 font-bold uppercase tracking-widest font-mono">
                  Or Social Auth
                </span>
                <div className="flex-grow border-t border-slate-900" />
              </div>

              {/* Social Login Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Google */}
                <button
                  type="button"
                  onClick={() => triggerSocialAuth("Google")}
                  className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 py-2.5 px-3 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Chrome className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Google</span>
                </button>

                {/* Apple */}
                <button
                  type="button"
                  onClick={() => triggerSocialAuth("Apple")}
                  className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 py-2.5 px-3 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Apple className="w-3.5 h-3.5 text-slate-300" />
                  <span>Apple ID</span>
                </button>
              </div>

              {/* Quick Access Sandbox demo */}
              <div className="relative flex items-center mt-1">
                <div className="flex-grow border-t border-slate-900" />
                <span className="flex-shrink mx-3 text-[8px] text-slate-500 font-bold uppercase tracking-widest font-mono">
                  Rapid Testing
                </span>
                <div className="flex-grow border-t border-slate-900" />
              </div>

              <button
                type="button"
                onClick={handleOneTapDemo}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-emerald-400 font-bold py-3 rounded-xl text-[10px] transition-all cursor-pointer shadow-md"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
                <span>One-Tap Demo Login (Iqra Malik)</span>
              </button>
            </>
          )}

          {/* Secure Sandbox Footnotes */}
          <div className="flex items-center justify-center gap-1 text-[8px] text-slate-500 uppercase tracking-widest font-mono font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/60 shrink-0" />
            <span>256-Bit TLS Handshake Sandbox</span>
          </div>

        </div>
      )}

    </div>
  );
}
