import React, { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, AlertCircle, Check, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import { AppNotification, CoachPreferences } from "../../types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const REMINDERS = [
  ["mealLogging", "Meal logging", "Only if you haven't logged at least 2 meals"],
  ["workout", "Workout session", "Only if you haven't worked out that day"],
  ["dailyGoals", "Daily goals", "Only if goals are still open"],
  ["weeklyReview", "Weekly progress review", "Once a week"],
] as const;

interface RemindersPanelProps {
  signedIn: boolean;
}

export default function RemindersPanel({ signedIn }: RemindersPanelProps) {
  const [prefs, setPrefs] = useState<CoachPreferences | null>(null);
  const [inbox, setInbox] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    api<{ preferences: CoachPreferences }>("/api/progress/preferences").then(d => setPrefs(d.preferences)).catch(e => setError(e.message));
    api<{ notifications: AppNotification[] }>("/api/notifications").then(d => setInbox(d.notifications)).catch(e => setError(e.message));
  }, [signedIn]);

  if (!signedIn) {
    return <p className="text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl p-4">Sign in to set up reminders and your coach preferences.</p>;
  }
  if (!prefs) {
    return error
      ? <p className="text-[11px] text-rose-400 flex gap-1.5" role="alert"><AlertCircle className="w-4 h-4" /> {error}</p>
      : <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-emerald-400 animate-spin" /></div>;
  }

  const patch = (p: Partial<CoachPreferences>) => { setPrefs({ ...prefs, ...p }); setSaved(false); };
  const patchReminder = (key: keyof CoachPreferences["reminders"], value: any) =>
    patch({ reminders: { ...prefs.reminders, [key]: value } });

  const save = async () => {
    setSaving(true);
    try {
      const data = await api<{ preferences: CoachPreferences }>("/api/progress/preferences", "PUT", prefs);
      setPrefs(data.preferences);
      setSaved(true);
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const markRead = async (n: AppNotification) => {
    try {
      await api(`/api/notifications/${n.id}/read`, "PUT");
      setInbox(list => list?.map(x => (x.id === n.id ? { ...x, read: true } : x)) || null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const clearRead = async () => {
    try {
      await api("/api/notifications/clear-all", "DELETE");
      setInbox(list => list?.filter(x => !x.read) || null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const selectCls = "bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-white";
  const r = prefs.reminders;

  return (
    <div className="flex flex-col gap-3 pb-4">
      {error && <p className="text-[11px] text-rose-400" role="alert">{error}</p>}

      {/* Coach preferences used for goal sizing */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">About your routine</span>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Fitness level
            <select value={prefs.fitnessLevel} onChange={e => patch({ fitnessLevel: e.target.value as any })} className={selectCls}>
              {["Beginner", "Intermediate", "Advanced"].map(v => <option key={v}>{v}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-400">
            Time for exercise
            <select value={prefs.availableMinutes} onChange={e => patch({ availableMinutes: Number(e.target.value) })} className={selectCls}>
              {[10, 15, 20, 30, 45, 60, 90].map(v => <option key={v} value={v}>{v} min / day</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-slate-400 col-span-2">
            Best time to work out
            <select value={prefs.preferredWorkoutTime} onChange={e => patch({ preferredWorkoutTime: e.target.value as any })} className={selectCls}>
              {["Morning", "Afternoon", "Evening"].map(v => <option key={v}>{v}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Reminder settings */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Smart reminders</span>
          <button
            onClick={() => patchReminder("enabled", !r.enabled)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${r.enabled ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-slate-950 border-slate-800 text-slate-500"}`}
            aria-pressed={r.enabled}
          >
            {r.enabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />} {r.enabled ? "On" : "Off"}
          </button>
        </div>

        <div className={`flex flex-col gap-2 ${r.enabled ? "" : "opacity-40 pointer-events-none"}`}>
          {REMINDERS.map(([key, label, hint]) => {
            const s = r[key] as any;
            return (
              <div key={key} className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2">
                <input type="checkbox" checked={s.enabled} onChange={e => patchReminder(key, { ...s, enabled: e.target.checked })} className="accent-emerald-500 w-4 h-4" aria-label={label} />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-xs text-white">{label}</span>
                  <span className="text-[9px] text-slate-500">{hint}</span>
                </div>
                {key === "weeklyReview" && (
                  <select value={s.day} onChange={e => patchReminder(key, { ...s, day: Number(e.target.value) })} className={selectCls} aria-label="Review day">
                    {DAYS.map((d, i) => <option key={d} value={i}>{d.slice(0, 3)}</option>)}
                  </select>
                )}
                <input type="time" value={s.time} onChange={e => patchReminder(key, { ...s, time: e.target.value })} className={selectCls} aria-label={`${label} time`} />
              </div>
            );
          })}
          <label className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            At most
            <select value={r.maxPerDay} onChange={e => patchReminder("maxPerDay", Number(e.target.value))} className={selectCls}>
              {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v} reminder{v === 1 ? "" : "s"} a day</option>)}
            </select>
          </label>
        </div>

        <button onClick={save} disabled={saving} className="py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : null}
          {saved ? "Saved" : "Save preferences"}
        </button>
      </div>

      {/* Inbox */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Notifications</span>
          {inbox?.some(n => n.read) && (
            <button onClick={clearRead} className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"><Trash2 className="w-3 h-3" /> Clear read</button>
          )}
        </div>
        {inbox === null ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 text-emerald-400 animate-spin" /></div>
        ) : inbox.length === 0 ? (
          <p className="text-[11px] text-slate-500 text-center py-2">Nothing here yet.</p>
        ) : (
          inbox.slice(0, 20).map(n => (
            <button key={n.id} onClick={() => !n.read && markRead(n)}
              className={`text-left rounded-xl px-3 py-2 border flex gap-2 ${n.read ? "bg-slate-950/30 border-slate-800/60" : "bg-slate-950/70 border-emerald-500/20 cursor-pointer"}`}>
              {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />}
              <div className="flex flex-col min-w-0">
                <span className={`text-xs ${n.read ? "text-slate-400" : "text-white font-semibold"}`}>{n.title}</span>
                <span className="text-[10px] text-slate-500">{n.message}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
