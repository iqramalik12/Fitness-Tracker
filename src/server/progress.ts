// Progress analysis for the AI Motivation Coach.
// Everything here is computed from the user's own logs; nothing is invented.

import { db, DailyGoal, UserProfile } from "./db.ts";

export type ProgressStatus = "building-baseline" | "on-track" | "improving" | "slowing";

const DAY = 86400000;
export const dateOffset = (days: number) => new Date(Date.now() - days * DAY).toISOString().split("T")[0];
const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export interface WeightPoint { date: string; weight: number }

export interface WeightTrend {
  recorded: WeightPoint[];
  recentAvg: number | null;
  earlierAvg: number | null;
  weeklyRate: number | null; // kg per week, negative = losing
  trend: "insufficient-data" | "down" | "flat" | "up";
  plateau: boolean;
  note: string;
}

// Compares the average of weigh-ins in the last 7 days with the average 14-28 days ago.
// Averaging several weigh-ins over weeks smooths out normal daily swings (water, salt, digestion),
// so a single heavy day never counts as a plateau.
export function analyzeWeight(points: WeightPoint[], goal: UserProfile["goal"], today = dateOffset(0)): WeightTrend {
  const t0 = Date.parse(today + "T00:00:00Z");
  const age = (d: string) => (t0 - Date.parse(d + "T00:00:00Z")) / DAY;
  const recorded = [...points].filter(p => age(p.date) >= 0 && age(p.date) <= 60).sort((a, b) => a.date.localeCompare(b.date));
  const recent = recorded.filter(p => age(p.date) <= 6);
  const earlier = recorded.filter(p => age(p.date) >= 14 && age(p.date) <= 28);

  if (recent.length < 2 || earlier.length < 2) {
    return {
      recorded, recentAvg: null, earlierAvg: null, weeklyRate: null, trend: "insufficient-data", plateau: false,
      note: "Need at least 2 weigh-ins this week and 2 from 2-4 weeks ago before judging your weight trend.",
    };
  }

  const recentAvg = avg(recent.map(p => p.weight));
  const earlierAvg = avg(earlier.map(p => p.weight));
  const weeksApart = (avg(earlier.map(p => age(p.date))) - avg(recent.map(p => age(p.date)))) / 7;
  const weeklyRate = round1((recentAvg - earlierAvg) / Math.max(weeksApart, 1));
  const trend = weeklyRate <= -0.1 ? "down" : weeklyRate >= 0.1 ? "up" : "flat";

  let plateau = false;
  let note = `Your average weight changed by ${weeklyRate > 0 ? "+" : ""}${weeklyRate} kg per week over the last few weeks.`;
  if (goal === "Lose Weight" && weeklyRate > -0.1) {
    plateau = true;
    note = "Your average weight has stayed about the same for 2-4 weeks while your goal is weight loss.";
  } else if (goal === "Build Muscle" && weeklyRate < 0.05) {
    plateau = true;
    note = "Your average weight has not gone up over 2-4 weeks while your goal is building muscle.";
  }
  return { recorded, recentAvg: round1(recentAvg), earlierAvg: round1(earlierAvg), weeklyRate, trend, plateau, note };
}

export interface ProgressSnapshot {
  today: string;
  profile: Pick<UserProfile, "name" | "goal" | "age" | "gender" | "weight" | "height" | "bmi" | "calorieIntakeGoal" | "stepGoal" | "waterGoal" | "country">;
  preferences: { fitnessLevel: string; availableMinutes: number; preferredWorkoutTime: string };
  daysTracked: number; // days with any activity in the last 14 days
  weight: WeightTrend;
  workouts: { thisWeek: number; lastWeek: number; minutesThisWeek: number; minutesLastWeek: number; today: number };
  meals: { daysLoggedThisWeek: number; daysLoggedLastWeek: number; avgCaloriesLogged: number | null; todayCalories: number; todayMealCount: number };
  activity: { avgStepsThisWeek: number; avgStepsLastWeek: number; avgWaterThisWeek: number; todaySteps: number; todayWater: number };
  goals: { completedThisWeek: number; acceptedThisWeek: number; completionRate: number | null };
  status: ProgressStatus;
  signals: string[]; // things that slipped
  wins: string[]; // things to celebrate
}

