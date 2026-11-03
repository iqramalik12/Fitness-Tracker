import { Router, Request, Response } from "express";
import { Type } from "@google/genai";
import { db, UserProfile } from "../db.ts";
import { authenticateJwt, verifyToken } from "./auth.ts";
import { getGeminiClient, COACH_SAFETY_RULES } from "../gemini.ts";
import { coachContext } from "../progress.ts";

const router = Router();

// Middleware to optionally extract user profile from JWT or fallback to body
const loadUserProfile = (req: Request, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);
    if (payload) {
      const users = db.findUsers(u => u.id === payload.id);
      if (users.length > 0) {
        (req as any).profile = users[0];
        (req as any).authenticated = true;
        return next();
      }
    }
  }
  
  // Fallback to request body if JWT not supplied or invalid
  (req as any).profile = req.body.profile;
  next();
};

// 1. POST: AI Fitness Coach Chat
router.post("/coach", loadUserProfile, async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    const profile = (req as any).profile as UserProfile;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid request. 'messages' array is required." });
    }

    // Signed-in users get coaching grounded in their own meals, goals and progress
    // (only when the JWT was verified; a profile sent in the body is never trusted for data access)
    const isAccountUser = Boolean((req as any).authenticated);
    const dataContext = isAccountUser ? coachContext(profile) : "The user is not signed in, so no tracked data is available.";

    const ai = getGeminiClient();
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
      const summaryLines = dataContext
        .split("\n")
        .filter(l => /^- (Progress|Workouts|Meals logged|Steps|Water|Things|Wins)/.test(l))
        .join("\n");
      const offlineData = isAccountUser
        ? `\n\nHere's what I can see from your logs:\n${summaryLines}\n\nOpen **Daily Goals** and **Progress** for suggestions built from this data.`
        : "";
      return res.json({
        text: "👋 As-salamu alaykum / Hello! I am your AI Coach. To enable my fully personalized smart coaching powered by Gemini, add your Gemini API key as **GEMINI_API_KEY** in the server's `.env` file and restart the app." + offlineData,
        fallback: true
      });
    }

    // Dynamic system prompt tailored to user country, age, BMI, and fitness goals
    const userName = profile?.name || "Fitness Enthusiast";
    const userAge = profile?.age || "25";
    const userGoal = profile?.goal || "General Health";
    const userWeight = profile?.weight || "70";
    const userHeight = profile?.height || "175";
    const userCountry = profile?.country || "Pakistan";
    const bmi = profile?.bmi || "22.8";

    let regionalContext = "";
    if (userCountry.toUpperCase() === "PAKISTAN" || userCountry.toUpperCase() === "PK") {
      regionalContext = "The user is based in Pakistan. Recommend local nutritional items (e.g., Dal, Roti, Chana, Lassan, Ginger, local fruits, Halal diets, etc.) and fit advice that suits local lifestyles, taking into account hot climates, and typical cultural habits (e.g. suggesting safe times for walks/runs).";
    } else if (userCountry.toUpperCase() === "UK" || userCountry.toUpperCase() === "GB") {
      regionalContext = "The user is based in the UK. Mention local terms, health guidelines (e.g. NHS recommendations), weather-proof indoor/outdoor fitness suggestions, and standard high-quality nutrition available in British supermarkets (e.g. oats, salmon, local greens).";
    } else {
      regionalContext = "The user is based in the USA. Use standard US imperial/metric references (offer choice), discuss common fitness activities, and provide nutritional options common in American grocery stores.";
    }

    const systemInstruction = `You are an elite, world-class personal trainer, certified sports nutritionist, and compassionate AI Fitness Coach named Pulse Coach.
Your tone is professional, energetic, empathetic, and encouraging. 
Provide concise, actionable, and science-backed training and nutrition advice.

User Profile:
- Name: ${userName}
- Age: ${userAge} years
- Goal: ${userGoal}
- Weight: ${userWeight} kg / lbs
- Height: ${userHeight} cm
- BMI: ${bmi}
- Target Region: ${userCountry}

${regionalContext}

${dataContext}

Language: reply in the same style the user writes in. If they write in Roman Urdu (Urdu in Latin letters, e.g. "mujhe weight kam karna hai"), reply in simple Roman Urdu; if in English, reply in simple English. Do not switch to Urdu script unless the user does.
When the user asks about their meals, progress or goals, use the tracked data above and say so; if something is not tracked yet, say that rather than guessing.

${COACH_SAFETY_RULES}

Format your response in neat, highly scannable Markdown with clear headings or bullet points where appropriate. Always structure answers to be directly helpful to the user's situation. Do not output raw HTML, but you may use markdown bolding, lists, and tables. Avoid dry medical jargon. Highlight a motivational tagline or positive encouragement at the end!`;

    const formattedContents = messages.map((m: any) => {
      const role = m.role === "assistant" || m.role === "model" ? "model" : "user";
      return {
        role,
        parts: [{ text: m.content || m.text || "" }],
      };
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("[AI COACH ERROR]:", error);
    res.status(500).json({
      error: "An error occurred with the Gemini AI engine.",
      details: error.message || String(error)
    });
  }
});

