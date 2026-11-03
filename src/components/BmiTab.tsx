import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Calculator, User, Users, Save, Trash2, Loader2, Info, AlertCircle, Check, History } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { UserProfile } from "../types";
import { api, isSignedIn } from "../lib/api";
import {
  ADULT_CATEGORIES, BMI_DISCLAIMER, BmiResult, HeightUnit, WeightUnit,
  calculateBmi, cmToFtIn, kgToLb, toCm, toKg, validateBmiInput,
} from "../lib/bmi";

interface BmiTabProps {
  profile: UserProfile;
}

interface SavedRecord {
  id: string;
  subject: "self" | "other";
  personName?: string;
  age: number;
  gender?: string;
  heightCm: number;
  weightKg: number;
  bmi: number;
  category: string | null;
  createdAt: string;
}

type Mode = "self" | "other";

interface FormState {
  name: string;
  age: string;
  gender: "" | "Male" | "Female" | "Other";
  heightUnit: HeightUnit;
  heightValue: string;
  heightInches: string;
  weightUnit: WeightUnit;
  weightValue: string;
}

const emptyForm = (): FormState => ({
  name: "", age: "", gender: "", heightUnit: "cm", heightValue: "", heightInches: "", weightUnit: "kg", weightValue: "",
});

const fromProfile = (p: UserProfile): FormState => ({
  name: p.name,
  age: String(p.age || ""),
  gender: p.gender || "",
  heightUnit: "cm",
  heightValue: p.height ? String(p.height) : "",
  heightInches: "",
  weightUnit: "kg",
  weightValue: p.weight ? String(p.weight) : "",
});

