import { Router, Request, Response } from "express";
import { db, NotificationLog } from "../db.ts";
import { authenticateJwt } from "./auth.ts";

const router = Router();

// GET: Fetch list of notifications for the authenticated user
router.get("/", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const list = db.findNotifications(n => n.userId === payload.id);
  
  // Return sorted by newest first
  const sorted = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ notifications: sorted });
});

// PUT: Mark a notification as read
router.put("/:id/read", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const id = req.params.id;

  const matched = db.findNotifications(n => n.id === id && n.userId === payload.id);
  if (matched.length === 0) {
    return res.status(404).json({ error: "Notification not found or unauthorized write." });
  }

  const updated = db.update("notifications", id, { read: true });
  res.json({
    message: "Notification marked as read successfully.",
    notification: updated
  });
});

// POST: Trigger a new custom notification/reminder
router.post("/create", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const { title, message, type } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: "Missing required notification fields (title, message)." });
  }

  const newNotif: Omit<NotificationLog, "id"> = {
    userId: payload.id,
    title: title.trim(),
    message: message.trim(),
    type: type || "info",
    read: false,
    createdAt: new Date().toISOString()
  };

  const saved = db.insert("notifications", newNotif) as NotificationLog;
  res.status(201).json({
    message: "Notification created successfully.",
    notification: saved
  });
});

// DELETE: Clear all read notifications
router.delete("/clear-all", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const list = db.findNotifications(n => n.userId === payload.id && n.read === true);

  list.forEach(n => {
    db.delete("notifications", n.id);
  });

  res.json({
    message: "Cleared all read notifications successfully.",
    clearedCount: list.length
  });
});

// POST: Send any personalised reminders that are due. The client calls this with its local time,
// because reminder times are set in the user's own time zone. Each reminder fires at most once a day,
// only when it is still relevant, and never more than the user's daily limit.
router.post("/reminders/check", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const user = db.findUsers(u => u.id === payload.id)[0];
  const { localTime, localDate, weekday } = req.body;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(localTime) || !/^\d{4}-\d{2}-\d{2}$/.test(localDate) || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return res.status(400).json({ error: "localTime (HH:MM), localDate (YYYY-MM-DD) and weekday (0-6) are required." });
  }

  const prefs = db.getPreferences(user).reminders;
  if (!prefs.enabled) return res.json({ created: [] });

  const today = new Date().toISOString().split("T")[0];
  const sentToday = db.findNotifications(n => n.userId === user.id && !!n.reminderKey && n.reminderKey.endsWith(localDate));
  let budget = prefs.maxPerDay - sentToday.length;
  const created: NotificationLog[] = [];

  const send = (type: string, title: string, message: string) => {
    const reminderKey = `${type}:${localDate}`;
    if (budget <= 0 || sentToday.some(n => n.reminderKey === reminderKey)) return;
    created.push(db.insert("notifications", {
      userId: user.id, title, message, type: "info", read: false, createdAt: new Date().toISOString(), reminderKey,
    }) as NotificationLog);
    budget--;
  };
  const due = (time: string) => localTime >= time;

  if (prefs.dailyGoals.enabled && due(prefs.dailyGoals.time)) {
    const open = db.findDailyGoals(g => g.userId === user.id && g.date === today && (g.status === "accepted" || g.status === "suggested"));
    if (open.length) send("goals", "🎯 Today's goals", `You have ${open.length} goal${open.length === 1 ? "" : "s"} waiting. Small steps count!`);
  }
  if (prefs.workout.enabled && due(prefs.workout.time)) {
    const done = db.findWorkoutLogs(w => w.userId === user.id && w.date === today).length;
    if (!done) send("workout", "💪 Workout time", "Even a 10-15 minute session keeps your streak going. Pick one from the Workout tab.");
  }
  if (prefs.mealLogging.enabled && due(prefs.mealLogging.time)) {
    const meals = db.findMealLogs(m => m.userId === user.id && m.date === today).length;
    if (meals < 2) send("meal", "🍽️ Log today's meals", meals ? "Only one meal logged so far today. Add the rest so your coach can help." : "No meals logged yet today. A quick log helps your coach give better advice.");
  }
  if (prefs.weeklyReview.enabled && weekday === prefs.weeklyReview.day && due(prefs.weeklyReview.time)) {
    send("weekly", "📊 Weekly progress review", "Your weekly summary is ready. Open AI Coach → Progress to see how the week went.");
  }

  res.json({ created });
});

export default router;
