// Shared BMI maths used by the BMI calculator page and the /api/bmi endpoints

export type HeightUnit = "ft-in" | "cm" | "m";
export type WeightUnit = "kg" | "lb";

export type AdultBmiCategory = "Underweight" | "Healthy weight" | "Overweight" | "Obesity";

export interface BmiInput {
  age: number;
  heightUnit: HeightUnit;
  heightValue: number; // cm, m, or feet (when ft-in)
  heightInches?: number; // only used with ft-in
  weightUnit: WeightUnit;
  weightValue: number;
}

export interface BmiResult {
  bmi: number;
  heightCm: number;
  weightKg: number;
  ageGroup: "adult" | "child";
  category: AdultBmiCategory | null; // null when adult categories do not apply
  healthyRange: { min: number; max: number } | null;
  // Weight range in kg that corresponds to the healthy adult BMI range at this height
  healthyWeightKg: { min: number; max: number } | null;
  explanation: string;
}

export const ADULT_CATEGORIES: { label: AdultBmiCategory; min: number; max: number; color: string }[] = [
  { label: "Underweight", min: 0, max: 18.5, color: "#38bdf8" },
  { label: "Healthy weight", min: 18.5, max: 25, color: "#34d399" },
  { label: "Overweight", min: 25, max: 30, color: "#fbbf24" },
  { label: "Obesity", min: 30, max: Infinity, color: "#f87171" },
];

const round1 = (n: number) => Math.round(n * 10) / 10;

export const toCm = (unit: HeightUnit, value: number, inches = 0): number => {
  if (unit === "cm") return value;
  if (unit === "m") return value * 100;
  return (value * 12 + inches) * 2.54;
};

export const toKg = (unit: WeightUnit, value: number): number => (unit === "kg" ? value : value * 0.45359237);

export const cmToFtIn = (cm: number) => {
  const totalIn = cm / 2.54;
  let ft = Math.floor(totalIn / 12);
  let inches = Math.round(totalIn - ft * 12);
  if (inches === 12) { ft += 1; inches = 0; }
  return { ft, inches };
};

export const kgToLb = (kg: number) => kg / 0.45359237;

// Returns a list of problems with the input; empty when valid
export function validateBmiInput(input: Partial<BmiInput>): string[] {
  const errors: string[] = [];
  const age = Number(input.age);
  if (!Number.isFinite(age) || age < 2 || age > 120) errors.push("Age must be between 2 and 120 years.");
  if (!["ft-in", "cm", "m"].includes(input.heightUnit as string)) errors.push("Choose a height unit.");
  if (!["kg", "lb"].includes(input.weightUnit as string)) errors.push("Choose a weight unit.");

  const heightValue = Number(input.heightValue);
  const inches = Number(input.heightInches ?? 0);
  if (!Number.isFinite(heightValue) || heightValue <= 0) {
    errors.push("Enter a height.");
  } else if (input.heightUnit === "ft-in" && (!Number.isFinite(inches) || inches < 0 || inches >= 12)) {
    errors.push("Inches must be between 0 and 11.");
  } else if (input.heightUnit) {
    const cm = toCm(input.heightUnit as HeightUnit, heightValue, inches);
    if (cm < 50 || cm > 272) errors.push("Height must be between 50 cm and 272 cm (1 ft 8 in to 8 ft 11 in).");
  }

  const weightValue = Number(input.weightValue);
  if (!Number.isFinite(weightValue) || weightValue <= 0) {
    errors.push("Enter a weight.");
  } else if (input.weightUnit) {
    const kg = toKg(input.weightUnit as WeightUnit, weightValue);
    if (kg < 5 || kg > 400) errors.push("Weight must be between 5 kg and 400 kg (11 lb to 880 lb).");
  }
  return errors;
}

export function adultCategory(bmi: number): AdultBmiCategory {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy weight";
  if (bmi < 30) return "Overweight";
  return "Obesity";
}

export function calculateBmi(input: BmiInput): BmiResult {
  const heightCm = toCm(input.heightUnit, input.heightValue, input.heightInches ?? 0);
  const weightKg = toKg(input.weightUnit, input.weightValue);
  const heightM = heightCm / 100;
  const bmi = round1(weightKg / (heightM * heightM));

  if (input.age < 20) {
    return {
      bmi,
      heightCm: round1(heightCm),
      weightKg: round1(weightKg),
      ageGroup: "child",
      category: null,
      healthyRange: null,
      healthyWeightKg: null,
      explanation:
        "For people under 20, adult BMI categories do not apply. BMI has to be compared with age- and sex-specific " +
        "BMI-for-age growth charts (CDC or WHO) to get a percentile. Please ask a doctor or paediatrician, or use a " +
        "growth-chart tool, for a proper assessment.",
    };
  }

  const category = adultCategory(bmi);
  const explanations: Record<AdultBmiCategory, string> = {
    "Underweight": "This BMI is below the healthy adult range. A doctor or dietitian can help check whether you are eating enough and getting the nutrients you need.",
    "Healthy weight": "This BMI is within the healthy adult range. Keep up regular activity and balanced meals to stay here.",
    "Overweight": "This BMI is above the healthy adult range. Small, steady changes such as daily walks and smaller portions of fried food and sweets can help over time.",
    "Obesity": "This BMI is in the obesity range, which can raise health risks. A doctor can help you plan safe, gradual changes that suit you.",
  };

  return {
    bmi,
    heightCm: round1(heightCm),
    weightKg: round1(weightKg),
    ageGroup: "adult",
    category,
    healthyRange: { min: 18.5, max: 24.9 },
    healthyWeightKg: { min: round1(18.5 * heightM * heightM), max: round1(24.9 * heightM * heightM) },
    explanation: explanations[category],
  };
}

export const BMI_DISCLAIMER =
  "BMI is a screening measure only. It does not measure body fat directly or tell you about muscle mass, " +
  "fat distribution, or overall health, and it is not a diagnosis. Talk to a healthcare professional about your results.";
