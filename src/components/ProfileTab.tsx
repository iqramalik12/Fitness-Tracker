import React, { useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";
import { User, Shield, Bell, RefreshCw, BarChart2, Plus, Sparkles, Scale, Heart, Save, LogOut } from "lucide-react";
import { MOCK_HISTORY_7DAYS } from "../data";
import { UserProfile, Region } from "../types";

interface ProfileTabProps {
  profile: UserProfile;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
  onResetData: () => void;
  onLogout?: () => void;
}

export default function ProfileTab({ profile, onProfileUpdate, onResetData, onLogout }: ProfileTabProps) {
  // Local state for editing fields
  const [name, setName] = useState(profile.name);
  const [weight, setWeight] = useState(profile.weight);
  const [height, setHeight] = useState(profile.height);
  const [country, setCountry] = useState<Region>(profile.country);
  const [goal, setGoal] = useState(profile.goal);
  const [units, setUnits] = useState(profile.units);

  const [notificationMsg, setNotificationMsg] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    // Autocalculate new BMI
    const heightInMeters = height / 100;
    const calculatedBmi = Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;

    let bmiStatus: "Underweight" | "Normal" | "Overweight" | "Obese" = "Normal";
    if (calculatedBmi < 18.5) bmiStatus = "Underweight";
    else if (calculatedBmi < 25) bmiStatus = "Normal";
    else if (calculatedBmi < 30) bmiStatus = "Overweight";
    else bmiStatus = "Obese";

    // Standard baseline fitness targets based on new goal
    let calorieBurnGoal = 500;
    let calorieIntakeGoal = 2200;
    let stepGoal = 10000;
    let waterGoal = 2500;

    if (goal === "Lose Weight") {
      calorieBurnGoal = 600;
      calorieIntakeGoal = 1800;
      stepGoal = 11000;
      waterGoal = 3000;
    } else if (goal === "Build Muscle") {
      calorieBurnGoal = 400;
      calorieIntakeGoal = 2600;
      stepGoal = 8000;
      waterGoal = 2800;
    } else if (goal === "Improve Cardio") {
      calorieBurnGoal = 700;
      calorieIntakeGoal = 2100;
      stepGoal = 12000;
      waterGoal = 3200;
    }

    onProfileUpdate({
      ...profile,
      name,
      weight,
      height,
      country,
      goal,
      units,
      bmi: calculatedBmi,
      bmiStatus,
      calorieBurnGoal,
      calorieIntakeGoal,
      stepGoal,
      waterGoal
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const triggerSimulatedPush = () => {
    const alerts = [
      "🔔 Pulse Coach: High heat today! Increase your water target by 500ml.",
      "🔔 Goal Alert: You are only 1,500 steps away from smashing your daily target!",
      "🔔 Nutrition Tip: Remember to log your next protein-rich snack to hit your macros.",
      "🔔 Workout Reminder: Perfect time to crush your 20-Min Full Body HIIT program!"
    ];
    const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];
    setNotificationMsg(randomAlert);
    setTimeout(() => setNotificationMsg(""), 4500);
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5 text-slate-100 bg-slate-950 h-full">
      
      {/* Profile Header */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <h2 className="text-xl font-extrabold tracking-tight text-white font-display">Profile & Settings</h2>
          <p className="text-xs text-slate-400">Configure parameters, units, and track progress.</p>
        </div>
        <User className="w-6 h-6 text-emerald-400" />
      </div>

      {/* Simulated Push Notification Toast */}
      {notificationMsg && (
        <div className="bg-emerald-500 border-l-4 border-emerald-300 text-slate-950 p-3 rounded-xl font-bold text-xs flex items-center justify-between shadow-lg animate-float">
          <span>{notificationMsg}</span>
          <button onClick={() => setNotificationMsg("")} className="text-[10px] uppercase font-mono px-1">✕</button>
        </div>
      )}

      {/* Interactive Profile Editing Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Personal Metrics</h3>
        
        {saveSuccess && (
          <div className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-2 rounded-lg text-center font-bold">
            ✨ Metrics successfully saved & targets recalculated!
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {/* Name */}
          <div className="flex flex-col gap-1 col-span-2">
            <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Full Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-950 border border-slate-850 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
            />
          </div>

          {/* Weight */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Weight (kg)</span>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
              className="bg-slate-950 border border-slate-850 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
            />
          </div>

          {/* Height */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Height (cm)</span>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
              className="bg-slate-950 border border-slate-850 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
            />
          </div>

          {/* Country */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Country / Region</span>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value as Region)}
              className="bg-slate-950 border border-slate-850 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
            >
              <option value="Pakistan">🇵🇰 Pakistan</option>
              <option value="USA">🇺🇸 USA</option>
              <option value="UK">🇬🇧 UK</option>
            </select>
          </div>

          {/* Goal */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Fitness Goal</span>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as any)}
              className="bg-slate-950 border border-slate-850 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
            >
              <option value="Lose Weight">Lose Weight</option>
              <option value="Build Muscle">Build Muscle</option>
              <option value="Improve Cardio">Improve Cardio</option>
              <option value="Stay Active">Stay Active</option>
            </select>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Changes & Sync</span>
        </button>
      </div>

      {/* Progress Charts Section using Recharts */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Steps progress (Past 7 Days)</h3>
          <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">Active Logs</span>
        </div>

        <div className="w-full h-44 bg-slate-950/40 rounded-xl p-2 border border-slate-850">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={MOCK_HISTORY_7DAYS}>
              <defs>
                <linearGradient id="colorSteps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={9} tickLine={false} width={25} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px" }}
                itemStyle={{ color: "#10b981" }}
                labelStyle={{ color: "#94a3b8", fontSize: "10px" }}
              />
              <Area type="monotone" dataKey="steps" stroke="#10b981" fillOpacity={1} fill="url(#colorSteps)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-between items-center border-t border-slate-800/85 pt-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Weight History (kg)</h3>
        </div>

        <div className="w-full h-40 bg-slate-950/40 rounded-xl p-2 border border-slate-850">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MOCK_HISTORY_7DAYS}>
              <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={9} tickLine={false} width={25} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px" }}
                itemStyle={{ color: "#06b6d4" }}
                labelStyle={{ color: "#94a3b8", fontSize: "10px" }}
              />
              <Bar dataKey="weight" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Simulator Tools & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 mb-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Simulator Preferences</h3>
        
        <div className="flex flex-col gap-2.5">
          {/* Simulated Push Notification */}
          <button
            onClick={triggerSimulatedPush}
            className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-850 text-slate-300 font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Bell className="w-4 h-4 text-emerald-400" />
            <span>Test Push Notification</span>
          </button>

          {/* Reset Cache */}
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to clear your local fitness cache? This will reset all step counts and daily logs.")) {
                onResetData();
              }
            }}
            className="w-full bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-rose-400 font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-rose-400" />
            <span>Reset Local Database Cache</span>
          </button>

          {/* Secure Logout (JWT Revocation) */}
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to securely log out? This will clear your current JWT session token.")) {
                if (onLogout) {
                  onLogout();
                } else {
                  onResetData();
                }
              }
            }}
            className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-850 hover:border-rose-500/20 text-slate-300 font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Secure Log Out (JWT Revocation)</span>
          </button>
        </div>
      </div>

    </div>
  );
}
