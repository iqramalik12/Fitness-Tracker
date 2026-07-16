import React, { useState, useEffect } from "react";
import { Monitor, Smartphone, Battery, Wifi, Signal } from "lucide-react";

interface DeviceFrameProps {
  children: React.ReactNode;
  isFullscreen: boolean;
  setIsFullscreen: (val: boolean) => void;
}

export default function DeviceFrame({ children, isFullscreen, setIsFullscreen }: DeviceFrameProps) {
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
      <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col relative">
        {/* Floating toggle at the top right of fullscreen mode */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(false)}
            id="toggle-device-view"
            className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 text-emerald-400 font-medium px-4 py-2 rounded-full border border-emerald-500/30 text-xs backdrop-blur shadow-lg transition-all"
            title="Switch to Mobile Simulator View"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Simulator</span>
          </button>
        </div>
        <div className="flex-1 flex flex-col">{children}</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 md:p-8 select-none relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Controller / Top Bar */}
      <div className="w-full max-w-[420px] mb-4 flex justify-between items-center px-2">
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

      {/* Realistic Mobile Device Frame */}
      <div className="relative w-full max-w-[395px] h-[820px] bg-slate-950 rounded-[52px] border-[10px] border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden ring-1 ring-white/10">
        
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
      </div>

      {/* Bottom informational caption */}
      <div className="mt-4 text-center max-w-sm">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Interactive mobile-responsive prototype replicating a premium Expo Router layout. Click elements to navigate. Connect with your Gemini secret key to talk to the real-time AI Coach!
        </p>
      </div>
    </div>
  );
}
