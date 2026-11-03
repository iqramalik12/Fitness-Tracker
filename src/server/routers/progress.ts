import { Router, Request, Response } from "express";
import { Type } from "@google/genai";
import { db, MotivationEntry, UserPreferences } from "../db.ts";
import { authenticateJwt } from "./auth.ts";
import { calculateBMI } from "./users.ts";
import { getGeminiClient, hasGeminiKey, GEMINI_MODEL, COACH_SAFETY_RULES } from "../gemini.ts";
import { buildSnapshot, dailySeries, ruleBasedMotivation } from "../progress.ts";

const router = Router();

const currentUser = (req: Request) => db.findUsers(u => u.id === (req as any).user.id)[0];

// GET: Progress snapshot, 14-day series and the latest coach message
router.get("/summary", authenticateJwt, (req: Request, res: Response) => {
  const user = currentUser(req);
  const latest = db
    .findMotivation(m => m.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
  res.json({ snapshot: buildSnapshot(user), series: dailySeries(user.id, 14), latestMotivation: latest });
});

// POST: Record today's weigh-in (also updates profile weight and BMI)
router.post("/weight", authenticateJwt, (req: Request, res: Response) => {
  const user = currentUser(req);
  const weight = Number(req.body.weight);
  if (!Number.isFinite(weight) || weight < 20 || weight > 400) {
    return res.status(400).json({ error: "Weight must be between 20 and 400 kg." });
  }
  const today = new Date().toISOString().split("T")[0];
  const log = db.getOrCreateDailyLog(user.id, today, user.weight);
  const updatedLog = db.update("daily_logs", log.id, { weightLog: weight, weightRecorded: true });
  const { bmi, status } = calculateBMI(weight, user.height);
  const updatedUser = db.update("users", user.id, { weight, bmi, bmiStatus: status })!;
  const { password, ...profile } = updatedUser;
  res.json({ log: updatedLog, profile });
});

// GET: Coach preferences and reminder settings
router.get("/preferences", authenticateJwt, (req: Request, res: Response) => {
  res.json({ preferences: db.getPreferences(currentUser(req)) });
});

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// PUT: Update coach preferences and reminder settings
router.put("/preferences", authenticateJwt, (req: Request, res: Response) => {
  const user = currentUser(req);
  const current = db.getPreferences(user);
  const body = req.body || {};
  const next: UserPreferences = { ...current, reminders: { ...current.reminders } };

  if (body.fitnessLevel !== undefined) {
    if (!["Beginner", "Intermediate", "Advanced"].includes(body.fitnessLevel)) return res.status(400).json({ error: "Invalid fitness level." });
    next.fitnessLevel = body.fitnessLevel;
  }
  if (body.availableMinutes !== undefined) {
    const m = Number(body.availableMinutes);
    if (!Number.isInteger(m) || m < 5 || m > 180) return res.status(400).json({ error: "Available time must be 5-180 minutes." });
    next.availableMinutes = m;
  }
  if (body.preferredWorkoutTime !== undefined) {
    if (!["Morning", "Afternoon", "Evening"].includes(body.preferredWorkoutTime)) return res.status(400).json({ error: "Invalid workout time." });
    next.preferredWorkoutTime = body.preferredWorkoutTime;
  }
  const r = body.reminders;
  if (r && typeof r === "object") {
    if (r.enabled !== undefined) next.reminders.enabled = Boolean(r.enabled);
    if (r.maxPerDay !== undefined) {
      const m = Number(r.maxPerDay);
      if (!Number.isInteger(m) || m < 1 || m > 5) return res.status(400).json({ error: "Max reminders per day must be 1-5." });
      next.reminders.maxPerDay = m;
    }
    for (const key of ["mealLogging", "workout", "dailyGoals", "weeklyReview"] as const) {
      const s = r[key];
      if (!s) continue;
      const merged: any = { ...next.reminders[key] };
      if (s.enabled !== undefined) merged.enabled = Boolean(s.enabled);
      if (s.time !== undefined) {
        if (!TIME.test(s.time)) return res.status(400).json({ error: "Reminder times must be HH:MM." });
        merged.time = s.time;
      }
      if (key === "weeklyReview" && s.day !== undefined) {
        const d = Number(s.day);
        if (!Number.isInteger(d) || d < 0 || d > 6) return res.status(400).json({ error: "Invalid review day." });
        merged.day = d;
      }
      (next.reminders as any)[key] = merged;
    }
  }

  db.update("users", user.id, { preferences: next });
  res.json({ preferences: next });
});

const motivationSchema = {
  type: Type.OBJECT,
  properties: {
    headline: { type: Type.STRING },
    message: { type: Type.STRING },
    smallGoals: { type: Type.ARRAY, items: { type: Type.STRING } },
    adjustments: { type: Type.ARRAY, items: { type: Type.STRING } },
    celebrations: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["headline", "message", "smallGoals", "adjustments", "celebrations"],
};

const strList = (v: unknown, max: number) =>
  (Array.isArray(v) ? v : []).filter(x => typeof x === "string" && x.trim()).map((x: string) => x.trim().slice(0, 200)).slice(0, max);

// POST: Generate a personalised check-in or weekly summary from the user's real data
router.post("/motivation", authenticateJwt, async (req: Request, res: Response) => {
  const user = currentUser(req);
  const kind: MotivationEntry["kind"] = req.body.kind === "weekly" ? "weekly" : "check-in";

  const todayCount = db.findMotivation(m => m.userId === user.id && m.createdAt.startsWith(new Date().toISOString().split("T")[0])).length;
  if (todayCount >= 10) {
    return res.status(429).json({ error: "You've had 10 coach messages today. Check back tomorrow!" });
  }

  const snapshot = buildSnapshot(user);
  let content = ruleBasedMotivation(snapshot, kind);
  let source: MotivationEntry["source"] = "rules";

  if (hasGeminiKey()) {
    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Write a ${kind === "weekly" ? "weekly progress summary" : "motivational check-in"} for this user, based only on this data:\n${JSON.stringify(snapshot, null, 1)}\n\n` +
          `Progress status is "${snapshot.status}". If it is "slowing", acknowledge it kindly and suggest small, realistic routine adjustments. If "building-baseline", encourage consistent tracking. ` +
          `Celebrate real wins from the data. smallGoals: 2-3 achievable goals for today. adjustments: 1-3 realistic changes. celebrations: wins from the data only (can be empty). ` +
          `Keep the message under 90 words, warm and specific to their numbers. The user lives in ${snapshot.profile.country}; local food examples are welcome.\n\n${COACH_SAFETY_RULES}`,
        config: { responseMimeType: "application/json", responseSchema: motivationSchema, temperature: 0.7 },
      });
      const data = JSON.parse(response.text || "{}");
      if (data.headline && data.message) {
        content = {
          headline: String(data.headline).slice(0, 100),
          message: String(data.message).slice(0, 900),
          smallGoals: strList(data.smallGoals, 3),
          adjustments: strList(data.adjustments, 3),
          celebrations: strList(data.celebrations, 3),
        };
        source = "ai";
      }
    } catch (error) {
      console.error("[COACH MOTIVATION ERROR]:", error);
    }
  }

  const entry = db.insert("motivation_history", {
    userId: user.id,
    kind,
    progressStatus: snapshot.status,
    ...content,
    source,
    createdAt: new Date().toISOString(),
  }) as MotivationEntry;
  res.status(201).json({ entry, snapshot });
});

// GET: Past coach messages, newest first
router.get("/motivation/history", authenticateJwt, (req: Request, res: Response) => {
  const user = currentUser(req);
  const entries = db.findMotivation(m => m.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30);
  res.json({ entries });
});

export default router;
