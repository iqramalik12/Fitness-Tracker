import { Router, Request, Response } from "express";
import { db } from "../db.ts";
import { authenticateJwt } from "./auth.ts";

const router = Router();

// GET: Fetch hydration status for today, and 7-day logs
router.get("/status", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const todayStr = new Date().toISOString().split("T")[0];
  
  // Get or Create today's log
  const todayLog = db.getOrCreateDailyLog(payload.id, todayStr);
  
  // Get last 7 days of logs to display progression charts
  const allLogs = db.findDailyLogs(l => l.userId === payload.id);
  const sortedLogs = [...allLogs]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 7)
    .reverse();

  res.json({
    todayWater: todayLog.waterLogged,
    history: sortedLogs.map(l => ({
      date: l.date,
      water: l.waterLogged
    }))
  });
});

// POST: Log water intake
router.post("/log", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const { amount } = req.body; // in ml, e.g. 250, 500

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: "Please supply a valid positive numeric water amount." });
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const todayLog = db.getOrCreateDailyLog(payload.id, todayStr);

  const updatedLog = db.update("daily_logs", todayLog.id, {
    waterLogged: todayLog.waterLogged + parseInt(amount)
  });

  if (!updatedLog) {
    return res.status(500).json({ error: "Failed to update daily hydration metrics." });
  }

  // Fetch the user's water goal to see if they completed it
  const matchedUsers = db.findUsers(u => u.id === payload.id);
  if (matchedUsers.length > 0) {
    const user = matchedUsers[0];
    if (todayLog.waterLogged < user.waterGoal && updatedLog.waterLogged >= user.waterGoal) {
      // Hydration milestone achieved!
      db.insert("notifications", {
        userId: payload.id,
        title: "💧 Fully Hydrated!",
        message: `Superb work! You've achieved your daily water intake goal of ${user.waterGoal} ml today.`,
        type: "success",
        read: false,
        createdAt: new Date().toISOString()
      });
    }
  }

  res.json({
    message: "Hydration log updated successfully.",
    waterLogged: updatedLog.waterLogged,
    dailyLog: updatedLog
  });
});

// POST: Reset today's water log
router.post("/reset", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const todayStr = new Date().toISOString().split("T")[0];
  const todayLog = db.getOrCreateDailyLog(payload.id, todayStr);

  const updatedLog = db.update("daily_logs", todayLog.id, {
    waterLogged: 0
  });

  res.json({
    message: "Today's hydration log has been reset.",
    waterLogged: 0,
    dailyLog: updatedLog
  });
});

export default router;
