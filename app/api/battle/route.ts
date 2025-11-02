import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"

export async function POST(request: NextRequest) {
  try {
    const { myCharacter, opponent } = await request.json()

    // Use AI to analyze the battle
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt: `You are a battle judge for a character fighting game. Two characters are battling each other.

Character 1 (Player): Rank ${myCharacter.rank}
Character 2 (Opponent): Rank ${opponent.rank}

Based on the rank difference and a bit of randomness, determine who wins this battle.
- If ranks are similar (within 100 points), it should be close to 50/50
- Higher rank should have advantage but not guaranteed win
- Consider adding some unpredictability

Respond in JSON format with:
{
  "result": "win" | "loss" | "draw",
  "reasoning": "A brief Korean explanation (2-3 sentences) of why this character won/lost/drew",
  "pointsChange": number (positive for win, negative for loss, 0 for draw. Typically 15-30 points)
}

Make it exciting and dramatic! Write the reasoning in Korean.`,
    })

    // Parse AI response
    const battleResult = JSON.parse(text)

    return NextResponse.json(battleResult)
  } catch (error) {
    console.error("Battle API error:", error)

    // Fallback response
    const outcomes = ["win", "loss", "draw"] as const
    const result = outcomes[Math.floor(Math.random() * outcomes.length)]

    return NextResponse.json({
      result,
      reasoning: "치열한 전투 끝에 결과가 결정되었습니다!",
      pointsChange: result === "win" ? 25 : result === "loss" ? -15 : 0,
    })
  }
}
