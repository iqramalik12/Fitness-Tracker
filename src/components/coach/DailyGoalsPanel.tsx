import React, { useEffect, useState } from "react";
import { Footprints, Dumbbell, Utensils, Droplets, Moon, Star, Check, X, Pencil, RotateCcw, RefreshCw, Plus, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import { CoachGoal } from "../../types";

const ICONS = { activity: Footprints, workout: Dumbbell, nutrition: Utensils, hydration: Droplets, sleep: Moon, custom: Star };
const UNITS = { steps: "steps", water: "ml", meals: "meals", workouts: "workout" };

interface DailyGoalsPanelProps {
  signedIn: boolean;
}

export default function DailyGoalsPanel({ signedIn }: DailyGoalsPanelProps) {
  const [goals, setGoals] = useState<CoachGoal[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [editing, setEditing] = useState<{ id: string; title: string; description: string; target: string } | null>(null);
  const [newGoal, setNewGoal] = useState("");

  const load = async () => {
    try {
      const data = await api<{ goals: CoachGoal[] }>("/api/goals/today");
      setGoals(data.goals);
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => { if (signedIn) load(); }, [signedIn]);

  const update = async (id: string, body: Record<string, unknown>) => {
    setBusy(id);
    try {
      const data = await api<{ goal: CoachGoal }>(`/api/goals/${id}`, "PUT", body);
      setGoals(gs => gs?.map(g => (g.id === id ? data.goal : g)) || null);
      setEditing(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const data = await api<{ goals: CoachGoal[] }>("/api/goals/regenerate", "POST");
      setGoals(data.goals);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRegenerating(false);
    }
  };

  const addGoal = async () => {
    if (!newGoal.trim()) return;
    try {
      await api("/api/goals", "POST", { title: newGoal });
      setNewGoal("");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const remove = async (id: string) => {
    try {
      await api(`/api/goals/${id}`, "DELETE");
      setGoals(gs => gs?.filter(g => g.id !== id) || null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (!signedIn) {
    return <p className="text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl p-4">Sign in to get personalised daily goals based on your activity.</p>;
  }

  const active = goals?.filter(g => g.status !== "skipped") || [];
  const done = active.filter(g => g.status === "completed").length;
  const committed = active.filter(g => g.status !== "suggested").length;

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
        <div className="relative w-14 h-14 shrink-0">
          <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#1e293b" strokeWidth="4" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#34d399" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${committed ? (done / committed) * 97.4 : 0} 97.4`} className="transition-all duration-500" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white">{done}/{committed || 0}</span>
        </div>
        <div className="flex flex-col flex-1">
          <span className="text-sm font-bold text-white">Today's goals</span>
          <span className="text-[11px] text-slate-400">Accept the ones that fit your day, edit them, or skip. Measurable goals tick themselves off from your logs.</span>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex gap-2 text-[11px] text-rose-300" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0" /><span className="flex-1">{error}</span>
          <button onClick={() => { setError(""); load(); }} className="font-bold cursor-pointer">Retry</button>
        </div>
      )}

      {goals === null && !error ? (
        <div className="flex flex-col items-center gap-2 py-8 text-[11px] text-slate-500">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" /> Building goals from your recent activity...
        </div>
      ) : (
        goals?.map(g => {
          const Icon = ICONS[g.category] || Star;
          const pct = g.progress ? Math.min(100, (g.progress.current / g.progress.target) * 100) : 0;
          const isEditing = editing?.id === g.id;
          return (
            <div key={g.id} className={`border rounded-2xl p-3.5 flex flex-col gap-2.5 transition-all ${
              g.status === "completed" ? "bg-emerald-500/5 border-emerald-500/25" : g.status === "skipped" ? "bg-slate-900/30 border-slate-800/50 opacity-60" : "bg-slate-900 border-slate-800"
            }`}>
              <div className="flex gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${g.status === "completed" ? "bg-emerald-500 text-slate-950" : "bg-slate-950 border border-slate-800 text-emerald-400"}`}>
                  {g.status === "completed" ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                {isEditing ? (
                  <div className="flex-1 flex flex-col gap-1.5">
                    <input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} maxLength={60}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white" aria-label="Goal title" />
                    <textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} maxLength={200} rows={2}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-300 resize-none" aria-label="Goal description" />
                    {g.metric && (
                      <label className="flex items-center gap-2 text-[11px] text-slate-400">
                        Target
                        <input type="number" value={editing.target} onChange={e => setEditing({ ...editing, target: e.target.value })}
                          className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono" />
                        {UNITS[g.metric.type]}
                      </label>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-w-0">
                    <span className={`text-xs font-bold ${g.status === "completed" ? "text-emerald-300" : "text-white"} ${g.status === "skipped" ? "line-through" : ""}`}>{g.title}</span>
                    <span className="text-[11px] text-slate-400 leading-relaxed">{g.description}</span>
                    {g.source === "ai" && g.status === "suggested" && <span className="text-[9px] text-emerald-400/80 flex items-center gap-1 mt-0.5"><Sparkles className="w-2.5 h-2.5" /> AI suggestion</span>}
                  </div>
                )}
              </div>

              {g.progress && g.status !== "skipped" && !isEditing && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{g.progress.current.toLocaleString()} / {g.progress.target.toLocaleString()} {UNITS[g.metric!.type]}</span>
                </div>
              )}

              <div className="flex gap-1.5 flex-wrap">
                {isEditing ? (
                  <>
                    <button onClick={() => update(g.id, { title: editing.title, description: editing.description, ...(g.metric ? { metricTarget: Number(editing.target) } : {}), ...(g.status === "suggested" ? { status: "accepted" } : {}) })}
                      disabled={busy === g.id} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-[10px] font-bold cursor-pointer">Save</button>
                    <button onClick={() => setEditing(null)} className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-[10px] cursor-pointer">Cancel</button>
                  </>
                ) : g.status === "suggested" ? (
                  <>
                    <button onClick={() => update(g.id, { status: "accepted" })} disabled={busy === g.id} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-[10px] font-bold flex items-center gap-1 cursor-pointer"><Check className="w-3 h-3" /> Accept</button>
                    <button onClick={() => setEditing({ id: g.id, title: g.title, description: g.description, target: String(g.metric?.target ?? "") })} className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-[10px] flex items-center gap-1 cursor-pointer"><Pencil className="w-3 h-3" /> Edit</button>
                    <button onClick={() => update(g.id, { status: "skipped" })} disabled={busy === g.id} className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-[10px] flex items-center gap-1 cursor-pointer"><X className="w-3 h-3" /> Skip</button>
                  </>
                ) : g.status === "accepted" ? (
                  <>
                    <button onClick={() => update(g.id, { status: "completed" })} disabled={busy === g.id} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-[10px] font-bold flex items-center gap-1 cursor-pointer"><Check className="w-3 h-3" /> Mark done</button>
                    <button onClick={() => setEditing({ id: g.id, title: g.title, description: g.description, target: String(g.metric?.target ?? "") })} className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-[10px] flex items-center gap-1 cursor-pointer"><Pencil className="w-3 h-3" /> Edit</button>
                    <button onClick={() => update(g.id, { status: "skipped" })} disabled={busy === g.id} className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-[10px] flex items-center gap-1 cursor-pointer"><X className="w-3 h-3" /> Skip</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => update(g.id, { status: "accepted" })} disabled={busy === g.id} className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-[10px] flex items-center gap-1 cursor-pointer">
                      <RotateCcw className="w-3 h-3" /> {g.status === "completed" ? "Undo" : "Restore"}
                    </button>
                    {g.source === "user" && <button onClick={() => remove(g.id)} className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-[10px] cursor-pointer">Delete</button>}
                  </>
                )}
              </div>
            </div>
          );
        })
      )}

      {goals !== null && (
        <>
          <div className="flex gap-2">
            <input value={newGoal} onChange={e => setNewGoal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addGoal(); }} maxLength={60}
              placeholder="Add your own goal for today" className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 min-w-0" />
            <button onClick={addGoal} disabled={!newGoal.trim()} className="px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 disabled:opacity-40 cursor-pointer" aria-label="Add goal"><Plus className="w-4 h-4" /></button>
          </div>
          <button onClick={regenerate} disabled={regenerating} className="w-full bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
            {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Suggest different goals
          </button>
        </>
      )}
    </div>
  );
}
