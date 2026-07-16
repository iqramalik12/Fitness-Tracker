import { Router, Request, Response } from "express";
import { db, MealLog } from "../db.ts";
import { authenticateJwt } from "./auth.ts";

const router = Router();

// GET: Fetch meal logs for today and overall calorie breakdown
router.get("/meals", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const todayStr = new Date().toISOString().split("T")[0];

  // Get daily log
  const dailyLog = db.getOrCreateDailyLog(payload.id, todayStr);

  // Get meal logs for today
  const meals = db.findMealLogs(m => m.userId === payload.id && m.date === todayStr);

  // Recalculate macros for safety/audit
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  meals.forEach(m => {
    totalProtein += m.protein || 0;
    totalCarbs += m.carbs || 0;
    totalFat += m.fat || 0;
  });

  res.json({
    caloriesConsumed: dailyLog.caloriesConsumed,
    caloriesBurned: dailyLog.caloriesBurned,
    stepsCount: dailyLog.stepsCount,
    macros: {
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat
    },
    meals
  });
});

// POST: Log a new meal item
router.post("/meals", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const { name, calories, protein, carbs, fat, category, ingredients } = req.body;

  if (!name || !calories || !category) {
    return res.status(400).json({ error: "Missing required meal fields (name, calories, category)." });
  }

  const todayStr = new Date().toISOString().split("T")[0];

  const newMeal: Omit<MealLog, "id"> = {
    userId: payload.id,
    name: name.trim(),
    calories: parseInt(calories),
    protein: protein ? parseInt(protein) : 0,
    carbs: carbs ? parseInt(carbs) : 0,
    fat: fat ? parseInt(fat) : 0,
    category: category,
    ingredients: ingredients || [],
    date: todayStr,
    loggedAt: new Date().toISOString()
  };

  const savedMeal = db.insert("meal_logs", newMeal) as MealLog;

  // Sync to DailyLog
  const dailyLog = db.getOrCreateDailyLog(payload.id, todayStr);
  const updatedLog = db.update("daily_logs", dailyLog.id, {
    caloriesConsumed: dailyLog.caloriesConsumed + parseInt(calories)
  });

  res.status(201).json({
    message: "Meal item logged successfully and active calories synchronized.",
    meal: savedMeal,
    dailyLog: updatedLog
  });
});

// DELETE: Remove a logged meal
router.delete("/meals/:id", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const mealId = req.params.id;

  const matchedMeals = db.findMealLogs(m => m.id === mealId && m.userId === payload.id);
  if (matchedMeals.length === 0) {
    return res.status(404).json({ error: "Logged meal item not found or unauthorized deletion." });
  }

  const mealToDelete = matchedMeals[0];
  const todayStr = mealToDelete.date;

  // Delete from meals collection
  db.delete("meal_logs", mealId);

  // Decrement from today's daily log
  const dailyLogs = db.findDailyLogs(l => l.userId === payload.id && l.date === todayStr);
  let updatedLog = null;
  if (dailyLogs.length > 0) {
    const dailyLog = dailyLogs[0];
    const newConsumed = Math.max(0, dailyLog.caloriesConsumed - mealToDelete.calories);
    updatedLog = db.update("daily_logs", dailyLog.id, {
      caloriesConsumed: newConsumed
    });
  }

  res.json({
    message: "Logged meal removed successfully.",
    deletedMealId: mealId,
    dailyLog: updatedLog
  });
});

// POST: Log steps count (adds steps and recalculates active burn: 1 step = 0.04 calories)
router.post("/steps", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const { steps } = req.body;

  if (steps === undefined || isNaN(steps) || steps < 0) {
    return res.status(400).json({ error: "Please supply a valid non-negative steps number." });
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const dailyLog = db.getOrCreateDailyLog(payload.id, todayStr);

  const stepsDiff = Math.max(0, parseInt(steps) - dailyLog.stepsCount);
  const additionalCaloriesBurned = Math.round(stepsDiff * 0.04); // 0.04 kcal per step

  const updatedLog = db.update("daily_logs", dailyLog.id, {
    stepsCount: parseInt(steps),
    caloriesBurned: dailyLog.caloriesBurned + additionalCaloriesBurned
  });

  if (!updatedLog) {
    return res.status(500).json({ error: "Failed to update steps statistics on backend." });
  }

  // Check if step goal achieved
  const matchedUsers = db.findUsers(u => u.id === payload.id);
  if (matchedUsers.length > 0) {
    const user = matchedUsers[0];
    if (dailyLog.stepsCount < user.stepGoal && updatedLog.stepsCount >= user.stepGoal) {
      db.insert("notifications", {
        userId: payload.id,
        title: "👣 Step Goal Completed!",
        message: `Incredible work, ${user.name}! You achieved your daily target of ${user.stepGoal} steps!`,
        type: "success",
        read: false,
        createdAt: new Date().toISOString()
      });
    }
  }

  res.json({
    message: "Steps synchronized successfully.",
    stepsCount: updatedLog.stepsCount,
    caloriesBurned: updatedLog.caloriesBurned,
    dailyLog: updatedLog
  });
});

export default router;
