import React, { useEffect, useState } from "react";
import { Loader2, AlertCircle, TrendingUp, TrendingDown, Minus, Sparkles, Scale, CalendarCheck, PartyPopper, Wrench, Target, ChevronDown } from "lucide-react";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, LineChart } from "recharts";
import { api } from "../../lib/api";
import { DailyLog, MotivationEntry, UserProfile } from "../../types";

interface Snapshot {
  status: MotivationEntry["progressStatus"];
  daysTracked: number;
  weight: { trend: "insufficient-data" | "down" | "flat" | "up"; weeklyRate: number | null; recentAvg: number | null; note: string; plateau: boolean };
  workouts: { thisWeek: number; lastWeek: number; minutesThisWeek: number };
  meals: { daysLoggedThisWeek: number; avgCaloriesLogged: number | null };
  activity: { avgStepsThisWeek: number; avgStepsLastWeek: number; avgWaterThisWeek: number };
  goals: { completedThisWeek: number; acceptedThisWeek: number; completionRate: number | null };
  signals: string[];
  wins: string[];
}

interface SeriesPoint { date: string; steps: number; water: number; caloriesLogged: number; workouts: number; weight: number | null }

const STATUS_STYLE: Record<Snapshot["status"], { label: string; cls: string }> = {
  "building-baseline": { label: "Building your baseline", cls: "bg-cyan-500/10 border-cyan-500/25 text-cyan-300" },
  "on-track": { label: "On track", cls: "bg-emerald-500/10 border-emerald-500/25 text-emerald-300" },
  "improving": { label: "Improving", cls: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" },
  "slowing": { label: "Progress slowing", cls: "bg-amber-500/10 border-amber-500/25 text-amber-300" },
};

const dayLabel = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });

interface ProgressPanelProps {
  signedIn: boolean;
  profile: UserProfile;
  onWeightLogged?: (profile: UserProfile, log: DailyLog) => void;
}

