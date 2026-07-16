import { Router, Request, Response } from "express";
import { db, NotificationLog } from "../db.ts";
import { authenticateJwt } from "./auth.ts";

const router = Router();

// GET: Fetch list of notifications for the authenticated user
router.get("/", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const list = db.findNotifications(n => n.userId === payload.id);
  
  // Return sorted by newest first
  const sorted = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ notifications: sorted });
});

// PUT: Mark a notification as read
router.put("/:id/read", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const id = req.params.id;

  const matched = db.findNotifications(n => n.id === id && n.userId === payload.id);
  if (matched.length === 0) {
    return res.status(404).json({ error: "Notification not found or unauthorized write." });
  }

  const updated = db.update("notifications", id, { read: true });
  res.json({
    message: "Notification marked as read successfully.",
    notification: updated
  });
});

// POST: Trigger a new custom notification/reminder
router.post("/create", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const { title, message, type } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: "Missing required notification fields (title, message)." });
  }

  const newNotif: Omit<NotificationLog, "id"> = {
    userId: payload.id,
    title: title.trim(),
    message: message.trim(),
    type: type || "info",
    read: false,
    createdAt: new Date().toISOString()
  };

  const saved = db.insert("notifications", newNotif) as NotificationLog;
  res.status(201).json({
    message: "Notification created successfully.",
    notification: saved
  });
});

// DELETE: Clear all read notifications
router.delete("/clear-all", authenticateJwt, (req: Request, res: Response) => {
  const payload = (req as any).user;
  const list = db.findNotifications(n => n.userId === payload.id && n.read === true);

  list.forEach(n => {
    db.delete("notifications", n.id);
  });

  res.json({
    message: "Cleared all read notifications successfully.",
    clearedCount: list.length
  });
});

export default router;
