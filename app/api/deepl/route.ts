import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import * as z from "zod"
import type { DeeplApiResponse, DeeplRequestBody } from "@/app/types/types"

const openai = new OpenAI()

/** OpenAI が返す JSON の形 */
const TranslationSchema = z.object({
  ja_word: z.string(),
})

export const POST = async (
  req: NextRequest
): Promise<NextResponse<DeeplApiResponse | null>> => {
  try {
    const { text } = (await req.json()) as DeeplRequestBody
    const enWord = text?.trim()
    if (!enWord) throw new Error("text is required")

    const response = await openai.responses.create({
      model: "gpt-5-nano",
      instructions: `You are a bilingual dictionary.
      Translate the given English word into exactly one Japanese word.
      Rules:
      - Output only one Japanese word (no spaces, no punctuation, no explanation).
      - Do not use hiragana-only glosses when a common kanji/katakana word exists.
      - If multiple translations exist, choose the most common single-word equivalent.`,
      input: enWord,
      text: {
        format: {
          name: "japaneseTranslation",
          type: "json_schema",
          schema: z.toJSONSchema(TranslationSchema),
        },
      },
    })

    const parsed: DeeplApiResponse = TranslationSchema.parse(
      JSON.parse(response.output_text)
    )

    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json(null)
  }
}
