import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Apple, Plus, Sparkles, Check, Pencil, Trash2, Loader2, LogIn, ChevronDown, AlertCircle, UtensilsCrossed } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { REGIONAL_MEALS } from "../data";
import { UserProfile, MealItem, DailyLog, DaySummary, LoggedMeal, MealCategory } from "../types";
import { api, isSignedIn } from "../lib/api";
import { macroTargets } from "../lib/nutrition";
import MealBuilder from "./meals/MealBuilder";

interface NutritionTabProps {
  profile: UserProfile;
  log: DailyLog;
  onLogUpdate: (updatedLog: Partial<DailyLog>) => void;
  onServerLog?: (log: DailyLog) => void; // the server already saved this log; just show it
}

const CATEGORIES: MealCategory[] = ["Breakfast", "Lunch", "Dinner", "Snack"];
const todayStr = () => new Date().toISOString().split("T")[0];
const shortDate = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const MACRO_COLORS = { protein: "#f87171", carbs: "#22d3ee", fat: "#facc15" };

export default function NutritionTab({ profile, log, onLogUpdate, onServerLog }: NutritionTabProps) {
  const signedIn = isSignedIn();
  const [view, setView] = useState<"meals" | "nutrition" | "history">("meals");
  const [selectedCategory, setSelectedCategory] = useState<MealCategory>("Breakfast");
  const [successMsg, setSuccessMsg] = useState("");

  const [day, setDay] = useState<DaySummary | null>(null);
  const [history, setHistory] = useState<DaySummary[] | null>(null);
  const [loading, setLoading] = useState(signedIn);
  const [error, setError] = useState("");
  const [builder, setBuilder] = useState<{ category: MealCategory; meal?: LoggedMeal } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LoggedMeal | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);

  const loadToday = useCallback(async () => {
    if (!signedIn) return;
    try {
      const data = await api<DaySummary>("/api/meals");
      setDay(data);
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [signedIn]);

  const loadHistory = useCallback(async () => {
    if (!signedIn) return;
    try {
      const data = await api<{ days: DaySummary[] }>("/api/meals/history?days=30");
      setHistory(data.days);
    } catch (e: any) {
      setError(e.message);
    }
  }, [signedIn]);

  useEffect(() => { loadToday(); }, [loadToday]);
  useEffect(() => { if (view !== "meals" && history === null) loadHistory(); }, [view, history, loadHistory]);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 2500);
  };

  const afterChange = (dailyLog: DailyLog | null) => {
    if (dailyLog && dailyLog.date === todayStr()) onServerLog?.(dailyLog);
    loadToday();
    if (history !== null) loadHistory();
  };

  const handleSaved = (meal: LoggedMeal, dailyLog: DailyLog | null) => {
    setBuilder(null);
    flash(`Saved ${meal.category.toLowerCase()} (~${meal.calories} kcal)`);
    afterChange(dailyLog);
  };

  const handleDelete = async (meal: LoggedMeal) => {
    try {
      const data = await api(`/api/meals/${meal.id}`, "DELETE");
      setConfirmDelete(null);
      flash(`Removed ${meal.name}`);
      afterChange(data.dailyLog);
    } catch (e: any) {
      setConfirmDelete(null);
      setError(e.message);
    }
  };

  // Meal ideas from the existing regional presets; signed-in users get a real meal record
  const handleLogIdea = async (idea: MealItem) => {
    if (!signedIn) {
      onLogUpdate({ caloriesConsumed: log.caloriesConsumed + idea.calories });
      flash(`Logged ${idea.name}! (+${idea.calories} kcal)`);
      return;
    }
    try {
      const data = await api("/api/meals", "POST", {
        category: idea.category,
        items: [{ name: idea.name, portionLabel: "Serving", quantity: 1, calories: idea.calories, protein: idea.protein, carbs: idea.carbs, fat: idea.fat, source: "manual" }],
      });
      flash(`Logged ${idea.name}! (+${idea.calories} kcal)`);
      afterChange(data.dailyLog);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const localizedMeals = REGIONAL_MEALS.filter(
    meal => meal.region.toUpperCase() === profile.country.toUpperCase() && meal.category === selectedCategory
  );

  const totalCaloriesGoal = profile.calorieIntakeGoal;
  const totals = day?.totals;
  // Signed-in users see real meal totals; guests keep the existing calorie counter
  const loggedCalories = totals ? totals.calories : log.caloriesConsumed;
  const remainingCalories = Math.max(totalCaloriesGoal - loggedCalories, 0);
  const percentage = Math.min((loggedCalories / totalCaloriesGoal) * 100, 100);
  const targets = macroTargets(totalCaloriesGoal);
  const macroRows = [
    { key: "protein", label: "Protein", value: totals ? Math.round(totals.protein) : Math.round((loggedCalories * 0.28) / 4), goal: targets.protein, bar: "bg-red-400" },
    { key: "carbs", label: "Carbs", value: totals ? Math.round(totals.carbs) : Math.round((loggedCalories * 0.42) / 4), goal: targets.carbs, bar: "bg-cyan-400" },
    { key: "fat", label: "Fats", value: totals ? Math.round(totals.fat) : Math.round((loggedCalories * 0.3) / 9), goal: targets.fat, bar: "bg-yellow-400" },
  ];

  const categoryMeals = day?.meals.filter(m => m.category === selectedCategory) || [];

  const mealCard = (m: LoggedMeal, compact = false) => (
    <div key={m.id} className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl flex flex-col gap-2">
      <div className="flex justify-between items-start gap-2">
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold text-white font-display leading-tight">{compact ? `${m.category}: ` : ""}{m.name}</span>
          <span className="text-[9px] text-slate-500 font-mono mt-0.5">P {m.protein}g · C {m.carbs}g · F {m.fat}g{m.fiber ? ` · Fiber ${m.fiber}g` : ""}</span>
        </div>
        <span className="text-xs font-bold text-emerald-400 font-mono shrink-0">~{m.calories} kcal</span>
      </div>
      {!compact && m.items && m.items.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {m.items.map((it, i) => (
            <span key={i} className={`text-[9px] px-2 py-0.5 rounded ${it.source.startsWith("ai") ? "bg-amber-500/10 text-amber-300" : "bg-slate-950 text-slate-400"}`}>
              {it.name.replace(/\s*\(.*\)$/, "")} · {it.portionId === "g" ? `${it.quantity} g` : `${it.quantity} × ${it.portionLabel.toLowerCase()}`}
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => setBuilder({ category: m.category, meal: m })} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-300 hover:text-white cursor-pointer">
          <Pencil className="w-3 h-3" /> Edit
        </button>
        <button onClick={() => setConfirmDelete(m)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-300 hover:text-rose-400 cursor-pointer">
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>
    </div>
  );

  // Last 7 days of logged calories, oldest first, including empty days
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() - (6 - i) * 86400000).toISOString().split("T")[0];
    const found = history?.find(d => d.date === date);
    return { date, label: shortDate(date).split(" ")[0], calories: found?.totals.calories || 0 };
  });

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 relative overflow-hidden bg-slate-950 text-slate-100">
    <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

      {/* Nutrition Header */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <h2 className="text-xl font-extrabold tracking-tight text-white font-display">Diet & Calorie Logger</h2>
          <p className="text-xs text-slate-400">Pakistani home food tracking for {profile.country}.</p>
        </div>
        <Apple className="w-6 h-6 text-emerald-400" />
      </div>

      {/* View switcher */}
      <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 select-none">
        {([["meals", "Meal Tracking"], ["nutrition", "Nutrition"], ["history", "History"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${view === id ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {!signedIn && (
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 flex gap-2 text-[11px] text-cyan-200">
          <LogIn className="w-4 h-4 shrink-0 text-cyan-400" />
          <span>Sign in to log meals with portions, see macros and keep your meal history. Quick calorie logging still works below.</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex gap-2 text-[11px] text-rose-300" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => { setError(""); setLoading(true); loadToday(); }} className="font-bold text-rose-200 cursor-pointer">Retry</button>
        </div>
      )}

      {/* Main Calorie Summary Card */}
      {view !== "history" && (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">CALORIE BUDGET · TODAY</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-black text-white">{loading ? "…" : loggedCalories}</span>
              <span className="text-xs text-slate-400">/ {totalCaloriesGoal} kcal</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-emerald-400">{remainingCalories} kcal</span>
            <span className="text-[9px] font-mono text-slate-400">REMAINING</span>
          </div>
        </div>

        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
        </div>

        <div className="grid grid-cols-3 gap-2.5 border-t border-slate-800 pt-3">
          {macroRows.map((r, i) => (
            <div key={r.key} className={`flex flex-col items-center ${i === 1 ? "border-x border-slate-800/80" : ""}`}>
              <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">{r.label}</span>
              <span className="text-xs font-bold text-white mt-1">{r.value}g <span className="text-[9px] text-slate-500">/ {r.goal}g</span></span>
              <div className="w-12 h-1 bg-slate-950 rounded-full mt-1.5 overflow-hidden">
                <div className={`h-full ${r.bar}`} style={{ width: `${Math.min((r.value / r.goal) * 100, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
        {totals && <span className="text-[9px] text-slate-500 text-center -mt-1">Fiber today: {totals.fiber} g · all values are estimates</span>}
      </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl flex items-center gap-2 text-xs font-bold" role="status">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ===== MEAL TRACKING ===== */}
      {view === "meals" && (
        <>
          <div className="flex justify-between bg-slate-900 border border-slate-800 rounded-xl p-1 select-none">
            {CATEGORIES.map(cat => {
              const count = day?.meals.filter(m => m.category === cat).length || 0;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-1 text-center py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${selectedCategory === cat ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400"}`}
                >
                  {cat}{count ? ` · ${count}` : ""}
                </button>
              );
            })}
          </div>

          {signedIn && (
            <div className="flex flex-col gap-2.5">
              {loading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-emerald-400 animate-spin" /></div>
              ) : categoryMeals.length === 0 ? (
                <div className="border border-dashed border-slate-800 rounded-2xl p-5 flex flex-col items-center gap-1 text-center">
                  <UtensilsCrossed className="w-5 h-5 text-slate-600" />
                  <span className="text-xs text-slate-400">No {selectedCategory.toLowerCase()} logged today</span>
                  <span className="text-[10px] text-slate-600">Add roti, daal, rice, chai, anything you ate</span>
                </div>
              ) : (
                categoryMeals.map(m => mealCard(m))
              )}
              <button
                onClick={() => setBuilder({ category: selectedCategory })}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10"
              >
                <Plus className="w-4 h-4" /> Add food to {selectedCategory.toLowerCase()}
              </button>
            </div>
          )}

          {localizedMeals.length > 0 && (
          <div className="flex flex-col gap-3">
            <h4 className="text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{profile.country} Meal Suggestions</span>
            </h4>

            <div className="flex flex-col gap-2.5 pb-6">
              {localizedMeals.map(meal => (
                <div key={meal.id} className="bg-slate-900/60 border border-slate-850 p-4 rounded-2xl flex flex-col gap-3">
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

                  {meal.ingredients && (
                    <div className="bg-slate-950/65 rounded-xl p-2.5 border border-slate-900">
                      <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-1">Key Ingredients:</span>
                      <div className="flex flex-wrap gap-1">
                        {meal.ingredients.map((ing, idx) => (
                          <span key={idx} className="text-[9px] bg-slate-900 px-2 py-0.5 rounded text-slate-400">• {ing}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => handleLogIdea(meal)}
                    className="w-full bg-slate-950 hover:bg-slate-900 text-emerald-400 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 border border-emerald-500/10 hover:border-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log to Calorie Intake</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
          )}
        </>
      )}

      {/* ===== NUTRITION DASHBOARD ===== */}
      {view === "nutrition" && signedIn && (
        <div className="flex flex-col gap-4 pb-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Macro breakdown (by calories)</span>
            {totals && totals.calories > 0 ? (
              <div className="flex items-center gap-4">
                <div className="w-28 h-28 shrink-0">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Protein", value: totals.protein * 4, color: MACRO_COLORS.protein },
                          { name: "Carbs", value: totals.carbs * 4, color: MACRO_COLORS.carbs },
                          { name: "Fat", value: totals.fat * 9, color: MACRO_COLORS.fat },
                        ]}
                        dataKey="value" innerRadius={32} outerRadius={52} paddingAngle={2} stroke="none"
                      >
                        {[MACRO_COLORS.protein, MACRO_COLORS.carbs, MACRO_COLORS.fat].map(c => <Cell key={c} fill={c} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  {(() => {
                    const kcal = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9 || 1;
                    return ([["Protein", totals.protein, 4, MACRO_COLORS.protein], ["Carbs", totals.carbs, 4, MACRO_COLORS.carbs], ["Fat", totals.fat, 9, MACRO_COLORS.fat]] as const).map(([label, g, f, color]) => (
                      <div key={label} className="flex items-center gap-2 text-[11px]">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                        <span className="text-slate-300 flex-1">{label}</span>
                        <span className="font-mono text-white">{g}g</span>
                        <span className="font-mono text-slate-500 w-9 text-right">{Math.round((g * f * 100) / kcal)}%</span>
                      </div>
                    ));
                  })()}
                  <div className="flex items-center gap-2 text-[11px] border-t border-slate-800 pt-1.5">
                    <span className="w-2.5 h-2.5" />
                    <span className="text-slate-300 flex-1">Fiber</span>
                    <span className="font-mono text-white">{totals.fiber}g</span>
                    <span className="w-9" />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 py-3 text-center">Log a meal to see your macro breakdown.</p>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Meal-wise nutrition · today</span>
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 gap-y-1.5 text-[11px] items-center">
              <span className="text-[9px] text-slate-500 font-mono uppercase">Meal</span>
              <span className="text-[9px] text-slate-500 font-mono uppercase text-right">kcal</span>
              <span className="text-[9px] text-slate-500 font-mono uppercase text-right">P</span>
              <span className="text-[9px] text-slate-500 font-mono uppercase text-right">C</span>
              <span className="text-[9px] text-slate-500 font-mono uppercase text-right">F</span>
              {CATEGORIES.map(c => {
                const n = day?.byCategory[c];
                return (
                  <React.Fragment key={c}>
                    <span className="text-slate-300">{c}</span>
                    <span className="font-mono text-white text-right">{n?.calories || 0}</span>
                    <span className="font-mono text-slate-400 text-right">{n?.protein || 0}</span>
                    <span className="font-mono text-slate-400 text-right">{n?.carbs || 0}</span>
                    <span className="font-mono text-slate-400 text-right">{n?.fat || 0}</span>
                  </React.Fragment>
                );
              })}
              <span className="text-white font-bold border-t border-slate-800 pt-1.5">Total</span>
              <span className="font-mono text-emerald-400 font-bold text-right border-t border-slate-800 pt-1.5">{totals?.calories || 0}</span>
              <span className="font-mono text-white text-right border-t border-slate-800 pt-1.5">{totals?.protein || 0}</span>
              <span className="font-mono text-white text-right border-t border-slate-800 pt-1.5">{totals?.carbs || 0}</span>
              <span className="font-mono text-white text-right border-t border-slate-800 pt-1.5">{totals?.fat || 0}</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Daily intake · last 7 days</span>
            {history === null ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-emerald-400 animate-spin" /></div>
            ) : (
              <div className="h-40">
                <ResponsiveContainer>
                  <BarChart data={week} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(148,163,184,0.08)" }}
                      contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, fontSize: 11 }}
                      formatter={(v: any) => [`${v} kcal`, "Logged"]}
                    />
                    <ReferenceLine y={totalCaloriesGoal} stroke="#34d399" strokeDasharray="4 4" />
                    <Bar dataKey="calories" fill="#22d3ee" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <span className="text-[9px] text-slate-500">Dashed line: your {totalCaloriesGoal} kcal goal</span>
          </div>
        </div>
      )}

      {/* ===== HISTORY ===== */}
      {view === "history" && signedIn && (
        <div className="flex flex-col gap-2.5 pb-6">
          {history === null ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-emerald-400 animate-spin" /></div>
          ) : history.length === 0 ? (
            <div className="border border-dashed border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500">No meals logged in the last 30 days.</div>
          ) : (
            history.map(d => (
              <div key={d.date} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <button onClick={() => setOpenDay(openDay === d.date ? null : d.date)} className="w-full flex items-center justify-between px-4 py-3 cursor-pointer" aria-expanded={openDay === d.date}>
                  <div className="flex flex-col items-start">
                    <span className="text-xs font-bold text-white">{d.date === todayStr() ? "Today" : shortDate(d.date)}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{d.meals.length} meal{d.meals.length === 1 ? "" : "s"} · P {d.totals.protein}g · C {d.totals.carbs}g · F {d.totals.fat}g</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400 font-mono">{d.totals.calories} kcal</span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${openDay === d.date ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {openDay === d.date && (
                  <div className="px-3 pb-3 flex flex-col gap-2">{d.meals.map(m => mealCard(m, true))}</div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>

      {/* Meal builder sheet */}
      <AnimatePresence>
        {builder && (
          <MealBuilder
            category={builder.category}
            meal={builder.meal}
            date={todayStr()}
            onClose={() => setBuilder(null)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-6" role="alertdialog">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-xs flex flex-col gap-3">
              <span className="text-sm font-bold text-white">Delete this meal?</span>
              <span className="text-xs text-slate-400">{confirmDelete.name} (~{confirmDelete.calories} kcal) will be removed from {confirmDelete.date === todayStr() ? "today" : shortDate(confirmDelete.date)}.</span>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 cursor-pointer">Cancel</button>
                <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold cursor-pointer">Delete</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
