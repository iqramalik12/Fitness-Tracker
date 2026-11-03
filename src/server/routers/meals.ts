import { Router, Request, Response } from "express";
import { Type } from "@google/genai";
import { db, MealLog, MealItemEntry } from "../db.ts";
import { authenticateJwt } from "./auth.ts";
import { getGeminiClient, hasGeminiKey, GEMINI_MODEL } from "../gemini.ts";
import { FOODS, FOOD_CATEGORIES, findFood, findPortion, portionNutrition, searchFoods } from "../../lib/foods.ts";
import { scaleNutrients, sumNutrients } from "../../lib/nutrition.ts";

const router = Router();

const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
const todayStr = () => new Date().toISOString().split("T")[0];

// Accepts YYYY-MM-DD within the last year and at most one day ahead (time zones)
function validDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const t = Date.parse(value + "T00:00:00Z");
  if (Number.isNaN(t)) return null;
  const now = Date.now();
  if (t > now + 86400000 || t < now - 366 * 86400000) return null;
  return value;
}

const num = (v: unknown, min: number, max: number): number | null => {
  const x = Number(v);
  return Number.isFinite(x) && x >= min && x <= max ? x : null;
};

// Turns one client item into a trusted entry. Database items are always recalculated on the server.
function normalizeItem(raw: any): { item?: MealItemEntry; error?: string } {
  if (!raw || typeof raw !== "object") return { error: "Invalid food item." };
  const quantity = num(raw.quantity ?? 1, 0.1, 50);
  if (quantity === null) return { error: "Quantity must be between 0.1 and 50." };

  if (raw.foodId) {
    const food = findFood(String(raw.foodId));
    if (!food) return { error: `Unknown food "${raw.foodId}".` };
    const portion = findPortion(food, String(raw.portionId || food.portions[0].id));
    if (!portion) return { error: `Unknown portion for ${food.name}.` };
    // Grams portions allow larger numbers (e.g. 250 g)
    const qty = portion.id === "g" ? num(raw.quantity, 1, 3000) : quantity;
    if (qty === null) return { error: "Grams must be between 1 and 3000." };
    const nut = portionNutrition(food, portion, qty);
    return {
      item: {
        foodId: food.id,
        name: food.name,
        portionId: portion.id,
        portionLabel: portion.label,
        quantity: qty,
        grams: nut.grams,
        calories: nut.calories,
        protein: nut.protein,
        carbs: nut.carbs,
        fat: nut.fat,
        fiber: nut.fiber,
        source: ["ai-photo", "ai-text"].includes(raw.source) ? raw.source : "database",
      },
    };
  }

  const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 80) : "";
  if (!name) return { error: "Each manual item needs a name." };
  const calories = num(raw.calories, 0, 5000);
  if (calories === null) return { error: `Calories for "${name}" must be between 0 and 5000.` };
  const macro = (v: unknown) => num(v ?? 0, 0, 500);
  const protein = macro(raw.protein), carbs = macro(raw.carbs), fat = macro(raw.fat), fiber = macro(raw.fiber);
  if (protein === null || carbs === null || fat === null || fiber === null) {
    return { error: `Macros for "${name}" must be between 0 and 500 g.` };
  }
  const source = ["ai-photo", "ai-text"].includes(raw.source) ? raw.source : "manual";
  return {
    item: {
      name,
      portionLabel: typeof raw.portionLabel === "string" && raw.portionLabel.trim() ? raw.portionLabel.trim().slice(0, 40) : "Serving",
      quantity,
      grams: num(raw.grams, 0, 5000) ?? undefined,
      calories: Math.round(calories * quantity),
      protein: Math.round(protein * quantity * 10) / 10,
      carbs: Math.round(carbs * quantity * 10) / 10,
      fat: Math.round(fat * quantity * 10) / 10,
      fiber: Math.round(fiber * quantity * 10) / 10,
      source,
    },
  };
}

function buildMeal(body: any): { meal?: Omit<MealLog, "id" | "userId" | "loggedAt">; error?: string } {
  if (!CATEGORIES.includes(body.category)) return { error: "Choose breakfast, lunch, dinner or snack." };
  const date = body.date === undefined ? todayStr() : validDate(body.date);
  if (!date) return { error: "Invalid date." };
  if (!Array.isArray(body.items) || body.items.length === 0) return { error: "Add at least one food item." };
  if (body.items.length > 30) return { error: "A meal can have at most 30 items." };

  const items: MealItemEntry[] = [];
  for (const raw of body.items) {
    const { item, error } = normalizeItem(raw);
    if (error || !item) return { error };
    items.push(item);
  }
  const totals = sumNutrients(items);
  return {
    meal: {
      name: items.map(i => i.name.replace(/\s*\(.*\)$/, "")).join(", ").slice(0, 120),
      category: body.category,
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      fiber: totals.fiber,
      ingredients: items.map(i => `${i.quantity} × ${i.portionLabel} ${i.name}`),
      items,
      notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 200) : undefined,
      date,
    },
  };
}