export function buildSnapshot(user: UserProfile): ProgressSnapshot {
  const today = dateOffset(0);
  const weekStart = dateOffset(6);
  const lastWeekStart = dateOffset(13);
  const inThisWeek = (d: string) => d >= weekStart && d <= today;
  const inLastWeek = (d: string) => d >= lastWeekStart && d < weekStart;
  const prefs = db.getPreferences(user);

  const logs = db.findDailyLogs(l => l.userId === user.id && l.date >= dateOffset(60));
  const workouts = db.findWorkoutLogs(w => w.userId === user.id && w.date >= lastWeekStart);
  const meals = db.findMealLogs(m => m.userId === user.id && m.date >= lastWeekStart);
  const goals = db.findDailyGoals(g => g.userId === user.id && inThisWeek(g.date));

  const weight = analyzeWeight(
    logs.filter(l => l.weightRecorded).map(l => ({ date: l.date, weight: l.weightLog })),
    user.goal,
    today
  );

  const wThis = workouts.filter(w => inThisWeek(w.date));
  const wLast = workouts.filter(w => inLastWeek(w.date));
  const mealDays = (pred: (d: string) => boolean) => new Set(meals.filter(m => pred(m.date)).map(m => m.date));
  const mealDaysThis = mealDays(inThisWeek);
  const mealDaysLast = mealDays(inLastWeek);
  const caloriesByDay = [...mealDaysThis].map(d => meals.filter(m => m.date === d).reduce((s, m) => s + m.calories, 0));
  const todayMeals = meals.filter(m => m.date === today);

  const stepsAvg = (pred: (d: string) => boolean) =>
    Math.round(avg(logs.filter(l => pred(l.date) && l.stepsCount > 0).map(l => l.stepsCount)));
  const todayLog = logs.find(l => l.date === today);

  const activeDays = new Set([
    ...logs.filter(l => l.date >= lastWeekStart && (l.stepsCount > 0 || l.waterLogged > 0 || l.caloriesConsumed > 0)).map(l => l.date),
    ...workouts.map(w => w.date),
    ...meals.map(m => m.date),
  ]);

  const completed = goals.filter(g => g.status === "completed").length;
  const accepted = goals.filter(g => g.status === "accepted" || g.status === "completed").length;

  const snapshot: ProgressSnapshot = {
    today,
    profile: {
      name: user.name, goal: user.goal, age: user.age, gender: user.gender, weight: user.weight, height: user.height,
      bmi: user.bmi, calorieIntakeGoal: user.calorieIntakeGoal, stepGoal: user.stepGoal, waterGoal: user.waterGoal, country: user.country,
    },
    preferences: { fitnessLevel: prefs.fitnessLevel, availableMinutes: prefs.availableMinutes, preferredWorkoutTime: prefs.preferredWorkoutTime },
    daysTracked: activeDays.size,
    weight,
    workouts: {
      thisWeek: wThis.length,
      lastWeek: wLast.length,
      minutesThisWeek: wThis.reduce((s, w) => s + w.durationMinutes, 0),
      minutesLastWeek: wLast.reduce((s, w) => s + w.durationMinutes, 0),
      today: workouts.filter(w => w.date === today).length,
    },
    meals: {
      daysLoggedThisWeek: mealDaysThis.size,
      daysLoggedLastWeek: mealDaysLast.size,
      avgCaloriesLogged: caloriesByDay.length ? Math.round(avg(caloriesByDay)) : null,
      todayCalories: todayMeals.reduce((s, m) => s + m.calories, 0),
      todayMealCount: todayMeals.length,
    },
    activity: {
      avgStepsThisWeek: stepsAvg(inThisWeek),
      avgStepsLastWeek: stepsAvg(inLastWeek),
      avgWaterThisWeek: Math.round(avg(logs.filter(l => inThisWeek(l.date) && l.waterLogged > 0).map(l => l.waterLogged))),
      todaySteps: todayLog?.stepsCount || 0,
      todayWater: todayLog?.waterLogged || 0,
    },
    goals: { completedThisWeek: completed, acceptedThisWeek: accepted, completionRate: accepted ? Math.round((completed / accepted) * 100) : null },
    status: "on-track",
    signals: [],
    wins: [],
  };

  const { signals, wins } = snapshot;
  const wk = snapshot.workouts, ml = snapshot.meals, ac = snapshot.activity;

  if (weight.plateau) signals.push(weight.note);
  if (wk.lastWeek >= 2 && wk.thisWeek <= wk.lastWeek - 2) signals.push(`Workouts dropped from ${wk.lastWeek} last week to ${wk.thisWeek} this week.`);
  if (ml.daysLoggedLastWeek >= 3 && ml.daysLoggedThisWeek <= ml.daysLoggedLastWeek - 2) signals.push(`Meals were logged on ${ml.daysLoggedThisWeek} days this week, down from ${ml.daysLoggedLastWeek}.`);
  if (ac.avgStepsLastWeek >= 2000 && ac.avgStepsThisWeek < ac.avgStepsLastWeek * 0.75) signals.push(`Average daily steps fell from ${ac.avgStepsLastWeek.toLocaleString()} to ${ac.avgStepsThisWeek.toLocaleString()}.`);

  if (weight.trend === "down" && user.goal === "Lose Weight") wins.push(`Your average weight is going down (${weight.weeklyRate} kg per week).`);
  if (weight.trend === "up" && user.goal === "Build Muscle") wins.push(`Your average weight is going up (+${weight.weeklyRate} kg per week).`);
  if (wk.thisWeek > 0 && wk.thisWeek >= wk.lastWeek) wins.push(`${wk.thisWeek} workout${wk.thisWeek === 1 ? "" : "s"} done this week${wk.thisWeek > wk.lastWeek ? `, up from ${wk.lastWeek}` : ""}.`);
  if (ml.daysLoggedThisWeek >= 4) wins.push(`Meals logged on ${ml.daysLoggedThisWeek} of the last 7 days.`);
  if (ac.avgStepsThisWeek >= user.stepGoal && user.stepGoal > 0) wins.push(`You are averaging ${ac.avgStepsThisWeek.toLocaleString()} steps, above your goal.`);
  else if (ac.avgStepsLastWeek > 0 && ac.avgStepsThisWeek > ac.avgStepsLastWeek * 1.1) wins.push(`Average steps rose to ${ac.avgStepsThisWeek.toLocaleString()} a day.`);
  if (completed >= 3) wins.push(`${completed} daily goals completed this week.`);

  if (snapshot.daysTracked < 5) snapshot.status = "building-baseline";
  else if (weight.plateau || signals.length >= 2) snapshot.status = "slowing";
  else if (wins.length >= 2) snapshot.status = "improving";
  else snapshot.status = "on-track";

  return snapshot;
}

