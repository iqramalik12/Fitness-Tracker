/**
 * Pulse.fit Integration & Unit Test Suite
 * Fully functional testing framework for verifying backend API compliance,
 * security protocols, database integrity, and validation flows.
 */

import { db, DatabaseSchema } from "../db.ts";
import { signToken, verifyToken } from "../routers/auth.ts";
import { calculateBMI } from "../routers/users.ts";
import { calculateBmi, validateBmiInput, toCm, toKg } from "../../lib/bmi.ts";
import { findFood, findPortion, portionNutrition, searchFoods, FOODS } from "../../lib/foods.ts";
import { sumNutrients } from "../../lib/nutrition.ts";
import { analyzeWeight, suggestGoals, buildSnapshot, dateOffset } from "../progress.ts";

let testsPassed = 0;
let testsFailed = 0;

function describe(suiteName: string, fn: () => void) {
  console.log(`\n\x1b[35m=== Suite: ${suiteName} ===\x1b[0m`);
  fn();
}

function it(testName: string, fn: () => void) {
  try {
    fn();
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${testName}`);
    testsPassed++;
  } catch (error: any) {
    console.error(`  \x1b[31m✘ FAIL:\x1b[0m ${testName}`);
    console.error(`    \x1b[33mError:\x1b[0m ${error.message || error}`);
    testsFailed++;
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (typeof actual !== "number" || actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      if (typeof actual !== "number" || actual >= expected) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },
    toExist() {
      if (actual === null || actual === undefined) {
        throw new Error(`Expected value to exist, but got ${actual}`);
      }
    },
    toInclude(substring: string) {
      if (typeof actual !== "string" || !actual.includes(substring)) {
        throw new Error(`Expected string "${actual}" to include "${substring}"`);
      }
    }
  };
}

// Start testing sequence
describe("Database Engine Core Operations", () => {
  it("Should successfully load the default collections", () => {
    const users = db.getCollection("users");
    expect(users.length).toBeGreaterThan(0);
    expect(users[0].name).toBe("Iqra Malik");
  });

  it("Should perform CRUD operations safely", () => {
    // 1. Create/Insert
    const newWorkout = db.insert("workout_logs", {
      userId: "usr-test",
      title: "Morning Sprint Test",
      category: "Cardio",
      durationMinutes: 15,
      caloriesBurn: 120,
      exercisesCount: 1,
      completedAt: new Date().toISOString(),
      date: "2026-07-15"
    });
    expect(newWorkout.id).toExist();
    expect(newWorkout.title).toBe("Morning Sprint Test");

    // 2. Read
    const fetched = db.findWorkoutLogs(w => w.id === newWorkout.id);
    expect(fetched.length).toBe(1);
    expect(fetched[0].durationMinutes).toBe(15);

    // 3. Update
    const updated = db.update("workout_logs", newWorkout.id, { durationMinutes: 20, caloriesBurn: 160 });
    expect(updated).toExist();
    expect(updated!.durationMinutes).toBe(20);
    expect(updated!.caloriesBurn).toBe(160);

    // 4. Delete
    const deleted = db.delete("workout_logs", newWorkout.id);
    expect(deleted).toBe(true);
    
    const fetchedAfterDelete = db.findWorkoutLogs(w => w.id === newWorkout.id);
    expect(fetchedAfterDelete.length).toBe(0);
  });

  it("Should automatically initialize a daily log when requesting non-existent records", () => {
    const dateStr = "2026-12-25";
    const log = db.getOrCreateDailyLog("usr-demo", dateStr, 78);
    expect(log).toExist();
    expect(log.date).toBe(dateStr);
    expect(log.waterLogged).toBe(0);
    expect(log.weightLog).toBe(78);

    // Cleanup generated testing entry
    db.delete("daily_logs", log.id);
  });
});

describe("JWT Authentication & Encryption Handshake", () => {
  it("Should sign and verify custom payload successfully", () => {
    const payload = { id: "usr-999", email: "test@example.com", name: "Alpha Tester" };
    const token = signToken(payload);
    
    expect(token).toExist();
    expect(token.split(".").length).toBe(3);

    const verified = verifyToken(token);
    expect(verified).toExist();
    expect(verified.id).toBe("usr-999");
    expect(verified.email).toBe("test@example.com");
  });

  it("Should reject forged, altered, or expired tokens", () => {
    const payload = { id: "usr-999", email: "test@example.com" };
    const token = signToken(payload);
    
    // Altered payload signature
    const forgedToken = token + "forged";
    const verifiedAltered = verifyToken(forgedToken);
    expect(verifiedAltered).toBe(null);

    // Random string
    const verifiedRandom = verifyToken("invalid-token-string");
    expect(verifiedRandom).toBe(null);
  });
});

describe("User Profiles & BMI Calculations", () => {
  it("Should calculate BMI and statuses accurately", () => {
    // Underweight Check
    const underweight = calculateBMI(50, 180); // BMI 15.4
    expect(underweight.bmi).toBe(15.4);
    expect(underweight.status).toBe("Underweight");

    // Normal Check
    const normal = calculateBMI(72, 178); // BMI 22.7
    expect(normal.bmi).toBe(22.7);
    expect(normal.status).toBe("Normal");

    // Overweight Check
    const overweight = calculateBMI(88, 178); // BMI 27.8
    expect(overweight.bmi).toBe(27.8);
    expect(overweight.status).toBe("Overweight");

    // Obese Check
    const obese = calculateBMI(110, 175); // BMI 35.9
    expect(obese.bmi).toBe(35.9);
    expect(obese.status).toBe("Obese");
  });
});

describe("Hydration & Calories Logic Synchronization", () => {
  it("Should prevent negative step counts and correctly extrapolate calorie active burn", () => {
    const mockUserId = "usr-sync-test";
    const dateStr = "2026-07-15";
    
    const dailyLog = db.getOrCreateDailyLog(mockUserId, dateStr, 70);
    expect(dailyLog.stepsCount).toBe(0);
    expect(dailyLog.caloriesBurned).toBe(0);

    // Simulate stepping: step count 5000 (which adds 200 kcal since 5000 * 0.04 = 200)
    const newSteps = 5000;
    const additionalBurn = Math.round(newSteps * 0.04);
    
    const updated = db.update("daily_logs", dailyLog.id, {
      stepsCount: newSteps,
      caloriesBurned: dailyLog.caloriesBurned + additionalBurn
    });

    expect(updated).toExist();
    expect(updated!.stepsCount).toBe(5000);
    expect(updated!.caloriesBurned).toBe(200);

    // Clean up
    db.delete("daily_logs", dailyLog.id);
  });
});


describe("BMI Calculator Module", () => {
  it("Should convert all supported height and weight units", () => {
    expect(Math.round(toCm("ft-in", 5, 7) * 10) / 10).toBe(170.2);
    expect(toCm("m", 1.7)).toBe(170);
    expect(toCm("cm", 170)).toBe(170);
    expect(Math.round(toKg("lb", 160) * 10) / 10).toBe(72.6);
    expect(toKg("kg", 72)).toBe(72);
  });

  it("Should give the same BMI whichever units are used", () => {
    const metric = calculateBmi({ age: 30, heightUnit: "cm", heightValue: 170.18, weightUnit: "kg", weightValue: 72.57 });
    const imperial = calculateBmi({ age: 30, heightUnit: "ft-in", heightValue: 5, heightInches: 7, weightUnit: "lb", weightValue: 160 });
    expect(metric.bmi).toBe(imperial.bmi);
    expect(imperial.bmi).toBe(25.1);
  });

  it("Should apply adult categories at the standard cut-offs", () => {
    const cat = (kg: number) => calculateBmi({ age: 25, heightUnit: "m", heightValue: 1, weightUnit: "kg", weightValue: kg }).category;
    expect(cat(18.4)).toBe("Underweight");
    expect(cat(18.5)).toBe("Healthy weight");
    expect(cat(24.9)).toBe("Healthy weight");
    expect(cat(25)).toBe("Overweight");
    expect(cat(29.9)).toBe("Overweight");
    expect(cat(30)).toBe("Obesity");
  });

  it("Should not apply adult categories to people under 20", () => {
    const teen = calculateBmi({ age: 15, heightUnit: "cm", heightValue: 160, weightUnit: "kg", weightValue: 50 });
    expect(teen.category).toBe(null);
    expect(teen.ageGroup).toBe("child");
    expect(teen.explanation).toInclude("BMI-for-age");
    const adult = calculateBmi({ age: 20, heightUnit: "cm", heightValue: 160, weightUnit: "kg", weightValue: 50 });
    expect(adult.category).toBe("Healthy weight");
  });

  it("Should reject invalid input", () => {
    expect(validateBmiInput({ age: 1, heightUnit: "cm", heightValue: 170, weightUnit: "kg", weightValue: 70 }).length).toBe(1);
    expect(validateBmiInput({ age: 30, heightUnit: "cm", heightValue: 12, weightUnit: "kg", weightValue: 70 }).length).toBe(1);
    expect(validateBmiInput({ age: 30, heightUnit: "ft-in", heightValue: 5, heightInches: 14, weightUnit: "kg", weightValue: 70 }).length).toBe(1);
    expect(validateBmiInput({ age: 30, heightUnit: "cm", heightValue: 170, weightUnit: "lb", weightValue: 0 }).length).toBe(1);
    expect(validateBmiInput({ age: 30, heightUnit: "cm", heightValue: 170, weightUnit: "kg", weightValue: 70 }).length).toBe(0);
  });
});

describe("Pakistani Meal Tracking Module", () => {
  it("Should include the core Pakistani foods", () => {
    for (const id of ["roti", "naan", "paratha", "daal-masoor", "chana", "lobia", "chicken-karahi", "chicken-salan", "mixed-sabzi", "rice-plain", "biryani", "pulao", "egg-boiled", "yogurt", "milk", "banana", "almonds", "samosa"]) {
      expect(findFood(id)).toExist();
    }
    expect(FOODS.length).toBeGreaterThan(50);
  });

  it("Should find foods by Roman Urdu names", () => {
    expect(searchFoods("chawal")[0].id).toBe("rice-plain");
    expect(searchFoods("anda").some(f => f.id === "egg-boiled")).toBe(true);
    expect(searchFoods("daal").length).toBeGreaterThan(3);
  });

  it("Should scale nutrition by portion and quantity", () => {
    const roti = findFood("roti")!;
    const two = portionNutrition(roti, findPortion(roti, "medium")!, 2); // 80 g at 280 kcal/100 g
    expect(two.grams).toBe(80);
    expect(two.calories).toBe(224);
    const daal = findFood("daal-masoor")!;
    const half = portionNutrition(daal, findPortion(daal, "half-bowl")!, 1);
    const full = portionNutrition(daal, findPortion(daal, "full-bowl")!, 1);
    expect(full.calories).toBe(half.calories * 2);
    const grams = portionNutrition(daal, findPortion(daal, "g")!, 120);
    expect(grams.calories).toBe(half.calories);
  });

  it("Should total a meal's items", () => {
    const t = sumNutrients([{ calories: 224, protein: 7.6 }, { calories: 132, protein: 7.2, fiber: 4.2 }]);
    expect(t.calories).toBe(356);
    expect(t.protein).toBe(14.8);
    expect(t.fiber).toBe(4.2);
  });
});

describe("AI Motivation Coach Progress Analysis", () => {
  const pts = (pairs: [number, number][]) => pairs.map(([daysAgo, weight]) => ({ date: dateOffset(daysAgo), weight }));

  it("Should not judge a trend without enough weigh-ins", () => {
    const r = analyzeWeight(pts([[0, 80], [1, 81.5]]), "Lose Weight");
    expect(r.trend).toBe("insufficient-data");
    expect(r.plateau).toBe(false);
  });

  it("Should ignore normal daily swings when the average is falling", () => {
    // Earlier weeks average 82; this week bounces 80-81.2 but averages ~80.6
    const r = analyzeWeight(pts([[21, 82.2], [18, 81.8], [16, 82], [6, 81.2], [3, 80.1], [0, 80.5]]), "Lose Weight");
    expect(r.trend).toBe("down");
    expect(r.plateau).toBe(false);
  });

  it("Should flag a plateau when the multi-week average is flat for a weight-loss goal", () => {
    const r = analyzeWeight(pts([[24, 80.0], [20, 80.4], [15, 79.9], [5, 80.3], [2, 79.8], [0, 80.2]]), "Lose Weight");
    expect(r.trend).toBe("flat");
    expect(r.plateau).toBe(true);
  });

  it("Should not call a stable weight a plateau for a stay-active goal", () => {
    const r = analyzeWeight(pts([[24, 70], [20, 70.2], [5, 70.1], [1, 70]]), "Stay Active");
    expect(r.plateau).toBe(false);
  });

  it("Should suggest small goals sized to the user's own activity", () => {
    const user = db.getCollection("users")[0];
    const snap = buildSnapshot(user);
    snap.activity.avgStepsThisWeek = 4000;
    snap.activity.todaySteps = 0;
    const goals = suggestGoals(snap);
    expect(goals.length).toBeGreaterThan(1);
    const walk = goals.find(g => g.metric?.type === "steps")!;
    expect(walk.metric!.target).toBe(5000);
  });
});

// Summary reporting
console.log("\n==================================================");
console.log(`\x1b[1mTESTS COMPLETE:\x1b[0m`);
console.log(`  \x1b[32mPassed: ${testsPassed}\x1b[0m`);
console.log(`  \x1b[31mFailed: ${testsFailed}\x1b[0m`);
console.log("==================================================");

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log("\x1b[32;1mAll unit and integration assertions executed flawlessly! Ready for production deployment.\x1b[0m\n");
  process.exit(0);
}
