import { WorkoutPlan, MealItem, ProgressHistory, UserProfile } from "./types";

export const DEFAULT_PROFILE: UserProfile = {
  name: "Iqra Malik",
  age: 26,
  gender: "Female",
  country: "Pakistan",
  weight: 74,
  height: 178,
  goal: "Build Muscle",
  bmi: 23.4,
  bmiStatus: "Normal",
  units: "metric",
  waterGoal: 2500,
  calorieBurnGoal: 600,
  calorieIntakeGoal: 2400,
  stepGoal: 10000,
  isRegistered: true,
  onboarded: true,
};

export const WORKOUT_PLANS: WorkoutPlan[] = [
  {
    id: "plan-hiit-1",
    title: "Full Body Ignite HIIT",
    category: "HIIT",
    durationMinutes: 20,
    level: "Intermediate",
    caloriesBurn: 280,
    exercisesCount: 4,
    imageUrl: "⚡",
    description: "High-intensity interval training designed to maximize fat burn and elevate cardiorespiratory capacity in under 20 minutes.",
    exercises: [
      {
        id: "ex-hiit-1",
        name: "Jumping Jacks",
        sets: 3,
        reps: 45, // Seconds
        caloriesBurn: 35,
        muscleGroup: "Cardio, Quads",
        imageUrl: "🏃‍♂️",
        description: "Jump up and spread legs while clapping hands overhead, returning to baseline.",
        instructions: [
          "Start with feet together and arms at your sides.",
          "Jump up, spread feet wider than shoulder-width, and clap hands above head.",
          "Jump back to the initial standing position immediately.",
          "Maintain a steady, energetic rhythm."
        ]
      },
      {
        id: "ex-hiit-2",
        name: "Burpees",
        sets: 3,
        reps: 15,
        caloriesBurn: 80,
        muscleGroup: "Full Body, Core",
        imageUrl: "🤸‍♂️",
        description: "A highly challenging total body power movement combining squats, pushups, and explosive jumps.",
        instructions: [
          "Stand straight, then drop into a squat position with hands on the floor.",
          "Kick feet back to a plank position and perform a crisp pushup.",
          "Immediately return feet to squat position and explosively jump up into the air.",
          "Land softly and repeat."
        ]
      },
      {
        id: "ex-hiit-3",
        name: "Mountain Climbers",
        sets: 3,
        reps: 40,
        caloriesBurn: 50,
        muscleGroup: "Core, Shoulders",
        imageUrl: "🏔️",
        description: "A rapid floor exercise targeting core stability while boosting your heart rate.",
        instructions: [
          "Begin in a high plank position with shoulders stacked over wrists.",
          "Drive right knee towards chest, then return to start while bringing left knee forward.",
          "Keep hips level and engage your core tightly throughout.",
          "Alternate rapidly as if running horizontal."
        ]
      },
      {
        id: "ex-hiit-4",
        name: "High Knees",
        sets: 3,
        reps: 50,
        caloriesBurn: 45,
        muscleGroup: "Calves, Hip Flexors",
        imageUrl: "🦵",
        description: "Rapidly run in place while driving knees up high to challenge core and lower limbs.",
        instructions: [
          "Stand tall with chest proud and shoulders relaxed.",
          "Alternate driving knees upward toward waist height as fast as possible.",
          "Pump arms dynamically with each stride to balance."
        ]
      }
    ]
  },
  {
    id: "plan-strength-1",
    title: "Apex Hypertrophy Upper",
    category: "Strength",
    durationMinutes: 45,
    level: "Advanced",
    caloriesBurn: 380,
    exercisesCount: 4,
    imageUrl: "💪",
    description: "An intense push-pull upper body program focusing on muscular hypertrophy, density, and functional strength.",
    exercises: [
      {
        id: "ex-strength-1",
        name: "Dumbbell Bench Press",
        sets: 4,
        reps: 10,
        caloriesBurn: 90,
        muscleGroup: "Chest, Triceps",
        imageUrl: "🏋️‍♂️",
        description: "Classic multi-joint horizontal push to develop heavy chest power and tricep density.",
        instructions: [
          "Lie flat on a bench, holding dumbbells at chest level.",
          "Press weights straight up over shoulders, locking out with control.",
          "Lower down slowly till weights gently touch outer chest region.",
          "Keep feet planted firmly for maximum power transfer."
        ]
      },
      {
        id: "ex-strength-2",
        name: "Bent-Over Row",
        sets: 4,
        reps: 12,
        caloriesBurn: 95,
        muscleGroup: "Lats, Upper Back",
        imageUrl: "🚣‍♂️",
        description: "Pillar pulling movement to expand lats, mid-back depth, and reinforce posture.",
        instructions: [
          "Hinge at the hips with a flat back, holding dumbbells hanging down.",
          "Pull weights to lower rib cage, squeezing shoulder blades tightly at peak.",
          "Lower weights under eccentric control back to straight arms.",
          "Never round lower spine."
        ]
      },
      {
        id: "ex-strength-3",
        name: "Shoulder Overhead Press",
        sets: 3,
        reps: 10,
        caloriesBurn: 75,
        muscleGroup: "Deltoids, Shoulders",
        imageUrl: "🎽",
        description: "Vertical push targeting complete shoulder development, upper traps, and core stability.",
        instructions: [
          "Sit or stand tall, holding dumbbells right at collarbone height.",
          "Press weights vertically overhead until arms are completely locked out.",
          "Keep ribs down and core braced to avoid hyperextending lower back.",
          "Lower slowly to chin level."
        ]
      },
      {
        id: "ex-strength-4",
        name: "Hammer Bicep Curls",
        sets: 3,
        reps: 12,
        caloriesBurn: 50,
        muscleGroup: "Biceps, Brachialis",
        imageUrl: "🥤",
        description: "Neutral grip curl to construct solid forearms and peak bicep muscles.",
        instructions: [
          "Stand straight with dumbbells at sides, palms facing inward.",
          "Curl dumbbells up while keeping palms facing each other throughout.",
          "Squeeze biceps at the top and release down slowly with control.",
          "Minimize swinging elbow alignment."
        ]
      }
    ]
  },
  {
    id: "plan-cardio-1",
    title: "Cardio Endurance Booster",
    category: "Cardio",
    durationMinutes: 30,
    level: "Beginner",
    caloriesBurn: 250,
    exercisesCount: 3,
    imageUrl: "🫁",
    description: "Aerobic-focused low-impact workout to build baseline cardiovascular endurance, metabolism, and active lung capacity.",
    exercises: [
      {
        id: "ex-cardio-1",
        name: "Power Walk / Jog",
        sets: 1,
        reps: 1,
        durationSeconds: 900, // 15 mins
        caloriesBurn: 130,
        muscleGroup: "Cardio, Calves",
        imageUrl: "👟",
        description: "Steady state jogging to strengthen cardiac output and overall fat oxidation metrics.",
        instructions: [
          "Establish an upright, natural running gait with head looking forward.",
          "Land lightly on midfoot and pump arms naturally.",
          "Inhale through nose, exhale out mouth in controlled counts."
        ]
      },
      {
        id: "ex-cardio-2",
        name: "Butt Kicks",
        sets: 3,
        reps: 45, // seconds
        caloriesBurn: 60,
        muscleGroup: "Hamstrings, Quads",
        imageUrl: "🍑",
        description: "Fast in-place running drill focused on stretching quad fibers and firing up hamstrings.",
        instructions: [
          "Stand with feet shoulder-width and run in place.",
          "Exaggerate kick back so your heels gently tap glutes sequentially.",
          "Keep core tight and hands behind back or pumping."
        ]
      },
      {
        id: "ex-cardio-3",
        name: "Skaters",
        sets: 3,
        reps: 30,
        caloriesBurn: 60,
        muscleGroup: "Glute Medius, Calves",
        imageUrl: "⛸️",
        description: "Lateral leaping movement to hone side-to-side stability, balance, and quickness.",
        instructions: [
          "Leap laterally to the right, landing on right foot while sweeping left foot behind.",
          "Immediately spring back to the left, repeating the motion.",
          "Reach opposite hand down towards foot for advanced torso integration."
        ]
      }
    ]
  },
  {
    id: "plan-yoga-1",
    title: "Mind-Body Vinyasa Flow",
    category: "Yoga",
    durationMinutes: 25,
    level: "Beginner",
    caloriesBurn: 120,
    exercisesCount: 4,
    imageUrl: "🧘‍♀️",
    description: "Restorative sequence designed to enhance total body mobility, open tight joints, and lower systemic stress levels.",
    exercises: [
      {
        id: "ex-yoga-1",
        name: "Downward Facing Dog",
        sets: 3,
        reps: 10, // breaths
        caloriesBurn: 20,
        muscleGroup: "Hamstrings, Spine",
        imageUrl: "🐕",
        description: "Inverted V posture serving as a structural stretch for hamstrings and posterior chain.",
        instructions: [
          "Begin on hands and knees, with hands placed slightly ahead of shoulders.",
          "Press hips up and back to create a clean inverted V frame with body.",
          "Extend heels down towards mat and let head hang relaxed between arms.",
          "Brace shoulders and ground knuckle mounds."
        ]
      },
      {
        id: "ex-yoga-2",
        name: "Warrior II",
        sets: 2,
        reps: 8,
        caloriesBurn: 30,
        muscleGroup: "Thighs, Shoulders",
        imageUrl: "⚔️",
        description: "Powerful static posture to strengthen thighs, open hips, and engage broad shoulders.",
        instructions: [
          "Step feet wide apart. Turn right toes out 90 degrees, left toes slightly in.",
          "Bend right knee directly over ankle while keeping torso centered.",
          "Extend arms parallel to floor, stretching out wide and looking over front hand."
        ]
      },
      {
        id: "ex-yoga-3",
        name: "Cobra Pose",
        sets: 3,
        reps: 8,
        caloriesBurn: 20,
        muscleGroup: "Lower Back, Abs",
        imageUrl: "🐍",
        description: "Gentle backbend to open anterior chest walls and strengthen lower spinal muscles.",
        instructions: [
          "Lie face down, placing hands directly under shoulder sockets.",
          "Hug elbows closely to ribs. Inhale and lift chest off mat using back muscles.",
          "Keep gaze low to keep neck long, shoulders sliding down back."
        ]
      },
      {
        id: "ex-yoga-4",
        name: "Child's Pose",
        sets: 1,
        reps: 1,
        durationSeconds: 120,
        caloriesBurn: 10,
        muscleGroup: "Restorative, Back",
        imageUrl: "👶",
        description: "Ultimate recovery posture to release lower spine tension and establish steady box breathing.",
        instructions: [
          "Kneel on floor with big toes touching, knees spread wide.",
          "Sink hips completely back over heels and extend arms forward on mat.",
          "Rest forehead comfortably on floor, breathing deeply into back body."
        ]
      }
    ]
  }
];

