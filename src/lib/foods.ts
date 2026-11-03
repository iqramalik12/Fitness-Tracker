// Pakistani home-cooked food database.
// Values are per 100 g of the food as typically cooked at home (with usual oil/ghee),
// compiled from USDA FoodData Central and South Asian food composition tables.
// Home recipes vary a lot, so every figure is an estimate and the UI labels it that way.

import { Nutrients, scaleNutrients } from "./nutrition";

export type FoodCategory =
  | "Breads"
  | "Daal & Lentils"
  | "Curries & Salan"
  | "Sabzi"
  | "Rice"
  | "Eggs & Dairy"
  | "Fruits"
  | "Nuts"
  | "Snacks & Sweets"
  | "Drinks"
  | "Extras";

export const FOOD_CATEGORIES: FoodCategory[] = [
  "Breads", "Daal & Lentils", "Curries & Salan", "Sabzi", "Rice",
  "Eggs & Dairy", "Fruits", "Nuts", "Snacks & Sweets", "Drinks", "Extras",
];

export interface Portion {
  id: string;
  label: string; // e.g. "Medium roti", "Half bowl"
  grams: number; // grams (or ml for drinks) in one unit of this portion
}

export interface FoodItem {
  id: string;
  name: string;
  aliases: string[]; // Roman Urdu / alternate spellings used for search
  category: FoodCategory;
  per100g: Nutrients;
  portions: Portion[]; // first entry is the default
}

const p = (id: string, label: string, grams: number): Portion => ({ id, label, grams });
const n = (calories: number, protein: number, carbs: number, fat: number, fiber: number): Nutrients =>
  ({ calories, protein, carbs, fat, fiber });

// Reusable portion sets
const BOWL = [p("half-bowl", "Half bowl", 120), p("full-bowl", "Full bowl", 240), p("cup", "1 cup", 240), p("tbsp", "1 tablespoon", 15)];
const PLATE_RICE = [p("half-plate", "Half plate", 150), p("full-plate", "Full plate", 300), p("cup", "1 cup", 160), p("tbsp", "1 tablespoon", 12)];
const SERVING = (small: number, medium: number, large: number) => [
  p("medium", "Medium serving", medium), p("small", "Small serving", small), p("large", "Large serving", large),
];