// Keep the dashboard's daily calorie counter in step with meal changes
function adjustConsumed(userId: string, date: string, delta: number) {
  if (!delta) return null;
  const user = db.findUsers(u => u.id === userId)[0];
  const log = db.getOrCreateDailyLog(userId, date, user?.weight);
  return db.update("daily_logs", log.id, { caloriesConsumed: Math.max(0, log.caloriesConsumed + delta) });
}

function daySummary(userId: string, date: string) {
  const meals = db
    .findMealLogs(m => m.userId === userId && m.date === date)
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  const byCategory = Object.fromEntries(
    CATEGORIES.map(c => [c, sumNutrients(meals.filter(m => m.category === c))])
  );
  return { date, meals, totals: sumNutrients(meals), byCategory };
}

// GET: Search the Pakistani food database
router.get("/foods", (req: Request, res: Response) => {
  const q = typeof req.query.q === "string" ? req.query.q.slice(0, 50) : "";
  const category = typeof req.query.category === "string" && FOOD_CATEGORIES.includes(req.query.category as any)
    ? req.query.category
    : undefined;
  res.json({ foods: searchFoods(q, category), categories: FOOD_CATEGORIES, total: FOODS.length });
});

// GET: Meals and nutrition totals for one day (defaults to today)
router.get("/", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const date = req.query.date === undefined ? todayStr() : validDate(req.query.date);
  if (!date) return res.status(400).json({ error: "Invalid date." });
  const dailyLog = db.findDailyLogs(l => l.userId === payload.id && l.date === date)[0] || null;
  res.json({ ...daySummary(payload.id, date), dailyLog });
});

// GET: Day-by-day meal history, newest first
router.get("/history", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const days = num(req.query.days ?? 30, 1, 365) ?? 30;
  const since = new Date(Date.now() - (days - 1) * 86400000).toISOString().split("T")[0];
  const meals = db.findMealLogs(m => m.userId === payload.id && m.date >= since);
  const dates = [...new Set(meals.map(m => m.date))].sort().reverse();
  res.json({ days: dates.map(d => daySummary(payload.id, d)) });
});

// POST: Log a meal with one or more food items
router.post("/", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const { meal, error } = buildMeal(req.body);
  if (error || !meal) return res.status(400).json({ error });

  const saved = db.insert("meal_logs", { ...meal, userId: payload.id, loggedAt: new Date().toISOString() }) as MealLog;
  const dailyLog = adjustConsumed(payload.id, saved.date, saved.calories);
  res.status(201).json({ meal: saved, dailyLog });
});

// PUT: Edit a logged meal (items, category or date)
router.put("/:id", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const existing = db.findMealLogs(m => m.id === req.params.id && m.userId === payload.id)[0];
  if (!existing) return res.status(404).json({ error: "Meal not found." });

  const { meal, error } = buildMeal({ date: existing.date, ...req.body });
  if (error || !meal) return res.status(400).json({ error });

  const updated = db.update("meal_logs", existing.id, { ...meal, updatedAt: new Date().toISOString() }) as MealLog;
  let dailyLog;
  if (meal.date === existing.date) {
    dailyLog = adjustConsumed(payload.id, meal.date, meal.calories - existing.calories);
  } else {
    adjustConsumed(payload.id, existing.date, -existing.calories);
    dailyLog = adjustConsumed(payload.id, meal.date, meal.calories);
  }
  res.json({ meal: updated, dailyLog });
});

// DELETE: Remove a logged meal
router.delete("/:id", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const existing = db.findMealLogs(m => m.id === req.params.id && m.userId === payload.id)[0];
  if (!existing) return res.status(404).json({ error: "Meal not found." });
  db.delete("meal_logs", existing.id);
  const dailyLog = adjustConsumed(payload.id, existing.date, -existing.calories);
  res.json({ deletedId: existing.id, date: existing.date, dailyLog });
});

