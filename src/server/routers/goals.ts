import { Router, Request, Response } from "express";
import { Type } from "@google/genai";
import { db, DailyGoal } from "../db.ts";
import { authenticateJwt } from "./auth.ts";
import { getGeminiClient, hasGeminiKey, GEMINI_MODEL, COACH_SAFETY_RULES } from "../gemini.ts";
import { buildSnapshot, metricProgress, suggestGoals } from "../progress.ts";

const router = Router();

const todayStr = () => new Date().toISOString().split("T")[0];
const CATEGORIES: DailyGoal["category"][] = ["activity", "workout", "nutrition", "hydration", "sleep", "custom"];
const METRIC_LIMITS = { steps: [500, 20000], water: [250, 5000], meals: [1, 6], workouts: [1, 2] } as const;

const currentUser = (req: Request) => db.findUsers(u => u.id === (req as any).user.id)[0];

function cleanMetric(m: any): DailyGoal["metric"] | undefined {
  if (!m || !(m.type in METRIC_LIMITS)) return undefined;
  const [min, max] = METRIC_LIMITS[m.type as keyof typeof METRIC_LIMITS];
  const target = Math.round(Number(m.target));
  if (!Number.isFinite(target)) return undefined;
  return { type: m.type, target: Math.min(max, Math.max(min, target)) };
}

// Today's goals with live progress; accepted goals whose target is met are completed automatically
function goalsWithProgress(userId: string, date: string) {
  return db
    .findDailyGoals(g => g.userId === userId && g.date === date)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(g => {
      if (!g.metric) return { ...g, progress: null };
      const current = metricProgress(userId, g.metric, date);
      if (g.status === "accepted" && current >= g.metric.target) {
        g = db.update("daily_goals", g.id, { status: "completed", completedAt: new Date().toISOString() }) as DailyGoal;
      }
      return { ...g, progress: { current, target: g.metric.target } };
    });
}

const goalSchema = {
  type: Type.OBJECT,
  properties: {
    goals: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          category: { type: Type.STRING, description: "activity, workout, nutrition, hydration or sleep" },
          metricType: { type: Type.STRING, description: "steps, water, meals, workouts, or empty string when not measurable" },
          metricTarget: { type: Type.NUMBER },
        },
        required: ["title", "description", "category", "metricType", "metricTarget"],
      },
    },
  },
  required: ["goals"],
};

async function generateDrafts(user: any) {
  const snapshot = buildSnapshot(user);
  const rules = suggestGoals(snapshot);
  if (!hasGeminiKey()) return { drafts: rules, source: "rules" as const };

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Suggest 3-4 small, achievable daily fitness goals for today based only on this user's data:\n${JSON.stringify(snapshot, null, 1)}\n\n` +
        `Size every goal to the user's fitness level (${snapshot.preferences.fitnessLevel}), available time (${snapshot.preferences.availableMinutes} min) and recent numbers: only a small step up from what they already do. ` +
        `Mix activity, nutrition (Pakistani home food is fine), hydration and sleep. Titles under 40 characters, descriptions under 140 characters and specific to their numbers. ` +
        `When a goal is measurable use metricType steps (target in steps), water (ml), meals (count) or workouts (count).\n\n${COACH_SAFETY_RULES}`,
      config: { responseMimeType: "application/json", responseSchema: goalSchema, temperature: 0.6 },
    });
    const data = JSON.parse(response.text || "{}");
    const drafts = (Array.isArray(data.goals) ? data.goals : []).slice(0, 4).map((g: any) => ({
      title: String(g.title || "").slice(0, 60),
      description: String(g.description || "").slice(0, 200),
      category: CATEGORIES.includes(g.category) ? g.category : "custom",
      metric: cleanMetric({ type: g.metricType, target: g.metricTarget }),
    })).filter((g: any) => g.title);
    if (drafts.length >= 2) return { drafts, source: "ai" as const };
  } catch (error) {
    console.error("[GOALS AI ERROR]:", error);
  }
  return { drafts: rules, source: "rules" as const };
}

