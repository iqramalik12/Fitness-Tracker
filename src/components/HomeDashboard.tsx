import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Flame,
  Footprints,
  Droplets,
  Target,
  Award,
  Dumbbell,
  Compass,
  History,
  TrendingUp,
  Scale,
  Calculator,
  Bell,
  Search,
  Plus,
  Clock,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Volume2
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from "recharts";
import { UserProfile, DailyLog, ProgressHistory, WorkoutPlan } from "../types";
import CoachGoalsCard from "./coach/CoachGoalsCard";
import { MOCK_HISTORY_7DAYS, WORKOUT_PLANS } from "../data";

interface HomeDashboardProps {
  profile: UserProfile;
  log: DailyLog;
  onLogUpdate: (updatedLog: Partial<DailyLog>) => void;
  onNavigateToTab: (tabIndex: number) => void;
  onProfileUpdate?: (updatedProfile: UserProfile) => void;
  // Saves a workout to history (signed-in users); falls back to onLogUpdate when absent
  onWorkoutRecorded?: (caloriesBurned: number, plan: Pick<WorkoutPlan, "title" | "category" | "durationMinutes" | "exercisesCount">) => void;
  onOpenCoach?: (subTab: "goals" | "progress") => void;
}

type SubTab = "TODAY" | "ANALYTICS" | "LIBRARY" | "ALERTS";

interface CustomizedReminder {
  id: string;
  title: string;
  time: string;
  category: "hydration" | "activity" | "workout" | "general";
  isActive: boolean;
}

