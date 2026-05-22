import { Word, CreatedImage } from "@/app/types/types";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { BaseNextResponse } from "next/dist/server/base-http";
import { uploadImage } from "@/app/features/db/bucket";
import { ca } from "zod/locales";

//英単語を送る→画像（buffer形式）を返す
//bufferやimgファイルをServerActionの関数の引数に設定するとエラー。よって画像を作った時にDBに渡すしかない
//生成した画像をbucketに保存して、保存した場所のpathを返す（page.tsxをサーバーrenderにすればpage.tsxでDBに送ることが可能になるため、将来はそっちでやりたい）
export const POST = async (req: NextRequest) => {
    try {
        //NextRequestのbody部分を取得
        const { word }: { word: string } = await req.json()
        const res = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prompt: `Create an image that makes the word "${word}" come to mind when you see it.
                [Image Creation Rules]:
                Do not include any text in the image.
                `,
                model: "gpt-image-2",
                quality: "low",
                n: 1,
                size: "1024x1024"
            })

        })
        //返ってきたデータのbody部分をResponseからjsオブジェクトにする
        const returnedData: CreatedImage = await res.json()
        const b_64Data: string = returnedData.data[0].b64_json
        //base64データをbufferに変換
        const buffer = Buffer.from(b_64Data, "base64")
        //画像のアップロード
        const path = await uploadImage(buffer, "word_image", word)
        if(!path)throw new Error("画像のアップロードに失敗しました")
        return NextResponse.json({ path: path.path })
    }catch (error) {
        return NextResponse.json(null)
    }
    
}