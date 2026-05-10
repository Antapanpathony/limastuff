export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { contents, systemInstruction } = req.body;

  // Map Google Gemini format to OpenAI/OpenRouter format
  const messages = [];
  if (systemInstruction?.parts?.[0]?.text) {
    messages.push({ role: "system", content: systemInstruction.parts[0].text });
  }

  (contents || []).forEach((c) => {
    messages.push({
      role: c.role === "model" ? "assistant" : "user",
      content: c.parts?.[0]?.text || "",
    });
  });

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://peruserv.pe",
      "X-Title": "PeruServ",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return res.status(response.status).json({ error: text.slice(0, 200) });
  }

  const data = await response.json();

  // Map back to the format the frontend expects (Google Gemini format)
  const mappedResponse = {
    candidates: [
      {
        content: {
          parts: [{ text: data.choices?.[0]?.message?.content || "" }],
        },
      },
    ],
  };

  return res.status(200).json(mappedResponse);
}
