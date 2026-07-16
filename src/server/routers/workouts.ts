import { Router, Request, Response } from "express";
import { db, WorkoutLog } from "../db.ts";
import { authenticateJwt } from "./auth.ts";

const router = Router();

// Predefined Curated Workout Plans
const PRESET_WORKOUT_PLANS = [
  {
    id: "plan-hiit-burn",
    title: "Vigorous HIIT Calorie Torch",
    category: "HIIT",
    durationMinutes: 20,
    level: "Intermediate",
    caloriesBurn: 240,
    exercisesCount: 5,
    imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&q=80",
    description: "High-intensity bursts paired with brief active recoveries designed to optimize oxygen debt and cardiovascular threshold.",
    exercises: [
      { name: "Jumping Jacks", sets: 3, reps: "45s", caloriesBurn: 30, targetMuscle: "Cardio & Full Body" },
      { name: "Mountain Climbers", sets: 3, reps: "40s", caloriesBurn: 40, targetMuscle: "Core & Shoulders" },
      { name: "High Knees Sprint", sets: 3, reps: "30s", caloriesBurn: 45, targetMuscle: "Legs & Cardio" },
      { name: "Bodyweight Squat jumps", sets: 3, reps: "15 reps", caloriesBurn: 50, targetMuscle: "Quads & Glutes" },
      { name: "Burpees", sets: 3, reps: "10 reps", caloriesBurn: 75, targetMuscle: "Full Body Stamina" }
    ]
  },
  {
    id: "plan-strength-build",
    title: "Full-Body Strength Foundation",
    category: "Strength",
    durationMinutes: 30,
    level: "Beginner",
    caloriesBurn: 180,
    exercisesCount: 4,
    imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&q=80",
    description: "Perfect introduction to progressive resistance loading using bodyweight or light dumbells to build structural bone density.",
    exercises: [
      { name: "Dumbbell Goblet Squats", sets: 3, reps: "12 reps", caloriesBurn: 40, targetMuscle: "Lower Body" },
      { name: "Standard Push-Ups", sets: 3, reps: "10 reps", caloriesBurn: 35, targetMuscle: "Pectorals & Triceps" },
      { name: "Dumbbell Bent-Over Rows", sets: 3, reps: "12 reps", caloriesBurn: 45, targetMuscle: "Lats & Rhomboids" },
      { name: "Elbow Plank Hold", sets: 3, reps: "45s", caloriesBurn: 60, targetMuscle: "Core & Pelvic Floor" }
    ]
  },
  {
    id: "plan-cardio-stamina",
    title: "Aerobic Capacity Builder",
    category: "Cardio",
    durationMinutes: 45,
    level: "Intermediate",
    caloriesBurn: 350,
    exercisesCount: 4,
    imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&q=80",
    description: "Steady-state aerobic workout targeted at enhancing mitochondrial counts and standard cardiovascular volume.",
    exercises: [
      { name: "Rhythmic Shadow Boxing", sets: 4, reps: "3 mins", caloriesBurn: 90, targetMuscle: "Shoulders & Core" },
      { name: "Speed Skater Hops", sets: 3, reps: "45s", caloriesBurn: 80, targetMuscle: "Quads & Hips" },
      { name: "Jump Rope Simulation", sets: 4, reps: "2 mins", caloriesBurn: 100, targetMuscle: "Calves & Aerobic" },
      { name: "Lateral Shuffles", sets: 3, reps: "1 min", caloriesBurn: 80, targetMuscle: "Gluteus Medius" }
    ]
  },
  {
    id: "plan-yoga-flex",
    title: "Deep Muscle Restoration Yoga",
    category: "Yoga",
    durationMinutes: 25,
    level: "Beginner",
    caloriesBurn: 90,
    exercisesCount: 5,
    imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&q=80",
    description: "Flowing spinal decompressions, hip flexor restorations, and breath alignments to aid muscular recovery.",
    exercises: [
      { name: "Cat-Cow Flexion Flow", sets: 1, reps: "2 mins", caloriesBurn: 15, targetMuscle: "Spinal Health" },
      { name: "Downward Facing Dog", sets: 2, reps: "45s hold", caloriesBurn: 20, targetMuscle: "Hamstrings & Shoulders" },
      { name: "Cobra Extension Stretch", sets: 2, reps: "30s hold", caloriesBurn: 15, targetMuscle: "Abdominals & Back" },
      { name: "Warrior II Power Pose", sets: 2, reps: "30s per side", caloriesBurn: 25, targetMuscle: "Hip Flexors" },
      { name: "Child's Pose Decompression", sets: 1, reps: "3 mins", caloriesBurn: 15, targetMuscle: "Parasympathetic Recovery" }
    ]
  }
];

// GET: Historical logged workouts for the authenticated user
router.get("/history", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const logs = db.findWorkoutLogs(l => l.userId === payload.id);
  
  // Sort with newest workouts first
  const sortedLogs = [...logs].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  res.json({ workouts: sortedLogs });
});

// GET: Preset curated plans
router.get("/plans", authenticateJwt, (req: Request, res: Response) => {
  res.json({ plans: PRESET_WORKOUT_PLANS });
});

// POST: Log a completed workout
router.post("/log", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const { title, category, durationMinutes, caloriesBurn, exercisesCount, notes } = req.body;

  if (!title || !category || !durationMinutes || !caloriesBurn) {
    return res.status(400).json({ error: "Missing required workout metrics (title, category, duration, calories)." });
  }

  const todayStr = new Date().toISOString().split("T")[0];

  // 1. Insert workout log
  const newWorkout: Omit<WorkoutLog, "id"> = {
    userId: payload.id,
    title,
    category: category || "Custom",
    durationMinutes: parseInt(durationMinutes),
    caloriesBurn: parseInt(caloriesBurn),
    exercisesCount: exercisesCount ? parseInt(exercisesCount) : 1,
    notes: notes || "",
    completedAt: new Date().toISOString(),
    date: todayStr
  };

  const savedWorkout = db.insert("workout_logs", newWorkout) as WorkoutLog;

  // 2. Fetch or create Daily Log for today to update totals
  const dailyLog = db.getOrCreateDailyLog(payload.id, todayStr);
  
  // Simulate extra steps gained from active minutes (e.g. 100 steps per active minute)
  const simulatedSteps = parseInt(durationMinutes) * 100;
  
  const updatedDailyLog = db.update("daily_logs", dailyLog.id, {
    caloriesBurned: dailyLog.caloriesBurned + parseInt(caloriesBurn),
    stepsCount: dailyLog.stepsCount + simulatedSteps
  });

  // 3. Optional: Push a success notification if the user hits 500+ active calories
  if (updatedDailyLog && updatedDailyLog.caloriesBurned >= 500) {
    db.insert("notifications", {
      userId: payload.id,
      title: "🔥 Burn Target Unlocked!",
      message: `Outstanding! You have reached ${updatedDailyLog.caloriesBurned} kcal burned today. Keep driving!`,
      type: "success",
      read: false,
      createdAt: new Date().toISOString()
    });
  }

  res.status(201).json({
    message: "Workout logged successfully and daily dashboard stats synchronized.",
    workout: savedWorkout,
    dailyLog: updatedDailyLog
  });
});

export default router;