export const REGIONAL_MEALS: MealItem[] = [
  // USA Presets
  {
    id: "us-meal-1",
    name: "Classic Avocado Toast & Poached Egg",
    calories: 360,
    protein: 16,
    carbs: 28,
    fat: 20,
    category: "Breakfast",
    region: "USA",
    ingredients: ["1 slice sourdough bread", "1/2 ripe Haas avocado", "1 poached egg", "Red pepper flakes", "Sea salt"]
  },
  {
    id: "us-meal-2",
    name: "Grilled Chicken & Quinoa Harvest Bowl",
    calories: 520,
    protein: 42,
    carbs: 48,
    fat: 14,
    category: "Lunch",
    region: "USA",
    ingredients: ["150g boneless grilled chicken breast", "1/2 cup cooked quinoa", "Mixed baby greens", "Cherry tomatoes", "Olive oil lemon vinaigrette"]
  },
  {
    id: "us-meal-3",
    name: "Baked Atlantic Salmon & Asparagus",
    calories: 460,
    protein: 38,
    carbs: 12,
    fat: 28,
    category: "Dinner",
    region: "USA",
    ingredients: ["180g fresh Atlantic salmon fillet", "1 bunch baby asparagus spears", "1 tbsp ghee or butter", "Fresh lemon slices", "Garlic herb rub"]
  },
  {
    id: "us-meal-4",
    name: "High-Protein Greek Yogurt Parfait",
    calories: 220,
    protein: 18,
    carbs: 22,
    fat: 4,
    category: "Snack",
    region: "USA",
    ingredients: ["200g non-fat Greek yogurt", "1/4 cup blueberries", "1 tbsp gluten-free granola", "Drizzle of pure honey"]
  },

  // UK Presets
  {
    id: "uk-meal-1",
    name: "Cinnamon Berry Porridge",
    calories: 320,
    protein: 11,
    carbs: 45,
    fat: 6,
    category: "Breakfast",
    region: "UK",
    ingredients: ["50g steel-cut jumbo oats", "200ml semi-skimmed milk", "1/2 tsp ground cinnamon", "Handful of fresh raspberries"]
  },
  {
    id: "uk-meal-2",
    name: "Tuna Salad & Wholemeal Wrap",
    calories: 410,
    protein: 29,
    carbs: 34,
    fat: 12,
    category: "Lunch",
    region: "UK",
    ingredients: ["1 can chunk light tuna in water", "1 wholemeal stone-baked wrap", "1 tbsp light mayo", "Cucumber & baby spinach slices"]
  },
  {
    id: "uk-meal-3",
    name: "Lean Grass-Fed Beef & Sweet Potato Mash",
    calories: 540,
    protein: 44,
    carbs: 42,
    fat: 16,
    category: "Dinner",
    region: "UK",
    ingredients: ["150g 5% lean grass-fed British beef", "150g sweet potato mash", "Steam roasted broccoli florets", "Red onion gravy splash"]
  },
  {
    id: "uk-meal-4",
    name: "Scotch Oatcakes with Cottage Cheese",
    calories: 190,
    protein: 10,
    carbs: 20,
    fat: 5,
    category: "Snack",
    region: "UK",
    ingredients: ["3 whole grain oatcakes", "4 tbsp light cottage cheese", "Fresh black pepper sprinkles"]
  },

  // Pakistan Presets
  {
    id: "pk-meal-1",
    name: "Anda Paratha & Spicy Omelette",
    calories: 420,
    protein: 14,
    carbs: 42,
    fat: 20,
    category: "Breakfast",
    region: "Pakistan",
    ingredients: ["1 medium whole wheat flour paratha (light oil)", "2 scrambled eggs", "1 chopped green chili", "Fine coriander leaves", "Red onion cubes"]
  },
  {
    id: "pk-meal-2",
    name: "Daal Chana & Tandoori Roti with Salad",
    calories: 450,
    protein: 18,
    carbs: 65,
    fat: 8,
    category: "Lunch",
    region: "Pakistan",
    ingredients: ["1 cup boiled Dal Chana (cooked in light olive oil)", "1 soft whole wheat Tandoori Roti", "Mixed cucumber, tomato, and onion salad with lemon juice"]
  },
  {
    id: "pk-meal-3",
    name: "Steamed Chicken Tikka & Mint Raita",
    calories: 390,
    protein: 48,
    carbs: 8,
    fat: 12,
    category: "Dinner",
    region: "Pakistan",
    ingredients: ["1 large chicken breast leg piece Tikka style", "3 tbsp light yogurt Raita with freshly crushed mint", "Onion rings & fresh lemon wedge"]
  },
  {
    id: "pk-meal-4",
    name: "Fresh Shakarkandi (Sweet Potato) Chaat",
    calories: 160,
    protein: 3,
    carbs: 35,
    fat: 1,
    category: "Snack",
    region: "Pakistan",
    ingredients: ["1 cup boiled sweet potato cubes", "1 tsp traditional Chaat Masala", "Zesty fresh lime juice squeeze"]
  }
];

export const MOCK_HISTORY_7DAYS: ProgressHistory[] = [
  { date: "Jul 09", steps: 8400, water: 2000, weight: 74.8, caloriesConsumed: 2100, caloriesBurned: 520 },
  { date: "Jul 10", steps: 9800, water: 2200, weight: 74.6, caloriesConsumed: 2350, caloriesBurned: 580 },
  { date: "Jul 11", steps: 11200, water: 2600, weight: 74.5, caloriesConsumed: 2150, caloriesBurned: 650 },
  { date: "Jul 12", steps: 7200, water: 1800, weight: 74.4, caloriesConsumed: 2500, caloriesBurned: 410 },
  { date: "Jul 13", steps: 10400, water: 2400, weight: 74.2, caloriesConsumed: 2200, caloriesBurned: 610 },
  { date: "Jul 14", steps: 12100, water: 2900, weight: 74.1, caloriesConsumed: 2420, caloriesBurned: 710 },
  { date: "Jul 15", steps: 10000, water: 2500, weight: 74.0, caloriesConsumed: 2400, caloriesBurned: 600 }
];
