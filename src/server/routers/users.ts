import { Router, Request, Response } from "express";
import { db, UserProfile } from "../db.ts";
import { authenticateJwt } from "./auth.ts";

const router = Router();

// Helper to calculate BMI and Classification
export function calculateBMI(weightKg: number, heightCm: number): { bmi: number; status: UserProfile["bmiStatus"] } {
  if (!weightKg || !heightCm) {
    return { bmi: 22.0, status: "Normal" };
  }
  const heightM = heightCm / 100;
  const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));
  
  let status: UserProfile["bmiStatus"] = "Normal";
  if (bmi < 18.5) {
    status = "Underweight";
  } else if (bmi >= 18.5 && bmi < 25.0) {
    status = "Normal";
  } else if (bmi >= 25.0 && bmi < 30.0) {
    status = "Overweight";
  } else {
    status = "Obese";
  }
  
  return { bmi, status };
}

// GET: Current user profile
router.get("/profile", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const matched = db.findUsers(u => u.id === payload.id);
  
  if (matched.length === 0) {
    return res.status(404).json({ error: "User profile not found." });
  }
  
  const { password, ...profile } = matched[0];
  res.json({ profile });
});

// PUT: Update user profile goals, details, or units
router.put("/profile", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const matched = db.findUsers(u => u.id === payload.id);
  
  if (matched.length === 0) {
    return res.status(404).json({ error: "User profile not found." });
  }
  
  const existingUser = matched[0];
  const { 
    name, age, gender, country, weight, height, 
    goal, units, waterGoal, calorieBurnGoal, calorieIntakeGoal, stepGoal 
  } = req.body;

  // Validate and merge details
  const weightVal = weight !== undefined ? parseFloat(weight) : existingUser.weight;
  const heightVal = height !== undefined ? parseFloat(height) : existingUser.height;
  
  const { bmi, status } = calculateBMI(weightVal, heightVal);

  const updates: Partial<UserProfile> = {};
  if (name !== undefined) updates.name = name.trim();
  if (age !== undefined) updates.age = parseInt(age);
  if (gender !== undefined) updates.gender = gender;
  if (country !== undefined) updates.country = country;
  if (weight !== undefined) updates.weight = weightVal;
  if (height !== undefined) updates.height = heightVal;
  if (goal !== undefined) updates.goal = goal;
  if (units !== undefined) updates.units = units;
  if (waterGoal !== undefined) updates.waterGoal = parseInt(waterGoal);
  if (calorieBurnGoal !== undefined) updates.calorieBurnGoal = parseInt(calorieBurnGoal);
  if (calorieIntakeGoal !== undefined) updates.calorieIntakeGoal = parseInt(calorieIntakeGoal);
  if (stepGoal !== undefined) updates.stepGoal = parseInt(stepGoal);

  // Recalculate BMI parameters
  updates.bmi = bmi;
  updates.bmiStatus = status;

  const updatedUser = db.update("users", existingUser.id, updates);
  if (!updatedUser) {
    return res.status(500).json({ error: "Failed to update user profile in database." });
  }

  // Sync daily log weight if there is a log for today
  const todayStr = new Date().toISOString().split("T")[0];
  const dailyLog = db.getOrCreateDailyLog(updatedUser.id, todayStr, updatedUser.weight);
  if (dailyLog.weightLog !== updatedUser.weight) {
    db.update("daily_logs", dailyLog.id, { weightLog: updatedUser.weight });
  }

  const { password, ...profile } = updatedUser;
  res.json({
    message: "User profile updated successfully.",
    profile
  });
});

// POST: Onboard user
router.post("/onboard", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const matched = db.findUsers(u => u.id === payload.id);
  
  if (matched.length === 0) {
    return res.status(404).json({ error: "User profile not found." });
  }
  
  const existingUser = matched[0];
  const {
    name, age, gender, country, weight, height, goal, units,
    waterGoal, calorieBurnGoal, calorieIntakeGoal, stepGoal
  } = req.body;

  // Validate inputs
  const weightVal = weight ? parseFloat(weight) : 70;
  const heightVal = height ? parseFloat(height) : 175;
  const { bmi, status } = calculateBMI(weightVal, heightVal);

  const updates: Partial<UserProfile> = {
    name: name && name.trim() ? name.trim() : existingUser.name,
    age: age ? parseInt(age) : 25,
    gender: gender || "Other",
    country: country || "Pakistan",
    weight: weightVal,
    height: heightVal,
    goal: goal || "Stay Active",
    units: units || "metric",
    waterGoal: waterGoal ? parseInt(waterGoal) : 2000,
    calorieBurnGoal: calorieBurnGoal ? parseInt(calorieBurnGoal) : 500,
    calorieIntakeGoal: calorieIntakeGoal ? parseInt(calorieIntakeGoal) : 2000,
    stepGoal: stepGoal ? parseInt(stepGoal) : 10000,
    bmi,
    bmiStatus: status,
    onboarded: true // Mark onboarded as true
  };

  const updatedUser = db.update("users", existingUser.id, updates);
  if (!updatedUser) {
    return res.status(500).json({ error: "Failed to complete onboarding database transaction." });
  }

  // Create an initial daily log for today to capture baseline values
  const todayStr = new Date().toISOString().split("T")[0];
  const initialLog = db.getOrCreateDailyLog(updatedUser.id, todayStr, updatedUser.weight);
  
  // Also push an onboard success notification to make it extremely responsive
  db.insert("notifications", {
    userId: updatedUser.id,
    title: "Welcome to Pulse.fit!",
    message: `As-salamu alaykum / Welcome ${updatedUser.name}! Your ${updatedUser.goal} roadmap has been initialized. Complete your targets daily.`,
    type: "success",
    read: false,
    createdAt: new Date().toISOString()
  });

  const { password, ...profile } = updatedUser;
  res.json({
    message: "Onboarding completed successfully.",
    profile,
    log: initialLog
  });
});

// GET: Today's daily log (water, steps, calories, weight)
router.get("/daily-log", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const user = db.findUsers(u => u.id === payload.id)[0];
  const todayStr = new Date().toISOString().split("T")[0];
  const log = db.getOrCreateDailyLog(payload.id, todayStr, user?.weight);
  res.json({ log });
});

// PUT: Overwrite today's daily log counters
router.put("/daily-log", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const user = db.findUsers(u => u.id === payload.id)[0];
  const todayStr = new Date().toISOString().split("T")[0];
  const todayLog = db.getOrCreateDailyLog(payload.id, todayStr, user?.weight);

  const updates: Record<string, number | boolean> = {};
  for (const field of ["waterLogged", "stepsCount", "caloriesBurned", "caloriesConsumed", "weightLog"]) {
    const value = Number(req.body[field]);
    if (req.body[field] !== undefined && Number.isFinite(value) && value >= 0) {
      updates[field] = value;
    }
  }

  // A changed weight is a real weigh-in, as opposed to the value carried over from the profile
  if (updates.weightLog !== undefined && updates.weightLog !== todayLog.weightLog) {
    (updates as any).weightRecorded = true;
  }

  const log = db.update("daily_logs", todayLog.id, updates);
  if (!log) {
    return res.status(500).json({ error: "Failed to update daily log." });
  }
  res.json({ log });
});

export default router;
