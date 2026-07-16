import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, ArrowLeft, Check, Compass, Scale, Goal, User, MapPin } from "lucide-react";
import { UserProfile, Region } from "../types";

interface OnboardingScreenProps {
  onComplete: (profile: UserProfile) => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [age, setAge] = useState<number>(25);
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Female");
  const [country, setCountry] = useState<Region>("Pakistan");
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  
  // Weights (default in kg, convert if imperial is active)
  const [weightKg, setWeightKg] = useState<number>(70);
  const [weightLbs, setWeightLbs] = useState<number>(154);

  // Height (default in cm, convert if imperial is active)
  const [heightCm, setHeightCm] = useState<number>(175);
  const [heightFt, setHeightFt] = useState<number>(5);
  const [heightIn, setHeightIn] = useState<number>(9);

  const [goal, setGoal] = useState<"Lose Weight" | "Build Muscle" | "Improve Cardio" | "Stay Active">("Lose Weight");

  const [errors, setErrors] = useState<string>("");

  const handleNext = () => {
    setErrors("");
    if (step === 1) {
      if (!name.trim()) {
        setErrors("Please enter your name");
        return;
      }
      if (age < 12 || age > 95) {
        setErrors("Please enter a valid age (12-95)");
        return;
      }
    }
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setErrors("");
    setStep((prev) => prev - 1);
  };

  const calculateAndFinish = () => {
    // Determine final height & weight in metric for standardization
    let finalWeight = weightKg;
    let finalHeight = heightCm;

    if (units === "imperial") {
      finalWeight = Math.round(weightLbs * 0.453592 * 10) / 10;
      const totalInches = (heightFt * 12) + heightIn;
      finalHeight = Math.round(totalInches * 2.54);
    }

    // BMI Formula: weight (kg) / (height (m))^2
    const heightInMeters = finalHeight / 100;
    const calculatedBmi = Math.round((finalWeight / (heightInMeters * heightInMeters)) * 10) / 10;

    let bmiStatus: "Underweight" | "Normal" | "Overweight" | "Obese" = "Normal";
    if (calculatedBmi < 18.5) bmiStatus = "Underweight";
    else if (calculatedBmi < 25) bmiStatus = "Normal";
    else if (calculatedBmi < 30) bmiStatus = "Overweight";
    else bmiStatus = "Obese";

    // Standard baseline fitness targets
    let calorieBurnGoal = 500;
    let calorieIntakeGoal = 2200;
    let stepGoal = 10000;
    let waterGoal = 2500;

    if (goal === "Lose Weight") {
      calorieBurnGoal = 600;
      calorieIntakeGoal = 1800;
      stepGoal = 11000;
      waterGoal = 3000;
    } else if (goal === "Build Muscle") {
      calorieBurnGoal = 400;
      calorieIntakeGoal = 2600;
      stepGoal = 8000;
      waterGoal = 2800;
    } else if (goal === "Improve Cardio") {
      calorieBurnGoal = 700;
      calorieIntakeGoal = 2100;
      stepGoal = 12000;
      waterGoal = 3200;
    }

    const profile: UserProfile = {
      name: name.trim(),
      age,
      gender,
      country,
      weight: finalWeight,
      height: finalHeight,
      goal,
      bmi: calculatedBmi,
      bmiStatus,
      units,
      waterGoal,
      calorieBurnGoal,
      calorieIntakeGoal,
      stepGoal,
      isRegistered: true,
      onboarded: true,
    };

    onComplete(profile);
  };

