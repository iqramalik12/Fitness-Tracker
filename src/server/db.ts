import fs from "fs";
import path from "path";

// Define the comprehensive Database Schema interfaces
export interface UserProfile {
  id: string;
  email: string;
  password?: string; // stored for simulation/demo validation
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  country: "USA" | "UK" | "Pakistan";
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
  createdAt: string;
  preferences?: UserPreferences;
}

export interface ReminderSetting {
  enabled: boolean;
  time: string; // HH:MM in the user's local time
}

export interface UserPreferences {
  fitnessLevel: "Beginner" | "Intermediate" | "Advanced";
  availableMinutes: number; // time per day the user can spend on exercise
  preferredWorkoutTime: "Morning" | "Afternoon" | "Evening";
  reminders: {
    enabled: boolean; // master switch
    mealLogging: ReminderSetting;
    workout: ReminderSetting;
    dailyGoals: ReminderSetting;
    weeklyReview: ReminderSetting & { day: number }; // 0 = Sunday
    maxPerDay: number;
  };
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  fitnessLevel: "Beginner",
  availableMinutes: 30,
  preferredWorkoutTime: "Evening",
  reminders: {
    enabled: true,
    mealLogging: { enabled: true, time: "21:00" },
    workout: { enabled: true, time: "18:00" },
    dailyGoals: { enabled: true, time: "09:00" },
    weeklyReview: { enabled: true, time: "19:00", day: 0 },
    maxPerDay: 3,
  },
};

export interface DailyLog {
  id: string;
  userId: string;
  waterLogged: number; // ml
  stepsCount: number;
  caloriesBurned: number; // total active burn
  caloriesConsumed: number; // total intake
  weightLog: number;
  weightRecorded?: boolean; // true when the user actually weighed in that day (not carried over)
  date: string; // YYYY-MM-DD
}

export interface WorkoutLog {
  id: string;
  userId: string;
  title: string;
  category: "HIIT" | "Strength" | "Cardio" | "Yoga" | "Custom";
  durationMinutes: number;
  caloriesBurn: number;
  exercisesCount: number;
  notes?: string;
  completedAt: string; // ISO String
  date: string; // YYYY-MM-DD
}

export interface MealItemEntry {
  foodId?: string; // set when picked from the food database
  name: string;
  portionId?: string;
  portionLabel: string;
  quantity: number;
  grams?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  source: "database" | "manual" | "ai-photo" | "ai-text";
}

export interface MealLog {
  id: string;
  userId: string;
  name: string;
  calories: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  fiber?: number; // g
  category: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  ingredients?: string[];
  items?: MealItemEntry[];
  notes?: string;
  date: string; // YYYY-MM-DD
  loggedAt: string; // ISO String
  updatedAt?: string;
}

export interface NotificationLog {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "alert";
  read: boolean;
  createdAt: string; // ISO String
  reminderKey?: string; // e.g. "meal:2026-11-03", used to send each reminder at most once
}

export interface DailyGoal {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  title: string;
  description: string;
  category: "activity" | "workout" | "nutrition" | "hydration" | "sleep" | "custom";
  // Optional measurable target that is checked against the user's logs automatically
  metric?: { type: "steps" | "water" | "meals" | "workouts"; target: number };
  status: "suggested" | "accepted" | "completed" | "skipped";
  source: "ai" | "rules" | "user";
  createdAt: string;
  completedAt?: string;
}

export interface MotivationEntry {
  id: string;
  userId: string;
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

export interface BmiRecord {
  id: string;
  userId: string; // the logged-in user who saved it
  subject: "self" | "other";
  personName?: string;
  age: number;
  gender?: "Male" | "Female" | "Other";
  heightCm: number;
  weightKg: number;
  bmi: number;
  category: string | null;
  createdAt: string;
}

export interface DatabaseSchema {
  users: UserProfile[];
  daily_logs: DailyLog[];
  workout_logs: WorkoutLog[];
  meal_logs: MealLog[];
  notifications: NotificationLog[];
  daily_goals: DailyGoal[];
  motivation_history: MotivationEntry[];
  bmi_records: BmiRecord[];
}

// Collections added after the first release; older database.json files get them on load
const LATER_COLLECTIONS = ["daily_goals", "motivation_history", "bmi_records"] as const;

class DatabaseEngine {
  private filePath: string;
  private memoryCache: DatabaseSchema | null = null;

