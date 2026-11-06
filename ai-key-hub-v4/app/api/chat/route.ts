import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

type Msg = { role: "user" | "assistant"; content: string };
const endpoints: Record<string, { url: string; model: string }> = {
  openai: { url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" },
  deepseek: { url: "https://api.deepseek.com/chat/completions", model: "deepseek-chat" },
  grok: { url: "https://api.x.ai/v1/chat/completions", model: "grok-2-latest" },
  mistral: { url: "https://api.mistral.ai/v1/chat/completions", model: "mistral-small-latest" },
  qwen: { url: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", model: "qwen-plus" }
};

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Войди в аккаунт, чтобы пользоваться AI Playground." }, { status: 401 });
    const body = await req.json();
    const { provider, apiKey, messages, checkOnly } = body as {
      provider: string; apiKey: string; messages: Msg[]; checkOnly?: boolean
    };
    if (!apiKey || typeof apiKey !== "string" || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Нужны API-ключ и сообщения." }, { status: 400 });
    }

    let response: Response;
    if (provider === "anthropic") {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json", "anthropic-dangerous-direct-browser-access": "false" },
        body: JSON.stringify({ model: "claude-3-5-haiku-latest", max_tokens: 512, messages: checkOnly ? [{ role: "user", content: "Reply with exactly: connected" }] : messages })
      });
      const data = await response.json();
      if (!response.ok) return NextResponse.json({ error: data.error?.message || "Anthropic API error" }, { status: response.status });
      if (!checkOnly) db.prepare("INSERT INTO usage_events (id,user_id,provider,created_at) VALUES (?,?,?,?)").run(randomUUID(), userId, provider, new Date().toISOString());
      return NextResponse.json({ reply: data.content?.map((x: { text?: string }) => x.text || "").join("") || "Connected" });
    }

    if (provider === "gemini") {
      const model = "gemini-2.0-flash";
      const prompt = checkOnly ? "Reply with exactly: connected" : messages.map(m => `${m.role}: ${m.content}`).join("\n");
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      if (!response.ok) return NextResponse.json({ error: data.error?.message || "Gemini API error" }, { status: response.status });
      if (!checkOnly) db.prepare("INSERT INTO usage_events (id,user_id,provider,created_at) VALUES (?,?,?,?)").run(randomUUID(), userId, provider, new Date().toISOString());
      return NextResponse.json({ reply: data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "Connected" });
    }

    const config = endpoints[provider];
    if (!config) return NextResponse.json({ error: "Этот провайдер пока не поддерживается." }, { status: 400 });
    response = await fetch(config.url, {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.model, messages: checkOnly ? [{ role: "user", content: "Reply with exactly: connected" }] : messages, max_tokens: 1024 })
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.error?.message || data.message || "Provider API error" }, { status: response.status });
    if (!checkOnly) db.prepare("INSERT INTO usage_events (id,user_id,provider,created_at) VALUES (?,?,?,?)").run(randomUUID(), userId, provider, new Date().toISOString());
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content || "Connected" });
  } catch {
    return NextResponse.json({ error: "Не удалось связаться с API. Проверь соединение и попробуй ещё раз." }, { status: 500 });
  }
}