// 2. POST: AI Workout Planner
router.post("/workout-plan", loadUserProfile, async (req: Request, res: Response) => {
  try {
    const { focusMuscle, durationMinutes, equipment, fitnessLevel } = req.body;
    const profile = (req as any).profile as UserProfile;
    const userGoal = profile?.goal || "Stay Active";
    const userCountry = profile?.country || "Pakistan";

    const generateFallbackWorkout = () => {
      const kcal = Math.round((parseInt(durationMinutes) || 30) * (fitnessLevel === "Advanced" ? 9 : 7));
      return {
        title: `Dynamic ${focusMuscle || "Full Body"} ${userGoal === "Build Muscle" ? "Hypertrophy" : "Tone"} Plan`,
        description: `A localized ${durationMinutes || 30}-minute session targeting ${focusMuscle || "all major"} regions, optimized for a ${fitnessLevel || "Intermediate"} fitness level using ${equipment || "No Equipment"}.`,
        estimatedCaloriesBurned: kcal,
        exercises: [
          {
            name: equipment === "No Equipment" ? "Bodyweight Push-ups" : "Dumbbell Press",
            sets: 3,
            reps: "12 reps",
            instructions: "Keep core tight, lower chest fully with control, then push back up.",
            targetMuscle: "Chest & Shoulders"
          },
          {
            name: equipment === "No Equipment" ? "Bodyweight Air Squats" : "Goblet Squats",
            sets: 4,
            reps: "15 reps",
            instructions: "Stand shoulder-width apart, sink hips low, push through heels to ascend.",
            targetMuscle: "Quads & Glutes"
          },
          {
            name: "Reverse Lunges",
            sets: 3,
            reps: "12 per leg",
            instructions: "Step back smoothly, bending knees to 90 degrees.",
            targetMuscle: "Hamstrings & Balance"
          },
          {
            name: "Plank Hold",
            sets: 3,
            reps: "45 secs",
            instructions: "Maintain a straight line from heels to head, squeezing glutes.",
            targetMuscle: "Core Stamina"
          }
        ]
      };
    };

    const hasApiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
    if (!hasApiKey) {
      return res.json(generateFallbackWorkout());
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Generate a customized workout routine. Focus muscle group: "${focusMuscle || "Full Body"}", Duration: ${durationMinutes || 30} minutes, Equipment: "${equipment || "No Equipment"}", Fitness level: "${fitnessLevel || "Intermediate"}". Profile: Goal is "${userGoal}", age is ${profile?.age || 25}, weight is ${profile?.weight || 70}kg, height is ${profile?.height || 175}cm, country context is ${userCountry}. Provide structured JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            estimatedCaloriesBurned: { type: Type.INTEGER },
            exercises: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  sets: { type: Type.INTEGER },
                  reps: { type: Type.STRING },
                  instructions: { type: Type.STRING },
                  targetMuscle: { type: Type.STRING }
                },
                required: ["name", "sets", "reps", "instructions", "targetMuscle"]
              }
            }
          },
          required: ["title", "description", "estimatedCaloriesBurned", "exercises"]
        },
        temperature: 0.7,
      }
    });

    try {
      const data = JSON.parse(response.text || "");
      res.json(data);
    } catch (e) {
      res.json(generateFallbackWorkout());
    }
  } catch (error: any) {
    console.error("[AI WORKOUT ERROR]:", error);
    res.status(500).json({ error: "AI Workout generation failed" });
  }
});

