/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { Home, Dumbbell, Apple, Bot, User, Activity } from "lucide-react";
import DeviceFrame from "./components/DeviceFrame";
import SplashScreen from "./components/SplashScreen";
import OnboardingScreen from "./components/OnboardingScreen";
import LoginSignupScreen from "./components/LoginSignupScreen";
import HomeDashboard from "./components/HomeDashboard";
import WorkoutTab from "./components/WorkoutTab";
import NutritionTab from "./components/NutritionTab";
import AiCoachTab from "./components/AiCoachTab";
import ProfileTab from "./components/ProfileTab";
import { UserProfile, DailyLog } from "./types";
import { DEFAULT_PROFILE } from "./data";

const todayStr = () => new Date().toISOString().split("T")[0];

const TABS = [
  { label: "Home", icon: Home },
  { label: "Workout", icon: Dumbbell },
  { label: "Diet", icon: Apple },
  { label: "AI Coach", icon: Bot },
  { label: "Profile", icon: User }
];

// Shared fade/slide used when switching screens and tabs
const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: "easeOut" as const },
};

const emptyLog = (weight: number): DailyLog => ({
  waterLogged: 0,
  stepsCount: 0,
  caloriesBurned: 0,
  caloriesConsumed: 0,
  weightLog: weight,
  date: todayStr(),
});