export const FOODS: FoodItem[] = [
  // Breads
  { id: "roti", name: "Roti / Chapati (whole wheat)", aliases: ["roti", "chapati", "chapatti", "phulka", "chapaati"], category: "Breads",
    per100g: n(280, 9.5, 52, 3.7, 6),
    portions: [p("medium", "Medium roti", 40), p("small", "Small roti", 30), p("large", "Large roti", 55)] },
  { id: "roti-ghee", name: "Roti with ghee/butter", aliases: ["chupri roti", "ghee roti", "makhan roti"], category: "Breads",
    per100g: n(330, 8.5, 48, 11, 5.5),
    portions: [p("medium", "Medium roti", 45), p("small", "Small roti", 35), p("large", "Large roti", 60)] },
  { id: "naan", name: "Naan (tandoori)", aliases: ["naan", "nan", "tandoori naan", "kulcha"], category: "Breads",
    per100g: n(290, 9, 50, 5.5, 2.2),
    portions: [p("medium", "Medium naan", 100), p("small", "Small naan", 70), p("large", "Large naan", 130), p("half", "Half naan", 50)] },
  { id: "paratha", name: "Paratha (plain)", aliases: ["paratha", "parotha", "prantha", "parontha"], category: "Breads",
    per100g: n(330, 7, 45, 14, 4),
    portions: [p("medium", "Medium paratha", 80), p("small", "Small paratha", 60), p("large", "Large paratha", 110)] },
  { id: "aloo-paratha", name: "Aloo paratha", aliases: ["aloo paratha", "alu paratha", "stuffed paratha"], category: "Breads",
    per100g: n(260, 6, 36, 10, 3.5),
    portions: [p("medium", "Medium paratha", 120), p("small", "Small paratha", 90), p("large", "Large paratha", 160)] },
  { id: "puri", name: "Puri (fried)", aliases: ["puri", "poori", "halwa puri"], category: "Breads",
    per100g: n(360, 7, 45, 17, 3),
    portions: [p("piece", "1 puri", 35)] },
  { id: "bread-slice", name: "Bread (white slice)", aliases: ["bread", "double roti", "slice", "toast"], category: "Breads",
    per100g: n(265, 9, 49, 3.2, 2.7),
    portions: [p("slice", "1 slice", 25)] },

  // Daal & lentils
  { id: "daal-masoor", name: "Daal masoor (red lentils)", aliases: ["daal", "dal", "masoor", "lentils", "red daal"], category: "Daal & Lentils",
    per100g: n(110, 6, 14, 3.5, 3.5), portions: BOWL },
  { id: "daal-moong", name: "Daal moong", aliases: ["moong", "mung daal", "yellow daal"], category: "Daal & Lentils",
    per100g: n(105, 6.5, 13, 3, 3.5), portions: BOWL },
  { id: "daal-chana", name: "Daal chana", aliases: ["chana daal", "chane ki daal"], category: "Daal & Lentils",
    per100g: n(140, 7.5, 18, 4.5, 5), portions: BOWL },
  { id: "daal-mash", name: "Daal mash (urad)", aliases: ["mash", "maash", "urad"], category: "Daal & Lentils",
    per100g: n(125, 7, 15, 4.5, 4), portions: BOWL },
  { id: "chana", name: "Chana / cholay (chickpea curry)", aliases: ["chana", "chanay", "cholay", "chole", "chickpeas", "safaid chana"], category: "Daal & Lentils",
    per100g: n(150, 7, 20, 5, 6), portions: BOWL },
  { id: "lobia", name: "Lobia (black-eyed beans)", aliases: ["lobia", "lobiya", "rongi", "beans"], category: "Daal & Lentils",
    per100g: n(130, 7, 18, 3.5, 5), portions: BOWL },
  { id: "rajma", name: "Rajma (kidney beans)", aliases: ["rajma", "lal lobia"], category: "Daal & Lentils",
    per100g: n(130, 7.5, 17, 3.5, 5.5), portions: BOWL },
  { id: "haleem", name: "Haleem", aliases: ["haleem", "daleem"], category: "Daal & Lentils",
    per100g: n(140, 9, 14, 5.5, 3), portions: BOWL },

  // Curries & salan
  { id: "chicken-karahi", name: "Chicken karahi", aliases: ["karahi", "kadai", "chicken karahi"], category: "Curries & Salan",
    per100g: n(190, 17, 4, 12, 1), portions: SERVING(150, 250, 350) },
  { id: "chicken-salan", name: "Chicken salan (with gravy)", aliases: ["salan", "chicken curry", "murgh", "shorba"], category: "Curries & Salan",
    per100g: n(140, 12, 5, 8, 1), portions: [p("half-bowl", "Half bowl", 150), p("full-bowl", "Full bowl", 300), p("cup", "1 cup", 240)] },
  { id: "aloo-gosht", name: "Aloo gosht", aliases: ["aloo gosht", "alu gosht", "meat curry"], category: "Curries & Salan",
    per100g: n(150, 10, 8, 9, 1.2), portions: [p("half-bowl", "Half bowl", 150), p("full-bowl", "Full bowl", 300)] },
  { id: "qorma", name: "Qorma (chicken/mutton)", aliases: ["qorma", "korma"], category: "Curries & Salan",
    per100g: n(220, 14, 5, 16, 1), portions: SERVING(150, 220, 300) },
  { id: "nihari", name: "Nihari", aliases: ["nihari", "nahari"], category: "Curries & Salan",
    per100g: n(180, 14, 4, 12, 0.5), portions: [p("half-bowl", "Half bowl", 150), p("full-bowl", "Full bowl", 300)] },
  { id: "keema", name: "Keema (minced meat)", aliases: ["keema", "qeema", "mince", "keema matar"], category: "Curries & Salan",
    per100g: n(210, 16, 4, 14, 1.5), portions: [p("half-bowl", "Half bowl", 120), p("full-bowl", "Full bowl", 240)] },
  { id: "chicken-tikka", name: "Chicken tikka (grilled)", aliases: ["tikka", "chicken tikka", "bbq chicken", "tandoori chicken"], category: "Curries & Salan",
    per100g: n(165, 25, 3, 6, 0.5), portions: [p("piece", "1 piece (leg/breast)", 150), p("boti", "1 boti", 30)] },
  { id: "seekh-kabab", name: "Seekh kabab", aliases: ["seekh", "kabab", "kebab"], category: "Curries & Salan",
    per100g: n(220, 18, 4, 15, 0.5), portions: [p("piece", "1 seekh", 60)] },
  { id: "shami-kabab", name: "Shami kabab", aliases: ["shami", "shami kabab", "kabab"], category: "Curries & Salan",
    per100g: n(230, 14, 12, 14, 2), portions: [p("piece", "1 kabab", 50)] },
  { id: "fish-fried", name: "Fried fish", aliases: ["fish", "machli", "masala fish"], category: "Curries & Salan",
    per100g: n(230, 18, 8, 14, 0.5), portions: [p("piece", "1 piece", 100), p("small", "Small serving", 150), p("large", "Large serving", 250)] },
  { id: "homemade-curry", name: "Homemade curry (generic)", aliases: ["curry", "salan", "ghar ka salan"], category: "Curries & Salan",
    per100g: n(130, 6, 8, 8, 2), portions: [p("half-bowl", "Half bowl", 150), p("full-bowl", "Full bowl", 300)] },

  // Sabzi
  { id: "mixed-sabzi", name: "Mixed sabzi", aliases: ["sabzi", "subzi", "mix veg", "vegetables", "tarkari"], category: "Sabzi",
    per100g: n(90, 2.5, 9, 5, 3), portions: BOWL },
  { id: "aloo-sabzi", name: "Aloo ki sabzi / bhujia", aliases: ["aloo", "alu", "potato", "aloo bhujia"], category: "Sabzi",
    per100g: n(120, 2, 15, 6, 2), portions: BOWL },
  { id: "bhindi", name: "Bhindi (okra)", aliases: ["bhindi", "okra", "lady finger"], category: "Sabzi",
    per100g: n(95, 2, 8, 6.5, 3), portions: BOWL },
  { id: "palak", name: "Palak / saag", aliases: ["palak", "saag", "spinach", "sarson"], category: "Sabzi",
    per100g: n(90, 3, 6, 6, 3), portions: BOWL },
  { id: "aloo-matar", name: "Aloo matar", aliases: ["aloo matar", "peas", "matar"], category: "Sabzi",
    per100g: n(110, 3.5, 13, 5, 3.5), portions: BOWL },
  { id: "gobhi", name: "Gobhi (cauliflower)", aliases: ["gobi", "gobhi", "cauliflower", "aloo gobhi"], category: "Sabzi",
    per100g: n(95, 2.5, 8, 6, 2.5), portions: BOWL },
  { id: "salad", name: "Salad (kachumber)", aliases: ["salad", "kachumber", "cucumber", "kheera"], category: "Sabzi",
    per100g: n(20, 0.8, 4, 0.2, 1.2), portions: [p("bowl", "Small bowl", 100), p("plate", "Side plate", 150)] },

  // Rice
  { id: "rice-plain", name: "Plain boiled rice", aliases: ["rice", "chawal", "boiled rice", "basmati"], category: "Rice",
    per100g: n(130, 2.7, 28, 0.3, 0.4), portions: PLATE_RICE },
  { id: "biryani", name: "Chicken biryani", aliases: ["biryani", "biriyani", "chicken biryani"], category: "Rice",
    per100g: n(180, 9, 22, 6, 1), portions: [p("half-plate", "Half plate", 200), p("full-plate", "Full plate", 400), p("cup", "1 cup", 180)] },
  { id: "pulao", name: "Chicken / yakhni pulao", aliases: ["pulao", "pilau", "yakhni pulao"], category: "Rice",
    per100g: n(165, 8, 22, 5, 0.8), portions: [p("half-plate", "Half plate", 200), p("full-plate", "Full plate", 400), p("cup", "1 cup", 170)] },
  { id: "matar-pulao", name: "Matar pulao (veg)", aliases: ["matar pulao", "veg pulao"], category: "Rice",
    per100g: n(150, 3.5, 25, 4, 2), portions: [p("half-plate", "Half plate", 180), p("full-plate", "Full plate", 360)] },
  { id: "khichri", name: "Khichri", aliases: ["khichri", "khichdi"], category: "Rice",
    per100g: n(120, 4.5, 20, 2.5, 2), portions: BOWL },

  // Eggs & dairy
  { id: "egg-boiled", name: "Boiled egg", aliases: ["egg", "anda", "anday", "boiled egg", "ubla anda"], category: "Eggs & Dairy",
    per100g: n(155, 13, 1.1, 10.6, 0), portions: [p("egg", "1 egg", 50)] },
  { id: "egg-fried", name: "Fried egg", aliases: ["fried egg", "anda fry"], category: "Eggs & Dairy",
    per100g: n(196, 13.6, 0.8, 15, 0), portions: [p("egg", "1 egg", 50)] },
  { id: "omelette", name: "Masala omelette", aliases: ["omelette", "omlet", "anda omelette"], category: "Eggs & Dairy",
    per100g: n(180, 11, 2, 14, 0.3), portions: [p("one-egg", "1-egg omelette", 70), p("two-egg", "2-egg omelette", 140)] },
  { id: "yogurt", name: "Yogurt / dahi", aliases: ["dahi", "yogurt", "yoghurt", "curd"], category: "Eggs & Dairy",
    per100g: n(61, 3.5, 4.7, 3.3, 0), portions: [p("bowl", "Small bowl", 150), p("cup", "1 cup", 245), p("tbsp", "1 tablespoon", 15)] },
  { id: "raita", name: "Raita", aliases: ["raita"], category: "Eggs & Dairy",
    per100g: n(60, 3, 5, 3, 0.3), portions: [p("bowl", "Small bowl", 120), p("tbsp", "1 tablespoon", 15)] },
  { id: "milk", name: "Milk (whole)", aliases: ["milk", "doodh"], category: "Eggs & Dairy",
    per100g: n(61, 3.2, 4.8, 3.3, 0), portions: [p("glass", "1 glass", 250), p("cup", "1 cup", 240)] },
  { id: "paneer", name: "Paneer", aliases: ["paneer", "cottage cheese"], category: "Eggs & Dairy",
    per100g: n(265, 18, 3.5, 20, 0), portions: [p("serving", "Serving", 100), p("cube", "1 cube", 20)] },

  // Fruits
  { id: "banana", name: "Banana (kela)", aliases: ["banana", "kela"], category: "Fruits",
    per100g: n(89, 1.1, 23, 0.3, 2.6), portions: [p("medium", "Medium banana", 118), p("small", "Small banana", 90)] },
  { id: "apple", name: "Apple (saib)", aliases: ["apple", "saib", "seb"], category: "Fruits",
    per100g: n(52, 0.3, 14, 0.2, 2.4), portions: [p("medium", "Medium apple", 180), p("small", "Small apple", 130)] },
  { id: "mango", name: "Mango (aam)", aliases: ["mango", "aam"], category: "Fruits",
    per100g: n(60, 0.8, 15, 0.4, 1.6), portions: [p("medium", "Medium mango (flesh)", 200), p("cup", "1 cup sliced", 165)] },
  { id: "kinnow", name: "Kinnow / orange", aliases: ["kinnow", "kinno", "orange", "malta", "santra"], category: "Fruits",
    per100g: n(47, 0.9, 12, 0.1, 2.4), portions: [p("medium", "Medium fruit", 130)] },
  { id: "guava", name: "Guava (amrood)", aliases: ["guava", "amrood", "amrud"], category: "Fruits",
    per100g: n(68, 2.6, 14, 1, 5.4), portions: [p("medium", "Medium guava", 100)] },
  { id: "dates", name: "Dates (khajoor)", aliases: ["dates", "khajoor", "khajur", "khajoorain"], category: "Fruits",
    per100g: n(277, 1.8, 75, 0.2, 6.7), portions: [p("date", "1 date", 8), p("medjool", "1 large date", 24)] },
  { id: "grapes", name: "Grapes (angoor)", aliases: ["grapes", "angoor"], category: "Fruits",
    per100g: n(69, 0.7, 18, 0.2, 0.9), portions: [p("cup", "1 cup", 150)] },
  { id: "fruit-chaat", name: "Fruit chaat", aliases: ["fruit chaat", "chaat"], category: "Fruits",
    per100g: n(75, 0.8, 18, 0.3, 2), portions: [p("bowl", "Small bowl", 150), p("plate", "Full plate", 250)] },

  // Nuts
  { id: "almonds", name: "Almonds (badam)", aliases: ["almonds", "badam"], category: "Nuts",
    per100g: n(579, 21, 22, 50, 12.5), portions: [p("ten", "10 almonds", 12), p("handful", "1 handful", 28)] },
  { id: "peanuts", name: "Peanuts (moongphali)", aliases: ["peanuts", "moongphali", "mungphali"], category: "Nuts",
    per100g: n(567, 26, 16, 49, 8.5), portions: [p("handful", "1 handful", 30), p("tbsp", "1 tablespoon", 9)] },
  { id: "walnuts", name: "Walnuts (akhrot)", aliases: ["walnuts", "akhrot"], category: "Nuts",
    per100g: n(654, 15, 14, 65, 6.7), portions: [p("handful", "1 handful", 30), p("halves", "2 halves", 8)] },
  { id: "roasted-chana", name: "Roasted chana", aliases: ["bhuna chana", "roasted chana", "chana", "chholay"], category: "Nuts",
    per100g: n(370, 20, 58, 6, 17), portions: [p("handful", "1 handful", 30), p("cup", "1 cup", 100)] },

  // Snacks & sweets
  { id: "samosa", name: "Samosa (aloo)", aliases: ["samosa", "samosay"], category: "Snacks & Sweets",
    per100g: n(262, 4.5, 30, 14, 2.5), portions: [p("piece", "1 samosa", 90)] },
  { id: "pakora", name: "Pakora", aliases: ["pakora", "pakoray", "bhajia"], category: "Snacks & Sweets",
    per100g: n(290, 7, 28, 17, 4), portions: [p("piece", "1 pakora", 20), p("plate", "Small plate", 120)] },
  { id: "chana-chaat", name: "Chana chaat", aliases: ["chana chaat", "chaat", "dahi baray"], category: "Snacks & Sweets",
    per100g: n(140, 6, 21, 3.5, 5), portions: [p("bowl", "Small bowl", 150), p("plate", "Full plate", 250)] },
  { id: "rusk", name: "Rusk / biscuit", aliases: ["rusk", "biscuit", "cake rusk", "papay"], category: "Snacks & Sweets",
    per100g: n(407, 12, 72, 7, 3), portions: [p("piece", "1 rusk", 13), p("biscuit", "1 biscuit", 8)] },
  { id: "jalebi", name: "Jalebi", aliases: ["jalebi"], category: "Snacks & Sweets",
    per100g: n(380, 3, 60, 15, 0.5), portions: [p("piece", "1 jalebi", 25)] },
  { id: "gulab-jamun", name: "Gulab jamun", aliases: ["gulab jamun", "rasgulla", "mithai"], category: "Snacks & Sweets",
    per100g: n(320, 4, 50, 12, 0.3), portions: [p("piece", "1 piece", 40)] },
  { id: "kheer", name: "Kheer", aliases: ["kheer", "firni", "rice pudding"], category: "Snacks & Sweets",
    per100g: n(140, 4, 22, 4, 0.2), portions: [p("bowl", "Small bowl", 150)] },

  // Drinks
  { id: "chai", name: "Doodh patti chai (with sugar)", aliases: ["chai", "tea", "doodh patti", "chaye"], category: "Drinks",
    per100g: n(60, 2.2, 8, 2.2, 0), portions: [p("cup", "1 cup", 180), p("mug", "1 mug", 250)] },
  { id: "lassi", name: "Lassi (sweet)", aliases: ["lassi", "meethi lassi"], category: "Drinks",
    per100g: n(90, 3, 14, 2.5, 0), portions: [p("glass", "1 glass", 300)] },
  { id: "lassi-salted", name: "Lassi (salted)", aliases: ["namkeen lassi", "chaach", "salted lassi"], category: "Drinks",
    per100g: n(40, 2.5, 3.5, 1.8, 0), portions: [p("glass", "1 glass", 300)] },
  { id: "soft-drink", name: "Soft drink", aliases: ["coke", "pepsi", "cold drink", "soda"], category: "Drinks",
    per100g: n(42, 0, 10.6, 0, 0), portions: [p("can", "1 can", 330), p("glass", "1 glass", 250)] },

  // Extras
  { id: "ghee", name: "Ghee / oil (extra)", aliases: ["ghee", "oil", "tel", "butter", "makhan"], category: "Extras",
    per100g: n(900, 0, 0, 100, 0), portions: [p("tsp", "1 teaspoon", 4.5), p("tbsp", "1 tablespoon", 14)] },
  { id: "sugar", name: "Sugar", aliases: ["sugar", "cheeni", "shakkar"], category: "Extras",
    per100g: n(387, 0, 100, 0, 0), portions: [p("tsp", "1 teaspoon", 4), p("tbsp", "1 tablespoon", 12)] },
  { id: "achar", name: "Achar (pickle)", aliases: ["achar", "pickle"], category: "Extras",
    per100g: n(180, 1.5, 6, 17, 2), portions: [p("tbsp", "1 tablespoon", 15)] },
];