function insertDrafts(userId: string, drafts: any[], source: DailyGoal["source"]) {
  const date = todayStr();
  for (const d of drafts) {
    db.insert("daily_goals", {
      userId, date, title: d.title, description: d.description, category: d.category,
      metric: d.metric, status: "suggested", source, createdAt: new Date().toISOString(),
    });
  }
}

// GET: Today's goals. Suggestions are created on the first visit of the day.
router.get("/today", authenticateJwt, async (req: Request, res: Response) => {
  const user = currentUser(req);
  const date = todayStr();
  if (db.findDailyGoals(g => g.userId === user.id && g.date === date).length === 0) {
    const { drafts, source } = await generateDrafts(user);
    insertDrafts(user.id, drafts, source);
  }
  res.json({ date, goals: goalsWithProgress(user.id, date) });
});

// POST: Replace today's untouched suggestions with fresh ones
router.post("/regenerate", authenticateJwt, async (req: Request, res: Response) => {
  const user = currentUser(req);
  const date = todayStr();
  db.findDailyGoals(g => g.userId === user.id && g.date === date && g.status === "suggested")
    .forEach(g => db.delete("daily_goals", g.id));
  const { drafts, source } = await generateDrafts(user);
  insertDrafts(user.id, drafts, source);
  res.json({ date, goals: goalsWithProgress(user.id, date) });
});

// POST: Add a custom goal for today
router.post("/", authenticateJwt, (req: Request, res: Response) => {
  const user = currentUser(req);
  const title = typeof req.body.title === "string" ? req.body.title.trim().slice(0, 60) : "";
  if (!title) return res.status(400).json({ error: "Give your goal a title." });
  const goal = db.insert("daily_goals", {
    userId: user.id,
    date: todayStr(),
    title,
    description: typeof req.body.description === "string" ? req.body.description.trim().slice(0, 200) : "",
    category: "custom",
    metric: cleanMetric(req.body.metric),
    status: "accepted",
    source: "user",
    createdAt: new Date().toISOString(),
  });
  res.status(201).json({ goal });
});

// PUT: Accept, edit, skip or complete a goal
router.put("/:id", authenticateJwt, (req: Request, res: Response) => {
  const user = currentUser(req);
  const goal = db.findDailyGoals(g => g.id === req.params.id && g.userId === user.id)[0];
  if (!goal) return res.status(404).json({ error: "Goal not found." });

  const updates: Partial<DailyGoal> = {};
  if (req.body.status !== undefined) {
    if (!["suggested", "accepted", "completed", "skipped"].includes(req.body.status)) return res.status(400).json({ error: "Invalid status." });
    updates.status = req.body.status;
    updates.completedAt = req.body.status === "completed" ? new Date().toISOString() : undefined;
  }
  if (req.body.title !== undefined) {
    const title = String(req.body.title).trim().slice(0, 60);
    if (!title) return res.status(400).json({ error: "Title cannot be empty." });
    updates.title = title;
  }
  if (req.body.description !== undefined) updates.description = String(req.body.description).trim().slice(0, 200);
  if (req.body.metricTarget !== undefined && goal.metric) {
    updates.metric = cleanMetric({ type: goal.metric.type, target: req.body.metricTarget });
  }

  db.update("daily_goals", goal.id, updates);
  const withProgress = goalsWithProgress(user.id, goal.date).find(g => g.id === goal.id);
  res.json({ goal: withProgress });
});

// DELETE: Remove a goal
router.delete("/:id", authenticateJwt, (req: Request, res: Response) => {
  const user = currentUser(req);
  const goal = db.findDailyGoals(g => g.id === req.params.id && g.userId === user.id)[0];
  if (!goal) return res.status(404).json({ error: "Goal not found." });
  db.delete("daily_goals", goal.id);
  res.json({ deletedId: goal.id });
});

export default router;
