import React, { useEffect, useState } from "react";
import { Target, Check, ChevronRight, TrendingUp } from "lucide-react";
import { api, isSignedIn } from "../../lib/api";
import { CoachGoal } from "../../types";

interface CoachGoalsCardProps {
  onOpen: (subTab: "goals" | "progress") => void;
}

// Compact view of today's coach goals for the Home dashboard
export default function CoachGoalsCard({ onOpen }: CoachGoalsCardProps) {
  const [goals, setGoals] = useState<CoachGoal[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isSignedIn()) return;
    api<{ goals: CoachGoal[] }>("/api/goals/today")
      .then(d => setGoals(d.goals.filter(g => g.status !== "skipped")))
      .catch(() => setFailed(true));
  }, []);

  if (!isSignedIn() || failed) return null;

  const done = goals?.filter(g => g.status === "completed").length || 0;
  const pending = goals?.filter(g => g.status === "suggested").length || 0;

  return (
    <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-2xl flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/15 shrink-0">
          <Target className="w-5 h-5" />
        </div>
        <div className="flex-1 flex flex-col">
          <span className="text-xs font-bold text-white">Today's Coach Goals</span>
          <span className="text-[10px] text-slate-400">
            {goals === null ? "Loading..." : `${done} of ${goals.length} done${pending ? ` · ${pending} new suggestion${pending === 1 ? "" : "s"}` : ""}`}
          </span>
        </div>
        <button onClick={() => onOpen("progress")} className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white cursor-pointer" aria-label="Open progress">
          <TrendingUp className="w-4 h-4" />
        </button>
      </div>
      {goals && goals.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {goals.slice(0, 3).map(g => (
            <div key={g.id} className="flex items-center gap-2 text-[11px]">
              <span className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${g.status === "completed" ? "bg-emerald-500 text-slate-950" : "border border-slate-700"}`}>
                {g.status === "completed" && <Check className="w-3 h-3" />}
              </span>
              <span className={`flex-1 truncate ${g.status === "completed" ? "text-slate-500 line-through" : "text-slate-300"}`}>{g.title}</span>
              {g.progress && g.status !== "completed" && (
                <span className="text-[9px] font-mono text-slate-500">{Math.min(100, Math.round((g.progress.current / g.progress.target) * 100))}%</span>
              )}
            </div>
          ))}
        </div>
      )}
      <button onClick={() => onOpen("goals")} className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-bold py-2 rounded-xl text-[10px] flex items-center justify-center gap-1 cursor-pointer">
        {pending ? "Review today's goals" : "Open daily goals"} <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