// Last N days of daily numbers for charts
export function dailySeries(userId: string, days = 14) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = dateOffset(i);
    const log = db.findDailyLogs(l => l.userId === userId && l.date === date)[0];
    const meals = db.findMealLogs(m => m.userId === userId && m.date === date);
    out.push({
      date,
      steps: log?.stepsCount || 0,
      water: log?.waterLogged || 0,
      caloriesLogged: meals.reduce((s, m) => s + m.calories, 0),
      workouts: db.findWorkoutLogs(w => w.userId === userId && w.date === date).length,
      weight: log?.weightRecorded ? log.weightLog : null,
    });
  }
  return out;
}

type GoalDraft = Pick<DailyGoal, "title" | "description" | "category" | "metric">;

// Rule-based daily goal suggestions: small, achievable steps sized to the user's own recent numbers
export function suggestGoals(s: ProgressSnapshot): GoalDraft[] {
  const drafts: GoalDraft[] = [];
  const level = s.preferences.fitnessLevel;
  const minutes = Math.min(s.preferences.availableMinutes, level === "Advanced" ? 40 : level === "Intermediate" ? 25 : 15);
  const weeklyTarget = level === "Advanced" ? 5 : level === "Intermediate" ? 4 : 3;

  // Activity: a little more than the user's own average, never a huge jump
  const base = s.activity.avgStepsThisWeek;
  const stepTarget = base > 0
    ? Math.min(Math.max(Math.round((base + 1000) / 500) * 500, 2000), Math.max(s.profile.stepGoal, base + 1000))
    : 3000;
  if (s.activity.todaySteps < stepTarget) {
    drafts.push({
      title: base > 0 ? "Walk 10 extra minutes" : "Take a 10-minute walk",
      description: base > 0
        ? `You average ${base.toLocaleString()} steps. A 10-minute walk (about 1,000 steps) gets you to ${stepTarget.toLocaleString()} today.`
        : "A short walk after a meal is an easy start. Aim for about 3,000 steps today.",
      category: "activity",
      metric: { type: "steps", target: stepTarget },
    });
  }

  // Workout: only if this week is still under the level's weekly target
  if (s.workouts.thisWeek < weeklyTarget && s.workouts.today === 0) {
    drafts.push({
      title: `Complete a ${minutes}-minute workout`,
      description: `${s.workouts.thisWeek} of ${weeklyTarget} workouts done this week. Pick any short session from the Workout tab${s.preferences.preferredWorkoutTime ? ` this ${s.preferences.preferredWorkoutTime.toLowerCase()}` : ""}.`,
      category: "workout",
      metric: { type: "workouts", target: 1 },
    });
  }

  // Nutrition: tracking first, then quality
  if (s.meals.daysLoggedThisWeek < 5 || s.meals.todayMealCount === 0) {
    drafts.push({
      title: "Track today's meals",
      description: "Log breakfast, lunch and dinner. Even rough portions (1 roti, half bowl daal) help your coach give better advice.",
      category: "nutrition",
      metric: { type: "meals", target: 3 },
    });
  } else if (s.meals.avgCaloriesLogged && s.meals.avgCaloriesLogged > s.profile.calorieIntakeGoal + 200) {
    drafts.push({
      title: "Swap one fried item today",
      description: `You've averaged ${s.meals.avgCaloriesLogged} kcal against a ${s.profile.calorieIntakeGoal} kcal goal. Try roti instead of paratha, or grilled tikka instead of fried snacks.`,
      category: "nutrition",
    });
  } else {
    drafts.push({
      title: "Add protein to each meal",
      description: "Include daal, chana, eggs, dahi or chicken with every meal to stay full and support your goal.",
      category: "nutrition",
    });
  }

  // Hydration
  const waterAvg = s.activity.avgWaterThisWeek;
  if (waterAvg < s.profile.waterGoal * 0.8) {
    const target = Math.min(s.profile.waterGoal, Math.max(1500, Math.round((waterAvg + 500) / 250) * 250));
    drafts.push({
      title: "Keep up regular hydration",
      description: `Drink about ${target.toLocaleString()} ml today. Keep a bottle nearby and have a glass with each meal.`,
      category: "hydration",
      metric: { type: "water", target },
    });
  }

  // Sleep fills the remaining slot
  if (drafts.length < 4) {
    drafts.push({
      title: "Improve sleep consistency",
      description: "Go to bed at the same time tonight and aim for 7-8 hours. Put the phone away 30 minutes before.",
      category: "sleep",
    });
  }
  return drafts.slice(0, 4);
}