  constructor() {
    this.filePath = path.join(process.cwd(), "database.json");
    this.initDatabase();
  }

  // Set up the database if it doesn't exist
  private initDatabase() {
    if (!fs.existsSync(this.filePath)) {
      const defaultState: DatabaseSchema = {
        users: [
          {
            id: "usr-demo",
            email: "iqra@pulse.fit",
            password: "password123",
            name: "Iqra Malik",
            age: 26,
            gender: "Female",
            country: "Pakistan",
            weight: 74,
            height: 178,
            goal: "Build Muscle",
            bmi: 23.4,
            bmiStatus: "Normal",
            units: "metric",
            waterGoal: 2500,
            calorieBurnGoal: 600,
            calorieIntakeGoal: 2400,
            stepGoal: 10000,
            isRegistered: true,
            onboarded: true,
            createdAt: new Date().toISOString()
          }
        ],
        daily_logs: [
          {
            id: "log-demo-1",
            userId: "usr-demo",
            waterLogged: 1250,
            stepsCount: 6400,
            caloriesBurned: 310,
            caloriesConsumed: 1650,
            weightLog: 74,
            date: new Date().toISOString().split("T")[0]
          }
        ],
        workout_logs: [
          {
            id: "workout-demo-1",
            userId: "usr-demo",
            title: "Tandoori Cardio Push",
            category: "Cardio",
            durationMinutes: 30,
            caloriesBurn: 240,
            exercisesCount: 4,
            completedAt: new Date().toISOString(),
            date: new Date().toISOString().split("T")[0]
          }
        ],
        meal_logs: [
          {
            id: "meal-demo-1",
            userId: "usr-demo",
            name: "Masala Scrambled Eggs & Roti",
            calories: 450,
            protein: 24,
            carbs: 48,
            fat: 14,
            category: "Breakfast",
            ingredients: ["2 Whole Eggs", "1 dry chapati", "Onions", "Spices"],
            date: new Date().toISOString().split("T")[0],
            loggedAt: new Date().toISOString()
          }
        ],
        notifications: [
          {
            id: "notif-demo-1",
            userId: "usr-demo",
            title: "Hydration Check-in",
            message: "Don't forget to complete your water goal today. 1,250ml logged so far!",
            type: "info",
            read: false,
            createdAt: new Date().toISOString()
          }
        ],
        daily_goals: [],
        motivation_history: [],
        bmi_records: []
      };
      this.memoryCache = defaultState;
      this.saveToDisk(defaultState);
    } else {
      this.readFromDisk();
    }
  }

  // Read data from disk into cache
  private readFromDisk(): DatabaseSchema {
    try {
      const content = fs.readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(content) as DatabaseSchema;
      for (const key of LATER_COLLECTIONS) {
        if (!Array.isArray(parsed[key])) (parsed as any)[key] = [];
      }
      this.memoryCache = parsed;
      return this.memoryCache;
    } catch (error) {
      console.error("Database Engine: Failed to read from disk. Using fallback empty cache.", error);
      if (this.memoryCache) return this.memoryCache;
      
      const emptyState: DatabaseSchema = {
        users: [],
        daily_logs: [],
        workout_logs: [],
        meal_logs: [],
        notifications: [],
        daily_goals: [],
        motivation_history: [],
        bmi_records: []
      };
      this.memoryCache = emptyState;
      return emptyState;
    }
  }

  // Save data to disk atomically to prevent corruption
  private saveToDisk(data: DatabaseSchema): void {
    try {
      const tempPath = this.filePath + ".tmp";
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
      fs.renameSync(tempPath, this.filePath);
      this.memoryCache = data;
    } catch (error) {
      console.error("Database Engine: Atomic write failed.", error);
    }
  }

