import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { X, Search, Plus, Minus, Trash2, Camera, PenLine, Sparkles, Loader2, AlertTriangle, Check } from "lucide-react";
import { api } from "../../lib/api";
import { FoodItem, FOOD_CATEGORIES, GRAM_PORTION, findFood, findPortion, portionNutrition } from "../../lib/foods";
import { sumNutrients } from "../../lib/nutrition";
import { DailyLog, LoggedMeal, MealCategory, Nutrients } from "../../types";

const MEAL_CATEGORIES: MealCategory[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

// One row in the meal being built
interface DraftItem {
  key: string;
  name: string;
  source: "database" | "manual" | "ai-photo" | "ai-text";
  quantity: number;
  // Database foods
  foodId?: string;
  portionId?: string;
  // Manual / AI items: values for ONE unit; multiplied by quantity
  portionLabel?: string;
  grams?: number;
  perUnit?: Nutrients;
  confidence?: "low" | "medium" | "high";
}

interface Suggestion extends Nutrients {
  name: string;
  matchedFoodId: string | null;
  portionLabel: string;
  grams: number;
  confidence: "low" | "medium" | "high";
  source: "ai-photo" | "ai-text";
}

let keySeq = 0;
const newKey = () => `d${Date.now()}-${keySeq++}`;

function itemNutrition(d: DraftItem): Nutrients & { label: string } {
  if (d.foodId) {
    const food = findFood(d.foodId);
    const portion = food && findPortion(food, d.portionId || food.portions[0].id);
    if (food && portion) {
      const nut = portionNutrition(food, portion, d.quantity);
      return { ...nut, label: portion.id === "g" ? `${d.quantity} g` : `${d.quantity} × ${portion.label}` };
    }
  }
  const per = d.perUnit || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  const q = d.quantity;
  return {
    calories: Math.round(per.calories * q),
    protein: Math.round(per.protein * q * 10) / 10,
    carbs: Math.round(per.carbs * q * 10) / 10,
    fat: Math.round(per.fat * q * 10) / 10,
    fiber: Math.round(per.fiber * q * 10) / 10,
    label: `${q} × ${d.portionLabel || "Serving"}`,
  };
}

// Turns a saved meal back into editable rows
function draftsFromMeal(meal: LoggedMeal): DraftItem[] {
  if (!meal.items || meal.items.length === 0) {
    return [{
      key: newKey(), name: meal.name, source: "manual", quantity: 1, portionLabel: "Meal",
      perUnit: { calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat, fiber: meal.fiber || 0 },
    }];
  }
  return meal.items.map(it => {
    if (it.foodId && findFood(it.foodId)) {
      return { key: newKey(), name: it.name, source: it.source, quantity: it.quantity, foodId: it.foodId, portionId: it.portionId };
    }
    const q = it.quantity || 1;
    return {
      key: newKey(), name: it.name, source: it.source, quantity: q, portionLabel: it.portionLabel, grams: it.grams,
      perUnit: { calories: it.calories / q, protein: it.protein / q, carbs: it.carbs / q, fat: it.fat / q, fiber: (it.fiber || 0) / q },
    };
  });
}

// Shrinks a photo before upload so it stays small and fast
function readImage(file: File, maxSide = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image."));
    };
    img.src = url;
  });
}

interface MealBuilderProps {
  category: MealCategory;
  date: string;
  meal?: LoggedMeal; // present when editing
  onClose: () => void;
  onSaved: (meal: LoggedMeal, dailyLog: DailyLog | null) => void;
}