// Current value for a measurable goal, read from today's logs
export function metricProgress(userId: string, metric: NonNullable<DailyGoal["metric"]>, date: string): number {
  const log = db.findDailyLogs(l => l.userId === userId && l.date === date)[0];
  switch (metric.type) {
    case "steps": return log?.stepsCount || 0;
    case "water": return log?.waterLogged || 0;
    case "meals": return db.findMealLogs(m => m.userId === userId && m.date === date).length;
    case "workouts": return db.findWorkoutLogs(w => w.userId === userId && w.date === date).length;
  }
}

// Rule-based motivation used when Gemini is not configured or fails
export function ruleBasedMotivation(s: ProgressSnapshot, kind: "check-in" | "weekly") {
  const first = s.profile.name.split(" ")[0] || "there";
  const goals = suggestGoals(s).slice(0, 3).map(g => g.title);
  const adjustments: string[] = [];
  let headline = "";
  let message = "";

  if (s.status === "building-baseline") {
    headline = "Let's build your baseline";
    message = `Hi ${first}! I need about a week of logs before I can spot trends. Log your meals, water and workouts each day and weigh yourself 2-3 times a week at the same time of day.`;
  } else if (s.status === "slowing") {
    headline = "Progress has slowed a little, and that's normal";
    message = `${first}, every journey has slower weeks. Here is what the data shows: ${s.signals.join(" ")} Small, steady changes will get things moving again. No need for anything drastic.`;
    if (s.weight.plateau && s.profile.goal === "Lose Weight") adjustments.push("Cut one sweet drink or fried snack a day instead of skipping meals.");
    if (s.weight.plateau && s.profile.goal === "Build Muscle") adjustments.push("Add a protein portion (2 eggs, a bowl of daal or dahi) to one more meal each day.");
    if (s.workouts.thisWeek < s.workouts.lastWeek) adjustments.push(`Book ${Math.min(s.preferences.availableMinutes, 20)}-minute workouts at a fixed ${s.preferences.preferredWorkoutTime.toLowerCase()} time on 3 days.`);
    if (s.meals.daysLoggedThisWeek < s.meals.daysLoggedLastWeek) adjustments.push("Log meals right after eating, even roughly. It takes under a minute.");
    if (s.activity.avgStepsThisWeek < s.activity.avgStepsLastWeek) adjustments.push("Take a 10-minute walk after lunch or dinner.");
  } else if (s.status === "improving") {
    headline = "You're making real progress";
    message = `Great work, ${first}! ${s.wins.join(" ")} Keep the same routine. Consistency is what's working.`;
  } else {
    headline = "Steady and on track";
    message = `You're on track, ${first}. ${s.wins.length ? s.wins.join(" ") + " " : ""}Keep showing up. Small daily actions add up.`;
  }

  if (!adjustments.length && s.status !== "building-baseline") {
    adjustments.push("Keep your current routine and add one small step, like a short walk after dinner.");
  }
  if (kind === "weekly") {
    headline = `Weekly review: ${headline.charAt(0).toLowerCase()}${headline.slice(1)}`;
    message += ` This week: ${s.workouts.thisWeek} workouts (${s.workouts.minutesThisWeek} min), meals logged on ${s.meals.daysLoggedThisWeek} days, ${s.activity.avgStepsThisWeek.toLocaleString()} average steps.`;
  }

  return { headline, message, smallGoals: goals, adjustments: adjustments.slice(0, 3), celebrations: s.wins.slice(0, 3) };
}