  // Generic Operations
  public getCollection<K extends keyof DatabaseSchema>(collection: K): DatabaseSchema[K] {
    const data = this.readFromDisk();
    return data[collection];
  }

  public insert<K extends keyof DatabaseSchema>(collection: K, record: Omit<DatabaseSchema[K][number], "id">): DatabaseSchema[K][number] {
    const data = this.readFromDisk();
    const id = `${collection.slice(0, 3)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newRecord = { ...record, id } as any;
    
    (data[collection] as any).push(newRecord);
    this.saveToDisk(data);
    return newRecord;
  }

  public update<K extends keyof DatabaseSchema>(
    collection: K,
    id: string,
    updates: Partial<DatabaseSchema[K][number]>
  ): DatabaseSchema[K][number] | null {
    const data = this.readFromDisk();
    const index = (data[collection] as any[]).findIndex((item: any) => item.id === id);
    
    if (index === -1) return null;
    
    const existing = data[collection][index];
    const updatedRecord = { ...existing, ...updates };
    (data[collection] as any[])[index] = updatedRecord;
    
    this.saveToDisk(data);
    return updatedRecord;
  }

  public delete<K extends keyof DatabaseSchema>(collection: K, id: string): boolean {
    const data = this.readFromDisk();
    const initialLength = (data[collection] as any[]).length;
    (data[collection] as any[]) = (data[collection] as any[]).filter((item: any) => item.id !== id);
    
    if ((data[collection] as any[]).length === initialLength) return false;
    
    this.saveToDisk(data);
    return true;
  }

  // Specialized queries
  public findUsers(predicate: (user: UserProfile) => boolean): UserProfile[] {
    return this.getCollection("users").filter(predicate);
  }

  public findDailyLogs(predicate: (log: DailyLog) => boolean): DailyLog[] {
    return this.getCollection("daily_logs").filter(predicate);
  }

  public findWorkoutLogs(predicate: (log: WorkoutLog) => boolean): WorkoutLog[] {
    return this.getCollection("workout_logs").filter(predicate);
  }

  public findMealLogs(predicate: (log: MealLog) => boolean): MealLog[] {
    return this.getCollection("meal_logs").filter(predicate);
  }

  public findNotifications(predicate: (notif: NotificationLog) => boolean): NotificationLog[] {
    return this.getCollection("notifications").filter(predicate);
  }

  public findDailyGoals(predicate: (goal: DailyGoal) => boolean): DailyGoal[] {
    return this.getCollection("daily_goals").filter(predicate);
  }

  public findMotivation(predicate: (entry: MotivationEntry) => boolean): MotivationEntry[] {
    return this.getCollection("motivation_history").filter(predicate);
  }

  public findBmiRecords(predicate: (record: BmiRecord) => boolean): BmiRecord[] {
    return this.getCollection("bmi_records").filter(predicate);
  }

  public getPreferences(user: UserProfile): UserPreferences {
    const saved = user.preferences;
    return {
      ...DEFAULT_PREFERENCES,
      ...saved,
      reminders: { ...DEFAULT_PREFERENCES.reminders, ...(saved?.reminders || {}) },
    };
  }

  // Get or Create Daily Log helper
  public getOrCreateDailyLog(userId: string, dateStr: string, weightFallback = 70): DailyLog {
    const logs = this.findDailyLogs(l => l.userId === userId && l.date === dateStr);
    if (logs.length > 0) {
      return logs[0];
    }
    
    // Create new daily log initialized to empty/fresh values for this day
    const newLog: Omit<DailyLog, "id"> = {
      userId,
      waterLogged: 0,
      stepsCount: 0,
      caloriesBurned: 0,
      caloriesConsumed: 0,
      weightLog: weightFallback,
      date: dateStr
    };
    
    return this.insert("daily_logs", newLog) as DailyLog;
  }
}

export const db = new DatabaseEngine();
