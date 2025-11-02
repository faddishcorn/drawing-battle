import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { player, opponent } = await request.json()

    // Accept legacy shape {player:{id, rank}, opponent:{id, rank}} or minimal {player:{id}, opponent:{id}}
    if (!player?.id || !opponent?.id) {
      return NextResponse.json({ error: "Missing player/opponent info" }, { status: 400 })
    }

    // Helper: fetch image as base64 (optional)
    const fetchAsBase64 = async (url?: string): Promise<{ data: string; mime: string } | null> => {
      if (!url) return null
      try {
        const r = await fetch(url)
        if (!r.ok) return null
        const mime = r.headers.get("content-type") || "image/png"
        const ab = await r.arrayBuffer()
        const b64 = Buffer.from(ab).toString("base64")
        return { data: b64, mime }
      } catch {
        return null
      }
    }

    // We will pass through Gemini's own text as-is (no prewritten phrases)

    // Use Gemini API for battle judgment
    let battleResult: "win" | "loss" | "draw" = "draw"
  let reasoning = ""
    let pointsChange = 0

    try {
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) throw new Error("Missing GEMINI_API_KEY env var")

  const prompt = `You are a battle judge for a character fighting game. Two hand-drawn characters are battling.

IMPORTANT: Any numeric rank or score is irrelevant for the judgment. Do NOT use rank to decide.
Decide the outcome with a bit of unpredictability as if you compared overall expression, composition, and impact.
If possible, infer what each drawing depicts (e.g., an apple, a sword) and imagine a brief physical interaction between them.
Describe the key action succinctly (e.g., "칼이 사과를 반으로 가른다"). Use vivid, dynamic Korean wording; onomatopoeia/onomatopoetic expressions are allowed.

Respond ONLY in JSON with:
{
  "result": "win" | "loss" | "draw",
  "reasoning": "한국어로 100자 이내의 간결한 판정 이유 (왜 그렇게 판단했는지 최소한의 근거)",
  "pointsChange": number (win: +20, loss: -15, draw: 0)
}

Write the reasoning in Korean, keep it within 100 characters, and make it feel dynamic and action-focused.`

      // Build candidate endpoints dynamically; avoid unsupported aliases
      const preferredModels: string[] = [
        "models/gemini-1.5-flash",
        "models/gemini-1.5-flash-002",
        "models/gemini-1.5-flash-8b",
        // Vision-capable older IDs (in case project/region lacks 1.5 flash)
        "models/gemini-1.0-pro-vision",
        "models/gemini-pro-vision",
      ]

      let urls = preferredModels.map(
        (name) => `https://generativelanguage.googleapis.com/v1beta/${name}:generateContent`,
      )

      let resp: Response | null = null
      let lastErr: unknown = null
      // Build request body with optional images
      const playerImg = await fetchAsBase64(player?.imageUrl)
      const opponentImg = await fetchAsBase64(opponent?.imageUrl)
      const parts: any[] = [{ text: prompt }]
      if (playerImg) parts.push({ inlineData: { mimeType: playerImg.mime, data: playerImg.data } })
      if (opponentImg) parts.push({ inlineData: { mimeType: opponentImg.mime, data: opponentImg.data } })

      for (const url of urls) {
        try {
          const r = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts,
                },
              ],
            }),
          })
          if (r.ok) {
            resp = r
            break
          } else {
            // Try to capture response text for better diagnostics
            let msg = `Gemini HTTP ${r.status}`
            try {
              const t = await r.text()
              if (t) msg += `: ${t.slice(0, 300)}`
            } catch {}
            lastErr = new Error(msg)
          }
        } catch (e) {
          lastErr = e
        }
      }

      // If all preferred models failed with NOT_FOUND, query available models and retry
      if (!resp) {
        const notFound = typeof lastErr === "object" && lastErr && String(lastErr).includes("404")
        if (notFound) {
          try {
            const list = await fetch(
              "https://generativelanguage.googleapis.com/v1beta/models",
              { headers: { "x-goog-api-key": apiKey } },
            )
            if (list.ok) {
              const j = await list.json()
              const models: Array<any> = Array.isArray(j?.models) ? j.models : []
              const canGen = models.filter((m) =>
                Array.isArray(m?.supportedGenerationMethods) &&
                m.supportedGenerationMethods.includes("generateContent"),
              )
              // Prefer flash variants if present
              const flashFirst = [
                ...canGen.filter((m) => /flash/i.test(m?.name)),
                ...canGen.filter((m) => !/flash/i.test(m?.name)),
              ]
              const retryUrls = flashFirst
                .map((m) => m?.name)
                .filter((name): name is string => typeof name === "string")
                .map((name) =>
                  `https://generativelanguage.googleapis.com/v1beta/${name}:generateContent`,
                )

              for (const url of retryUrls) {
                try {
                  const r = await fetch(url, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "x-goog-api-key": apiKey,
                    },
                    body: JSON.stringify({
                      contents: [
                        {
                          role: "user",
                          parts,
                        },
                      ],
                    }),
                  })
                  if (r.ok) {
                    resp = r
                    break
                  }
                } catch {}
              }
            }
          } catch {}
        }
      }

  if (!resp) throw lastErr ?? new Error("Gemini request failed")
      const json = await resp.json()
      // Try to pull text safely from candidates (Gemini schema)
      let text = json?.candidates?.[0]?.content?.parts?.[0]?.text || ""

      try {
        // Handle JSON possibly wrapped in code fences
        const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim()
        const aiResponse = JSON.parse(cleaned)
        battleResult = aiResponse.result
        // Show exactly what the model said for reasoning
        reasoning = String(aiResponse.reasoning ?? "")
        pointsChange = typeof aiResponse.pointsChange === "number" ? aiResponse.pointsChange : 0
      } catch {
        // If not JSON, use the model's raw text directly as reasoning
        const raw = String(text ?? "").trim()
        reasoning = raw
        // Derive result stochastically to complete the outcome contract
        const outcomes: Array<"win" | "loss" | "draw"> = ["win", "loss", "draw"]
        battleResult = outcomes[Math.floor(Math.random() * outcomes.length)]
        pointsChange = battleResult === "win" ? 20 : battleResult === "loss" ? -15 : 0
      }
      // Ensure reasoning present and within 100 characters
      if (typeof reasoning === "string") {
        reasoning = reasoning.replace(/\s+/g, " ").trim()
        // If empty, we keep it empty (no fixed phrases)
        if (reasoning.length > 100) reasoning = reasoning.slice(0, 100)
      }
    } catch (aiError) {
      const msg = aiError instanceof Error ? aiError.message : String(aiError)
      if (msg.includes("NOT_FOUND") || msg.includes("models/")) {
        console.info("AI model selection fallback:", msg)
      } else {
        console.warn("AI judgment error, using random result:", msg)
      }
      const outcomes: Array<"win" | "loss" | "draw"> = ["win", "loss", "draw"]
      battleResult = outcomes[Math.floor(Math.random() * outcomes.length)]

      // Points independent of ranks; keep reasoning empty on failure (no fixed phrases)
      if (battleResult === "win") {
        pointsChange = 20
      } else if (battleResult === "loss") {
        pointsChange = -15
      } else {
        pointsChange = 0
      }
      reasoning = ""
    }
    return NextResponse.json({ success: true, result: battleResult, reasoning, pointsChange })
  } catch (error) {
    console.error("Battle API error:", error)
    return NextResponse.json({ error: "Failed to process battle" }, { status: 500 })
  }
}