export default function MealBuilder({ category: initialCategory, date, meal, onClose, onSaved }: MealBuilderProps) {
  const [category, setCategory] = useState<MealCategory>(meal?.category || initialCategory);
  const [drafts, setDrafts] = useState<DraftItem[]>(() => (meal ? draftsFromMeal(meal) : []));
  const [mode, setMode] = useState<"search" | "manual" | "photo">("search");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Search
  const [query, setQuery] = useState("");
  const [foodCategory, setFoodCategory] = useState<string>("");
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [foodsLoading, setFoodsLoading] = useState(true);
  const [foodsError, setFoodsError] = useState("");
  const [picked, setPicked] = useState<FoodItem | null>(null);
  const [portionId, setPortionId] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Manual entry
  const [manual, setManual] = useState({ name: "", portionLabel: "", calories: "", protein: "", carbs: "", fat: "", fiber: "" });
  const [estimateText, setEstimateText] = useState("");

  // AI suggestions (photo or text)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [aiNote, setAiNote] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setFoodsLoading(true);
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query, ...(foodCategory ? { category: foodCategory } : {}) });
        const data = await api<{ foods: FoodItem[] }>(`/api/meals/foods?${params}`);
        if (!cancelled) { setFoods(data.foods); setFoodsError(""); }
      } catch (e: any) {
        if (!cancelled) setFoodsError(e.message);
      } finally {
        if (!cancelled) setFoodsLoading(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, foodCategory]);

  const totals = useMemo(() => sumNutrients(drafts.map(itemNutrition)), [drafts]);
  const pickedPortion = picked ? findPortion(picked, portionId) : undefined;
  const pickedPreview = picked && pickedPortion && quantity > 0 ? portionNutrition(picked, pickedPortion, quantity) : null;

  const pickFood = (f: FoodItem) => {
    setPicked(f);
    setPortionId(f.portions[0].id);
    setQuantity(1);
  };

  const addPicked = () => {
    if (!picked || !pickedPortion || !(quantity > 0)) return;
    setDrafts(d => [...d, { key: newKey(), name: picked.name, source: "database", foodId: picked.id, portionId: pickedPortion.id, quantity }]);
    setPicked(null);
  };

  const addManual = () => {
    const calories = Number(manual.calories);
    if (!manual.name.trim()) return setError("Enter a food name.");
    if (!Number.isFinite(calories) || calories < 0 || manual.calories === "") return setError("Enter estimated calories for one serving.");
    setError("");
    const val = (s: string) => (Number.isFinite(Number(s)) && Number(s) >= 0 ? Number(s) : 0);
    setDrafts(d => [...d, {
      key: newKey(), name: manual.name.trim(), source: "manual", quantity: 1,
      portionLabel: manual.portionLabel.trim() || "Serving",
      perUnit: { calories, protein: val(manual.protein), carbs: val(manual.carbs), fat: val(manual.fat), fiber: val(manual.fiber) },
    }]);
    setManual({ name: "", portionLabel: "", calories: "", protein: "", carbs: "", fat: "", fiber: "" });
  };

  const runEstimate = async () => {
    if (!estimateText.trim()) return;
    setAiLoading(true); setError(""); setSuggestions([]); setAiNote("");
    try {
      const data = await api<{ items: Suggestion[]; note: string }>("/api/meals/estimate", "POST", { text: estimateText });
      setSuggestions(data.items);
      setAiNote(data.note);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const onPhoto = async (file?: File) => {
    if (!file) return;
    setAiLoading(true); setError(""); setSuggestions([]); setAiNote("");
    try {
      const image = await readImage(file);
      setPhotoPreview(image);
      const data = await api<{ items: Suggestion[]; note: string }>("/api/meals/analyze-photo", "POST", { image });
      setSuggestions(data.items);
      setAiNote(data.note || (data.items.length ? "" : "No food was recognised. Try another photo or add items manually."));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAiLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Suggestions matched to the database become gram-based database rows, so the user can adjust grams
  const acceptSuggestion = (s: Suggestion) => {
    const item: DraftItem = s.matchedFoodId
      ? { key: newKey(), name: s.name, source: s.source, foodId: s.matchedFoodId, portionId: GRAM_PORTION.id, quantity: s.grams, confidence: s.confidence }
      : { key: newKey(), name: s.name, source: s.source, quantity: 1, portionLabel: s.portionLabel, grams: s.grams, confidence: s.confidence,
          perUnit: { calories: s.calories, protein: s.protein, carbs: s.carbs, fat: s.fat, fiber: s.fiber } };
    setDrafts(d => [...d, item]);
    setSuggestions(list => list.filter(x => x !== s));
  };

  const updateDraft = (key: string, patch: Partial<DraftItem>) =>
    setDrafts(d => d.map(x => (x.key === key ? { ...x, ...patch } : x)));

  const save = async () => {
    if (drafts.length === 0) return setError("Add at least one food.");
    setSaving(true); setError("");
    const items = drafts.map(d =>
      d.foodId
        ? { foodId: d.foodId, portionId: d.portionId, quantity: d.quantity, source: d.source }
        : { name: d.name, portionLabel: d.portionLabel, quantity: d.quantity, grams: d.grams, source: d.source, ...d.perUnit }
    );
    try {
      const body = { category, date: meal?.date || date, items };
      const data = meal
        ? await api(`/api/meals/${meal.id}`, "PUT", body)
        : await api("/api/meals", "POST", body);
      onSaved(data.meal, data.dailyLog || null);
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };

  const hasEstimates = drafts.some(d => d.source === "ai-photo" || d.source === "ai-text");
  const inputCls = "bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 w-full";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col"
      role="dialog"
      aria-label={meal ? "Edit meal" : "Add meal"}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-800 shrink-0">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white font-display">{meal ? "Edit meal" : "Add meal"}</span>
          <span className="text-[10px] text-slate-400">Estimates based on typical home recipes</span>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {/* Meal type */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
          {MEAL_CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${category === c ? "bg-emerald-500 text-slate-950" : "text-slate-400"}`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Items in this meal */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">This meal</span>
            <span className="text-xs font-bold text-emerald-400 font-mono">~{totals.calories} kcal</span>
          </div>
          {drafts.length === 0 ? (
            <p className="text-[11px] text-slate-500 py-2">No foods yet. Search below, type one in, or snap a photo.</p>
          ) : (
            drafts.map(d => {
              const nut = itemNutrition(d);
              const food = d.foodId ? findFood(d.foodId) : undefined;
              const isGrams = d.portionId === "g";
              return (
                <div key={d.key} className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex flex-col gap-2">
                  <div className="flex justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-white truncate">{d.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {nut.calories} kcal · P {nut.protein}g · C {nut.carbs}g · F {nut.fat}g
                      </span>
                    </div>
                    <button onClick={() => setDrafts(x => x.filter(i => i.key !== d.key))} className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer shrink-0" aria-label={`Remove ${d.name}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {(d.source === "ai-photo" || d.source === "ai-text") && (
                    <span className="self-start text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      AI estimate{d.confidence ? ` · ${d.confidence} confidence` : ""}: check the amount
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    {food ? (
                      <select
                        value={d.portionId}
                        onChange={e => {
                          const toGrams = e.target.value === "g";
                          const fromGrams = d.portionId === "g";
                          const portion = findPortion(food, d.portionId || "");
                          // Keep roughly the same amount when switching to/from grams
                          const qty = toGrams && portion ? Math.round(portion.grams * d.quantity) : fromGrams ? 1 : d.quantity;
                          updateDraft(d.key, { portionId: e.target.value, quantity: qty });
                        }}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 min-w-0"
                        aria-label="Portion"
                      >
                        {food.portions.map(pt => <option key={pt.id} value={pt.id}>{pt.label} ({pt.grams} g)</option>)}
                        <option value="g">Grams (custom)</option>
                      </select>
                    ) : (
                      <span className="flex-1 text-[11px] text-slate-400 truncate">{d.portionLabel}</span>
                    )}
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg">
                      <button
                        onClick={() => updateDraft(d.key, { quantity: Math.max(isGrams ? 5 : 0.5, d.quantity - (isGrams ? 10 : 0.5)) })}
                        className="p-1.5 text-slate-400 hover:text-white cursor-pointer" aria-label="Less"
                      ><Minus className="w-3 h-3" /></button>
                      <input
                        type="number"
                        min={isGrams ? 1 : 0.1}
                        step={isGrams ? 5 : 0.5}
                        value={d.quantity}
                        onChange={e => updateDraft(d.key, { quantity: Math.max(0, Number(e.target.value)) })}
                        className="w-12 bg-transparent text-center text-[11px] text-white font-mono focus:outline-none"
                        aria-label={isGrams ? "Grams" : "Quantity"}
                      />
                      <button
                        onClick={() => updateDraft(d.key, { quantity: d.quantity + (isGrams ? 10 : 0.5) })}
                        className="p-1.5 text-slate-400 hover:text-white cursor-pointer" aria-label="More"
                      ><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                  {!food && d.perUnit && (
                    <div className="grid grid-cols-4 gap-1.5">
                      {(["calories", "protein", "carbs", "fat"] as const).map(k => (
                        <label key={k} className="flex flex-col gap-0.5">
                          <span className="text-[8px] uppercase font-mono text-slate-500">{k === "calories" ? "kcal" : k} / unit</span>
                          <input
                            type="number" min={0}
                            value={Math.round(d.perUnit![k] * 10) / 10}
                            onChange={e => updateDraft(d.key, { perUnit: { ...d.perUnit!, [k]: Math.max(0, Number(e.target.value)) } })}
                            className="bg-slate-900 border border-slate-800 rounded-md px-1.5 py-1 text-[10px] text-white font-mono w-full"
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
          {drafts.length > 0 && (
            <div className="grid grid-cols-4 gap-1 text-center border-t border-slate-800 pt-2 text-[10px] font-mono">
              <span className="text-slate-400">P <b className="text-white">{totals.protein}g</b></span>
              <span className="text-slate-400">C <b className="text-white">{totals.carbs}g</b></span>
              <span className="text-slate-400">F <b className="text-white">{totals.fat}g</b></span>
              <span className="text-slate-400">Fib <b className="text-white">{totals.fiber}g</b></span>
            </div>
          )}
          {hasEstimates && (
            <p className="text-[10px] text-amber-400/90 flex gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              AI values are rough estimates, not exact nutrition facts. Adjust the amounts before saving.
            </p>
          )}
        </div>

        {/* Add method tabs */}
        <div className="flex gap-2">
          {([
            ["search", "Search foods", Search],
            ["manual", "Type it in", PenLine],
            ["photo", "Photo", Camera],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => { setMode(id); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${mode === id ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"}`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {mode === "search" && (
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search roti, daal, biryani, chana..."
                className={`${inputCls} pl-8`}
                aria-label="Search foods"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
              {["", ...FOOD_CATEGORIES].map(c => (
                <button
                  key={c || "all"}
                  onClick={() => setFoodCategory(c)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap cursor-pointer ${foodCategory === c ? "bg-emerald-500 text-slate-950" : "bg-slate-900 text-slate-400 border border-slate-800"}`}
                >
                  {c || "All"}
                </button>
              ))}
            </div>

            {picked && pickedPortion && (
              <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-2xl p-3 flex flex-col gap-2.5">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-white">{picked.name}</span>
                  <button onClick={() => setPicked(null)} className="text-slate-500 hover:text-white cursor-pointer" aria-label="Cancel"><X className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[...picked.portions, GRAM_PORTION].map(pt => (
                    <button
                      key={pt.id}
                      onClick={() => {
                        setQuantity(pt.id === "g" ? Math.round(pickedPortion.grams * quantity) : portionId === "g" ? 1 : quantity);
                        setPortionId(pt.id);
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer ${portionId === pt.id ? "bg-emerald-500 text-slate-950" : "bg-slate-900 text-slate-300 border border-slate-800"}`}
                    >
                      {pt.id === "g" ? "Custom grams" : pt.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-slate-400" htmlFor="qty">{portionId === "g" ? "Grams" : "How many"}</label>
                  <input
                    id="qty" type="number" min={portionId === "g" ? 1 : 0.25} step={portionId === "g" ? 5 : 0.5}
                    value={quantity}
                    onChange={e => setQuantity(Number(e.target.value))}
                    className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono"
                  />
                  {portionId !== "g" && <span className="text-[10px] text-slate-500">× {pickedPortion.grams} g</span>}
                </div>
                {pickedPreview && (
                  <span className="text-[10px] font-mono text-slate-300">
                    ≈ {pickedPreview.calories} kcal · P {pickedPreview.protein}g · C {pickedPreview.carbs}g · F {pickedPreview.fat}g · Fiber {pickedPreview.fiber}g
                  </span>
                )}
                <button
                  onClick={addPicked}
                  disabled={!(quantity > 0)}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add to meal
                </button>
              </div>
            )}

            {foodsError ? (
              <p className="text-[11px] text-rose-400">{foodsError}</p>
            ) : foodsLoading && foods.length === 0 ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-emerald-400 animate-spin" /></div>
            ) : foods.length === 0 ? (
              <div className="text-center py-4 flex flex-col gap-2 items-center">
                <p className="text-[11px] text-slate-500">No match for "{query}".</p>
                <button
                  onClick={() => { setMode("manual"); setManual(m => ({ ...m, name: query })); setEstimateText(query); }}
                  className="text-[11px] text-emerald-400 font-semibold cursor-pointer"
                >
                  Enter "{query}" manually →
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {foods.map(f => {
                  const def = portionNutrition(f, f.portions[0], 1);
                  return (
                    <button
                      key={f.id}
                      onClick={() => pickFood(f)}
                      className={`text-left bg-slate-900/70 hover:bg-slate-900 border rounded-xl px-3 py-2 flex justify-between items-center gap-2 cursor-pointer ${picked?.id === f.id ? "border-emerald-500/40" : "border-slate-800"}`}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs text-white font-medium truncate">{f.name}</span>
                        <span className="text-[9px] text-slate-500">{f.category}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">{def.calories} kcal / {f.portions[0].label.toLowerCase()}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {mode === "manual" && (
          <div className="flex flex-col gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Enter values yourself</span>
              <input value={manual.name} onChange={e => setManual({ ...manual, name: e.target.value })} placeholder="Food name, e.g. Ammi's aloo keema" className={inputCls} maxLength={80} />
              <input value={manual.portionLabel} onChange={e => setManual({ ...manual, portionLabel: e.target.value })} placeholder="Portion, e.g. 1 bowl" className={inputCls} maxLength={40} />
              <div className="grid grid-cols-3 gap-2">
                {([["calories", "kcal *"], ["protein", "Protein g"], ["carbs", "Carbs g"], ["fat", "Fat g"], ["fiber", "Fiber g"]] as const).map(([k, label]) => (
                  <input
                    key={k} type="number" min={0} placeholder={label}
                    value={(manual as any)[k]}
                    onChange={e => setManual({ ...manual, [k]: e.target.value })}
                    className={inputCls}
                    aria-label={label}
                  />
                ))}
              </div>
              <button onClick={addManual} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Add to meal
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1"><Sparkles className="w-3 h-3 text-emerald-400" /> Or let AI estimate</span>
              <div className="flex gap-2">
                <input value={estimateText} onChange={e => setEstimateText(e.target.value)} placeholder='e.g. "1 plate daal chawal"' className={inputCls} maxLength={150}
                  onKeyDown={e => { if (e.key === "Enter") runEstimate(); }} />
                <button onClick={runEstimate} disabled={aiLoading || !estimateText.trim()} className="px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold disabled:opacity-40 cursor-pointer">
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Estimate"}
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === "photo" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col gap-3">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Take or upload a photo of your plate. AI will guess the foods and portions. These are rough guesses, so you can review and correct each one.
            </p>
            {photoPreview && <img src={photoPreview} alt="Your meal" className="rounded-xl max-h-48 object-cover w-full" />}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={e => onPhoto(e.target.files?.[0])} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={aiLoading}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {aiLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analysing photo...</> : <><Camera className="w-3.5 h-3.5" /> {photoPreview ? "Try another photo" : "Choose photo"}</>}
            </button>
          </div>
        )}

        {/* AI suggestions waiting for review */}
        {(suggestions.length > 0 || aiNote) && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-mono">Review AI estimates</span>
            {aiNote && <p className="text-[10px] text-slate-400">{aiNote}</p>}
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-2 bg-slate-950/60 rounded-xl px-3 py-2">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-white truncate">{s.name}</span>
                  <span className="text-[9px] text-slate-500 font-mono">{s.portionLabel} · ~{s.calories} kcal · {s.confidence} confidence</span>
                </div>
                <button onClick={() => acceptSuggestion(s)} className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold cursor-pointer">
                  Add
                </button>
              </div>
            ))}
            {suggestions.length > 1 && (
              <button onClick={() => [...suggestions].forEach(acceptSuggestion)} className="text-[11px] text-emerald-400 font-semibold self-end cursor-pointer">Add all</button>
            )}
          </div>
        )}

        {error && <p className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2" role="alert">{error}</p>}
      </div>

      {/* Save bar */}
      <div className="px-5 py-3 border-t border-slate-800 shrink-0 flex gap-2">
        <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold cursor-pointer">Cancel</button>
        <button
          onClick={save}
          disabled={saving || drafts.length === 0}
          className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 disabled:opacity-40 text-slate-950 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {meal ? "Save changes" : `Save ${category.toLowerCase()} · ${totals.calories} kcal`}
        </button>
      </div>
    </motion.div>
  );
}
