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
