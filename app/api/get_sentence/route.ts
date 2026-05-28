import { NextRequest,NextResponse } from "next/server";
import { Word } from "@/app/types/types";
import OpenAI from "openai";
import * as z from "zod"
import { uploadImage} from "@/app/features/db/bucket";
import { insertSentence} from "@/app/features/db/table";

const openai=new OpenAI()
//返り値の構造(JSONschema)
const ReturnSchema=z.object({
    sentence:z.string(),
})

export const POST=async(req:NextRequest):Promise<NextResponse<{sentence:string,path:string}|null>>=>{
try{
    const {en_word,ja_word,id}=await req.json() as Pick<Word,"en_word"|"ja_word"|"id">
    
    //en_wordとja_wordを使って例文を作るように指示するプロンプトをOpenAiAPIに送る
    const res=await openai.responses.create(
        {
            model:"gpt-5-nano",
            instructions:`You write ONE natural English example sentence for vocabulary learners.

            The English word "${en_word}" can have several Japanese translations. Here, focus ONLY on the sense that matches "${ja_word}" (not other senses of the same English word).

            Your job: show how "${en_word}" is used in a real situation where it means "${ja_word}" — as if the reader already chose this meaning from a list of possible Japanese glosses.

            Rules for the sentence:
            - Include "${en_word}" exactly once, used naturally in context (not quoted as a vocabulary label).
            - The situation must clearly fit the meaning "${ja_word}"; avoid senses that would translate differently in Japanese.
            - One sentence only, 8–20 words, concrete and easy to visualize.
            - Do NOT explain meanings, mention Japanese, or say "means", "refers to", "in Japanese", "this word", etc.

            Good (word: bank, sense: 銀行 / financial institution):
            - "She deposited her paycheck at the bank near the station."

            Bad (meta / wrong sense):
            - "Bank means ginkou in Japanese."
            - "He sat on the grassy bank of the river." (wrong sense when gloss is 銀行)

            Also create an image that illustrates the example sentence. Image rules: no text in the image; show a specific, easy-to-visualize scene.`,
            input:`English: ${en_word}\nJapanese sense to illustrate: ${ja_word}`,
            text:{
                format:{
                    name:"sentenceAndImage",
                    type:"json_schema",
                    schema:z.toJSONSchema(ReturnSchema),
                }
            },
            tools:[{
                model:"gpt-image-1-mini",
                action:"generate",
                type:"image_generation",
                size:"1024x1024",
                //変えてみるパラメータ(tokenの上下を確認)
                moderation:"low",//過度な表現の規制
                quality:"low",
                output_format:"webp",
                output_compression:35,

            }],

        }
    )

    //res返却後の処理
    //ここから例文の後処理
    const sentenceJson=JSON.parse(res.output_text)//JSON→jsオブジェクト
    const sentence=sentenceJson.sentence

    //ここからbase64データの後処理
    const datasetForImage=res.output.find((element)=>element.type==="image_generation_call")
    if(!datasetForImage || !datasetForImage.result)throw new Error("画像生成のデータが見つかりませんでした")
    const imageData=datasetForImage.result
    const buffer=Buffer.from(imageData,"base64")//画像のバイナリデータに変換

    //画像アップロード
    const path=await uploadImage(buffer,"sentence_image",en_word)
    if(!path)throw new Error("画像のアップロードに失敗しました")

    //例文と画像のpathをDBに保存
    const newSentence=await insertSentence({sentence:sentence,sentenceImage:path.path,id:id})
    if(!newSentence)throw new Error("例文のDBへのアップロードに失敗しました")
    //画像のURL,path,sentence全てResponseで返す
    return NextResponse.json({sentence:sentence,path:path.path})
}catch{
    //datasetFroImageがnullの時のエラー処理
    return NextResponse.json(null)
}
}