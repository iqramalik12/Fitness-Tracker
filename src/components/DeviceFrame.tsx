import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Monitor, Smartphone, Battery, Wifi, Signal, Activity, Bot, Dumbbell,
  Apple, Droplets, Footprints, Flame, Sparkles
} from "lucide-react";
import { DailyLog, UserProfile } from "../types";

interface DeviceFrameProps {
  children: React.ReactNode;
  isFullscreen: boolean;
  setIsFullscreen: (val: boolean) => void;
  // Live stats mirrored on the desktop showcase panel (only when signed in)
  profile?: UserProfile;
  log?: DailyLog;
}

const FEATURES = [
  { icon: Bot, title: "AI Coach", text: "Personal plans and answers powered by Gemini.", color: "text-violet-300", glow: "from-violet-500/20" },
  { icon: Dumbbell, title: "Smart Workouts", text: "Guided HIIT, strength and cardio sessions.", color: "text-emerald-300", glow: "from-emerald-500/20" },
  { icon: Apple, title: "Nutrition", text: "Meal logging with local food suggestions.", color: "text-amber-300", glow: "from-amber-500/20" },
  { icon: Droplets, title: "Hydration", text: "Daily water goals with gentle reminders.", color: "text-cyan-300", glow: "from-cyan-500/20" },
];