const fmt = (n: number, d = 1) => String(Math.round(n * 10 ** d) / 10 ** d);
const SCALE_MIN = 15, SCALE_MAX = 40;
const scalePos = (bmi: number) => Math.min(100, Math.max(0, ((bmi - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100));
const categoryColor = (c: string | null) => ADULT_CATEGORIES.find(x => x.label === c)?.color || "#94a3b8";

export default function BmiTab({ profile }: BmiTabProps) {
  const signedIn = isSignedIn();
  const [mode, setMode] = useState<Mode>("self");
  const [form, setForm] = useState<FormState>(() => fromProfile(profile));
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<(BmiResult & { name: string; age: number }) | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  const [historyTab, setHistoryTab] = useState<Mode>("self");
  const [records, setRecords] = useState<Record<Mode, SavedRecord[] | null>>({ self: null, other: null });
  const [historyError, setHistoryError] = useState("");

  const loadHistory = async (subject: Mode) => {
    if (!signedIn) return;
    try {
      const data = await api<{ records: SavedRecord[] }>(`/api/bmi/history?subject=${subject}`);
      setRecords(r => ({ ...r, [subject]: data.records }));
      setHistoryError("");
    } catch (e: any) {
      setHistoryError(e.message);
    }
  };

  useEffect(() => { loadHistory("self"); loadHistory("other"); }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    setForm(m === "self" ? fromProfile(profile) : emptyForm());
    setResult(null);
    setErrors([]);
    setSaveState("idle");
  };

  const set = (patch: Partial<FormState>) => {
    setForm(f => ({ ...f, ...patch }));
    setSaveState("idle");
  };

  // Converting units keeps the same physical height/weight
  const changeHeightUnit = (unit: HeightUnit) => {
    const v = Number(form.heightValue);
    if (!form.heightValue || !Number.isFinite(v) || v <= 0) return set({ heightUnit: unit });
    const cm = toCm(form.heightUnit, v, Number(form.heightInches) || 0);
    if (unit === "cm") set({ heightUnit: unit, heightValue: fmt(cm, 0), heightInches: "" });
    else if (unit === "m") set({ heightUnit: unit, heightValue: fmt(cm / 100, 2), heightInches: "" });
    else {
      const { ft, inches } = cmToFtIn(cm);
      set({ heightUnit: unit, heightValue: String(ft), heightInches: String(inches) });
    }
  };

  const changeWeightUnit = (unit: WeightUnit) => {
    const v = Number(form.weightValue);
    if (!form.weightValue || !Number.isFinite(v) || v <= 0 || unit === form.weightUnit) return set({ weightUnit: unit });
    const kg = toKg(form.weightUnit, v);
    set({ weightUnit: unit, weightValue: unit === "kg" ? fmt(kg) : fmt(kgToLb(kg)) });
  };

  const input = () => ({
    age: Number(form.age),
    heightUnit: form.heightUnit,
    heightValue: Number(form.heightValue),
    heightInches: form.heightUnit === "ft-in" ? Number(form.heightInches || 0) : 0,
    weightUnit: form.weightUnit,
    weightValue: Number(form.weightValue),
  });

  const calculate = (e?: React.FormEvent) => {
    e?.preventDefault();
    const raw = { ...input(), age: form.age === "" ? NaN : Number(form.age) };
    const errs = validateBmiInput(raw);
    setErrors(errs);
    setSaveState("idle");
    if (errs.length) return setResult(null);
    setResult({ ...calculateBmi(raw), name: form.name.trim(), age: raw.age });
  };

  const save = async () => {
    if (!result) return;
    setSaveState("saving");
    try {
      await api("/api/bmi/records", "POST", {
        subject: mode,
        personName: mode === "other" ? form.name.trim() : undefined,
        gender: form.gender || undefined,
        ...input(),
      });
      setSaveState("saved");
      setHistoryTab(mode);
      loadHistory(mode);
    } catch (e: any) {
      setSaveState("error");
      setSaveError(e.message);
    }
  };

  const remove = async (rec: SavedRecord) => {
    try {
      await api(`/api/bmi/records/${rec.id}`, "DELETE");
      setRecords(r => ({ ...r, [rec.subject]: (r[rec.subject] || []).filter(x => x.id !== rec.id) }));
    } catch (e: any) {
      setHistoryError(e.message);
    }
  };

  const inputCls = "bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 w-full min-w-0";
  const unitBtn = (active: boolean) =>
    `px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${active ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-white"}`;

  const selfRecords = records.self || [];
  const chartData = [...selfRecords].reverse().map(r => ({
    date: new Date(r.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
    bmi: r.bmi,
  }));
  const shown = records[historyTab];

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 text-slate-100 bg-slate-950 h-full">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <h2 className="text-xl font-extrabold tracking-tight text-white font-display">BMI Calculator</h2>
          <p className="text-xs text-slate-400">For yourself, family or friends. No account needed for them.</p>
        </div>
        <Calculator className="w-6 h-6 text-emerald-400" />
      </div>

      {/* Who is this for */}
      <div className="grid grid-cols-2 gap-2">
        {([["self", "Calculate My BMI", User], ["other", "Someone Else's BMI", Users]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => switchMode(id)}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${mode === id ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"}`}
            aria-pressed={mode === id}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      <form onSubmit={calculate} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 col-span-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Name (optional)</span>
            <input value={form.name} onChange={e => set({ name: e.target.value })} placeholder={mode === "self" ? "Your name" : "e.g. Ammi, Bilal"} maxLength={60} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Age</span>
            <input type="number" inputMode="numeric" min={2} max={120} value={form.age} onChange={e => set({ age: e.target.value })} placeholder="Years" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Gender (optional)</span>
            <select value={form.gender} onChange={e => set({ gender: e.target.value as FormState["gender"] })} className={inputCls}>
              <option value="">Prefer not to say</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Height</span>
            <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5" role="group" aria-label="Height unit">
              <button type="button" onClick={() => changeHeightUnit("ft-in")} className={unitBtn(form.heightUnit === "ft-in")}>ft / in</button>
              <button type="button" onClick={() => changeHeightUnit("cm")} className={unitBtn(form.heightUnit === "cm")}>cm</button>
              <button type="button" onClick={() => changeHeightUnit("m")} className={unitBtn(form.heightUnit === "m")}>m</button>
            </div>
          </div>
          {form.heightUnit === "ft-in" ? (
            <div className="grid grid-cols-2 gap-2">
              <input type="number" inputMode="numeric" min={1} max={8} value={form.heightValue} onChange={e => set({ heightValue: e.target.value })} placeholder="Feet" className={inputCls} aria-label="Feet" />
              <input type="number" inputMode="numeric" min={0} max={11} value={form.heightInches} onChange={e => set({ heightInches: e.target.value })} placeholder="Inches" className={inputCls} aria-label="Inches" />
            </div>
          ) : (
            <input type="number" inputMode="decimal" step={form.heightUnit === "m" ? 0.01 : 1} value={form.heightValue} onChange={e => set({ heightValue: e.target.value })}
              placeholder={form.heightUnit === "m" ? "e.g. 1.65" : "e.g. 165"} className={inputCls} aria-label={`Height in ${form.heightUnit}`} />
          )}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Weight</span>
            <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5" role="group" aria-label="Weight unit">
              <button type="button" onClick={() => changeWeightUnit("kg")} className={unitBtn(form.weightUnit === "kg")}>kg</button>
              <button type="button" onClick={() => changeWeightUnit("lb")} className={unitBtn(form.weightUnit === "lb")}>lb</button>
            </div>
          </div>
          <input type="number" inputMode="decimal" step={0.1} value={form.weightValue} onChange={e => set({ weightValue: e.target.value })}
            placeholder={form.weightUnit === "kg" ? "e.g. 68" : "e.g. 150"} className={inputCls} aria-label={`Weight in ${form.weightUnit}`} />
        </div>

        {errors.length > 0 && (
          <ul className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2 flex flex-col gap-0.5" role="alert">
            {errors.map(e => <li key={e}>{e}</li>)}
          </ul>
        )}

        <button type="submit" className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-black py-2.5 rounded-xl text-sm cursor-pointer">
          Calculate BMI
        </button>
      </form>

      {/* Result card */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={`${result.bmi}-${result.name}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4"
            aria-live="polite"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">BMI result</span>
                <span className="text-sm font-bold text-white truncate">{result.name || (mode === "self" ? "You" : "This person")}</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {result.age} yrs · {fmt(result.heightCm, 0)} cm ({cmToFtIn(result.heightCm).ft}′{cmToFtIn(result.heightCm).inches}″) · {result.weightKg} kg ({fmt(kgToLb(result.weightKg), 0)} lb)
                </span>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-4xl font-black font-display" style={{ color: categoryColor(result.category) }}>{result.bmi}</span>
                <span className="text-[10px] text-slate-500 font-mono">kg/m²</span>
              </div>
            </div>

            {result.category ? (
              <>
                <span className="self-start text-xs font-bold px-2.5 py-1 rounded-lg border" style={{ color: categoryColor(result.category), borderColor: categoryColor(result.category) + "55", background: categoryColor(result.category) + "15" }}>
                  {result.category}
                </span>

                {/* Visual scale */}
                <div className="flex flex-col gap-1.5" aria-hidden="true">
                  <div className="relative h-3 rounded-full overflow-hidden flex">
                    {ADULT_CATEGORIES.map(c => {
                      const from = Math.max(c.min, SCALE_MIN), to = Math.min(c.max, SCALE_MAX);
                      return <div key={c.label} style={{ width: `${((to - from) / (SCALE_MAX - SCALE_MIN)) * 100}%`, background: c.color, opacity: 0.85 }} />;
                    })}
                  </div>
                  <div className="relative h-4">
                    <motion.div
                      initial={{ left: "0%" }}
                      animate={{ left: `${scalePos(result.bmi)}%` }}
                      transition={{ type: "spring", stiffness: 120, damping: 18 }}
                      className="absolute -top-6 -translate-x-1/2 flex flex-col items-center"
                    >
                      <div className="w-1 h-5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                    </motion.div>
                    {[18.5, 25, 30].map(v => (
                      <span key={v} className="absolute text-[9px] text-slate-500 font-mono -translate-x-1/2" style={{ left: `${scalePos(v)}%` }}>{v}</span>
                    ))}
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>Underweight</span><span>Healthy</span><span>Overweight</span><span>Obesity</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
                    <span className="text-[9px] text-slate-500 font-mono uppercase block">Healthy BMI</span>
                    <span className="text-white font-bold">{result.healthyRange!.min} – {result.healthyRange!.max}</span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
                    <span className="text-[9px] text-slate-500 font-mono uppercase block">Healthy weight at this height</span>
                    <span className="text-white font-bold">{result.healthyWeightKg!.min} – {result.healthyWeightKg!.max} kg</span>
                  </div>
                </div>
              </>
            ) : (
              <span className="self-start text-xs font-bold px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                Under 20: adult categories don't apply
              </span>
            )}

            <p className="text-xs text-slate-300 leading-relaxed">{result.explanation}</p>

            <p className="text-[10px] text-slate-500 leading-relaxed flex gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {BMI_DISCLAIMER}
            </p>

            {signedIn ? (
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={save}
                  disabled={saveState === "saving" || saveState === "saved"}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-950 border border-emerald-500/25 text-emerald-400 text-xs font-bold disabled:opacity-60 cursor-pointer"
                >
                  {saveState === "saving" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saveState === "saved" ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  {saveState === "saved" ? "Saved" : mode === "self" ? "Save to my BMI history" : "Save to 'Other people' (optional)"}
                </button>
                {mode === "other" && <span className="text-[10px] text-slate-500 text-center">Saved separately. It never mixes with your own health records.</span>}
                {saveState === "error" && <span className="text-[11px] text-rose-400 text-center">{saveError}</span>}
              </div>
            ) : (
              <span className="text-[10px] text-slate-500 text-center">Sign in to save results to your history.</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {signedIn && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Saved results</span>
            <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5">
              <button onClick={() => setHistoryTab("self")} className={unitBtn(historyTab === "self")}>My history</button>
              <button onClick={() => setHistoryTab("other")} className={unitBtn(historyTab === "other")}>Other people</button>
            </div>
          </div>

          {historyError && <p className="text-[11px] text-rose-400 flex gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> {historyError}</p>}

          {historyTab === "self" && chartData.length >= 2 && (
            <div className="h-36">
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <ReferenceLine y={18.5} stroke="#34d399" strokeOpacity={0.4} strokeDasharray="3 3" />
                  <ReferenceLine y={24.9} stroke="#34d399" strokeOpacity={0.4} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[(min: number) => Math.floor(Math.min(min, 18.5) - 1), (max: number) => Math.ceil(Math.max(max, 24.9) + 1)]} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, fontSize: 11 }} formatter={(v: any) => [v, "BMI"]} />
                  <Line type="monotone" dataKey="bmi" stroke="#34d399" strokeWidth={2} dot={{ r: 3, fill: "#34d399" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {historyTab === "self" && selfRecords.length >= 2 && (
            <p className="text-[11px] text-slate-400">
              Change since first saved: <b className="text-white">{(selfRecords[0].bmi - selfRecords[selfRecords.length - 1].bmi > 0 ? "+" : "") + fmt(selfRecords[0].bmi - selfRecords[selfRecords.length - 1].bmi)}</b> BMI
              ({(selfRecords[0].weightKg - selfRecords[selfRecords.length - 1].weightKg > 0 ? "+" : "") + fmt(selfRecords[0].weightKg - selfRecords[selfRecords.length - 1].weightKg)} kg)
            </p>
          )}

          {shown === null ? (
            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 text-emerald-400 animate-spin" /></div>
          ) : shown.length === 0 ? (
            <p className="text-[11px] text-slate-500 text-center py-3">
              {historyTab === "self" ? "No saved results yet. Calculate your BMI and tap save." : "No saved results for other people."}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {shown.map(r => (
                <div key={r.id} className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2">
                  <span className="text-lg font-black font-display w-12" style={{ color: categoryColor(r.category) }}>{r.bmi}</span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs text-white truncate">{r.subject === "other" ? r.personName : r.category || "Under 20 (no adult category)"}</span>
                    <span className="text-[10px] text-slate-500 font-mono truncate">
                      {new Date(r.createdAt).toLocaleDateString()} · {r.age} yrs · {fmt(r.heightCm, 0)} cm · {r.weightKg} kg{r.subject === "other" && r.category ? ` · ${r.category}` : ""}
                    </span>
                  </div>
                  <button onClick={() => remove(r)} className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer" aria-label="Delete record">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