// Authenticated call to the backend; returns parsed JSON or null when offline/unauthenticated
async function apiRequest(path: string, method = "GET", body?: unknown): Promise<any | null> {
  const token = localStorage.getItem("pulse_auth_token");
  if (!token) return null;
  try {
    const res = await fetch(path, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.ok ? await res.json() : null;
  } catch (e) {
    console.warn(`Backend sync failed for ${path}:`, e);
    return null;
  }
}

export default function App() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<"splash" | "auth" | "onboarding" | "main">("splash");
  const [activeTab, setActiveTab] = useState(0);

  // Core synchronized profile and daily statistics states
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [dailyLog, setDailyLog] = useState<DailyLog>(emptyLog(DEFAULT_PROFILE.weight));

  // Pull today's log from the server so data follows the account across devices
  const loadServerLog = async () => {
    const data = await apiRequest("/api/users/daily-log");
    if (data?.log) {
      setDailyLog(data.log);
      localStorage.setItem("pulse_daily_log_v3", JSON.stringify(data.log));
    }
  };

  // Load state cache on startup with full JWT session validation
  useEffect(() => {
    const initSession = async () => {
      try {
        const cachedLog = localStorage.getItem("pulse_daily_log_v3");
        if (cachedLog) {
          const parsedLog: DailyLog = JSON.parse(cachedLog);
          // A log from a previous day starts fresh
          setDailyLog(parsedLog.date === todayStr() ? parsedLog : emptyLog(parsedLog.weightLog));
        }

        const token = localStorage.getItem("pulse_auth_token");
        if (token) {
          // Verify Bearer Token with Node.js Express Backend
          const res = await fetch("/api/auth/session", {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });

          if (res.ok) {
            const data = await res.json();
            setProfile(data.user.profile);
            localStorage.setItem("pulse_user_profile_v3", JSON.stringify(data.user.profile));
            await loadServerLog();

            if (data.user.onboarded) {
              setAppScreen("main");
            } else {
              setAppScreen("onboarding");
            }
          } else {
            // Invalid/Expired JWT session token
            localStorage.removeItem("pulse_auth_token");
            setAppScreen("auth");
          }
        } else {
          // Normal offline recovery if token doesn't exist
          const cachedProfile = localStorage.getItem("pulse_user_profile_v3");
          const cachedScreen = localStorage.getItem("pulse_active_screen_v3");

          if (cachedProfile) {
            const parsed = JSON.parse(cachedProfile);
            if (parsed.name && (parsed.name.includes("Hamza") || parsed.gender === "Male")) {
              setProfile(DEFAULT_PROFILE);
              localStorage.setItem("pulse_user_profile_v3", JSON.stringify(DEFAULT_PROFILE));
            } else {
              setProfile(parsed);
            }
          }
          if (cachedScreen) {
            const screenVal = cachedScreen as any;
            if (screenVal === "main" || screenVal === "onboarding") {
              setActiveScreen(screenVal);
            }
          }
        }
      } catch (e) {
        console.error("Failed to restore cached fitness settings:", e);
      }
    };

    initSession();
  }, []);

  // Save changes to local storage for persistence
  const saveProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem("pulse_user_profile_v3", JSON.stringify(newProfile));
    apiRequest("/api/users/profile", "PUT", newProfile);
  };

  const saveDailyLog = (newLog: DailyLog) => {
    setDailyLog(newLog);
    localStorage.setItem("pulse_daily_log_v3", JSON.stringify(newLog));
    apiRequest("/api/users/daily-log", "PUT", newLog);
  };

  const setAppScreen = (screen: "splash" | "auth" | "onboarding" | "main") => {
    setActiveScreen(screen);
    localStorage.setItem("pulse_active_screen_v3", screen);
  };

  const handleSplashFinish = () => {
    const token = localStorage.getItem("pulse_auth_token");
    if (token) {
      // Re-trigger auth flow on splash finish if token exists
      const cachedScreen = localStorage.getItem("pulse_active_screen_v3");
      if (cachedScreen === "main") {
        setAppScreen("main");
        return;
      }
    }
    
    if (profile && profile.onboarded) {
      setAppScreen("main");
    } else {
      setAppScreen("auth");
    }
  };

  const handleLoginSuccess = async (token: string, loggedInProfile: UserProfile) => {
    localStorage.setItem("pulse_auth_token", token);
    setProfile(loggedInProfile);
    localStorage.setItem("pulse_user_profile_v3", JSON.stringify(loggedInProfile));
    await loadServerLog();
    if (loggedInProfile.onboarded) {
      setAppScreen("main");
    } else {
      setAppScreen("onboarding");
    }
  };

  const handleOnboardingComplete = async (completedProfile: UserProfile) => {
    // Persist onboarding on the server so the next login skips it
    const data = await apiRequest("/api/users/onboard", "POST", completedProfile);
    const finalProfile: UserProfile = data?.profile ?? completedProfile;
    setProfile(finalProfile);
    localStorage.setItem("pulse_user_profile_v3", JSON.stringify(finalProfile));

    const startLog: DailyLog = data?.log ?? emptyLog(finalProfile.weight);
    setDailyLog(startLog);
    localStorage.setItem("pulse_daily_log_v3", JSON.stringify(startLog));
    setAppScreen("main");
  };

  const handleLogUpdate = (updatedFields: Partial<DailyLog>) => {
    const nextLog = { ...dailyLog, ...updatedFields };
    saveDailyLog(nextLog);
  };

  const handleWorkoutComplete = (caloriesBurned: number) => {
    const nextLog: DailyLog = {
      ...dailyLog,
      caloriesBurned: dailyLog.caloriesBurned + caloriesBurned,
      stepsCount: dailyLog.stepsCount + 1200, // Simulate steps gained from movement
    };
    saveDailyLog(nextLog);
  };

  const handleResetData = () => {
    // Clear storage cache and roll back to preloaded template
    localStorage.removeItem("pulse_user_profile_v3");
    localStorage.removeItem("pulse_daily_log_v3");
    localStorage.removeItem("pulse_active_screen_v3");
    localStorage.removeItem("pulse_auth_token");
    
    setProfile(DEFAULT_PROFILE);
    setDailyLog(emptyLog(DEFAULT_PROFILE.weight));
    setActiveTab(0);
    setAppScreen("splash");
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("pulse_auth_token");
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
      }
    } catch (e) {
      console.warn("Logout endpoint unreachable, cleaning local storage parameters:", e);
    }

    // Clean up Secure Storage entries
    localStorage.removeItem("pulse_auth_token");
    localStorage.removeItem("pulse_user_profile_v3");
    localStorage.removeItem("pulse_daily_log_v3");
    localStorage.removeItem("pulse_active_screen_v3");

    // Rollback local states
    setProfile(DEFAULT_PROFILE);
    setDailyLog(emptyLog(DEFAULT_PROFILE.weight));
    setActiveTab(0);
    setActiveScreen("auth");
  };

  // Render correct sub-view within main application flow
  const renderMainTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <HomeDashboard
            profile={profile}
            log={dailyLog}
            onLogUpdate={handleLogUpdate}
            onNavigateToTab={setActiveTab}
            onProfileUpdate={saveProfile}
          />
        );
      case 1:
        return <WorkoutTab onWorkoutComplete={handleWorkoutComplete} />;
      case 2:
        return (
          <NutritionTab
            profile={profile}
            log={dailyLog}
            onLogUpdate={handleLogUpdate}
          />
        );
      case 3:
        return (
          <AiCoachTab
            profile={profile}
            log={dailyLog}
            onLogUpdate={handleLogUpdate}
          />
        );
      case 4:
        return (
          <ProfileTab
            profile={profile}
            onProfileUpdate={saveProfile}
            onResetData={handleResetData}
            onLogout={handleLogout}
          />
        );
      default:
        return (
          <HomeDashboard
            profile={profile}
            log={dailyLog}
            onLogUpdate={handleLogUpdate}
            onNavigateToTab={setActiveTab}
            onProfileUpdate={saveProfile}
          />
        );
    }
  };

  // In full screen web mode, desktop gets a sidebar and a centred content column
  const webLayout = isFullscreen;

  return (
    <MotionConfig reducedMotion="user">
    <DeviceFrame
      isFullscreen={isFullscreen}
      setIsFullscreen={setIsFullscreen}
      profile={activeScreen === "main" ? profile : undefined}
      log={activeScreen === "main" ? dailyLog : undefined}
    >
      <AnimatePresence mode="wait">
        {activeScreen !== "main" && (
          <motion.div
            key={activeScreen}
            {...pageTransition}
            className={`flex-1 flex flex-col min-h-0 ${webLayout ? "md:w-full md:max-w-md md:mx-auto md:my-8 md:rounded-[2rem] md:border md:border-white/10 md:shadow-2xl md:overflow-hidden md:bg-slate-950" : ""}`}
          >
            {activeScreen === "splash" && (
              <SplashScreen onFinish={handleSplashFinish} />
            )}

            {activeScreen === "auth" && (
              <LoginSignupScreen
                onSuccess={handleLoginSuccess}
                onGoToOnboarding={() => setAppScreen("onboarding")}
              />
            )}

            {activeScreen === "onboarding" && (
              <OnboardingScreen onComplete={handleOnboardingComplete} />
            )}
          </motion.div>
        )}

        {activeScreen === "main" && (
          <motion.div
            key="main"
            {...pageTransition}
            className={`flex-1 flex flex-col md:flex-row h-full min-h-0 relative overflow-hidden ${webLayout ? "md:bg-transparent" : ""} bg-slate-950`}
          >
            {/* Desktop sidebar (full screen web mode only) */}
            {webLayout && (
              <aside className="hidden md:flex flex-col w-64 shrink-0 p-6 border-r border-white/10 bg-slate-950/60 backdrop-blur-xl z-40">
                <div className="flex items-center gap-2.5 px-2 mb-10">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Activity className="w-5 h-5 text-slate-950" strokeWidth={2.5} />
                  </div>
                  <span className="font-display text-lg font-bold tracking-tight">
                    Pulse<span className="text-emerald-400">.fit</span>
                  </span>
                </div>

                <nav className="flex flex-col gap-1.5">
                  {TABS.map((tab, idx) => {
                    const TabIcon = tab.icon;
                    const isActive = activeTab === idx;
                    return (
                      <button
                        key={tab.label}
                        onClick={() => setActiveTab(idx)}
                        className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${isActive ? "text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="sidebar-active"
                            className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/10 border border-emerald-500/30"
                            transition={{ type: "spring", stiffness: 400, damping: 32 }}
                          />
                        )}
                        <TabIcon className={`relative w-5 h-5 ${isActive ? "text-emerald-400" : ""}`} />
                        <span className="relative">{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>

                <div className="mt-auto p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-sm font-semibold text-white truncate">{profile.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{profile.goal} · {profile.country}</p>
                </div>
              </aside>
            )}

            <div className="flex-1 flex flex-col min-h-0 min-w-0">
              {/* Main Content Area */}
              <div className={`flex-1 overflow-hidden flex flex-col min-h-0 ${webLayout ? "md:w-full md:max-w-2xl md:mx-auto md:my-6 md:rounded-[2rem] md:border md:border-white/10 md:bg-slate-950/90 md:shadow-2xl" : ""}`}>
                <AnimatePresence mode="wait">
                  <motion.div key={activeTab} {...pageTransition} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {renderMainTabContent()}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Bottom Simulated Tab Bar Navigation (Premium Dark Glass Theme) */}
              <div className={`h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 pb-1 shrink-0 z-40 select-none ${webLayout ? "md:hidden" : ""}`}>
                {TABS.map((tab, idx) => {
                  const TabIcon = tab.icon;
                  const isActive = activeTab === idx;
                  return (
                    <motion.button
                      key={tab.label}
                      onClick={() => setActiveTab(idx)}
                      whileTap={{ scale: 0.88 }}
                      className="flex flex-col items-center justify-center flex-1 h-full py-1 text-slate-400 hover:text-white transition-colors relative cursor-pointer"
                    >
                      <TabIcon className={`w-5 h-5 transition-transform ${isActive ? "text-emerald-400 scale-110" : "text-slate-400 hover:scale-105"}`} />
                      <span className={`text-[9px] font-bold mt-1 tracking-wider uppercase ${isActive ? "text-emerald-400" : "text-slate-500"}`}>
                        {tab.label}
                      </span>

                      {/* Emerald indicator that slides between tabs */}
                      {isActive && (
                        <motion.div
                          layoutId="tabbar-active"
                          className="absolute top-0 w-8 h-[2px] bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                          transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </DeviceFrame>
    </MotionConfig>
  );
}