// Slowly drifting gradient blobs behind everything
function AuroraBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute -top-40 -left-32 w-[36rem] h-[36rem] rounded-full bg-emerald-500/15 blur-3xl"
        animate={{ x: [0, 80, 0], y: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-48 -right-32 w-[38rem] h-[38rem] rounded-full bg-cyan-500/15 blur-3xl"
        animate={{ x: [0, -70, 0], y: [0, -50, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 left-1/2 w-[28rem] h-[28rem] rounded-full bg-violet-500/10 blur-3xl"
        animate={{ x: [0, 60, -40, 0], y: [0, -30, 30, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-dot-grid opacity-40" />
    </div>
  );
}

function StatBar({ icon: Icon, label, value, goal, unit, color, delay }: {
  icon: React.ElementType; label: string; value: number; goal: number; unit: string; color: string; delay: number;
}) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="flex items-center gap-1.5 text-slate-300">
          <Icon className="w-3.5 h-3.5" /> {label}
        </span>
        <span className="font-mono text-slate-400">
          <span className="text-white font-semibold">{value.toLocaleString()}</span> / {goal.toLocaleString()} {unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, delay, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// Floating chip that bobs next to the phone on desktop
function FloatingChip({ className, delay, children }: { className: string; delay: number; children: React.ReactNode }) {
  return (
    <motion.div
      className={`absolute z-20 hidden xl:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md shadow-xl text-xs font-medium text-slate-200 ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
      transition={{
        opacity: { delay, duration: 0.5 },
        scale: { delay, duration: 0.5 },
        y: { delay, duration: 5, repeat: Infinity, ease: "easeInOut" },
      }}
    >
      {children}
    </motion.div>
  );
}

export default function DeviceFrame({ children, isFullscreen, setIsFullscreen, profile, log }: DeviceFrameProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      setTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isFullscreen) {
    return (
      <div className="w-full min-h-screen md:h-screen bg-slate-950 text-slate-100 flex flex-col relative md:overflow-hidden">
        <div className="hidden md:block">
          <AuroraBackground />
        </div>
        {/* Toggle back to the simulator: top right on phones, bottom right on desktop */}
        <div className="absolute top-4 right-4 md:top-auto md:bottom-6 md:right-6 z-50 flex items-center gap-2">
          <motion.button
            onClick={() => setIsFullscreen(false)}
            id="toggle-device-view"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 text-emerald-400 font-medium px-4 py-2 rounded-full border border-emerald-500/30 text-xs backdrop-blur shadow-lg transition-colors"
            title="Switch to Mobile Simulator View"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Simulator</span>
          </motion.button>
        </div>
        <div className="flex-1 flex flex-col relative md:min-h-0">{children}</div>
      </div>
    );
  }

  const showStats = !!(profile && log && profile.onboarded);

  return (
    <div className="w-full min-h-screen bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 md:p-8 lg:px-12 select-none relative overflow-hidden">
      <AuroraBackground />

      {/* Desktop top navigation */}
      <motion.header
        className="hidden lg:flex absolute top-0 inset-x-0 z-30 items-center justify-between px-12 py-5"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Activity className="w-5 h-5 text-slate-950" strokeWidth={2.5} />
            <span className="absolute inset-0 rounded-xl animate-pulse-ring" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">
            Pulse<span className="text-emerald-400">.fit</span>
          </span>
        </div>
        <motion.button
          onClick={() => setIsFullscreen(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-semibold px-5 py-2.5 rounded-full text-sm shadow-lg shadow-emerald-500/25"
          title="Open the full web app"
        >
          <Monitor className="w-4 h-4" />
          Open Web App
        </motion.button>
      </motion.header>

      <div className="relative z-10 w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-12 lg:pt-16">

        {/* Desktop showcase panel */}
        <div className="hidden lg:flex flex-col max-w-xl flex-1">
          <motion.span
            className="inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-medium"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI powered fitness for Pakistan, UK and USA
          </motion.span>

          <motion.h1
            className="font-display text-5xl xl:text-6xl font-bold leading-[1.05] tracking-tight mt-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Train smarter.
            <br />
            <span className="text-gradient-animated">Live stronger.</span>
          </motion.h1>

          <motion.p
            className="text-slate-400 text-base leading-relaxed mt-5 max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Workouts, meals, water and steps in one place, with an AI coach that builds plans around your goals and your local food.
          </motion.p>

          {showStats ? (
            <motion.div
              className="mt-8 p-5 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-md shadow-2xl space-y-4"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.6 }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">
                  Today, {profile!.name.split(" ")[0]}
                </p>
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-mono uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>
              <StatBar icon={Droplets} label="Water" value={log!.waterLogged} goal={profile!.waterGoal} unit="ml" color="bg-gradient-to-r from-cyan-400 to-sky-500" delay={0.6} />
              <StatBar icon={Footprints} label="Steps" value={log!.stepsCount} goal={profile!.stepGoal} unit="" color="bg-gradient-to-r from-emerald-400 to-teal-500" delay={0.7} />
              <StatBar icon={Flame} label="Burned" value={log!.caloriesBurned} goal={profile!.calorieBurnGoal} unit="kcal" color="bg-gradient-to-r from-orange-400 to-rose-500" delay={0.8} />
            </motion.div>
          ) : null}

          <div className="grid grid-cols-2 gap-3 mt-6">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  className={`group relative p-4 rounded-2xl bg-gradient-to-br ${f.glow} to-transparent bg-slate-900/50 border border-white/10 backdrop-blur-sm overflow-hidden`}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 + i * 0.08, duration: 0.5 }}
                  whileHover={{ y: -4, borderColor: "rgba(255,255,255,0.25)" }}
                >
                  <Icon className={`w-5 h-5 ${f.color} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`} />
                  <p className="text-sm font-semibold text-white mt-2.5">{f.title}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{f.text}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Phone column */}
        <div className="flex flex-col items-center relative">
          {/* Floating Controller / Top Bar (phones and tablets) */}
          <div className="lg:hidden w-full max-w-[420px] mb-4 flex justify-between items-center px-2">
            <div className="flex flex-col">
              <h1 className="text-sm font-semibold tracking-wide text-white font-display">PREMIUM FITNESS TRACKER</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Mobile Expo Prototype</p>
            </div>
            <button
              onClick={() => setIsFullscreen(true)}
              id="toggle-fullscreen-view"
              className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 text-emerald-400 font-medium px-3 py-1.5 rounded-full border border-emerald-500/30 text-[11px] backdrop-blur transition-all"
              title="Go Fullscreen Responsive Web Mode"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Full Screen</span>
            </button>
          </div>

          {/* Glow behind the phone */}
          <div className="hidden lg:block absolute inset-0 m-auto w-[340px] h-[600px] rounded-full bg-gradient-to-b from-emerald-500/25 to-cyan-500/20 blur-3xl pointer-events-none" />

          <FloatingChip className="-left-24 top-[22%]" delay={1.0}>
            <Droplets className="w-4 h-4 text-cyan-300" /> +250 ml logged
          </FloatingChip>
          <FloatingChip className="-right-24 top-[45%]" delay={1.3}>
            <Flame className="w-4 h-4 text-orange-300" /> Workout complete
          </FloatingChip>
          <FloatingChip className="-left-20 bottom-[18%]" delay={1.6}>
            <Bot className="w-4 h-4 text-violet-300" /> New AI tip ready
          </FloatingChip>

          {/* Realistic Mobile Device Frame */}
          <motion.div
            className="relative w-full max-w-[395px] lg:w-[395px] h-[820px] lg:h-[min(820px,calc(100vh-7rem))] bg-slate-950 rounded-[52px] border-[10px] border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden ring-1 ring-white/10"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Device Highlights / Glare effects */}
            <div className="absolute top-0 left-0 right-0 h-[100px] bg-gradient-to-b from-white/5 to-transparent pointer-events-none z-50 rounded-t-[42px]" />

            {/* Notch / Dynamic Island */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-[26px] bg-black rounded-full z-50 flex items-center justify-center ring-1 ring-white/5">
              <div className="w-3 h-3 bg-slate-900 rounded-full absolute left-4 border border-white/5" />
              <div className="w-2.5 h-2.5 bg-indigo-950/40 rounded-full absolute right-6 border border-indigo-500/20" />
            </div>

            {/* Status Bar inside iPhone Frame */}
            <div className="h-11 bg-slate-950 px-6 pt-5 flex justify-between items-center text-[11px] font-medium text-slate-200 select-none z-40 shrink-0">
              <span className="font-mono tracking-tighter text-[10px]">{time}</span>
              <div className="flex items-center gap-1.5">
                <Signal className="w-3 h-3" />
                <Wifi className="w-3 h-3" />
                <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded-sm px-0.5 py-px text-[8px] font-bold">
                  <span className="leading-none text-[8px] font-mono">100%</span>
                  <Battery className="w-3 h-2 text-emerald-400 fill-emerald-400" />
                </div>
              </div>
            </div>

            {/* Main Application Container */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
              {children}
            </div>

            {/* Home Indicator Bar */}
            <div className="h-6 bg-slate-950 flex items-end justify-center pb-2 shrink-0 z-40">
              <div className="w-32 h-1 bg-white/40 rounded-full" />
            </div>
          </motion.div>

          {/* Bottom informational caption (phones and tablets) */}
          <div className="lg:hidden mt-4 text-center max-w-sm">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Interactive mobile-responsive prototype replicating a premium Expo Router layout. Click elements to navigate. Connect with your Gemini secret key to talk to the real-time AI Coach!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
