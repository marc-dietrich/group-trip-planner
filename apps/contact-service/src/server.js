import dotenv from "dotenv";
import express from "express";
import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3002);
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
const serviceDir = dirname(fileURLToPath(import.meta.url));
const supportEmail =
  (process.env.CONTACT_SUPPORT_EMAIL || "").trim() ||
  "kontakt@group-trip-planner.local";
const logFilePath = resolve(
  process.env.CONTACT_LOG_FILE || resolve(serviceDir, "../data/requests.log"),
);
const maxLogBytes = Number(
  process.env.CONTACT_LOG_MAX_BYTES || 10 * 1024 * 1024,
);

let writeQueue = Promise.resolve();

async function appendLogInternal(entry) {
  await mkdir(dirname(logFilePath), { recursive: true });

  const line = `${JSON.stringify(entry)}\n`;
  const lineBuffer = Buffer.from(line, "utf-8");

  if (!Number.isFinite(maxLogBytes) || maxLogBytes <= 0) {
    await appendFile(logFilePath, lineBuffer);
    return;
  }

  let currentSize = 0;
  try {
    const currentStats = await stat(logFilePath);
    currentSize = currentStats.size;
  } catch {
    currentSize = 0;
  }

  if (currentSize + lineBuffer.length <= maxLogBytes) {
    await appendFile(logFilePath, lineBuffer);
    return;
  }

  let existing = Buffer.alloc(0);
  try {
    existing = await readFile(logFilePath);
  } catch {
    existing = Buffer.alloc(0);
  }

  const combined = Buffer.concat([existing, lineBuffer]);
  const start = Math.max(0, combined.length - maxLogBytes);
  await writeFile(logFilePath, combined.subarray(start));
}

function appendLog(entry) {
  writeQueue = writeQueue.then(() => appendLogInternal(entry));
  return writeQueue;
}

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`,
    );
  });
  next();
});

app.post("/mail/feedback", async (req, res, next) => {
  try {
    const { rating, message, actorId, displayName } = req.body ?? {};

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "rating must be an integer 1..5" });
    }

    if (
      message !== undefined &&
      (typeof message !== "string" || message.trim().length > 5000)
    ) {
      return res.status(400).json({
        error: "message must be a string up to 5000 chars when provided",
      });
    }

    await appendLog({
      type: "feedback",
      createdAt: new Date().toISOString(),
      rating,
      message:
        typeof message === "string" && message.trim().length > 0
          ? message.trim()
          : null,
      actorId: actorId ? String(actorId) : null,
      displayName: displayName ? String(displayName) : null,
      sourceIp: req.ip,
    });

    return res.status(202).json({ ok: true, stored: true });
  } catch (error) {
    return next(error);
  }
});

app.post("/mail/contact", async (req, res, next) => {
  try {
    const { message, actorId, displayName, replyTo } = req.body ?? {};

    if (typeof message !== "string" || message.trim().length === 0) {
      return res
        .status(400)
        .json({ error: "message must be a non-empty string" });
    }

    const trimmedMessage = message.trim().slice(0, 5000);
    await appendLog({
      type: "contact",
      createdAt: new Date().toISOString(),
      message: trimmedMessage,
      actorId: actorId ? String(actorId) : null,
      displayName: displayName ? String(displayName) : null,
      replyTo:
        typeof replyTo === "string" && replyTo.includes("@") ? replyTo : null,
      sourceIp: req.ip,
    });

    return res.status(202).json({ ok: true, stored: true });
  } catch (error) {
    return next(error);
  }
});

app.get("/mail/contact", (req, res) => {
  res.status(200).json({ email: supportEmail });
});

app.get("/contact", (req, res) => {
  res.status(200).json({ email: supportEmail });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  return res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(
    `Contact service listening on port ${port} (log file: ${logFilePath})`,
  );
});
