import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Dumbbell, Clock, Flame, ChevronRight, Trophy, Sparkles, Check, PlayCircle, PauseCircle, SkipForward } from "lucide-react";
import { WORKOUT_PLANS } from "../data";
import { WorkoutPlan, Exercise } from "../types";

interface WorkoutTabProps {
  onWorkoutComplete: (caloriesBurned: number) => void;
}

export default function WorkoutTab({ onWorkoutComplete }: WorkoutTabProps) {
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [workoutFinished, setWorkoutFinished] = useState(false);
  const [showPlanDetailModal, setShowPlanDetailModal] = useState(false);

  // Filter category states
  const [activeCategory, setActiveCategory] = useState<"All" | "HIIT" | "Strength" | "Cardio" | "Yoga">("All");

  const filteredPlans = activeCategory === "All"
    ? WORKOUT_PLANS
    : WORKOUT_PLANS.filter(p => p.category === activeCategory);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, seconds]);

  const handleStartWorkout = (plan: WorkoutPlan) => {
    setActivePlan(plan);
    setCurrentExerciseIndex(0);
    setSeconds(0);
    setIsActive(true);
    setWorkoutFinished(false);
    setShowPlanDetailModal(false);
  };

  const handleNextExercise = () => {
    if (!activePlan) return;
    if (currentExerciseIndex < activePlan.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      // Completed the final exercise!
      setIsActive(false);
      setWorkoutFinished(true);
    }
  };

  const handleFinishAndLog = () => {
    if (activePlan) {
      onWorkoutComplete(activePlan.caloriesBurn);
    }
    setActivePlan(null);
    setSelectedPlan(null);
    setWorkoutFinished(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 text-slate-100 bg-slate-950 h-full relative">
      
      {/* If a workout is actively in progress, override UI with the active exercise screen */}
      {activePlan && (
        <div className="absolute inset-0 bg-slate-950 z-50 flex flex-col justify-between p-6">
          
          {/* Top Info Bar */}
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-emerald-400 font-mono tracking-widest uppercase">
                ACTIVE PLAN: {activePlan.title}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Exercise {currentExerciseIndex + 1} of {activePlan.exercises.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full font-mono text-xs text-emerald-400">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{formatTime(seconds)}</span>
            </div>
          </div>

          {/* Main Active Exercise display card */}
          {!workoutFinished ? (
            <div className="flex-1 flex flex-col justify-center items-center gap-6 py-6 text-center">
              
              {/* Giant Exercise Animated Icon */}
              <motion.div
                key={currentExerciseIndex}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.05, 1], opacity: 1 }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="w-32 h-32 rounded-full bg-emerald-500/10 flex items-center justify-center border-2 border-emerald-500/30 text-5xl shadow-[0_0_30px_rgba(16,185,129,0.15)]"
              >
                {activePlan.exercises[currentExerciseIndex].imageUrl}
              </motion.div>

              <div className="flex flex-col gap-2 max-w-sm">
                <h3 className="text-2xl font-bold tracking-tight text-white font-display">
                  {activePlan.exercises[currentExerciseIndex].name}
                </h3>
                <div className="flex items-center justify-center gap-3 text-xs text-slate-400 font-semibold font-mono">
                  <span className="bg-slate-900 px-2.5 py-1 rounded-md">
                    {activePlan.exercises[currentExerciseIndex].sets} SETS
                  </span>
                  <span>•</span>
                  <span className="bg-slate-900 px-2.5 py-1 rounded-md">
                    {activePlan.exercises[currentExerciseIndex].reps} REPS
                  </span>
                  <span>•</span>
                  <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md">
                    ~{activePlan.exercises[currentExerciseIndex].caloriesBurn} KCAL
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-2 px-4">
                  {activePlan.exercises[currentExerciseIndex].description}
                </p>
              </div>

              {/* Instructions steps */}
              <div className="w-full bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl text-left max-h-40 overflow-y-auto">
                <h4 className="text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase mb-1">How to perform:</h4>
                <ol className="list-decimal pl-4 flex flex-col gap-1 text-[10px] text-slate-300">
                  {activePlan.exercises[currentExerciseIndex].instructions.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>

              {/* Active session control triggers */}
              <div className="flex items-center gap-4 w-full justify-center">
                <button
                  onClick={() => setIsActive(!isActive)}
                  className="p-3.5 rounded-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white transition-all cursor-pointer"
                  title={isActive ? "Pause Timer" : "Resume Timer"}
                >
                  {isActive ? (
                    <PauseCircle className="w-8 h-8 text-amber-400" />
                  ) : (
                    <PlayCircle className="w-8 h-8 text-emerald-400" />
                  )}
                </button>

                <button
                  onClick={handleNextExercise}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-bold py-4 rounded-xl text-xs transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                >
                  <span>{currentExerciseIndex === activePlan.exercises.length - 1 ? "Complete Workout" : "Next Exercise"}</span>
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

            </div>
          ) : (
            // Celebration summary modal when completed!
            <div className="flex-1 flex flex-col justify-center items-center gap-6 py-6 text-center">
              <div className="w-20 h-20 bg-gradient-to-tr from-yellow-500 to-amber-500 rounded-3xl flex items-center justify-center text-slate-950 text-4xl shadow-lg animate-float">
                🏆
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-2xl font-bold tracking-tight text-white font-display">Splendid Work!</h3>
                <p className="text-xs text-slate-400">You successfully finished the program.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full max-w-xs bg-slate-900 border border-slate-850 p-4 rounded-2xl">
                <div className="flex flex-col items-center">
                  <Flame className="w-5 h-5 text-emerald-400" />
                  <span className="text-xl font-black text-white mt-1">+{activePlan.caloriesBurn} kcal</span>
                  <span className="text-[9px] font-mono text-slate-400">BURNED</span>
                </div>
                <div className="flex flex-col items-center">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <span className="text-xl font-black text-white mt-1">{formatTime(seconds)}</span>
                  <span className="text-[9px] font-mono text-slate-400">DURATION</span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-4 py-2 border border-emerald-500/20 rounded-xl">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Rings and stats synchronized!</span>
              </div>

              <button
                onClick={handleFinishAndLog}
                className="w-full max-w-xs bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-bold py-3.5 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/15"
              >
                Log to Dashboard & Finish
              </button>
            </div>
          )}

          {/* Quick exit safety */}
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to stop this active workout? All logged progress will be cleared.")) {
                setActivePlan(null);
              }
            }}
            className="text-[10px] text-rose-400 hover:underline text-center font-semibold tracking-wider font-mono uppercase"
          >
            Quit Active Program
          </button>
        </div>
      )}

      {/* Primary Workout Hub Headers */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <h2 className="text-xl font-extrabold tracking-tight text-white font-display">Workout Programs</h2>
          <p className="text-xs text-slate-400">Premium schedules designed for optimal metabolism.</p>
        </div>
        <Dumbbell className="w-6 h-6 text-emerald-400 animate-pulse" />
      </div>

      {/* Horizontal Category Pill Filter */}
      <div className="flex gap-2 pb-1 overflow-x-auto select-none shrink-0 scrollbar-none">
        {(["All", "HIIT", "Strength", "Cardio", "Yoga"] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
              activeCategory === cat
                ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid List of Premium Workout Programs */}
      <div className="flex-1 flex flex-col gap-3 pb-6">
        {filteredPlans.map((plan) => (
          <div
            key={plan.id}
            onClick={() => {
              setSelectedPlan(plan);
              setShowPlanDetailModal(true);
            }}
            className="bg-slate-900 border border-slate-800/80 hover:border-emerald-500/30 hover:bg-slate-900/80 rounded-2xl p-4 flex gap-4 cursor-pointer transition-all group"
          >
            {/* Plan emoji avatar */}
            <div className="w-14 h-14 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
              {plan.imageUrl}
            </div>

            <div className="flex-1 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-white font-display group-hover:text-emerald-400 transition-colors">
                  {plan.title}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </div>

              <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono font-bold mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {plan.durationMinutes} mins
                </span>
                <span className="flex items-center gap-1">
                  <Flame className="w-3 h-3 text-slate-500" />
                  {plan.caloriesBurn} kcal
                </span>
                <span className="bg-slate-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/10">
                  {plan.level}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Immersive Exercise List & Plan Detail Modal overlay */}
      <AnimatePresence>
        {showPlanDetailModal && selectedPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-40 flex flex-col p-6 overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-900 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedPlan.imageUrl}</span>
                <span className="text-base font-bold text-white font-display">{selectedPlan.title}</span>
              </div>
              <button
                onClick={() => {
                  setSelectedPlan(null);
                  setShowPlanDetailModal(false);
                }}
                className="text-xs font-bold font-mono text-slate-400 hover:text-white uppercase bg-slate-900 px-2.5 py-1 rounded-md"
              >
                Close
              </button>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2 mt-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedPlan.description}
              </p>
              <div className="flex gap-4 bg-slate-900 p-3 rounded-xl border border-slate-850 mt-1">
                <div className="flex-1 flex flex-col items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">Category</span>
                  <span className="text-xs font-bold text-emerald-400 mt-1">{selectedPlan.category}</span>
                </div>
                <div className="flex-1 flex flex-col items-center border-x border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">Duration</span>
                  <span className="text-xs font-bold text-white mt-1">{selectedPlan.durationMinutes} mins</span>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">Level</span>
                  <span className="text-xs font-bold text-amber-400 mt-1">{selectedPlan.level}</span>
                </div>
              </div>
            </div>

            {/* Exercises List inside the selected plan */}
            <div className="flex flex-col gap-2.5 mt-5 flex-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Exercises Block ({selectedPlan.exercises.length})</h3>
              <div className="flex flex-col gap-2">
                {selectedPlan.exercises.map((ex, idx) => (
                  <div key={ex.id} className="bg-slate-900/50 border border-slate-850 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg bg-slate-950 w-8 h-8 rounded-lg flex items-center justify-center">{ex.imageUrl}</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">{ex.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">Muscle: {ex.muscleGroup}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded">
                      {ex.sets}x{ex.reps}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action launcher */}
            <button
              onClick={() => handleStartWorkout(selectedPlan)}
              className="w-full bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-black py-4 rounded-xl text-xs flex items-center justify-center gap-2 mt-6 cursor-pointer shadow-lg shadow-emerald-500/15 shrink-0"
            >
              <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
              <span>LAUNCH ACTIVE WORKOUT STOPWATCH</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
