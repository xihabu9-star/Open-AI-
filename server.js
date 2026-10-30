require("dotenv").config();

const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json({ limit: "1mb" }));

// Allow requests from the packaged mobile HTML/WebView.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/", (_req, res) => {
  res.send("Open-AI Chatbot backend is running.");
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server is missing OPENAI_API_KEY." });
    }

    const messages = req.body && req.body.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Send a non-empty messages array." });
    }

    const safeMessages = messages
      .filter((m) => m && ["system", "user", "assistant"].includes(m.role) && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content }));

    if (!safeMessages.length) {
      return res.status(400).json({ error: "No valid chat messages were provided." });
    }

    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: safeMessages,
    });

    res.json({
      reply: completion.choices?.[0]?.message?.content || "No response was returned.",
    });
  } catch (error) {
    console.error("Chat request failed:", error);
    res.status(500).json({
      error: error?.status === 401
        ? "OpenAI API key is invalid. Check the server environment variable."
        : (error?.message || "The AI request failed."),
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Open-AI backend listening on port ${port}`);
});
