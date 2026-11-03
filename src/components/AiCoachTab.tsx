import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, Bot, Sparkles, MessageSquare, AlertCircle, HelpCircle, Dumbbell, 
  Utensils, Trophy, Calendar, Zap, Volume2, VolumeX, Check, Plus, 
  Flame, Droplets, Clock, HeartPulse, Sparkle, RefreshCw, ChevronRight, Play,
  Target, TrendingUp, Bell
} from "lucide-react";
import { UserProfile, DailyLog, ChatMessage } from "../types";
import { getToken, isSignedIn } from "../lib/api";
import DailyGoalsPanel from "./coach/DailyGoalsPanel";
import ProgressPanel from "./coach/ProgressPanel";
import RemindersPanel from "./coach/RemindersPanel";

interface AiCoachTabProps {
  profile: UserProfile;
  log?: DailyLog;
  onLogUpdate?: (updatedFields: Partial<DailyLog>) => void;
  onWeightLogged?: (profile: UserProfile, log: DailyLog) => void;
  initialSubTab?: AiSubTab;
}

// Sub-tabs of the AI Suite
export type AiSubTab = "chat" | "goals" | "progress" | "reminders" | "workout" | "diet" | "tips" | "motivation" | "roadmap";

export default function AiCoachTab({ profile, log, onLogUpdate, onWeightLogged, initialSubTab }: AiCoachTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<AiSubTab>(initialSubTab || "chat");
  const signedIn = isSignedIn();

  // Opening the coach from elsewhere (e.g. the Home goals card) jumps to the requested section
  useEffect(() => {
    if (initialSubTab) setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  // ==========================================
  // STATE DEFINITIONS
  // ==========================================

  // 1. Chat Coach State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 2. Workout Planner State
  const [focusMuscle, setFocusMuscle] = useState("Full Body");
  const [duration, setDuration] = useState("30");
  const [equipment, setEquipment] = useState("No Equipment");
  const [fitnessLevel, setFitnessLevel] = useState("Intermediate");
  const [workoutPlan, setWorkoutPlan] = useState<any | null>(null);
  const [workoutLoading, setWorkoutLoading] = useState(false);
  const [workoutSuccessMessage, setWorkoutSuccessMessage] = useState("");

  // 3. Diet Planner State
  const [dietPref, setDietPref] = useState(
    profile.country === "Pakistan" 
      ? "High Protein Halal Pakistani" 
      : profile.country === "UK" 
        ? "UK High-Street Clean" 
        : "Balanced Nutrition"
  );
  const [calTarget, setCalTarget] = useState(profile.calorieIntakeGoal || 2000);
  const [protTarget, setProtTarget] = useState(120);
  const [dietPlan, setDietPlan] = useState<any | null>(null);
  const [dietLoading, setDietLoading] = useState(false);
  const [dietSuccessMessage, setDietSuccessMessage] = useState("");

  // 4. Health Tips State
  const [healthTips, setHealthTips] = useState<any[]>([]);
  const [tipsLoading, setTipsLoading] = useState(false);

  // 5. Daily Motivation State
  const [motivationData, setMotivationData] = useState<any | null>(null);
  const [motivationLoading, setMotivationLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // 6. 7-Day Roadmap State
  const [roadmapData, setRoadmapData] = useState<any | null>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [completedRoadmapDays, setCompletedRoadmapDays] = useState<number[]>([]);

  // ==========================================
  // INITIALIZERS / EFFECTS
  // ==========================================

  // Initialize Chat
  useEffect(() => {
    if (chatMessages.length === 0) {
      let regionalGreeting = "Welcome!";
      if (profile.country === "Pakistan") {
        regionalGreeting = "As-salamu alaykum! 🇵🇰 I am your Pulse AI Coach, tailored specifically to Pakistani lifestyles, Halal meal options, and traditional foods like Lentils (Daal), Roti, and roasted chana.";
      } else if (profile.country === "UK") {
        regionalGreeting = "Cheers! 🇬🇧 I am your Pulse AI Coach, aligned with British health guidelines and high-quality local supermarket recipes.";
      } else {
        regionalGreeting = "Hello! 🇺🇸 I am your Pulse AI Coach, ready to deliver top-tier training, nutritional tips, and habit tracking suited to your lifestyle.";
      }

      setChatMessages([
        {
          id: "msg-welcome",
          role: "model",
          content: `${regionalGreeting}\n\nBased on your goal to **${profile.goal.toLowerCase()}** at your current **BMI of ${profile.bmi} (${profile.bmiStatus})**, what fitness or dietary queries can I answer for you today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  }, [profile, chatMessages.length]);

  // Load other AI views on first sub-tab swap to avoid empty screens
  useEffect(() => {
    if (activeSubTab === "tips" && healthTips.length === 0) {
      fetchHealthTips();
    } else if (activeSubTab === "motivation" && !motivationData) {
      fetchMotivation();
    } else if (activeSubTab === "roadmap" && !roadmapData) {
      fetchWeeklyRoadmap();
    }
  }, [activeSubTab]);

  // Scroll chat window to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Audio wave visualizer timeout simulation
  useEffect(() => {
    let timer: any;
    if (isPlayingAudio) {
      timer = setTimeout(() => {
        setIsPlayingAudio(false);
      }, 7000); // sound bite is simulated for 7 seconds
    }
    return () => clearTimeout(timer);
  }, [isPlayingAudio]);

  // ==========================================
  // API CALL TRIGGERS
  // ==========================================

  // 1. Send Coach Chat Message
  const handleSendChatMessage = async (textToSend?: string) => {
    const text = textToSend || chatInput;
    if (!text.trim() || chatLoading) return;

    setChatError("");
    if (!textToSend) setChatInput("");

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatLoading(true);

    try {
      const token = getToken();
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: updatedMessages,
          profile,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "An error occurred fetching response from coach API.");
      }

      const coachMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "model",
        content: data.text || "I apologize, I could not synthesize a proper response.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setChatMessages((prev) => [...prev, coachMsg]);
    } catch (err: any) {
      console.error(err);
      setChatError(err.message || "Failed to establish secure handshake with Gemini Engine.");
    } finally {
      setChatLoading(false);
    }
  };

  // 2. Generate Workout Plan
  const fetchWorkoutPlan = async () => {
    setWorkoutLoading(true);
    setWorkoutSuccessMessage("");
    setWorkoutPlan(null);
    try {
      const res = await fetch("/api/ai/workout-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focusMuscle,
          durationMinutes: duration,
          equipment,
          fitnessLevel,
          profile
        })
      });
      if (res.ok) {
        const data = await res.json();
        setWorkoutPlan(data);
      } else {
        console.error("Workout endpoint failed");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setWorkoutLoading(false);
    }
  };

  // 3. Generate Diet Plan
  const fetchDietPlan = async () => {
    setDietLoading(true);
    setDietSuccessMessage("");
    setDietPlan(null);
    try {
      const res = await fetch("/api/ai/diet-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dietPreference: dietPref,
          targetCalories: calTarget,
          targetProtein: protTarget,
          profile
        })
      });
      if (res.ok) {
        const data = await res.json();
        setDietPlan(data);
      } else {
        console.error("Diet API failed");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDietLoading(false);
    }
  };

  // 4. Fetch Health Tips
  const fetchHealthTips = async () => {
    setTipsLoading(true);
    try {
      const res = await fetch("/api/ai/health-tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile })
      });
      if (res.ok) {
        const data = await res.json();
        setHealthTips(data.tips || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTipsLoading(false);
    }
  };

  // 5. Fetch Daily Motivation
  const fetchMotivation = async () => {
    setMotivationLoading(true);
    try {
      const res = await fetch("/api/ai/motivation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile })
      });
      if (res.ok) {
        const data = await res.json();
        setMotivationData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMotivationLoading(false);
    }
  };

  // 6. Fetch Weekly Suggestions (Roadmap)
  const fetchWeeklyRoadmap = async () => {
    setRoadmapLoading(true);
    try {
      const res = await fetch("/api/ai/weekly-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile })
      });
      if (res.ok) {
        const data = await res.json();
        setRoadmapData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRoadmapLoading(false);
    }
  };

  // ==========================================
  // ACTION HANDLERS (LOG SYNCRONIZATION)
  // ==========================================

  // Apply & Log Custom AI Workout Calories to state
  const handleApplyWorkout = () => {
    if (!workoutPlan || !onLogUpdate || !log) return;
    const calories = workoutPlan.estimatedCaloriesBurned || 250;
    
    // Dispatch update to App state
    onLogUpdate({
      caloriesBurned: log.caloriesBurned + calories,
      stepsCount: log.stepsCount + 1500 // simulate physical movement step increase
    });

    setWorkoutSuccessMessage(`🚀 Excellent! Logged ${calories} kcal and +1,500 workout steps to your Today's dashboard!`);
    setTimeout(() => setWorkoutSuccessMessage(""), 5000);
  };

  // Log Single meal calories from Diet Planner
  const handleLogMealCalories = (calories: number, name: string) => {
    if (!onLogUpdate || !log) return;
    onLogUpdate({
      caloriesConsumed: log.caloriesConsumed + calories
    });

    setDietSuccessMessage(`🥗 Logged "${name}" (+${calories} kcal) to your daily consumption target!`);
    setTimeout(() => setDietSuccessMessage(""), 5000);
  };

  // Log complete daily macro plan
  const handleApplyFullDietPlan = () => {
    if (!dietPlan || !onLogUpdate || !log) return;
    const totalCals = dietPlan.totalCalories || 2000;
    
    onLogUpdate({
      caloriesConsumed: log.caloriesConsumed + totalCals
    });

    setDietSuccessMessage(`🎉 Clean fuel! Logged the full daily meal target (+${totalCals} kcal) to your Nutrition dashboard!`);
    setTimeout(() => setDietSuccessMessage(""), 5000);
  };

  const toggleRoadmapDay = (dayNum: number) => {
    setCompletedRoadmapDays(prev => 
      prev.includes(dayNum) 
        ? prev.filter(d => d !== dayNum) 
        : [...prev, dayNum]
    );
  };

  // Get Suggestion chips for Chat
  const getSuggestionChips = () => {
    if (profile.country === "Pakistan") {
      return [
        "How did I eat today based on my meal log?",
        "Mera weight kam nahi ho raha, kya karun?",
        "Suggest a high-protein Halal snack from common Pakistani foods.",
        "How should I adjust my running schedule for hot weather?",
        "Provide a quick calorie count for common roti & dal meals."
      ];
    } else if (profile.country === "UK") {
      return [
        "Draft a rainy-day indoor cardio program for UK winters.",
        "Recommend healthy ingredients available in local UK shops.",
        "How do I optimize steel-cut oats for clean gains?"
      ];
    }
    return [
      "Suggest a quick 15-minute home workout for " + profile.goal.toLowerCase(),
      "Is my BMI of " + profile.bmi + " in the healthy range?",
      "Provide a clean, high-protein breakfast recipe."
    ];
  };

  return (
    <div className="flex-1 flex flex-col justify-between text-slate-100 bg-slate-950 h-full overflow-hidden">
      
      {/* 1. Main Premium AI Navigation Header (Tabs Scrollable) */}
      <div className="bg-slate-900 border-b border-slate-800 shrink-0">
        
        {/* Pulse Brand Label */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950">
              <Bot className="w-4.5 h-4.5 font-bold" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white font-display tracking-tight flex items-center gap-1.5">
                Pulse AI Suite
              </span>
              <span className="text-[9px] font-mono font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Gemini Certified</span>
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[10px]">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="font-mono text-slate-400">Region: <b>{profile.country}</b></span>
          </div>
        </div>

        {/* Horizontal Scroll Sub-Tabs menu */}
        <div className="flex px-4 overflow-x-auto gap-2 pb-2 scrollbar-none select-none">
          <button
            onClick={() => setActiveSubTab("chat")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "chat" 
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10" 
                : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-850"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Pulse Coach</span>
          </button>

          {([
            ["goals", "Daily Goals", Target],
            ["progress", "Progress", TrendingUp],
            ["reminders", "Reminders", Bell],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setActiveSubTab(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === id
                  ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10"
                  : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-850"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}

          <button
            onClick={() => setActiveSubTab("workout")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "workout" 
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10" 
                : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-850"
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>AI Workout Planner</span>
          </button>

          <button
            onClick={() => setActiveSubTab("diet")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "diet" 
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10" 
                : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-850"
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>AI Diet Planner</span>
          </button>

          <button
            onClick={() => setActiveSubTab("tips")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "tips" 
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10" 
                : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-850"
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Longevity Tips</span>
          </button>

          <button
            onClick={() => setActiveSubTab("motivation")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "motivation" 
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10" 
                : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-850"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Motivation</span>
          </button>

          <button
            onClick={() => setActiveSubTab("roadmap")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "roadmap" 
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10" 
                : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-850"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>7-Day Suggestions</span>
          </button>
        </div>
      </div>

      {/* 2. Main Content Display Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-none">
        
        <AnimatePresence mode="wait">
          
          {/* TAB A: COACH CHAT */}
          {activeSubTab === "chat" && (
            <motion.div 
              key="chat-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col justify-between h-full min-h-[400px]"
            >
              <div className="flex-1 flex flex-col gap-3">
                {chatMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-[85%] ${
                      m.role === "user" ? "self-end items-end" : "self-start items-start"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-semibold rounded-tr-none shadow-md shadow-emerald-500/5"
                          : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none"
                      }`}
                    >
                      {m.content}
                    </div>
                    <span className="text-[8px] font-mono text-slate-500 mt-1 uppercase tracking-widest">{m.timestamp}</span>
                  </div>
                ))}

                {chatLoading && (
                  <div className="self-start flex flex-col items-start max-w-[85%]">
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono font-semibold">Pulse Coach is drafting...</span>
                    </div>
                  </div>
                )}

                {chatError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl flex items-start gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <span className="font-bold">Handshake Interrupted</span>
                      <span className="text-[10px] text-rose-300 leading-normal">{chatError}</span>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="mt-4 pt-3 border-t border-slate-900 flex flex-col gap-2">
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
                  {getSuggestionChips().map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendChatMessage(chip)}
                      className="bg-slate-900 hover:bg-slate-850 border border-slate-850 hover:border-emerald-500/20 text-slate-300 font-semibold px-3 py-1.5 rounded-full text-[9px] whitespace-nowrap transition-all cursor-pointer"
                    >
                      💡 {chip}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendChatMessage();
                    }}
                    placeholder="Ask in English or Roman Urdu: meals, workouts, progress..."
                    className="flex-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 outline-none transition-colors"
                  />
                  <button
                    onClick={() => handleSendChatMessage()}
                    disabled={!chatInput.trim() || chatLoading}
                    className="p-3 bg-emerald-500 hover:bg-emerald-450 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded-xl transition-all shadow-md cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* COACH: DAILY GOALS, PROGRESS, REMINDERS */}
          {(activeSubTab === "goals" || activeSubTab === "progress" || activeSubTab === "reminders") && (
            <motion.div
              key={`${activeSubTab}-tab`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeSubTab === "goals" && <DailyGoalsPanel signedIn={signedIn} />}
              {activeSubTab === "progress" && <ProgressPanel signedIn={signedIn} profile={profile} onWeightLogged={onWeightLogged} />}
              {activeSubTab === "reminders" && <RemindersPanel signedIn={signedIn} />}
            </motion.div>
          )}

          {/* TAB B: AI WORKOUT PLANNER */}
          {activeSubTab === "workout" && (
            <motion.div
              key="workout-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-4"
            >
              {/* Controls card */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 border-b border-slate-800/60 pb-2">
                  <Dumbbell className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">Configure Routine Parameters</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Focus Muscle</label>
                    <select 
                      value={focusMuscle}
                      onChange={(e) => setFocusMuscle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 text-xs text-white px-2.5 py-2 rounded-xl outline-none"
                    >
                      <option value="Full Body">Full Body</option>
                      <option value="Chest & Triceps">Chest & Triceps</option>
                      <option value="Back & Biceps">Back & Biceps</option>
                      <option value="Legs & Core">Legs & Core</option>
                      <option value="Shoulders & Arms">Shoulders & Arms</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Duration</label>
                    <select 
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 text-xs text-white px-2.5 py-2 rounded-xl outline-none"
                    >
                      <option value="15">15 Minutes</option>
                      <option value="30">30 Minutes</option>
                      <option value="45">45 Minutes</option>
                      <option value="60">60 Minutes</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Equipment</label>
                    <select 
                      value={equipment}
                      onChange={(e) => setEquipment(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 text-xs text-white px-2.5 py-2 rounded-xl outline-none"
                    >
                      <option value="No Equipment">No Equipment / Bodyweight</option>
                      <option value="Dumbbells Only">Dumbbells Only</option>
                      <option value="Full Gym">Full Gym Equipment</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Fitness Level</label>
                    <select 
                      value={fitnessLevel}
                      onChange={(e) => setFitnessLevel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 text-xs text-white px-2.5 py-2 rounded-xl outline-none"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={fetchWorkoutPlan}
                  disabled={workoutLoading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs py-3 rounded-xl hover:opacity-95 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {workoutLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Synthesizing Workout Plan...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Synthesize Custom Workout Plan</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status messages */}
              {workoutSuccessMessage && (
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2"
                >
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{workoutSuccessMessage}</span>
                </motion.div>
              )}

              {/* Workout Results */}
              {workoutPlan && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col gap-3.5"
                >
                  <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-extrabold text-white font-display tracking-tight leading-snug">{workoutPlan.title}</h4>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1 text-[10px] text-emerald-400 font-mono font-bold">
                        <Flame className="w-3.5 h-3.5" />
                        <span>~{workoutPlan.estimatedCaloriesBurned} kcal</span>
                      </div>
                    </div>
                    
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-4">{workoutPlan.description}</p>

                    <div className="flex flex-col gap-3 mb-4">
                      {workoutPlan.exercises?.map((ex: any, idx: number) => (
                        <div key={idx} className="bg-slate-950/50 border border-slate-900 p-3 rounded-xl flex items-start gap-3">
                          <div className="w-6.5 h-6.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-xs text-emerald-400 font-mono font-bold shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-white">{ex.name}</span>
                              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-400/5 border border-cyan-400/10 px-1.5 py-0.5 rounded-md font-bold">{ex.sets} Sets x {ex.reps}</span>
                            </div>
                            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">{ex.targetMuscle}</span>
                            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed"><span className="text-emerald-400/80 font-bold font-display">Tip:</span> {ex.instructions}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleApplyWorkout}
                      className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Log Calories Gained to Today's Dashboard</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* TAB C: AI DIET PLANNER */}
          {activeSubTab === "diet" && (
            <motion.div
              key="diet-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-4"
            >
              {/* Diet preferences configuration */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 border-b border-slate-800/60 pb-2">
                  <Utensils className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">Configure Daily Meals</h3>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Nutrition Style / Region Mode</label>
                    <select 
                      value={dietPref}
                      onChange={(e) => setDietPref(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 text-xs text-white px-2.5 py-2 rounded-xl outline-none"
                    >
                      <option value="High Protein Halal Pakistani">🇵🇰 High Protein Halal Pakistani (Daal, Roti, Chicken, Chana)</option>
                      <option value="UK High-Street Clean">🇬🇧 UK High-Street Clean (Porridge, Oats, Salmon, Tuna Jacket)</option>
                      <option value="Balanced Nutrition">🇺🇸 Balanced Nutrition (Avocado Toast, Quinoa Bowl, Sirloin)</option>
                      <option value="Keto Fats Target">🥑 Low-Carb High-Fat Keto</option>
                      <option value="Vegan Active Green">🌱 Plant-Based Active Vegan</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Calories ({calTarget} kcal)</label>
                      <input 
                        type="range"
                        min="1400"
                        max="3500"
                        step="50"
                        value={calTarget}
                        onChange={(e) => setCalTarget(parseInt(e.target.value))}
                        className="w-full accent-emerald-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Protein ({protTarget}g)</label>
                      <input 
                        type="range"
                        min="50"
                        max="220"
                        step="5"
                        value={protTarget}
                        onChange={(e) => setProtTarget(parseInt(e.target.value))}
                        className="w-full accent-cyan-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={fetchDietPlan}
                  disabled={dietLoading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs py-3 rounded-xl hover:opacity-95 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-1"
                >
                  {dietLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Compiling Recipe Datasets...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Full-Day Diet Plan</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status messages */}
              {dietSuccessMessage && (
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2"
                >
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{dietSuccessMessage}</span>
                </motion.div>
              )}

              {/* Diet Results */}
              {dietPlan && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col gap-3.5"
                >
                  <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl">
                    <h4 className="text-sm font-extrabold text-white font-display mb-1">{dietPlan.title}</h4>
                    
                    {/* Macros Grid */}
                    <div className="grid grid-cols-4 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-900 mb-4 text-center">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Calories</span>
                        <span className="text-xs font-bold text-emerald-400 font-mono">{dietPlan.totalCalories} kcal</span>
                      </div>
                      <div className="flex flex-col border-l border-slate-900">
                        <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Protein</span>
                        <span className="text-xs font-bold text-cyan-400 font-mono">{dietPlan.totalProtein}g</span>
                      </div>
                      <div className="flex flex-col border-l border-slate-900">
                        <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Carbs</span>
                        <span className="text-xs font-bold text-amber-500 font-mono">{dietPlan.totalCarbs}g</span>
                      </div>
                      <div className="flex flex-col border-l border-slate-900">
                        <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Fats</span>
                        <span className="text-xs font-bold text-rose-500 font-mono">{dietPlan.totalFats}g</span>
                      </div>
                    </div>

                    {/* Meal list */}
                    <div className="flex flex-col gap-3 mb-4">
                      {dietPlan.meals?.map((meal: any, idx: number) => (
                        <div key={idx} className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 flex flex-col gap-2">
                          <div className="flex justify-between items-center border-b border-slate-900 pb-1.5">
                            <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest font-mono">{meal.type}</span>
                            <span className="text-[10px] text-slate-500 font-mono font-semibold">{meal.calories} kcal | P: {meal.protein}g</span>
                          </div>
                          
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">{meal.name}</span>
                            
                            {/* Ingredients list */}
                            <div className="flex flex-wrap gap-1 mt-1.5 mb-2 select-none">
                              {meal.ingredients?.map((ing: string, i: number) => (
                                <span key={i} className="text-[9px] bg-slate-900 text-slate-400 border border-slate-850 px-2 py-0.5 rounded-full font-medium">
                                  ✓ {ing}
                                </span>
                              ))}
                            </div>

                            <p className="text-[10px] text-slate-400 leading-relaxed"><span className="text-cyan-400 font-bold">Directions:</span> {meal.instructions}</p>
                          </div>

                          <button
                            onClick={() => handleLogMealCalories(meal.calories, meal.name)}
                            className="w-full bg-slate-900 hover:bg-slate-850 py-1.5 mt-2 rounded-lg border border-slate-850 text-[9px] text-slate-300 hover:text-white font-bold tracking-wide transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3 text-emerald-400" />
                            <span>Log This Meal Calories (+{meal.calories} kcal)</span>
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleApplyFullDietPlan}
                      className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Log Full Day Calories ({dietPlan.totalCalories} kcal)</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* TAB D: LONGEVITY & PREVENTIVE TIPS */}
          {activeSubTab === "tips" && (
            <motion.div
              key="tips-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-3.5"
            >
              <div className="flex justify-between items-center bg-slate-900 p-3.5 rounded-xl border border-slate-850">
                <div className="flex items-center gap-2">
                  <HeartPulse className="text-emerald-400 w-5 h-5 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white font-display uppercase tracking-wider leading-none">Preventive Guidelines</span>
                    <span className="text-[9px] text-slate-400">Localized health science based on age & BMI</span>
                  </div>
                </div>
                
                <button
                  onClick={fetchHealthTips}
                  disabled={tipsLoading}
                  className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/30 p-2 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${tipsLoading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {tipsLoading ? (
                <div className="flex flex-col gap-3 py-6 items-center justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                  <span className="text-xs text-slate-400 font-mono font-medium">Analyzing metabolic metrics...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {healthTips.map((tip, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-2 shadow-md relative overflow-hidden"
                    >
                      {/* Gradient tag line */}
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-emerald-500 to-cyan-500" />
                      
                      <div className="flex justify-between items-center pl-1.5">
                        <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-widest">{tip.category}</span>
                        <span className={`text-[8px] font-mono px-2 py-0.5 rounded-md font-bold uppercase border ${
                          tip.impactLevel === "Critical" 
                            ? "bg-rose-500/10 border-rose-500/25 text-rose-400" 
                            : tip.impactLevel === "High" 
                              ? "bg-amber-500/10 border-amber-500/25 text-amber-400" 
                              : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                        }`}>
                          {tip.impactLevel} Impact
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white pl-1.5 leading-snug">{tip.title}</h4>
                      <p className="text-[11px] text-slate-400 pl-1.5 leading-relaxed font-sans">{tip.detail}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB E: DAILY MOTIVATION */}
          {activeSubTab === "motivation" && (
            <motion.div
              key="motivation-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-4"
            >
              {motivationLoading ? (
                <div className="flex flex-col gap-3 py-10 items-center justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                  <span className="text-xs text-slate-400 font-mono font-medium">Synthesizing mental momentum...</span>
                </div>
              ) : (
                motivationData && (
                  <div className="flex flex-col gap-4">
                    {/* Glowing Quote Card */}
                    <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden text-center flex flex-col items-center gap-4">
                      
                      <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full" />
                      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full" />
                      
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <Trophy className="w-5 h-5" />
                      </div>

                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium text-white italic leading-relaxed font-sans tracking-tight">
                          "{motivationData.quote}"
                        </p>
                        <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest mt-1">
                          — {motivationData.author}
                        </span>
                      </div>

                      {/* Spoken voice mantra (Simulated Audio Wave Visualizer) */}
                      <div className="w-full bg-slate-950/60 border border-slate-850 p-4 rounded-2xl flex flex-col items-center gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                            className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-450 text-slate-950 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            {isPlayingAudio ? (
                              <VolumeX className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4 fill-slate-950 pl-0.5" />
                            )}
                          </button>
                          <div className="flex flex-col items-start text-left">
                            <span className="text-[10px] font-extrabold text-white">Interactive Coach Mantra</span>
                            <span className="text-[9px] font-mono text-slate-500">
                              {isPlayingAudio ? "Streaming energetic audio guide..." : "Tap to play motivational voice note"}
                            </span>
                          </div>
                        </div>

                        {/* Animated Visualizer Wave Bars */}
                        <div className="h-8 flex items-center gap-1.5 select-none mt-1">
                          {[...Array(12)].map((_, i) => (
                            <motion.div
                              key={i}
                              animate={isPlayingAudio ? {
                                height: [8, Math.random() * 24 + 8, 8]
                              } : {
                                height: 8
                              }}
                              transition={{
                                duration: 0.6,
                                repeat: Infinity,
                                delay: i * 0.05,
                                ease: "easeInOut"
                              }}
                              className="w-1 rounded-full bg-gradient-to-t from-emerald-500 to-cyan-400"
                            />
                          ))}
                        </div>

                        {isPlayingAudio && (
                          <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-[10px] text-slate-400 italic text-center max-w-[90%] leading-relaxed bg-slate-900/60 p-2.5 rounded-xl"
                          >
                            "{motivationData.audioTagline}"
                          </motion.p>
                        )}
                      </div>
                    </div>

                    {/* Today's focus card */}
                    <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex flex-col gap-2 relative">
                      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-1">
                        <Zap className="w-4.5 h-4.5 text-amber-400" />
                        <span className="text-xs font-bold text-white font-display uppercase tracking-wider">Today's Focus Task</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed pl-0.5">{motivationData.todaysFocus}</p>
                    </div>

                    <button
                      onClick={fetchMotivation}
                      className="w-full bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-850 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Synthesize New Mantra</span>
                    </button>
                  </div>
                )
              )}
            </motion.div>
          )}

          {/* TAB F: 7-DAY ROADMAP WEEKLY SUGGESTIONS */}
          {activeSubTab === "roadmap" && (
            <motion.div
              key="roadmap-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-3.5"
            >
              {roadmapLoading ? (
                <div className="flex flex-col gap-3 py-10 items-center justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                  <span className="text-xs text-slate-400 font-mono font-medium">Drafting weekly layout suggestion...</span>
                </div>
              ) : (
                roadmapData && (
                  <div className="flex flex-col gap-3.5">
                    <div className="bg-slate-900 p-4 border border-slate-850 rounded-2xl">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display mb-1">7-Day Fit Roadmap Tracker</h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed">Tap a day to mark the activity as completed. Build a 7-day streak to unlock high level metabolic progression!</p>
                      
                      {/* Progress bar */}
                      <div className="mt-3 bg-slate-950 border border-slate-900 p-3 rounded-xl">
                        <div className="flex justify-between text-[10px] font-mono font-bold mb-1.5">
                          <span className="text-slate-400">Roadmap Progress</span>
                          <span className="text-emerald-400">{completedRoadmapDays.length} / 7 Days</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300" 
                            style={{ width: `${(completedRoadmapDays.length / 7) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      {roadmapData.days?.map((day: any, idx: number) => {
                        const isDone = completedRoadmapDays.includes(day.dayNumber);
                        return (
                          <div 
                            key={idx} 
                            onClick={() => toggleRoadmapDay(day.dayNumber)}
                            className={`p-3.5 border rounded-2xl transition-all cursor-pointer flex gap-3.5 items-start ${
                              isDone 
                                ? "bg-emerald-500/5 border-emerald-500/20 text-slate-300" 
                                : "bg-slate-900 border-slate-850 text-slate-400 hover:border-slate-800"
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${
                              isDone 
                                ? "bg-emerald-500 border-emerald-400 text-slate-950" 
                                : "bg-slate-950 border-slate-850 text-slate-500"
                            }`}>
                              {isDone ? <Check className="w-4.5 h-4.5 font-extrabold" /> : <span className="text-[10px] font-mono font-bold">{day.dayNumber}</span>}
                            </div>

                            <div className="flex-1 flex flex-col gap-1 text-left">
                              <div className="flex justify-between items-center">
                                <span className={`text-xs font-bold ${isDone ? "text-emerald-400" : "text-white"}`}>{day.dayName}</span>
                                <span className={`text-[9px] font-mono font-bold uppercase tracking-widest border px-1.5 py-0.5 rounded ${
                                  day.restDay 
                                    ? "bg-rose-500/10 border-rose-500/15 text-rose-400" 
                                    : "bg-cyan-500/10 border-cyan-500/15 text-cyan-400"
                                }`}>
                                  {day.restDay ? "Rest & Restore" : "Active Flow"}
                                </span>
                              </div>

                              <span className="text-[10px] text-slate-300 font-bold">{day.focus}</span>
                              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{day.activitySuggestion}</p>
                              
                              <div className="flex gap-4 mt-2 border-t border-slate-950/40 pt-2 text-[9px] font-mono">
                                <span className="flex items-center gap-1"><Droplets className="w-3.5 h-3.5 text-cyan-400" /> Hydrate: {day.hydrationTarget}ml</span>
                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-emerald-400" /> Sleep: {day.sleepTarget}h</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={fetchWeeklyRoadmap}
                      className="w-full bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-850 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Re-synthesize Roadmap</span>
                    </button>
                  </div>
                )
              )}
            </motion.div>
          )}

        </AnimatePresence>

      </div>

    </div>
  );
}
