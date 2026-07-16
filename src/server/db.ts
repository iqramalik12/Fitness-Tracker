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
}

export interface DailyLog {
  id: string;
  userId: string;
  waterLogged: number; // ml
  stepsCount: number;
  caloriesBurned: number; // total active burn
  caloriesConsumed: number; // total intake
  weightLog: number;
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

export interface MealLog {
  id: string;
  userId: string;
  name: string;
  calories: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  category: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  ingredients?: string[];
  date: string; // YYYY-MM-DD
  loggedAt: string; // ISO String
}

export interface NotificationLog {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "alert";
  read: boolean;
  createdAt: string; // ISO String
}

export interface DatabaseSchema {
  users: UserProfile[];
  daily_logs: DailyLog[];
  workout_logs: WorkoutLog[];
  meal_logs: MealLog[];
  notifications: NotificationLog[];
}

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
        ]
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
      this.memoryCache = JSON.parse(content) as DatabaseSchema;
      return this.memoryCache;
    } catch (error) {
      console.error("Database Engine: Failed to read from disk. Using fallback empty cache.", error);
      if (this.memoryCache) return this.memoryCache;
      
      const emptyState: DatabaseSchema = {
        users: [],
        daily_logs: [],
        workout_logs: [],
        meal_logs: [],
        notifications: []
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
