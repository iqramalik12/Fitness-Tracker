// Shared nutrition maths used by both the server and the browser

export interface Nutrients {
  calories: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  fiber: number; // g
}

export const ZERO_NUTRIENTS: Nutrients = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

const round1 = (n: number) => Math.round(n * 10) / 10;

// Scale a per-100g profile to an eaten weight in grams
export function scaleNutrients(per100g: Nutrients, grams: number): Nutrients {
  const f = grams / 100;
  return {
    calories: Math.round(per100g.calories * f),
    protein: round1(per100g.protein * f),
    carbs: round1(per100g.carbs * f),
    fat: round1(per100g.fat * f),
    fiber: round1(per100g.fiber * f),
  };
}

export function sumNutrients(list: Partial<Nutrients>[]): Nutrients {
  const total = list.reduce<Nutrients>(
    (acc, n) => ({
      calories: acc.calories + (n.calories || 0),
      protein: acc.protein + (n.protein || 0),
      carbs: acc.carbs + (n.carbs || 0),
      fat: acc.fat + (n.fat || 0),
      fiber: acc.fiber + (n.fiber || 0),
    }),
    { ...ZERO_NUTRIENTS }
  );
  return {
    calories: Math.round(total.calories),
    protein: round1(total.protein),
    carbs: round1(total.carbs),
    fat: round1(total.fat),
    fiber: round1(total.fiber),
  };
}

// Macro targets from a calorie goal (30% protein, 40% carbs, 30% fat), matching the existing Diet tab
export function macroTargets(calorieGoal: number) {
  return {
    protein: Math.round((calorieGoal * 0.3) / 4),
    carbs: Math.round((calorieGoal * 0.4) / 4),
    fat: Math.round((calorieGoal * 0.3) / 9),
  };
}
