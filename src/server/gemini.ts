import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = "gemini-3.5-flash";

// The key only ever lives on the server (.env); the browser never sees it
export const hasGeminiKey = () => {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key !== "MY_GEMINI_API_KEY");
};

// Helper to initialize Gemini SDK with safe API key checking
export const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("[AI SERVICE] Warning: GEMINI_API_KEY is not set or using placeholder.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Rules every coaching prompt must follow
export const COACH_SAFETY_RULES = `Safety rules you must always follow:
- Never shame, blame or guilt the user about their weight, body or lapses.
- Never recommend extreme calorie restriction (below about 1200 kcal/day for women or 1500 kcal/day for men), fasting for weight loss, skipping meals, crash diets, detox products, diet pills or laxatives.
- Never recommend excessive exercise, exercising through pain, or more than a modest step up from what the user already does.
- Aim for safe, gradual change: weight loss of no more than about 0.5-1 kg per week.
- Do not diagnose medical conditions. Suggest seeing a doctor for pain, dizziness, very low or high weight, pregnancy, or medical conditions.
- Normal day-to-day weight changes (water, salt, digestion) are not a plateau; only talk about slowing progress when the trend data says so.`;
