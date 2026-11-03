export type Region = "USA" | "UK" | "Pakistan";

export interface UserProfile {
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  country: Region;
  weight: number; // in kg
  height: number; // in cm
  goal: "Lose Weight" | "Build Muscle" | "Improve Cardio" | "Stay Active";
  bmi: number;
  bmiStatus: "Underweight" | "Normal" | "Overweight" | "Obese";
  units: "metric" | "imperial";
  waterGoal: number; // ml
  calorieBurnGoal: number; // kcal
  calorieIntakeGoal: number; // kcal
  stepGoal: number;
  isRegistered: boolean;
  onboarded: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  durationSeconds?: number;
  caloriesBurn: number;
  muscleGroup: string;
  imageUrl: string;
  description: string;
  instructions: string[];
}

export interface WorkoutPlan {
  id: string;
  title: string;
  category: "HIIT" | "Strength" | "Cardio" | "Yoga";
  durationMinutes: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  caloriesBurn: number;
  exercisesCount: number;
  imageUrl: string;
  description: string;
  exercises: Exercise[];
}

export interface DailyLog {
  waterLogged: number; // ml
  stepsCount: number;
  caloriesBurned: number; // total kcal burned
  caloriesConsumed: number; // total kcal consumed
  weightLog: number; // Current weight logged for progress
  date: string; // YYYY-MM-DD
}

export interface MealItem {
  id: string;
  name: string;
  calories: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  category: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  region: Region;
  ingredients?: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "model";
  content: string;
  timestamp: string;
}

export interface ProgressHistory {
  date: string;
  steps: number;
  water: number;
  weight: number;
  caloriesConsumed: number;
  caloriesBurned: number;
}

// Meal tracking
export type MealCategory = "Breakfast" | "Lunch" | "Dinner" | "Snack";

export interface Nutrients { // same shape as src/lib/nutrition.ts
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface LoggedMealItem extends Nutrients {
  foodId?: string;
  name: string;
  portionId?: string;
  portionLabel: string;
  quantity: number;
  grams?: number;
  source: "database" | "manual" | "ai-photo" | "ai-text";
}

export interface LoggedMeal extends Nutrients {
  id: string;
  name: string;
  category: MealCategory;
  items?: LoggedMealItem[];
  ingredients?: string[];
  notes?: string;
  date: string;
  loggedAt: string;
}

export interface DaySummary {
  date: string;
  meals: LoggedMeal[];
  totals: Nutrients;
  byCategory: Record<MealCategory, Nutrients>;
}

// AI coach
export interface CoachGoal {
  id: string;
  date: string;
  title: string;
  description: string;
  category: "activity" | "workout" | "nutrition" | "hydration" | "sleep" | "custom";
  metric?: { type: "steps" | "water" | "meals" | "workouts"; target: number };
  status: "suggested" | "accepted" | "completed" | "skipped";
  source: "ai" | "rules" | "user";
  progress: { current: number; target: number } | null;
}

export interface MotivationEntry {
  id: string;
  kind: "check-in" | "weekly";
  progressStatus: "building-baseline" | "on-track" | "improving" | "slowing";
  headline: string;
  message: string;
  smallGoals: string[];
  adjustments: string[];
  celebrations: string[];
  source: "ai" | "rules";
  createdAt: string;
}

export interface ReminderSetting {
  enabled: boolean;
  time: string;
}

export interface CoachPreferences {
  fitnessLevel: "Beginner" | "Intermediate" | "Advanced";
  availableMinutes: number;
  preferredWorkoutTime: "Morning" | "Afternoon" | "Evening";
  reminders: {
    enabled: boolean;
    mealLogging: ReminderSetting;
    workout: ReminderSetting;
    dailyGoals: ReminderSetting;
    weeklyReview: ReminderSetting & { day: number };
    maxPerDay: number;
  };
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "alert";
  read: boolean;
  createdAt: string;
}
