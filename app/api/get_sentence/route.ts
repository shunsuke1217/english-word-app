import { NextRequest,NextResponse } from "next/server";
import { Word,Sentence } from "@/app/types/types";
import OpenAI from "openai";
import * as z from "zod"
import fs from "fs"
import { uploadImage} from "@/app/features/db/bucket";
import { CreatedImage } from "@/app/types/types";
const openai=new OpenAI()
//返り値の構造(JSONschema)
const ReturnSchema=z.object({
    sentence:z.string(),
})

export const POST=async(req:NextRequest):Promise<NextResponse>=>{

    const {en_word,ja_word}=await req.json() as Pick<Word,"en_word"|"ja_word">
    
    //en_wordとja_wordを使って例文を作るように指示するプロンプトをOpenAiAPIに送る
    const res=await openai.responses.create(
        {
            model:"gpt-5-nano",
            input:` Using "${en_word}" as the Japanese meaning “${ja_word}” ,create an example sentence in English.And 
            create an image illustrating the example sentence. Do not include any text in the image.`,
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
                output_compression:0,

            }],

        }
    )

    //ここから例文の後処理
    const sentenceJson=JSON.parse(res.output_text)//JSON→jsオブジェクト
    const sentence=sentenceJson.sentence
    //ここからbase64データの後処理
    const datasetForImage=res.output.find((element)=>element.type==="image_generation_call")
    if(datasetForImage?.result){
            //画像受け取れなかった時のエラー処理が必要
            const imageData=datasetForImage.result
            const buffer=Buffer.from(imageData,"base64")//画像のバイナリデータに変換
            const path=await uploadImage(buffer,"sentence_image",en_word)
            //画像のURL,path,sentence全てResponseで返す
            return NextResponse.json({sentence:sentence,path:path?.path})
        }
    //datasetFroImageがnullの時のエラー処理
    return NextResponse.json(null)
}