export default function ProgressPanel({ signedIn, profile, onWeightLogged }: ProgressPanelProps) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [latest, setLatest] = useState<MotivationEntry | null>(null);
  const [history, setHistory] = useState<MotivationEntry[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState("");
  const [coachLoading, setCoachLoading] = useState<"check-in" | "weekly" | null>(null);
  const [weight, setWeight] = useState(String(profile.weight || ""));
  const [weightMsg, setWeightMsg] = useState("");

  const load = async () => {
    try {
      const data = await api<{ snapshot: Snapshot; series: SeriesPoint[]; latestMotivation: MotivationEntry | null }>("/api/progress/summary");
      setSnapshot(data.snapshot);
      setSeries(data.series);
      setLatest(data.latestMotivation);
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => { if (signedIn) load(); }, [signedIn]);

  const askCoach = async (kind: "check-in" | "weekly") => {
    setCoachLoading(kind);
    try {
      const data = await api<{ entry: MotivationEntry; snapshot: Snapshot }>("/api/progress/motivation", "POST", { kind });
      setLatest(data.entry);
      setSnapshot(data.snapshot);
      if (history) setHistory([data.entry, ...history]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCoachLoading(null);
    }
  };

  const logWeight = async () => {
    try {
      const data = await api<{ profile: UserProfile; log: DailyLog }>("/api/progress/weight", "POST", { weight: Number(weight) });
      onWeightLogged?.(data.profile, data.log);
      setWeightMsg(`Saved ${weight} kg for today.`);
      setTimeout(() => setWeightMsg(""), 2500);
      load();
    } catch (e: any) {
      setWeightMsg(e.message);
    }
  };

  const toggleHistory = async () => {
    setShowHistory(s => !s);
    if (history === null) {
      try {
        const data = await api<{ entries: MotivationEntry[] }>("/api/progress/motivation/history");
        setHistory(data.entries);
      } catch (e: any) {
        setError(e.message);
      }
    }
  };

  if (!signedIn) {
    return <p className="text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl p-4">Sign in so your coach can track your weight, workouts and meals over time.</p>;
  }
  if (!snapshot) {
    return error ? (
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex gap-2 text-[11px] text-rose-300" role="alert">
        <AlertCircle className="w-4 h-4 shrink-0" /><span className="flex-1">{error}</span>
        <button onClick={load} className="font-bold cursor-pointer">Retry</button>
      </div>
    ) : (
      <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-emerald-400 animate-spin" /></div>
    );
  }

  const st = STATUS_STYLE[snapshot.status];
  const TrendIcon = snapshot.weight.trend === "down" ? TrendingDown : snapshot.weight.trend === "up" ? TrendingUp : Minus;
  const chart = series.map(p => ({ ...p, label: dayLabel(p.date) }));
  const weightPoints = chart.filter(p => p.weight !== null);

  const stat = (label: string, value: string, sub?: string) => (
    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex flex-col">
      <span className="text-[9px] text-slate-500 font-mono uppercase">{label}</span>
      <span className="text-sm font-black text-white">{value}</span>
      {sub && <span className="text-[9px] text-slate-500">{sub}</span>}
    </div>
  );

  const entryCard = (m: MotivationEntry, big = false) => (
    <div key={m.id} className={`flex flex-col gap-2 ${big ? "" : "bg-slate-950/50 border border-slate-800 rounded-xl p-3"}`}>
      <div className="flex justify-between items-start gap-2">
        <span className={`${big ? "text-sm" : "text-xs"} font-bold text-white`}>{m.headline}</span>
        <span className="text-[9px] text-slate-500 font-mono shrink-0">{new Date(m.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
      </div>
      <p className="text-[11px] text-slate-300 leading-relaxed">{m.message}</p>
      {m.celebrations.length > 0 && (
        <div className="flex flex-col gap-1">
          {m.celebrations.map(c => <span key={c} className="text-[11px] text-emerald-300 flex gap-1.5"><PartyPopper className="w-3.5 h-3.5 shrink-0" /> {c}</span>)}
        </div>
      )}
      {m.smallGoals.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-mono uppercase text-slate-500">Small goals</span>
          {m.smallGoals.map(c => <span key={c} className="text-[11px] text-slate-300 flex gap-1.5"><Target className="w-3.5 h-3.5 shrink-0 text-cyan-400" /> {c}</span>)}
        </div>
      )}
      {m.adjustments.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-mono uppercase text-slate-500">Try this</span>
          {m.adjustments.map(c => <span key={c} className="text-[11px] text-slate-300 flex gap-1.5"><Wrench className="w-3.5 h-3.5 shrink-0 text-amber-400" /> {c}</span>)}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3 pb-4">
      {error && <p className="text-[11px] text-rose-400" role="alert">{error}</p>}

      {/* Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">This week</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${st.cls}`}>{st.label}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {stat("Workouts", String(snapshot.workouts.thisWeek), `last week ${snapshot.workouts.lastWeek}`)}
          {stat("Meals logged", `${snapshot.meals.daysLoggedThisWeek}/7 days`, snapshot.meals.avgCaloriesLogged ? `~${snapshot.meals.avgCaloriesLogged} kcal/day` : undefined)}
          {stat("Avg steps", snapshot.activity.avgStepsThisWeek.toLocaleString(), `last week ${snapshot.activity.avgStepsLastWeek.toLocaleString()}`)}
          {stat("Goals done", snapshot.goals.completionRate === null ? "–" : `${snapshot.goals.completionRate}%`, `${snapshot.goals.completedThisWeek} of ${snapshot.goals.acceptedThisWeek}`)}
        </div>
        <div className="flex items-start gap-2 text-[11px] text-slate-300 bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
          <TrendIcon className="w-4 h-4 shrink-0 text-cyan-400" />
          <span>{snapshot.weight.note}</span>
        </div>
        {snapshot.signals.length > 0 && (
          <div className="flex flex-col gap-1">
            {snapshot.signals.map(s => <span key={s} className="text-[11px] text-amber-300/90">• {s}</span>)}
          </div>
        )}
      </div>

      {/* Coach message */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 border border-emerald-500/20 rounded-2xl p-4 flex flex-col gap-3">
        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Your coach</span>
        {latest ? entryCard(latest, true) : <p className="text-[11px] text-slate-400">Ask for a check-in to get a message based on your week.</p>}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => askCoach("check-in")} disabled={!!coachLoading} className="py-2 rounded-xl bg-emerald-500 text-slate-950 text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer">
            {coachLoading === "check-in" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Motivate me
          </button>
          <button onClick={() => askCoach("weekly")} disabled={!!coachLoading} className="py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer">
            {coachLoading === "weekly" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarCheck className="w-3.5 h-3.5" />} Weekly summary
          </button>
        </div>
      </div>

      {/* Weigh-in */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /> Today's weigh-in</span>
        <div className="flex gap-2">
          <input type="number" step={0.1} value={weight} onChange={e => setWeight(e.target.value)} className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono" aria-label="Weight in kg" />
          <span className="self-center text-xs text-slate-500">kg</span>
          <button onClick={logWeight} className="px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold cursor-pointer">Save</button>
        </div>
        {weightMsg && <span className="text-[11px] text-slate-300">{weightMsg}</span>}
        <span className="text-[10px] text-slate-500">Weigh 2-3 times a week, same time of day. Your coach looks at the average over weeks, so daily ups and downs won't count as a plateau.</span>
        {weightPoints.length >= 2 && (
          <div className="h-28 mt-1">
            <ResponsiveContainer>
              <LineChart data={weightPoints} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, fontSize: 11 }} formatter={(v: any) => [`${v} kg`, "Weight"]} />
                <Line type="monotone" dataKey="weight" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 14-day activity */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Last 14 days</span>
        <div className="h-40">
          <ResponsiveContainer>
            <ComposedChart data={chart} margin={{ top: 6, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
              <YAxis yAxisId="steps" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="kcal" orientation="right" hide />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, fontSize: 11 }} />
              <Bar yAxisId="steps" dataKey="steps" name="Steps" fill="#34d399" radius={[4, 4, 0, 0]} />
              <Line yAxisId="kcal" dataKey="caloriesLogged" name="kcal logged" stroke="#facc15" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> Steps</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-yellow-400" /> Calories logged</span>
          <span className="ml-auto">Workout days: {series.filter(s => s.workouts > 0).length}</span>
        </div>
      </div>

      {/* Past messages */}
      <button onClick={toggleHistory} className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-300 cursor-pointer" aria-expanded={showHistory}>
        Past coach messages
        <ChevronDown className={`w-4 h-4 transition-transform ${showHistory ? "rotate-180" : ""}`} />
      </button>
      {showHistory && (
        history === null ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 text-emerald-400 animate-spin" /></div>
          : history.length === 0 ? <p className="text-[11px] text-slate-500 text-center">No messages yet.</p>
          : <div className="flex flex-col gap-2">{history.map(m => entryCard(m))}</div>
      )}
    </div>
  );
}