export default function HomeDashboard({
  profile,
  log,
  onLogUpdate,
  onNavigateToTab,
  onProfileUpdate,
  onWorkoutRecorded,
  onOpenCoach
}: HomeDashboardProps) {
  // Sub-navigation state
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("TODAY");

  // Notifications and interactive reminder system state
  const [reminders, setReminders] = useState<CustomizedReminder[]>([
    { id: "rem-1", title: "Water Hydration Alert", time: "09:00", category: "hydration", isActive: true },
    { id: "rem-2", title: "Afternoon Stretch Reminder", time: "14:00", category: "activity", isActive: true },
    { id: "rem-3", title: "Daily Calorie Check-in", time: "20:00", category: "general", isActive: false },
    { id: "rem-4", title: "Evening Workout Alarm", time: "18:30", category: "workout", isActive: true }
  ]);
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderTime, setNewReminderTime] = useState("08:00");
  const [newReminderCat, setNewReminderCat] = useState<"hydration" | "activity" | "workout" | "general">("hydration");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastTitle, setToastTitle] = useState("");

  // Goal Editor Modal
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editedSteps, setEditedSteps] = useState(profile.stepGoal);
  const [editedWater, setEditedWater] = useState(profile.waterGoal);
  const [editedBurn, setEditedBurn] = useState(profile.calorieBurnGoal);
  const [editedIntake, setEditedIntake] = useState(profile.calorieIntakeGoal);

  // Weight Tracker state
  const [weightInput, setWeightInput] = useState(profile.weight.toString());
  const [weightHistory, setWeightHistory] = useState<{ date: string; weight: number }[]>([
    { date: "Jul 09", weight: 74.8 },
    { date: "Jul 10", weight: 74.6 },
    { date: "Jul 11", weight: 74.5 },
    { date: "Jul 12", weight: 74.4 },
    { date: "Jul 13", weight: 74.2 },
    { date: "Jul 14", weight: 74.1 },
    { date: "Jul 15", weight: profile.weight }
  ]);

  // BMI Interactive Calculator
  const [bmiWeight, setBmiWeight] = useState(profile.weight);
  const [bmiHeight, setBmiHeight] = useState(profile.height);
  const [isSyncingBmi, setIsSyncingBmi] = useState(false);

  // Exercise Library searchable database state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<string>("All");
  const [showExDetailModal, setShowExDetailModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<any | null>(null);

  // Custom Workout Logging state
  const [showLogWorkoutForm, setShowLogWorkoutForm] = useState(false);
  const [customWorkoutName, setCustomWorkoutName] = useState("");
  const [customWorkoutDuration, setCustomWorkoutDuration] = useState("20");
  const [customWorkoutReps, setCustomWorkoutReps] = useState("12");
  const [customWorkoutSets, setCustomWorkoutSets] = useState("3");
  const [customWorkoutIntensity, setCustomWorkoutIntensity] = useState<"Low" | "Medium" | "High">("Medium");
  const [workoutLogSuccess, setWorkoutLogSuccess] = useState("");

  // Sound Synth Generator (Web Audio API) for alarms
  const triggerAudioBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 tone
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
      
      // Secondary tone for chime effect
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1109.73, audioCtx.currentTime); // C#6 tone
        gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.2);
      }, 150);
    } catch (e) {
      console.warn("Web Audio API not supported or user gesture required:", e);
    }
  };

  // Generate 30 days of data for monthly analytics view
  const monthlyData: ProgressHistory[] = useMemo(() => {
    const data: ProgressHistory[] = [];
    const baseWeight = profile.weight + 0.8;
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
      
      // Create clean realistic fluctuations
      const randomSeed = Math.sin(i + 4) * 0.5 + 0.5; // 0 to 1
      const stepVal = Math.round(profile.stepGoal - 1500 + randomSeed * 3200);
      const waterVal = Math.round(profile.waterGoal - 500 + randomSeed * 1000);
      const weightVal = parseFloat((baseWeight - (30 - i) * 0.04 + randomSeed * 0.15).toFixed(1));
      const calIn = Math.round(profile.calorieIntakeGoal - 200 + randomSeed * 400);
      const calOut = Math.round(profile.calorieBurnGoal - 100 + randomSeed * 250);

      data.push({
        date: dateString,
        steps: i === 0 ? log.stepsCount : stepVal,
        water: i === 0 ? log.waterLogged : waterVal,
        weight: i === 0 ? parseFloat(log.weightLog.toFixed(1)) : weightVal,
        caloriesConsumed: i === 0 ? log.caloriesConsumed : calIn,
        caloriesBurned: i === 0 ? log.caloriesBurned : calOut
      });
    }
    return data;
  }, [profile.stepGoal, profile.waterGoal, profile.calorieIntakeGoal, profile.calorieBurnGoal, log.stepsCount, log.waterLogged, log.weightLog, log.caloriesConsumed, log.caloriesBurned]);

  // Combined compiled lists of exercises from WORKOUT_PLANS plus additional compound movements
  const fullExerciseCatalog = useMemo(() => {
    const fromPlans = WORKOUT_PLANS.flatMap(p => p.exercises);
    const unique = Array.from(new Map(fromPlans.map(ex => [ex.name, ex])).values());
    
    // Supplement with standard library entries
    const supplements = [
      {
        id: "ex-sup-1",
        name: "Barbell Squats",
        sets: 4,
        reps: 10,
        caloriesBurn: 110,
        muscleGroup: "Quads, Glutes",
        imageUrl: "🦵",
        description: "The primary compound lower body strength development lift targeting quadriceps, hips, and core.",
        instructions: [
          "Place barbell on upper back, feet shoulder-width apart.",
          "Push hips back and bend knees, dropping down to parallel thigh depth.",
          "Drive heels hard into the floor to ascend back to lock out.",
          "Maintain a straight braced spine throughout."
        ]
      },
      {
        id: "ex-sup-2",
        name: "Conventional Deadlift",
        sets: 3,
        reps: 5,
        caloriesBurn: 140,
        muscleGroup: "Hamstrings, Back",
        imageUrl: "🏋️‍♂️",
        description: "Ultimate compound posterier chain pull to build absolute spinal power and hamstring density.",
        instructions: [
          "Stand with feet mid-foot under barbell.",
          "Hinge, grip bar shoulder-width, and flatten your spine completely.",
          "Drive legs downwards, rising chest and hips simultaneously to lock out.",
          "Lower bar with control maintaining hip hinge."
        ]
      },
      {
        id: "ex-sup-3",
        name: "Standard Push-Ups",
        sets: 3,
        reps: 20,
        caloriesBurn: 40,
        muscleGroup: "Chest, Shoulders",
        imageUrl: "🤸‍♂️",
        description: "Classic bodyweight horizontal push to shape tricep density and core stability.",
        instructions: [
          "Place hands slightly wider than shoulders in plank position.",
          "Lower chest down to 1 inch above floor, elbows at 45 degrees.",
          "Push floor away violently to return to top plank position.",
          "Maintain a straight line from heels to ears."
        ]
      },
      {
        id: "ex-sup-4",
        name: "Outdoor Cycling",
        sets: 1,
        reps: 1,
        durationSeconds: 1800,
        caloriesBurn: 240,
        muscleGroup: "Quads, Cardio",
        imageUrl: "🚴",
        description: "Steady state active leg drive outdoors to build massive cardiac endurance and lung health.",
        instructions: [
          "Secure helmet and adjust seat to hip level.",
          "Maintain rapid fluid cadence above 80 RPM.",
          "Exert even down-stroke power dynamically."
        ]
      }
    ];

    return [...unique, ...supplements];
  }, []);

  // Filtered exercises based on search query and selected muscle group filter
  const filteredCatalog = useMemo(() => {
    return fullExerciseCatalog.filter(ex => {
      const matchSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ex.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase());
      const matchMuscle = selectedMuscle === "All" || ex.muscleGroup.includes(selectedMuscle);
      return matchSearch && matchMuscle;
    });
  }, [fullExerciseCatalog, searchQuery, selectedMuscle]);

  // Unique muscle groups for filtering
  const muscleGroups = useMemo(() => {
    const list = ["All"];
    fullExerciseCatalog.forEach(ex => {
      const parts = ex.muscleGroup.split(", ");
      parts.forEach(p => {
        if (!list.includes(p)) list.push(p);
      });
    });
    return list;
  }, [fullExerciseCatalog]);

  // Greeting based on target country
  const getGreeting = () => {
    const hours = new Date().getHours();
    let timeGreeting = "Good Morning";
    if (hours >= 12 && hours < 17) timeGreeting = "Good Afternoon";
    if (hours >= 17) timeGreeting = "Good Evening";

    if (profile.country === "Pakistan") {
      return `As-salamu alaykum, ${profile.name.split(" ")[0]}! 🇵🇰`;
    } else if (profile.country === "UK") {
      return `Hello, ${profile.name.split(" ")[0]}! 🇬🇧`;
    }
    return `${timeGreeting}, ${profile.name.split(" ")[0]}! 🇺🇸`;
  };

  // Safe percentages
  const calorieBurnPercentage = Math.min((log.caloriesBurned / profile.calorieBurnGoal) * 100, 100);
  const stepsPercentage = Math.min((log.stepsCount / profile.stepGoal) * 100, 100);
  const waterPercentage = Math.min((log.waterLogged / profile.waterGoal) * 100, 100);

  // Quick activity adder
  const simulateActivity = (stepsToAdd: number) => {
    const calculatedCalorieBurn = Math.round(stepsToAdd * 0.04);
    onLogUpdate({
      stepsCount: log.stepsCount + stepsToAdd,
      caloriesBurned: log.caloriesBurned + calculatedCalorieBurn
    });
    
    // Trigger quick toast check
    setToastTitle("Activity Logged!");
    setToastMessage(`Simulated +${stepsToAdd.toLocaleString()} steps and +${calculatedCalorieBurn} kcal!`);
    setShowToast(true);
    triggerAudioBeep();
    setTimeout(() => setShowToast(false), 3000);
  };

  // Quick water addition
  const quickAddWater = (amount: number) => {
    onLogUpdate({
      waterLogged: log.waterLogged + amount
    });
    setToastTitle("Hydration Synced!");
    setToastMessage(`Logged +${amount}ml of mineral water. Keep it up!`);
    setShowToast(true);
    triggerAudioBeep();
    setTimeout(() => setShowToast(false), 3000);
  };

  // Save customized daily goals
  const handleSaveGoals = () => {
    if (onProfileUpdate) {
      onProfileUpdate({
        ...profile,
        stepGoal: editedSteps,
        waterGoal: editedWater,
        calorieBurnGoal: editedBurn,
        calorieIntakeGoal: editedIntake
      });
      setToastTitle("Goals Updated");
      setToastMessage("Your customized fitness targets have been updated successfully.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
    setShowGoalModal(false);
  };

  // Save weight input logging
  const handleLogWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weightInput);
    if (!w || isNaN(w)) return;

    // Save locally
    onLogUpdate({ weightLog: w });
    
    // Sync to profile weight & recalculate BMI
    if (onProfileUpdate) {
      const heightInMeters = profile.height / 100;
      const computedBmi = parseFloat((w / (heightInMeters * heightInMeters)).toFixed(1));
      let status: "Underweight" | "Normal" | "Overweight" | "Obese" = "Normal";
      if (computedBmi < 18.5) status = "Underweight";
      else if (computedBmi >= 18.5 && computedBmi < 25) status = "Normal";
      else if (computedBmi >= 25 && computedBmi < 30) status = "Overweight";
      else status = "Obese";

      onProfileUpdate({
        ...profile,
        weight: w,
        bmi: computedBmi,
        bmiStatus: status
      });
    }

    // Add entry to history chart
    const d = new Date();
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
    const existsIdx = weightHistory.findIndex(h => h.date === dateStr);
    let nextHistory = [...weightHistory];
    if (existsIdx !== -1) {
      nextHistory[existsIdx].weight = w;
    } else {
      nextHistory.push({ date: dateStr, weight: w });
      if (nextHistory.length > 7) nextHistory.shift();
    }
    setWeightHistory(nextHistory);

    setToastTitle("Weight Synchronized");
    setToastMessage(`Current body mass logged at ${w} kg. BMI recalculated dynamically.`);
    setShowToast(true);
    triggerAudioBeep();
    setTimeout(() => setShowToast(false), 3000);
  };

  // Live BMI Calculator Sync
  const handleSyncBmiToProfile = () => {
    setIsSyncingBmi(true);
    const heightInMeters = bmiHeight / 100;
    const computedBmi = parseFloat((bmiWeight / (heightInMeters * heightInMeters)).toFixed(1));
    let status: "Underweight" | "Normal" | "Overweight" | "Obese" = "Normal";
    if (computedBmi < 18.5) status = "Underweight";
    else if (computedBmi >= 18.5 && computedBmi < 25) status = "Normal";
    else if (computedBmi >= 25 && computedBmi < 30) status = "Overweight";
    else status = "Obese";

    // Auto calculate adjusted goals
    let calculatedCalorieIntake = 2200;
    let calculatedWater = 2500;
    if (profile.goal === "Lose Weight") {
      calculatedCalorieIntake = Math.round(bmiWeight * 24 - 500);
    } else if (profile.goal === "Build Muscle") {
      calculatedCalorieIntake = Math.round(bmiWeight * 28 + 300);
    } else {
      calculatedCalorieIntake = Math.round(bmiWeight * 26);
    }
    calculatedWater = Math.round(bmiWeight * 35); // 35ml per kg

    setTimeout(() => {
      if (onProfileUpdate) {
        onProfileUpdate({
          ...profile,
          weight: bmiWeight,
          height: bmiHeight,
          bmi: computedBmi,
          bmiStatus: status,
          calorieIntakeGoal: calculatedCalorieIntake,
          waterGoal: calculatedWater
        });
      }
      setIsSyncingBmi(false);
      setToastTitle("Profile Adjusted!");
      setToastMessage(`BMI Synced to ${computedBmi}. Goals re-calibrated.`);
      setShowToast(true);
      triggerAudioBeep();
      setTimeout(() => setShowToast(false), 3000);
    }, 800);
  };

  // Add customized reminder
  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderTitle.trim()) return;

    const added: CustomizedReminder = {
      id: `rem-${Math.random().toString(36).substring(2, 7)}`,
      title: newReminderTitle,
      time: newReminderTime,
      category: newReminderCat,
      isActive: true
    };

    setReminders([...reminders, added]);
    setNewReminderTitle("");
    setToastTitle("Reminder Configured");
    setToastMessage(`Alarm trigger added for ${newReminderTime}.`);
    setShowToast(true);
    triggerAudioBeep();
    setTimeout(() => setShowToast(false), 3000);
  };

  // Delete/toggle reminders
  const toggleReminder = (id: string) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  const deleteReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  // Force trigger test alarm immediately
  const handleTestAlarmImmediate = (rem: CustomizedReminder) => {
    triggerAudioBeep();
    setToastTitle(`🚨 ALARM SYSTEM TRIGGERED`);
    setToastMessage(`[${rem.time}] REMINDER: ${rem.title}. This simulated secure push notification has been broadcasted.`);
    setShowToast(true);
    
    // Trigger double beep for urgent reminders
    setTimeout(() => triggerAudioBeep(), 400);
  };

  // Custom Workout logging form submission
  const handleCustomWorkoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customWorkoutName.trim()) return;

    const duration = parseInt(customWorkoutDuration) || 20;
    const sets = parseInt(customWorkoutSets) || 3;
    const intensityFactor = customWorkoutIntensity === "High" ? 12 : customWorkoutIntensity === "Medium" ? 8 : 5;
    const computedBurn = Math.round(duration * intensityFactor);

    if (onWorkoutRecorded) {
      onWorkoutRecorded(computedBurn, { title: customWorkoutName.trim(), category: "Custom" as WorkoutPlan["category"], durationMinutes: duration, exercisesCount: sets });
    } else {
      // Update state log
      onLogUpdate({
        caloriesBurned: log.caloriesBurned + computedBurn,
        stepsCount: log.stepsCount + Math.round(duration * 60) // simulated steps from physical exercise
      });
    }

    setWorkoutLogSuccess(`Saved! Logged physical activity "${customWorkoutName}" (+${computedBurn} kcal)`);
    triggerAudioBeep();
    setTimeout(() => {
      setWorkoutLogSuccess("");
      setShowLogWorkoutForm(false);
      setCustomWorkoutName("");
    }, 2500);
  };

  // Trigger exercise direct logging
  const handleQuickLogExercise = (ex: any) => {
    const computedBurn = ex.caloriesBurn;
    onLogUpdate({
      caloriesBurned: log.caloriesBurned + computedBurn,
      stepsCount: log.stepsCount + 500
    });
    setToastTitle("Exercise Logged");
    setToastMessage(`Instantly added ${ex.name} to Daily Calories Burned (+${computedBurn} kcal).`);
    setShowToast(true);
    triggerAudioBeep();
    setTimeout(() => setShowToast(false), 2500);
  };

  // BMI status background & suggestions
  const getBmiInterpretation = (bmiVal: number) => {
    if (bmiVal < 18.5) {
      return {
        color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        desc: "Underweight - Suggest building dense skeletal mass & increasing healthy calorie margins.",
        tip: "Focus on rich compound strength training + extra carbohydrates."
      };
    } else if (bmiVal >= 18.5 && bmiVal < 25) {
      return {
        color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        desc: "Optimal Mass Index - Your cardiovascular parameters are highly balanced.",
        tip: "Maintain consistent hydration, steps pacing, and structured weights."
      };
    } else if (bmiVal >= 25 && bmiVal < 30) {
      return {
        color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        desc: "Overweight - Slight elevated lipids. Adopting a light energetic calorie deficit is useful.",
        tip: "Incorporate HIIT Cardio programs 2-3 times per week to boost active fat burn."
      };
    } else {
      return {
        color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
        desc: "Obese Index - High lipid concentration. Recommended strict lifestyle management.",
        tip: "Boost daily steps to 10k+ and log water rigorously to cleanse system."
      };
    }
  };

  const bmiFeedback = getBmiInterpretation(bmiWeight / Math.pow(bmiHeight / 100, 2));

  return (
    <div className="flex-1 bg-slate-950 flex flex-col h-full text-slate-100 overflow-hidden font-sans relative">
      
      {/* Dynamic Slide-down Push Notification Toast Panel */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -80 }}
            animate={{ opacity: 1, y: 12 }}
            exit={{ opacity: 0, y: -80 }}
            className="absolute top-0 inset-x-5 z-[100] bg-slate-900/95 border border-emerald-500/30 shadow-xl shadow-emerald-950/15 backdrop-blur-md rounded-2xl p-4 flex gap-3 items-start cursor-pointer"
            onClick={() => setShowToast(false)}
          >
            <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
              <Bell className="w-5 h-5 text-emerald-400 animate-bounce" />
            </div>
            <div className="flex-1 flex flex-col">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-display">{toastTitle}</span>
              <p className="text-[10px] text-slate-300 leading-relaxed mt-0.5">{toastMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Global Dashboard Header */}
      <div className="px-5 pt-4 shrink-0">
        <div className="flex justify-between items-center mb-1">
          <div className="flex flex-col">
            <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase font-bold">
              Secure Fitness Core
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white font-display">
              {activeSubTab === "TODAY" && "Today's Hub"}
              {activeSubTab === "ANALYTICS" && "Health Analytics"}
              {activeSubTab === "LIBRARY" && "Exercise Library"}
              {activeSubTab === "ALERTS" && "Reminders & Alerts"}
            </h1>
          </div>
          
          <button
            onClick={() => setShowGoalModal(true)}
            className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[10px] font-bold text-emerald-400 font-mono tracking-wider uppercase px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <Target className="w-3.5 h-3.5" />
            <span>Goals</span>
          </button>
        </div>

        {/* 4-Column Sub Tab Row (Swiss-Style Navigation Menu) */}
        <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800/80 mt-3 select-none">
          {[
            { id: "TODAY", label: "Today", icon: Compass },
            { id: "ANALYTICS", label: "Analytics", icon: TrendingUp },
            { id: "LIBRARY", label: "Exercises", icon: Dumbbell },
            { id: "ALERTS", label: "Alerts", icon: Bell }
          ].map((item) => {
            const Icon = item.icon;
            const isSel = activeSubTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSubTab(item.id as SubTab)}
                className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all gap-1 cursor-pointer ${
                  isSel
                    ? "bg-slate-950 text-emerald-400 border border-slate-800 shadow-sm shadow-emerald-500/5"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Icon className={`w-4 h-4 ${isSel ? "text-emerald-400" : "text-slate-500"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Dynamic View Scroll Container */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-10">
        
        {/* SUBTAB: TODAY */}
        {activeSubTab === "TODAY" && (
          <div className="flex flex-col gap-4">
            
            {/* Country-Based Dynamic Greeting Banner */}
            <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex justify-between items-center backdrop-blur-sm">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white tracking-tight">{getGreeting()}</span>
                <p className="text-[11px] text-slate-400 leading-tight">Crush your {profile.goal.toLowerCase()} plan today!</p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-mono font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {profile.bmiStatus} BMI
                </span>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5">Index: {profile.bmi}</span>
              </div>
            </div>

            {/* Premium Tri-Circle Activity Ring SVG */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="flex-1 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono">My Rings Status</h4>
                
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0" />
                    <div className="flex-1 flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">Calorie Burn</span>
                      <span className="text-white font-mono">{log.caloriesBurned} / {profile.calorieBurnGoal} kcal</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full shrink-0" />
                    <div className="flex-1 flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">Steps Pacing</span>
                      <span className="text-white font-mono">{log.stepsCount.toLocaleString()} / {profile.stepGoal.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-sky-400 rounded-full shrink-0" />
                    <div className="flex-1 flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">Hydration Log</span>
                      <span className="text-white font-mono">{log.waterLogged} / {profile.waterGoal} ml</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Triple Radial Overlap SVG */}
              <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  {/* Outer: Calorie Burn (Emerald) */}
                  <circle className="text-slate-850" strokeWidth={6} stroke="currentColor" fill="transparent" r={42} cx="56" cy="56" />
                  <circle
                    className="text-emerald-500 transition-all duration-500"
                    strokeWidth={6}
                    strokeDasharray={(42 * 2 * Math.PI).toString()}
                    strokeDashoffset={(42 * 2 * Math.PI - (calorieBurnPercentage / 100) * (42 * 2 * Math.PI)).toString()}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={42}
                    cx="56"
                    cy="56"
                  />

                  {/* Middle: Steps (Cyan) */}
                  <circle className="text-slate-850" strokeWidth={6} stroke="currentColor" fill="transparent" r={32} cx="56" cy="56" />
                  <circle
                    className="text-cyan-400 transition-all duration-500"
                    strokeWidth={6}
                    strokeDasharray={(32 * 2 * Math.PI).toString()}
                    strokeDashoffset={(32 * 2 * Math.PI - (stepsPercentage / 100) * (32 * 2 * Math.PI)).toString()}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={32}
                    cx="56"
                    cy="56"
                  />

                  {/* Inner: Hydration (Sky) */}
                  <circle className="text-slate-850" strokeWidth={6} stroke="currentColor" fill="transparent" r={22} cx="56" cy="56" />
                  <circle
                    className="text-sky-400 transition-all duration-500"
                    strokeWidth={6}
                    strokeDasharray={(22 * 2 * Math.PI).toString()}
                    strokeDashoffset={(22 * 2 * Math.PI - (waterPercentage / 100) * (22 * 2 * Math.PI)).toString()}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={22}
                    cx="56"
                    cy="56"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <Award className="w-4.5 h-4.5 text-yellow-400 animate-bounce" />
                </div>
              </div>
            </div>

            {/* Interactive Step Counter Simulator */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Footprints className="w-5 h-5 text-cyan-400" />
                  <span className="text-xs font-bold text-slate-300 font-display">Step Counter Core</span>
                </div>
                <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">SIMULATION ACCEL</span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-white font-display">
                  {log.stepsCount.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">/ {profile.stepGoal.toLocaleString()} steps</span>
              </div>

              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${stepsPercentage}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => simulateActivity(1500)}
                  className="bg-slate-950 hover:bg-slate-850 text-cyan-400 font-bold py-2 rounded-xl text-[10px] border border-cyan-500/10 hover:border-cyan-500/20 transition-all cursor-pointer"
                >
                  🚶‍♂️ Log Walk (+1,500)
                </button>
                <button
                  onClick={() => simulateActivity(3500)}
                  className="bg-slate-950 hover:bg-slate-850 text-cyan-400 font-bold py-2 rounded-xl text-[10px] border border-cyan-500/10 hover:border-cyan-500/20 transition-all cursor-pointer"
                >
                  🏃‍♂️ Log Jog (+3,500)
                </button>
              </div>
            </div>

            {/* Hydration & Net Calories Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Hydration Tracker */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-40">
                <div className="flex justify-between items-center">
                  <Droplets className="w-5 h-5 text-sky-400 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold text-slate-400">WATER INTAKE</span>
                </div>
                <div className="flex flex-col my-1">
                  <span className="text-2xl font-black text-white font-display">{log.waterLogged} ml</span>
                  <span className="text-[10px] text-slate-400">Target: {profile.waterGoal} ml</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => quickAddWater(250)}
                    className="flex-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 font-bold py-2 rounded-xl text-[9px] transition-all cursor-pointer"
                  >
                    +250ml
                  </button>
                  <button
                    onClick={() => quickAddWater(500)}
                    className="flex-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 font-bold py-2 rounded-xl text-[9px] transition-all cursor-pointer"
                  >
                    +500ml
                  </button>
                </div>
              </div>

              {/* Net Calories Balance Tracker */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-40">
                <div className="flex justify-between items-center">
                  <Flame className="w-5 h-5 text-emerald-400" />
                  <span className="text-[10px] font-mono font-bold text-slate-400">ENERGY BALANCE</span>
                </div>
                <div className="flex flex-col my-1">
                  <span className="text-2xl font-black text-white font-display">
                    {Math.max(log.caloriesConsumed - log.caloriesBurned, 0)} kcal
                  </span>
                  <div className="flex justify-between text-[8px] text-slate-400 font-mono mt-0.5 uppercase">
                    <span>In: {log.caloriesConsumed}</span>
                    <span>Out: {log.caloriesBurned}</span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateToTab(2)}
                  className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-bold py-2 rounded-xl text-[10px] transition-all cursor-pointer"
                >
                  🍎 Log Meals & Macros
                </button>
              </div>
            </div>

            {/* AI coach goals for today */}
            {onOpenCoach && <CoachGoalsCard onOpen={onOpenCoach} />}

            {/* Suggested Workout Program Quick Launcher */}
            <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/15 shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div className="flex-1 flex flex-col">
                <span className="text-xs font-bold text-white">Suggested Training Today:</span>
                <span className="text-[10px] text-slate-400 leading-relaxed">Execute the HIIT program to burn ~280 kcal.</span>
              </div>
              <button
                onClick={() => onNavigateToTab(1)}
                className="bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-black px-4.5 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-emerald-500/10 shrink-0"
              >
                Launch
              </button>
            </div>

          </div>
        )}

        {/* SUBTAB: ANALYTICS (Charts, weight log, and interactive BMI tool) */}
        {activeSubTab === "ANALYTICS" && (
          <div className="flex flex-col gap-5">
            
            {/* 1. Weight Tracker Log Card */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-bold text-white font-display">Daily Weight Logger</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-800">WEIGHT PROGRESSION</span>
              </div>

              <form onSubmit={handleLogWeightSubmit} className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder="e.g. 74.0"
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-xs text-white outline-none"
                  required
                />
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Log Weight
                </button>
              </form>
            </div>

            {/* 2. Interactive BMI Calculator */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold text-white font-display">Interactive BMI Calculator</span>
              </div>

              {/* Slider for Weight */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-bold text-slate-400 font-mono">
                  <span>Weight:</span>
                  <span className="text-white">{bmiWeight} kg ({Math.round(bmiWeight * 2.20462)} lbs)</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="140"
                  value={bmiWeight}
                  onChange={(e) => setBmiWeight(parseInt(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              {/* Slider for Height */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-bold text-slate-400 font-mono">
                  <span>Height:</span>
                  <span className="text-white">{bmiHeight} cm ({Math.floor(bmiHeight / 30.48)}&apos;{Math.round((bmiHeight % 30.48) / 2.54)}&quot;)</span>
                </div>
                <input
                  type="range"
                  min="130"
                  max="220"
                  value={bmiHeight}
                  onChange={(e) => setBmiHeight(parseInt(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              {/* Live Output Display */}
              <div className={`p-3.5 border rounded-xl flex flex-col gap-1.5 transition-all ${bmiFeedback.color}`}>
                <div className="flex justify-between items-center font-mono">
                  <span className="text-[10px] font-bold uppercase tracking-wider">LIVE BMI INDEX</span>
                  <span className="text-sm font-black uppercase">{(bmiWeight / Math.pow(bmiHeight / 100, 2)).toFixed(1)}</span>
                </div>
                <span className="text-xs font-bold leading-tight">{bmiFeedback.desc}</span>
                <span className="text-[9px] text-slate-400 italic block mt-0.5">💡 {bmiFeedback.tip}</span>
              </div>

              <button
                type="button"
                onClick={handleSyncBmiToProfile}
                disabled={isSyncingBmi}
                className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-200 text-xs py-3 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSyncingBmi ? "Syncing..." : <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />}
                <span>Sync parameters & target goals to my Profile</span>
              </button>
            </div>

            {/* 3. Recharts Visualizations */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white font-display">Weekly Fitness Progress</span>
                <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">7-DAY ROTATING</span>
              </div>

              <div className="h-56 w-full pr-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={MOCK_HISTORY_7DAYS}>
                    <defs>
                      <linearGradient id="colorSteps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorBurn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={9} />
                    <YAxis stroke="#64748b" fontSize={9} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }}
                      labelStyle={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    <Area type="monotone" dataKey="steps" stroke="#22d3ee" name="Steps count" fillOpacity={1} fill="url(#colorSteps)" strokeWidth={2} />
                    <Area type="monotone" dataKey="caloriesBurned" stroke="#10b981" name="Kcal Burn" fillOpacity={1} fill="url(#colorBurn)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Analytics (30-day Trend Analysis) */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white font-display">Monthly Trend Analysis</span>
                <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">30-DAY ACTIVE COMPILATION</span>
              </div>

              <div className="h-56 w-full pr-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={8} tickFormatter={(val) => val.split(" ")[1]} />
                    <YAxis stroke="#64748b" fontSize={9} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }}
                      labelStyle={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    <Bar dataKey="water" fill="#38bdf8" name="Hydration (ml)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="caloriesConsumed" fill="#f43f5e" name="Kcal In" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weight Progression Trend Area Chart */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3">
              <span className="text-xs font-bold text-white font-display">Monthly Weight Drift (kg)</span>
              <div className="h-44 w-full pr-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={8} />
                    <YAxis stroke="#64748b" fontSize={9} domain={["dataMin - 1", "dataMax + 1"]} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }} />
                    <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2.5} dot={false} name="Body Weight (kg)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}

        {/* SUBTAB: LIBRARY (Search exercises, muscle filters, custom log) */}
        {activeSubTab === "LIBRARY" && (
          <div className="flex flex-col gap-4">
            
            {/* Custom Log Workout Toggle card */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white font-display">Add Manual Training Log</span>
                <button
                  onClick={() => setShowLogWorkoutForm(!showLogWorkoutForm)}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-mono uppercase text-[9px] tracking-wider font-bold px-3 py-1.5 border border-emerald-500/20 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showLogWorkoutForm ? "Hide Form" : "Expand Form"}</span>
                </button>
              </div>

              {showLogWorkoutForm && (
                <form onSubmit={handleCustomWorkoutSubmit} className="flex flex-col gap-3.5 border-t border-slate-850 pt-3">
                  {workoutLogSuccess && (
                    <div className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/15 p-2.5 rounded-xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{workoutLogSuccess}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Workout / Exercise Name</span>
                    <input
                      type="text"
                      value={customWorkoutName}
                      onChange={(e) => setCustomWorkoutName(e.target.value)}
                      placeholder="e.g. Boxing, Swimming, Deadlift"
                      className="bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Minutes</span>
                      <input
                        type="number"
                        value={customWorkoutDuration}
                        onChange={(e) => setCustomWorkoutDuration(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Sets</span>
                      <input
                        type="number"
                        value={customWorkoutSets}
                        onChange={(e) => setCustomWorkoutSets(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Reps</span>
                      <input
                        type="number"
                        value={customWorkoutReps}
                        onChange={(e) => setCustomWorkoutReps(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Intensity Factor</span>
                    <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850">
                      {(["Low", "Medium", "High"] as const).map((intensity) => (
                        <button
                          key={intensity}
                          type="button"
                          onClick={() => setCustomWorkoutIntensity(intensity)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                            customWorkoutIntensity === intensity
                              ? "bg-slate-900 text-emerald-400 border border-slate-800"
                              : "text-slate-500 hover:text-slate-400"
                          }`}
                        >
                          {intensity}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-black py-2.5 rounded-xl text-xs transition-all shadow-md cursor-pointer"
                  >
                    Save & Log Workout Kcal
                  </button>
                </form>
              )}
            </div>

            {/* Core Search & Filters */}
            <div className="flex flex-col gap-2 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shrink-0">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search 20+ compound exercises..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800/80 focus:border-emerald-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition-colors"
                />
              </div>

              {/* Muscle Pills row */}
              <div className="flex gap-1.5 overflow-x-auto select-none py-1 scrollbar-none">
                {muscleGroups.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMuscle(m)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border ${
                      selectedMuscle === m
                        ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Exercise List Catalog results */}
            <div className="flex flex-col gap-2.5 pb-6">
              <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider pl-1">
                EXERCISE CATALOG ({filteredCatalog.length})
              </span>
              
              {filteredCatalog.map((ex) => (
                <div
                  key={ex.id}
                  className="bg-slate-900/60 hover:bg-slate-900 border border-slate-850 hover:border-emerald-500/20 p-3.5 rounded-xl flex gap-3 cursor-pointer transition-all group"
                  onClick={() => {
                    setSelectedExercise(ex);
                    setShowExDetailModal(true);
                  }}
                >
                  <div className="w-11 h-11 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    {ex.imageUrl}
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {ex.name}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        Muscle: {ex.muscleGroup.split(", ")[0]}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500 font-bold">
                        Est: {ex.caloriesBurn} kcal
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* SUBTAB: ALERTS (Reminder system, test triggers, active alarm alerts) */}
        {activeSubTab === "ALERTS" && (
          <div className="flex flex-col gap-4">
            
            {/* 1. Alarm test center banner */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 shrink-0">
                <Volume2 className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
              <div className="flex-1 flex flex-col">
                <span className="text-xs font-bold text-white">Interactive Alarm Simulator</span>
                <span className="text-[10px] text-slate-400 leading-relaxed">Toggle active notifications and tap the bell icon to simulate instant push notifications with high-chime audio logs.</span>
              </div>
            </div>

            {/* 2. Configure New Reminder form */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3">
              <span className="text-xs font-bold text-white font-display">Configure New Reminder Alert</span>
              
              <form onSubmit={handleAddReminder} className="flex flex-col gap-3 pt-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Alert Label / Title</span>
                  <input
                    type="text"
                    value={newReminderTitle}
                    onChange={(e) => setNewReminderTitle(e.target.value)}
                    placeholder="e.g. Afternoon stretch, Drink water"
                    className="bg-slate-950 border border-slate-850 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Time (24h)</span>
                    <input
                      type="time"
                      value={newReminderTime}
                      onChange={(e) => setNewReminderTime(e.target.value)}
                      className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Category</span>
                    <select
                      value={newReminderCat}
                      onChange={(e) => setNewReminderCat(e.target.value as any)}
                      className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="hydration">Hydration</option>
                      <option value="activity">Steps/Walk</option>
                      <option value="workout">Active Training</option>
                      <option value="general">Daily Log Check</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-black py-2.5 rounded-xl text-xs transition-all shadow-md cursor-pointer mt-1"
                >
                  Create Secure Reminder
                </button>
              </form>
            </div>

            {/* 3. List of active configured reminders */}
            <div className="flex flex-col gap-2 pb-6">
              <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider pl-1">
                CONFIGURED REMINDERS ({reminders.length})
              </span>

              {reminders.map((rem) => (
                <div
                  key={rem.id}
                  className="bg-slate-900 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleTestAlarmImmediate(rem)}
                      className="w-9 h-9 bg-slate-950 border border-slate-800 hover:border-emerald-500/30 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-400 transition-colors"
                      title="Test simulated alarm now"
                    >
                      <Bell className="w-4 h-4 text-emerald-400" />
                    </button>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white leading-tight">{rem.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 font-bold uppercase">
                        ⏲️ {rem.time} • {rem.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Toggle switch */}
                    <button
                      onClick={() => toggleReminder(rem.id)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                        rem.isActive ? "bg-emerald-500" : "bg-slate-800"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-slate-950 rounded-full transition-transform ${
                          rem.isActive ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => deleteReminder(rem.id)}
                      className="text-[9px] text-rose-400 hover:underline font-mono font-bold uppercase tracking-wider px-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>

      {/* MODAL OVERLAY: Edit Daily Goals */}
      <AnimatePresence>
        {showGoalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col justify-center p-6 overflow-y-auto"
          >
            <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-5 max-w-sm w-full mx-auto flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                <span className="text-sm font-black text-white uppercase tracking-wider font-display">Edit Daily Fitness Targets</span>
                <button
                  onClick={() => setShowGoalModal(false)}
                  className="text-[10px] text-slate-400 font-mono font-black uppercase tracking-wider"
                >
                  Cancel
                </button>
              </div>

              {/* Goal inputs */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-mono font-bold">Steps Goal (steps/day)</span>
                  <input
                    type="number"
                    value={editedSteps}
                    onChange={(e) => setEditedSteps(parseInt(e.target.value) || 0)}
                    className="bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-mono font-bold">Hydration Goal (ml/day)</span>
                  <input
                    type="number"
                    value={editedWater}
                    onChange={(e) => setEditedWater(parseInt(e.target.value) || 0)}
                    className="bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-mono font-bold">Burn Goal (kcal/day)</span>
                  <input
                    type="number"
                    value={editedBurn}
                    onChange={(e) => setEditedBurn(parseInt(e.target.value) || 0)}
                    className="bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-mono font-bold">Intake Goal (kcal/day)</span>
                  <input
                    type="number"
                    value={editedIntake}
                    onChange={(e) => setEditedIntake(parseInt(e.target.value) || 0)}
                    className="bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveGoals}
                className="w-full bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-black py-3 rounded-xl text-xs transition-all shadow-md mt-2 cursor-pointer"
              >
                Sync Customized Goals
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL OVERLAY: Exercise library step detail and guides */}
      <AnimatePresence>
        {showExDetailModal && selectedExercise && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col justify-center p-6 overflow-y-auto"
          >
            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-5 max-w-sm w-full mx-auto flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{selectedExercise.imageUrl}</span>
                  <span className="text-xs font-bold text-white font-display">{selectedExercise.name}</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedExercise(null);
                    setShowExDetailModal(false);
                  }}
                  className="text-[10px] text-slate-400 font-mono font-black uppercase tracking-wider"
                >
                  Close
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2 items-center text-[10px] text-emerald-400 font-mono font-bold">
                  <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 uppercase">Target: {selectedExercise.muscleGroup}</span>
                  <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 uppercase">~{selectedExercise.caloriesBurn} Kcal</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                  {selectedExercise.description}
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-850 rounded-2xl p-3 flex flex-col gap-1">
                <span className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wider">Step-by-step Execution:</span>
                <ol className="list-decimal pl-4 flex flex-col gap-1 text-[10px] text-slate-300 leading-normal">
                  {selectedExercise.instructions.map((step: string, idx: number) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    handleQuickLogExercise(selectedExercise);
                    setShowExDetailModal(false);
                    setSelectedExercise(null);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-black py-2.5 rounded-xl text-[10px] transition-all cursor-pointer shadow-md text-center"
                >
                  Log Reps & Burn Kcal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExDetailModal(false);
                    setSelectedExercise(null);
                    onNavigateToTab(1); // Redirects to full workout plans
                  }}
                  className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold py-2.5 rounded-xl text-[10px] transition-all cursor-pointer text-center"
                >
                  View Full Programs
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
