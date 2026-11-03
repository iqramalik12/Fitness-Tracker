import { Router, Request, Response } from "express";
import { db, BmiRecord } from "../db.ts";
import { authenticateJwt } from "./auth.ts";
import { calculateBmi, validateBmiInput, BmiInput, BMI_DISCLAIMER } from "../../lib/bmi.ts";

const router = Router();

const GENDERS = ["Male", "Female", "Other"];

function readInput(body: any): { input?: BmiInput; errors: string[] } {
  const raw = {
    age: Number(body.age),
    heightUnit: body.heightUnit,
    heightValue: Number(body.heightValue),
    heightInches: body.heightInches === undefined || body.heightInches === "" ? 0 : Number(body.heightInches),
    weightUnit: body.weightUnit,
    weightValue: Number(body.weightValue),
  };
  const errors = validateBmiInput(raw);
  return errors.length ? { errors } : { input: raw as BmiInput, errors };
}

// POST: Calculate BMI for anyone. No account needed and nothing is stored.
router.post("/calculate", (req: Request, res: Response) => {
  const { input, errors } = readInput(req.body);
  if (!input) return res.status(400).json({ error: errors.join(" "), errors });
  res.json({ result: calculateBmi(input), disclaimer: BMI_DISCLAIMER });
});

// GET: Saved BMI records. subject=self (default) or other; the two lists are never mixed.
router.get("/history", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const subject = req.query.subject === "other" ? "other" : "self";
  const records = db
    .findBmiRecords(r => r.userId === payload.id && r.subject === subject)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ subject, records });
});

// POST: Save a calculation. The server recalculates from the raw input instead of trusting a sent BMI.
router.post("/records", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const subject = req.body.subject;
  if (subject !== "self" && subject !== "other") {
    return res.status(400).json({ error: "subject must be \"self\" or \"other\"." });
  }
  const { input, errors } = readInput(req.body);
  if (!input) return res.status(400).json({ error: errors.join(" "), errors });

  const personName = typeof req.body.personName === "string" ? req.body.personName.trim().slice(0, 60) : "";
  const result = calculateBmi(input);
  const record = db.insert("bmi_records", {
    userId: payload.id,
    subject,
    personName: subject === "other" ? personName || "Unnamed person" : undefined,
    age: input.age,
    gender: GENDERS.includes(req.body.gender) ? req.body.gender : undefined,
    heightCm: result.heightCm,
    weightKg: result.weightKg,
    bmi: result.bmi,
    category: result.category,
    createdAt: new Date().toISOString(),
  }) as BmiRecord;
  res.status(201).json({ record });
});

// DELETE: Remove one of the user's saved records
router.delete("/records/:id", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const record = db.findBmiRecords(r => r.id === req.params.id && r.userId === payload.id)[0];
  if (!record) return res.status(404).json({ error: "Record not found." });
  db.delete("bmi_records", record.id);
  res.json({ deletedId: record.id });
});

export default router;