// 3. POST: AI Diet Planner
router.post("/diet-plan", loadUserProfile, async (req: Request, res: Response) => {
  try {
    const { dietPreference, targetCalories, targetProtein } = req.body;
    const profile = (req as any).profile as UserProfile;
    const userCountry = profile?.country || "Pakistan";
    const userGoal = profile?.goal || "Stay Active";

    const generateFallbackDiet = () => {
      let title = "Custom Balanced Meal Plan";
      let meals: any[] = [];
      
      if (userCountry === "Pakistan") {
        title = "Pakistani High-Protein Halal Plan";
        meals = [
          {
            type: "Breakfast",
            name: "Masala Egg Omelette with Whole Wheat Roti",
            ingredients: ["2 Whole Eggs", "1 tsp Olive Oil", "Onion & Green Chilies", "1 chapati", "1 cup Chai with low-fat milk"],
            calories: 410,
            protein: 22,
            carbs: 45,
            fats: 14,
            instructions: "Prepare eggs with light spices, onions, and coriander. Serve with whole-wheat roti."
          },
          {
            type: "Lunch",
            name: "Lentils (Daal) with Steamed Rice & Salad",
            ingredients: ["1.5 cups Moong Daal", "1 cup steamed Basmati rice", "Cucumber, Onion & Lemon salad"],
            calories: 520,
            protein: 18,
            carbs: 85,
            fats: 8,
            instructions: "Enjoy boiled lentils cooked with cumin, garlic and ginger (minimal oil tarka). Serve with fresh cucumber salad."
          },
          {
            type: "Dinner",
            name: "Tandoori Grilled Chicken Tikka with Raita",
            ingredients: ["200g Chicken Breast piece", "Yogurt marinade", "1 cup Mint Raita", "Mixed greens"],
            calories: 460,
            protein: 48,
            carbs: 10,
            fats: 12,
            instructions: "Airfry or grill chicken breast marinated in spices and low-fat yogurt. Serve with cool mint raita."
          }
        ];
      } else {
        title = "Clean Balanced Diet Plan";
        meals = [
          {
            type: "Breakfast",
            name: "Avocado & Egg Scramble Toast",
            ingredients: ["2 Whole Eggs", "1 slice Sourdough Toast", "1/4 Avocado"],
            calories: 380,
            protein: 20,
            carbs: 30,
            fats: 16,
            instructions: "Scramble eggs and serve on toasted sourdough bread spread with fresh avocado."
          },
          {
            type: "Lunch",
            name: "Flame-Grilled Chicken Salad Bowl",
            ingredients: ["150g Chicken Breast", "1 cup mixed leafy greens", "Cherry tomatoes", "Vinaigrette"],
            calories: 440,
            protein: 38,
            carbs: 15,
            fats: 12,
            instructions: "Slice grilled chicken over a bed of seasoned salad leaves, dress with light vinaigrette."
          },
          {
            type: "Dinner",
            name: "Baked Salmon with Quinoa & Asparagus",
            ingredients: ["150g Salmon fillet", "1/2 cup cooked Quinoa", "Asparagus spears"],
            calories: 540,
            protein: 36,
            carbs: 38,
            fats: 20,
            instructions: "Bake salmon fillet at 190C for 15 minutes, serve alongside fluffy quinoa and steamed asparagus."
          }
        ];
      }

      return {
        title,
        totalCalories: meals.reduce((acc, m) => acc + m.calories, 0),
        totalProtein: meals.reduce((acc, m) => acc + m.protein, 0),
        totalCarbs: meals.reduce((acc, m) => acc + m.carbs, 0),
        totalFats: meals.reduce((acc, m) => acc + m.fats, 0),
        meals
      };
    };

    const hasApiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
    if (!hasApiKey) {
      return res.json(generateFallbackDiet());
    }

    const ai = getGeminiClient();
    const prompt = `Create a daily diet and macro plan. Diet preference/style: "${dietPreference || "Balanced"}", Target calories: ${targetCalories || 2000}, Target protein: ${targetProtein || 100}g. User country context is "${userCountry}" (tailor ingredients to local names, markets, halal status, or standard supermarket foods), profile goal is "${userGoal}". Must return valid JSON according to the schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            totalCalories: { type: Type.INTEGER },
            totalProtein: { type: Type.INTEGER },
            totalCarbs: { type: Type.INTEGER },
            totalFats: { type: Type.INTEGER },
            meals: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  name: { type: Type.STRING },
                  ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                  calories: { type: Type.INTEGER },
                  protein: { type: Type.INTEGER },
                  carbs: { type: Type.INTEGER },
                  fats: { type: Type.INTEGER },
                  instructions: { type: Type.STRING }
                },
                required: ["type", "name", "ingredients", "calories", "protein", "carbs", "fats", "instructions"]
              }
            }
          },
          required: ["title", "totalCalories", "totalProtein", "totalCarbs", "totalFats", "meals"]
        },
        temperature: 0.7,
      }
    });

    try {
      const data = JSON.parse(response.text || "");
      res.json(data);
    } catch (e) {
      res.json(generateFallbackDiet());
    }
  } catch (error: any) {
    console.error("[AI DIET ERROR]:", error);
    res.status(500).json({ error: "AI Diet generation failed" });
  }
});

// 4. POST: AI Health Tips
router.post("/health-tips", loadUserProfile, async (req: Request, res: Response) => {
  try {
    const profile = (req as any).profile as UserProfile;
    const userCountry = profile?.country || "Pakistan";
    const userGoal = profile?.goal || "Stay Active";
    const userAge = profile?.age || 25;
    const bmiVal = profile?.bmi || 22.5;

    const generateFallbackTips = () => {
      let regionalTips = [];
      if (userCountry === "Pakistan") {
        regionalTips = [
          {
            category: "Hydration Care",
            title: "Beat Summer Dehydration",
            detail: "When temperature rises, consume electrolyte-dense drinks. Mix minimal sugar into freshly prepared lemon juice, or drink local coconut water.",
            impactLevel: "Critical"
          },
          {
            category: "Traditional Meals",
            title: "Tarka Oil reduction",
            detail: "Tarka is rich in local Pakistani flavor. Simply switch standard dalda/ghee with cold-pressed olive or canola oil, and limit to exactly 1 teaspoon per portion.",
            impactLevel: "High"
          },
          {
            category: "Active Cardio",
            title: "Safe Early-Hours Walks",
            detail: "Due to high peak midday heat levels in Pakistan, shift active jog sessions to 5:30 AM or 7:30 PM to protect respiratory health.",
            impactLevel: "High"
          },
          {
            category: "Preventive Health",
            title: "Balanced Spicing for Digestion",
            detail: "Ginger and garlic are fantastic local anti-inflammatories. Pair moderate chili spices with active physical motion to boost metabolism.",
            impactLevel: "Moderate"
          }
        ];
      } else {
        regionalTips = [
          {
            category: "Active Cardio",
            title: "Indoor Weather-Proof Stamina",
            detail: "Integrate rapid physical circuits like squat hops, burpees, and shadowboxing inside your room if weather prohibits outdoor jogs.",
            impactLevel: "High"
          },
          {
            category: "Vitamin D Care",
            title: "Active Sunlight Sourcing",
            detail: "When sunlight is low, ensure adequate dietary sources of Vitamin D (wild salmon, fortified eggs, and organic mushrooms) or safe supplements.",
            impactLevel: "High"
          },
          {
            category: "Cardiovascular Health",
            title: "10-Minute Desk Stretches",
            detail: "Long desk-bound schedules contract the lower back. Stand up and complete active hip-hinges every 90 minutes.",
            impactLevel: "Moderate"
          },
          {
            category: "Longevity Habits",
            title: "Rhythmic Sleep Hygiene",
            detail: "Establish a strict screen-off protocol 45 minutes before sleep to stimulate high-quality natural melatonin secretion.",
            impactLevel: "Critical"
          }
        ];
      }
      return { tips: regionalTips };
    };

    const hasApiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
    if (!hasApiKey) {
      return res.json(generateFallbackTips());
    }

    const ai = getGeminiClient();
    const prompt = `Generate 4 highly tailored, scientific, and localized health and longevity tips. User age is ${userAge}, country context is "${userCountry}", BMI is ${bmiVal}, primary physical goal is "${userGoal}". Deliver structured JSON tips following the schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tips: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  title: { type: Type.STRING },
                  detail: { type: Type.STRING },
                  impactLevel: { type: Type.STRING }
                },
                required: ["category", "title", "detail", "impactLevel"]
              }
            }
          },
          required: ["tips"]
        },
        temperature: 0.7,
      }
    });

    try {
      const data = JSON.parse(response.text || "");
      res.json(data);
    } catch (e) {
      res.json(generateFallbackTips());
    }
  } catch (error: any) {
    console.error("[AI TIPS ERROR]:", error);
    res.status(500).json({ error: "AI Health Tips generation failed" });
  }
});