// Plain-text summary of the user's data for the coach chat prompt
export function coachContext(user: UserProfile): string {
  const s = buildSnapshot(user);
  const todayMeals = db.findMealLogs(m => m.userId === user.id && m.date === s.today);
  const todayGoals = db.findDailyGoals(g => g.userId === user.id && g.date === s.today && g.status !== "skipped");
  const mealLines = todayMeals.length
    ? todayMeals.map(m => `  - ${m.category}: ${m.name} (${m.calories} kcal, P ${m.protein}g, C ${m.carbs}g, F ${m.fat}g)`).join("\n")
    : "  - none logged yet";
  const goalLines = todayGoals.length ? todayGoals.map(g => `  - ${g.title} [${g.status}]`).join("\n") : "  - none";
  return `User's real tracked data (use it, do not invent numbers that are not here):
- Progress status: ${s.status}
- Days with any tracking in the last 14 days: ${s.daysTracked}
- Weight trend: ${s.weight.trend === "insufficient-data" ? "not enough weigh-ins yet" : `${s.weight.trend}, ${s.weight.weeklyRate} kg/week (recent avg ${s.weight.recentAvg} kg)`}
- Workouts: ${s.workouts.thisWeek} this week (${s.workouts.minutesThisWeek} min), ${s.workouts.lastWeek} last week
- Meals logged on ${s.meals.daysLoggedThisWeek}/7 days this week; average logged intake ${s.meals.avgCaloriesLogged ?? "unknown"} kcal vs goal ${user.calorieIntakeGoal} kcal
- Steps: ${s.activity.todaySteps} today, ${s.activity.avgStepsThisWeek} average this week (goal ${user.stepGoal})
- Water: ${s.activity.todayWater} ml today (goal ${user.waterGoal} ml)
- Today's meals:
${mealLines}
- Today's goals:
${goalLines}
- Things that slipped: ${s.signals.join(" ") || "none"}
- Wins: ${s.wins.join(" ") || "none yet"}
- Fitness level: ${s.preferences.fitnessLevel}; available time: ${s.preferences.availableMinutes} min/day; prefers ${s.preferences.preferredWorkoutTime.toLowerCase()} workouts`;
}