// Every food can also be measured in grams
export const GRAM_PORTION: Portion = p("g", "Grams", 1);

export function findFood(id: string): FoodItem | undefined {
  return FOODS.find(f => f.id === id);
}

export function findPortion(food: FoodItem, portionId: string): Portion | undefined {
  if (portionId === GRAM_PORTION.id) return GRAM_PORTION;
  return food.portions.find(pt => pt.id === portionId);
}

// Case-insensitive search across names and Roman Urdu aliases; name-prefix matches rank first
export function searchFoods(query: string, category?: string): FoodItem[] {
  const q = query.trim().toLowerCase();
  const pool = category ? FOODS.filter(f => f.category === category) : FOODS;
  if (!q) return pool;
  const scored = pool
    .map(f => {
      const name = f.name.toLowerCase();
      let score = 0;
      if (name.startsWith(q)) score = 3;
      else if (f.aliases.some(a => a.startsWith(q))) score = 2;
      else if (name.includes(q) || f.aliases.some(a => a.includes(q))) score = 1;
      return { f, score };
    })
    .filter(x => x.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.map(x => x.f);
}

// Nutrition for `quantity` units of a portion of a database food
export function portionNutrition(food: FoodItem, portion: Portion, quantity: number) {
  const grams = Math.round(portion.grams * quantity * 10) / 10;
  return { grams, ...scaleNutrients(food.per100g, grams) };
}