  return (
    <div className="flex-1 bg-slate-950 flex flex-col h-full text-slate-100 overflow-hidden relative">
      {/* Top Banner */}
      <div className="pt-6 px-6 pb-2 border-b border-slate-900 bg-slate-950 flex justify-between items-center shrink-0">
        <span className="text-[10px] tracking-widest text-slate-400 font-mono">ONBOARDING PROFILE</span>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step ? "w-6 bg-emerald-400" : s < step ? "w-2 bg-emerald-700" : "w-2 bg-slate-800"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Form Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -30, opacity: 0 }}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                  <User className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight font-display text-white">Let&apos;s build your profile</h3>
                <p className="text-xs text-slate-400">We need basic statistics to customize calories, water and AI coaching outputs for you.</p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-300 font-medium">What is your name?</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    className="bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-300 font-medium">How old are you?</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="15"
                      max="75"
                      value={age}
                      onChange={(e) => setAge(parseInt(e.target.value))}
                      className="flex-1 accent-emerald-500 cursor-pointer"
                    />
                    <span className="text-sm font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg w-16 text-center">
                      {age} yrs
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -30, opacity: 0 }}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight font-display text-white">Location & Gender</h3>
                <p className="text-xs text-slate-400">This helps our AI coach formulate local nutritional plans and weather-proof habits.</p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-slate-300 font-medium">Target Region / Country</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Pakistan", "USA", "UK"] as Region[]).map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setCountry(c)}
                        className={`py-3 rounded-xl text-xs font-semibold border transition-all ${
                          country === c
                            ? "bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-md"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {c === "Pakistan" ? "🇵🇰 Pakistan" : c === "USA" ? "🇺🇸 USA" : "🇬🇧 UK"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs text-slate-300 font-medium">Select Gender</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Male", "Female", "Other"] as const).map((g) => (
                      <button
                        type="button"
                        key={g}
                        onClick={() => setGender(g)}
                        className={`py-3 rounded-xl text-xs font-semibold border transition-all ${
                          gender === g
                            ? "bg-emerald-500/15 border-emerald-500 text-emerald-400"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -30, opacity: 0 }}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                  <Scale className="w-5 h-5" />
                </div>
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold tracking-tight font-display text-white">Metrics & Dimension</h3>
                  {/* Units Toggle */}
                  <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setUnits("metric")}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                        units === "metric" ? "bg-emerald-500 text-slate-950" : "text-slate-400"
                      }`}
                    >
                      Metric
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnits("imperial")}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                        units === "imperial" ? "bg-emerald-500 text-slate-950" : "text-slate-400"
                      }`}
                    >
                      Imperial
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400">Accurate height & weight are crucial to index your BMI accurately.</p>
              </div>

              <div className="flex flex-col gap-5">
                {/* Weight Input */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-300 font-medium">Weight</span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {units === "metric" ? `${weightKg} kg` : `${weightLbs} lbs`}
                    </span>
                  </div>
                  {units === "metric" ? (
                    <input
                      type="range"
                      min="40"
                      max="150"
                      value={weightKg}
                      onChange={(e) => setWeightKg(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  ) : (
                    <input
                      type="range"
                      min="90"
                      max="330"
                      value={weightLbs}
                      onChange={(e) => setWeightLbs(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  )}
                </div>

                {/* Height Input */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-300 font-medium">Height</span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {units === "metric"
                        ? `${heightCm} cm`
                        : `${heightFt} ft ${heightIn} in`}
                    </span>
                  </div>
                  {units === "metric" ? (
                    <input
                      type="range"
                      min="130"
                      max="220"
                      value={heightCm}
                      onChange={(e) => setHeightCm(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  ) : (
                    <div className="flex gap-4">
                      <div className="flex-1 flex flex-col gap-1 bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Feet</span>
                        <select
                          value={heightFt}
                          onChange={(e) => setHeightFt(parseInt(e.target.value))}
                          className="bg-transparent text-sm font-bold text-white outline-none w-full border-none"
                        >
                          {[4, 5, 6, 7].map((f) => (
                            <option key={f} value={f} className="bg-slate-950 text-white">
                              {f} ft
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 flex flex-col gap-1 bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Inches</span>
                        <select
                          value={heightIn}
                          onChange={(e) => setHeightIn(parseInt(e.target.value))}
                          className="bg-transparent text-sm font-bold text-white outline-none w-full border-none"
                        >
                          {Array.from({ length: 12 }, (_, i) => i).map((i) => (
                            <option key={i} value={i} className="bg-slate-950 text-white">
                              {i} in
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -30, opacity: 0 }}
              className="flex flex-col gap-5"
            >
              <div className="flex flex-col gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                  <Goal className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight font-display text-white">Select Fitness Goal</h3>
                <p className="text-xs text-slate-400">Goals calibrate your daily energy requirements and customized coach guidance.</p>
              </div>

              <div className="flex flex-col gap-2.5">
                {[
                  { id: "Lose Weight", title: "🔥 Burn Fat & Lose Weight", desc: "Calorie deficit focus with heavy fat-burning workout metrics." },
                  { id: "Build Muscle", title: "💪 Hypertrophy & Build Muscle", desc: "Gain power, skeletal muscle density, and healthy mass." },
                  { id: "Improve Cardio", title: "🫁 Endurance & Cardio Health", desc: "Upgrade oxygen intake, baseline running pace and heart rate index." },
                  { id: "Stay Active", title: "🧘‍♂️ Maintain Health & Wellness", desc: "Consistent functional workouts, stretching, and water schedules." }
                ].map((g) => (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() => setGoal(g.id as any)}
                    className={`p-4 rounded-xl text-left border flex flex-col gap-1 transition-all ${
                      goal === g.id
                        ? "bg-emerald-500/15 border-emerald-500 text-white shadow-lg"
                        : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-xs font-bold font-display">{g.title}</span>
                    <span className="text-[10px] text-slate-400 leading-relaxed">{g.desc}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="mt-8 flex flex-col gap-3 shrink-0">
          {errors && (
            <span className="text-xs text-rose-400 text-center font-medium bg-rose-500/10 py-2 border border-rose-500/15 rounded-lg">
              ⚠️ {errors}
            </span>
          )}

          <div className="flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-semibold px-4 py-3.5 rounded-xl text-xs transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-bold px-6 py-3.5 rounded-xl text-xs shadow-lg shadow-emerald-500/15 transition-all"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={calculateAndFinish}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-bold px-6 py-3.5 rounded-xl text-xs shadow-lg shadow-emerald-500/15 transition-all"
              >
                <span>Complete Profile Setup</span>
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
