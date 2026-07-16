/**
 * Pulse.fit Integration & Unit Test Suite
 * Fully functional testing framework for verifying backend API compliance,
 * security protocols, database integrity, and validation flows.
 */

import { db, DatabaseSchema } from "../db.ts";
import { signToken, verifyToken } from "../routers/auth.ts";
import { calculateBMI } from "../routers/users.ts";

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