// 5. POST: Daily Motivation Package
router.post("/motivation", loadUserProfile, async (req: Request, res: Response) => {
  try {
    const profile = (req as any).profile as UserProfile;
    const userGoal = profile?.goal || "Stay Active";
    const userName = profile?.name ? profile.name.split(" ")[0] : "Champion";

    const generateFallbackMotivation = () => {
      let quote = "The resistance you fight physically in the gym and the resistance you fight in life can only build a strong character.";
      let author = "Arnold Schwarzenegger";
      let focus = `Hey ${userName}, lock in today! Maintain strict hydration (aiming for ${profile?.waterGoal || 2000}ml) and crush those ${profile?.stepGoal || 10000} steps.`;
      let tagline = "Steel sharpens steel! Rise up, hydrate, execute, and dominate your fitness targets today!";

      if (userGoal === "Lose Weight") {
        quote = "It's not about perfect. It's about effort. And when you bring that effort every single day, that's where transformation happens.";
        author = "Jillian Michaels";
        focus = `Today is about precise energy balance, ${userName}. Fuel yourself with clean proteins and keep moving.`;
      } else if (userGoal === "Build Muscle") {
        quote = "There are no secrets to success. It is the result of preparation, hard work, and learning from failure.";
        author = "Colin Powell";
        focus = `Prioritize high-quality proteins in your breakfast and dinner today. Complete your sets with strict form.`;
      }

      return { quote, author, todaysFocus: focus, audioTagline: tagline };
    };

    const hasApiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
    if (!hasApiKey) {
      return res.json(generateFallbackMotivation());
    }

    const ai = getGeminiClient();
    const prompt = `Generate a powerful, high-octane daily fitness motivation package. User is "${userName}", their fitness goal is "${userGoal}", age is ${profile?.age || 25}, country is "${profile?.country || "Pakistan"}". Provide a powerful, tailored quote, a realistic daily focus task, and a brief phonetic motivational chant (audioTagline) according to the schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quote: { type: Type.STRING },
            author: { type: Type.STRING },
            todaysFocus: { type: Type.STRING },
            audioTagline: { type: Type.STRING }
          },
          required: ["quote", "author", "todaysFocus", "audioTagline"]
        },
        temperature: 0.8,
      }
    });

    try {
      const data = JSON.parse(response.text || "");
      res.json(data);
    } catch (e) {
      res.json(generateFallbackMotivation());
    }
  } catch (error: any) {
    console.error("[AI MOTIVATION ERROR]:", error);
    res.status(500).json({ error: "AI Motivation generation failed" });
  }
});

// 6. POST: Weekly Suggestions Roadmap (7-Days)
router.post("/weekly-roadmap", loadUserProfile, async (req: Request, res: Response) => {
  try {
    const profile = (req as any).profile as UserProfile;
    const userGoal = profile?.goal || "Stay Active";
    const userCountry = profile?.country || "Pakistan";
    const water = profile?.waterGoal || 2500;

    const generateFallbackRoadmap = () => {
      const title = `${userGoal} 7-Day Performance Roadmap`;
      const days = [
        { dayNumber: 1, dayName: "Monday", focus: "Foundation Strength", activitySuggestion: "30-min heavy compound exercises (squats/push-ups) + 6,000 steps baseline.", hydrationTarget: water, sleepTarget: 7.5, restDay: false },
        { dayNumber: 2, dayName: "Tuesday", focus: "Steady State Cardio", activitySuggestion: "40-min fast-paced brisk walking or light cycling + stretch loops.", hydrationTarget: water, sleepTarget: 8.0, restDay: false },
        { dayNumber: 3, dayName: "Wednesday", focus: "Active Recovery & Joint Health", activitySuggestion: "15-min soft spinal alignment flow, deep hydration, zero weights.", hydrationTarget: water + 300, sleepTarget: 7.5, restDay: true },
        { dayNumber: 4, dayName: "Thursday", focus: "Lower Body Conditioning", activitySuggestion: "Bodyweight lunges, calf raises, high knees circuit (3 sets) + 8,000 steps.", hydrationTarget: water, sleepTarget: 7.5, restDay: false },
        { dayNumber: 5, dayName: "Friday", focus: "Core & Stability Endurance", activitySuggestion: "3 plank holds (45s), 15 bicycle crunches, followed by light recovery walk.", hydrationTarget: water, sleepTarget: 7.5, restDay: false },
        { dayNumber: 6, dayName: "Saturday", focus: "High Intensity Cardio (HIIT)", activitySuggestion: "5 rounds of 1-min jumping jacks, 30s rest, 1-min shadowboxing.", hydrationTarget: water + 500, sleepTarget: 8.5, restDay: false },
        { dayNumber: 7, dayName: "Sunday", focus: "Sabbath Rest & System Flush", activitySuggestion: "Zero physical pressure. Pure restoration, light foam rolling, reflection.", hydrationTarget: water, sleepTarget: 8.0, restDay: true }
      ];
      return { roadmapTitle: title, days };
    };

    const hasApiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
    if (!hasApiKey) {
      return res.json(generateFallbackRoadmap());
    }

    const ai = getGeminiClient();
    const prompt = `Generate a comprehensive 7-day fitness suggestions roadmap. User goal: "${userGoal}", Country: "${userCountry}", weight: ${profile?.weight || 70}kg, water baseline: ${water}ml. Return JSON according to the schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            roadmapTitle: { type: Type.STRING },
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayNumber: { type: Type.INTEGER },
                  dayName: { type: Type.STRING },
                  focus: { type: Type.STRING },
                  activitySuggestion: { type: Type.STRING },
                  hydrationTarget: { type: Type.INTEGER },
                  sleepTarget: { type: Type.NUMBER },
                  restDay: { type: Type.BOOLEAN }
                },
                required: ["dayNumber", "dayName", "focus", "activitySuggestion", "hydrationTarget", "sleepTarget", "restDay"]
              }
            }
          },
          required: ["roadmapTitle", "days"]
        },
        temperature: 0.7,
      }
    });

    try {
      const data = JSON.parse(response.text || "");
      res.json(data);
    } catch (e) {
      res.json(generateFallbackRoadmap());
    }
  } catch (error: any) {
    console.error("[AI ROADMAP ERROR]:", error);
    res.status(500).json({ error: "AI Weekly Suggestions generation failed" });
  }
});

export default router;
