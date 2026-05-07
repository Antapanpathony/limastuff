export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { contents, systemInstruction } = req.body;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents, systemInstruction }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    return res.status(response.status).json({ error: text.slice(0, 200) });
  }

  const data = await response.json();
  return res.status(200).json(data);
}
