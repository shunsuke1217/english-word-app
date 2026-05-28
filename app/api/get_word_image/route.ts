import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/app/features/db/bucket";
import OpenAI from "openai";

const openai = new OpenAI()

//英単語を送る→画像（buffer形式）を返す
//bufferやimgファイルをServerActionの関数の引数に設定するとエラー。よって画像を作った時にDBに渡すしかない
//生成した画像をbucketに保存して、保存した場所のpathを返す（page.tsxをサーバーrenderにすればpage.tsxでDBに送ることが可能になるため、将来はそっちでやりたい）
export const POST = async (req: NextRequest) => {
    try {
        //NextRequestのbody部分を取得
        const { word }: { word: string } = await req.json()
        if (!word?.trim()) throw new Error("word is required")

        // 画像生成（Responses API + image_generation tool）
        const res = await openai.responses.create({
            model: "gpt-5-nano",
            instructions: `Create an image that makes the word "${word}" come to mind when you see it.
Rules:
- Do not include any text in the image.`,
            input: word,
            tools: [
                {
                    model: "gpt-image-1-mini",
                    action: "generate",
                    type: "image_generation",
                    size: "1024x1024",
                    moderation: "low",
                    quality: "low",
                    output_format: "webp",
                    output_compression: 35,
                },
            ],
        })

        const datasetForImage = res.output.find(
            (element) => element.type === "image_generation_call"
        )
        if (!datasetForImage || !datasetForImage.result) {
            throw new Error("画像生成のデータが見つかりませんでした")
        }
        const buffer = Buffer.from(datasetForImage.result, "base64")

        //画像のアップロード
        const path = await uploadImage(buffer, "word_image", word)
        if(!path)throw new Error("画像のアップロードに失敗しました")
        return NextResponse.json({ path: path.path })
    }catch {
        return NextResponse.json(null)
    }
    
}