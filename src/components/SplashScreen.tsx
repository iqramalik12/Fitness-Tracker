import React, { useEffect } from "react";
import { motion } from "motion/react";
import { Activity, Dumbbell, Zap } from "lucide-react";

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  useEffect(() => {
    // Auto transition to welcome screen after 3.2 seconds
    const timer = setTimeout(() => {
      onFinish();
    }, 3200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="flex-1 bg-slate-950 flex flex-col items-center justify-between py-12 px-6 h-full text-slate-100 relative overflow-hidden">
      {/* Background radial spotlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      
      {/* Top decorative branding */}
      <div className="flex items-center gap-1 opacity-40">
        <Activity className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-mono tracking-widest font-bold">PULSE TRACKER ENGINE v3.0</span>
      </div>

      {/* Main Pulse Logo Section */}
      <div className="flex flex-col items-center justify-center gap-4 my-auto">
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: [1, 1.15, 1], opacity: 1 }}
          transition={{ duration: 1.8, ease: "easeOut", repeat: Infinity, repeatDelay: 0.5 }}
          className="relative w-24 h-24 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-pulse-ring"
        >
          <Activity className="w-12 h-12 text-slate-950 stroke-[2.5]" />
          
          {/* Dynamic glowing particles orbit */}
          <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-cyan-400 rounded-full border-2 border-slate-950 animate-bounce" />
          <div className="absolute -bottom-1 -left-1.5 w-2.5 h-2.5 bg-yellow-400 rounded-full border-2 border-slate-950" />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-center"
        >
          <h2 className="text-3xl font-extrabold tracking-tight font-display bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
            PULSE
          </h2>
          <p className="text-xs text-emerald-400 font-mono tracking-[0.25em] uppercase mt-1">
            FITNESS & AI COACH
          </p>
        </motion.div>
      </div>

      {/* Footer loading tracker */}
      <div className="w-full max-w-[240px] flex flex-col items-center gap-4">
        <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.8, ease: "easeInOut" }}
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400"
          />
        </div>
        
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
          <Zap className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>Synchronizing parameters...</span>
        </div>
      </div>
    </div>
  );
}