const estimateSchema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          foodId: { type: Type.STRING, description: "Matching id from the food list, or empty string if none matches" },
          portionLabel: { type: Type.STRING },
          grams: { type: Type.NUMBER },
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fat: { type: Type.NUMBER },
          fiber: { type: Type.NUMBER },
          confidence: { type: Type.STRING, description: "low, medium or high" },
        },
        required: ["name", "foodId", "portionLabel", "grams", "calories", "protein", "carbs", "fat", "fiber", "confidence"],
      },
    },
    note: { type: Type.STRING },
  },
  required: ["items", "note"],
};

const FOOD_LIST_FOR_PROMPT = FOODS.map(f => `${f.id}: ${f.name}`).join("\n");

// Prefer our database values when the model matched a known food; otherwise keep its own estimate
function toSuggestions(raw: any[], source: "ai-photo" | "ai-text") {
  return (Array.isArray(raw) ? raw : []).slice(0, 12).map((r: any) => {
    const grams = num(r.grams, 1, 3000) ?? 100;
    const food = r.foodId ? findFood(String(r.foodId)) : undefined;
    const nut = food
      ? scaleNutrients(food.per100g, grams)
      : {
          calories: Math.round(num(r.calories, 0, 5000) ?? 0),
          protein: num(r.protein, 0, 500) ?? 0,
          carbs: num(r.carbs, 0, 500) ?? 0,
          fat: num(r.fat, 0, 500) ?? 0,
          fiber: num(r.fiber, 0, 500) ?? 0,
        };
    return {
      name: food ? food.name : String(r.name || "Food").slice(0, 80),
      matchedFoodId: food?.id || null,
      portionLabel: `${String(r.portionLabel || "Serving").slice(0, 30)} (~${Math.round(grams)} g)`,
      grams: Math.round(grams),
      ...nut,
      confidence: ["low", "medium", "high"].includes(r.confidence) ? r.confidence : "low",
      source,
    };
  });
}

// POST: Identify foods in a meal photo and estimate portions (needs GEMINI_API_KEY)
// (server.ts gives this route a larger body limit for the image)
router.post("/analyze-photo", authenticateJwt, async (req: Request, res: Response) => {
  if (!hasGeminiKey()) {
    return res.status(503).json({ error: "Photo recognition needs a Gemini API key on the server (GEMINI_API_KEY). You can still add foods by search or manually." });
  }
  const match = typeof req.body.image === "string" && req.body.image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return res.status(400).json({ error: "Upload a JPEG, PNG or WebP image." });

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType: match[1], data: match[2] } },
          { text: `Identify each food in this meal photo. It is most likely Pakistani home cooking. For each food, estimate the portion in everyday terms (e.g. "1 medium roti", "half bowl", "full plate") and its weight in grams, plus estimated calories, protein, carbs, fat and fiber for that portion. If a food matches one of these database ids, set foodId to it, otherwise use an empty string:\n${FOOD_LIST_FOR_PROMPT}\nPortion sizes from photos are uncertain: set confidence honestly. If the image does not show food, return no items and explain in note.` },
        ],
      }],
      config: { responseMimeType: "application/json", responseSchema: estimateSchema, temperature: 0.2 },
    });
    const data = JSON.parse(response.text || "{}");
    res.json({ items: toSuggestions(data.items, "ai-photo"), note: String(data.note || "").slice(0, 300) });
  } catch (error: any) {
    console.error("[MEAL PHOTO ERROR]:", error);
    res.status(502).json({ error: "Could not analyse the photo right now. Please add the foods manually." });
  }
});

// POST: Estimate nutrition for a food typed in by name (needs GEMINI_API_KEY)
router.post("/estimate", authenticateJwt, async (req: Request, res: Response) => {
  if (!hasGeminiKey()) {
    return res.status(503).json({ error: "AI estimates need a Gemini API key on the server. Enter the values yourself or pick a similar food from the list." });
  }
  const text = typeof req.body.text === "string" ? req.body.text.trim().slice(0, 150) : "";
  if (!text) return res.status(400).json({ error: "Describe the food and amount, e.g. \"1 plate daal chawal\"." });

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Estimate the nutrition of this food as eaten in a typical Pakistani home: "${text}". Split it into separate foods if it contains several. Use these database ids for foodId when one matches, else empty string:\n${FOOD_LIST_FOR_PROMPT}`,
      config: { responseMimeType: "application/json", responseSchema: estimateSchema, temperature: 0.2 },
    });
    const data = JSON.parse(response.text || "{}");
    res.json({ items: toSuggestions(data.items, "ai-text"), note: String(data.note || "").slice(0, 300) });
  } catch (error: any) {
    console.error("[MEAL ESTIMATE ERROR]:", error);
    res.status(502).json({ error: "Could not estimate this food right now. Please enter the values manually." });
  }
});

export default router;
