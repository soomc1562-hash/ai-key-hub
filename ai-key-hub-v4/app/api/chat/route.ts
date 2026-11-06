headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: config.model,
    messages: checkOnly
      ? [{ role: "user", content: "Reply with exactly: connected" }]
      : safeMessages,
    max_tokens: 1024,
  }),
});

const data = await response.json();

if (!response.ok) {
  return NextResponse.json(
    {
      error:
        data.error?.message ||
        data.message ||
        "Provider API error",
    },
    { status: response.status }
  );
}

if (!checkOnly) {
  await recordUsage(userId, provider);
}

return NextResponse.json({
  reply: data.choices?.[0]?.message?.content || "Connected",
});

} catch (error) {
console.error("Chat API error", error);

return NextResponse.json(
  {
    error:
      "Не удалось связаться с API. Проверь соединение и попробуй ещё раз.",
  },
  { status: 500 }
);

}}
