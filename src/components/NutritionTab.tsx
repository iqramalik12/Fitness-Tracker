import React, { useState } from "react";
import { Flame, Apple, ChevronRight, Plus, Sparkles, Check } from "lucide-react";
import { REGIONAL_MEALS } from "../data";
import { UserProfile, MealItem, DailyLog } from "../types";

interface NutritionTabProps {
  profile: UserProfile;
  log: DailyLog;
  onLogUpdate: (updatedLog: Partial<DailyLog>) => void;
}

export default function NutritionTab({ profile, log, onLogUpdate }: NutritionTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<"Breakfast" | "Lunch" | "Dinner" | "Snack">("Breakfast");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters localized recipes of user's selected country & selected category
  const localizedMeals = REGIONAL_MEALS.filter(
    (meal) => meal.region.toUpperCase() === profile.country.toUpperCase() && meal.category === selectedCategory
  );

  const totalCaloriesGoal = profile.calorieIntakeGoal;
  const loggedCalories = log.caloriesConsumed;
  const remainingCalories = Math.max(totalCaloriesGoal - loggedCalories, 0);
  const percentage = Math.min((loggedCalories / totalCaloriesGoal) * 100, 100);

  // Auto calculate protein/carbs/fat targets (40% Carbs, 30% Protein, 30% Fat)
  const proteinGoal = Math.round((totalCaloriesGoal * 0.3) / 4); // 4 kcal per g
  const carbsGoal = Math.round((totalCaloriesGoal * 0.4) / 4); // 4 kcal per g
  const fatGoal = Math.round((totalCaloriesGoal * 0.3) / 9); // 9 kcal per g

  // Calculate current logged macros from preloaded choices
  // Since we don't have full database logging of individual items, we can simulate macro logs when logged values increase
  const loggedProtein = Math.round((loggedCalories * 0.28) / 4);
  const loggedCarbs = Math.round((loggedCalories * 0.42) / 4);
  const loggedFat = Math.round((loggedCalories * 0.3) / 9);

  const handleLogMeal = (meal: MealItem) => {
    onLogUpdate({
      caloriesConsumed: log.caloriesConsumed + meal.calories
    });
    setSuccessMsg(`Logged ${meal.name}! (+${meal.calories} kcal)`);
    setTimeout(() => setSuccessMsg(""), 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 text-slate-100 bg-slate-950 h-full">
      
      {/* Nutrition Header */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <h2 className="text-xl font-extrabold tracking-tight text-white font-display">Diet & Calorie Logger</h2>
          <p className="text-xs text-slate-400">Nutritional programs localized for {profile.country}.</p>
        </div>
        <Apple className="w-6 h-6 text-emerald-400" />
      </div>

      {/* Main Calorie Summary Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
        
        {/* Dynamic Calorie Targets Progress */}
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">CALORIE BUDGET</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-black text-white">{loggedCalories}</span>
              <span className="text-xs text-slate-400">/ {totalCaloriesGoal} kcal</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-emerald-400">{remainingCalories} kcal</span>
            <span className="text-[9px] font-mono text-slate-400">REMAINING</span>
          </div>
        </div>

        {/* Custom Progress Bar */}
        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Simple Macro Progress Row */}
        <div className="grid grid-cols-3 gap-2.5 border-t border-slate-800 pt-3">
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Protein</span>
            <span className="text-xs font-bold text-white mt-1">{loggedProtein}g <span className="text-[9px] text-slate-500">/ {proteinGoal}g</span></span>
            <div className="w-12 h-1 bg-slate-950 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-red-400" style={{ width: `${Math.min((loggedProtein / proteinGoal) * 100, 100)}%` }} />
            </div>
          </div>
          <div className="flex flex-col items-center border-x border-slate-800/80">
            <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Carbs</span>
            <span className="text-xs font-bold text-white mt-1">{loggedCarbs}g <span className="text-[9px] text-slate-500">/ {carbsGoal}g</span></span>
            <div className="w-12 h-1 bg-slate-950 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-cyan-400" style={{ width: `${Math.min((loggedCarbs / carbsGoal) * 100, 100)}%` }} />
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Fats</span>
            <span className="text-xs font-bold text-white mt-1">{loggedFat}g <span className="text-[9px] text-slate-500">/ {fatGoal}g</span></span>
            <div className="w-12 h-1 bg-slate-950 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-yellow-400" style={{ width: `${Math.min((loggedFat / fatGoal) * 100, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Trigger Notification banner */}
      {successMsg && (
        <div className="bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl flex items-center gap-2 text-xs font-bold animate-pulse">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Horizontal Category Selectors (Breakfast, Lunch, Dinner, Snack) */}
      <div className="flex justify-between bg-slate-900 border border-slate-800 rounded-xl p-1 select-none">
        {(["Breakfast", "Lunch", "Dinner", "Snack"] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`flex-1 text-center py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
              selectedCategory === cat ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Customized list based on user's country selection */}
      <div className="flex flex-col gap-3">
        <h4 className="text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase flex items-center gap-1.5">
          <Sparkles className="w-3..5 h-3.5 text-emerald-400" />
          <span>{profile.country} Meal Suggestions</span>
        </h4>

        <div className="flex flex-col gap-2.5 pb-6">
          {localizedMeals.map((meal) => (
            <div
              key={meal.id}
              className="bg-slate-900/60 border border-slate-850 p-4 rounded-2xl flex flex-col gap-3"
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white font-display leading-tight">{meal.name}</span>
                  <span className="text-[9px] text-slate-400 font-mono mt-0.5">Category: {meal.category}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-emerald-400 font-mono">+{meal.calories} kcal</span>
                  <span className="text-[9px] text-slate-500 font-mono">P: {meal.protein}g / C: {meal.carbs}g / F: {meal.fat}g</span>
                </div>
              </div>

              {/* Ingredients list */}
              {meal.ingredients && (
                <div className="bg-slate-950/65 rounded-xl p-2.5 border border-slate-900">
                  <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-1">Key Ingredients:</span>
                  <div className="flex flex-wrap gap-1">
                    {meal.ingredients.map((ing, idx) => (
                      <span key={idx} className="text-[9px] bg-slate-900 px-2 py-0.5 rounded text-slate-400">
                        • {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Log meal button */}
              <button
                onClick={() => handleLogMeal(meal)}
                className="w-full bg-slate-950 hover:bg-slate-900 text-emerald-400 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 border border-emerald-500/10 hover:border-emerald-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log to Calorie Intake</span>
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
