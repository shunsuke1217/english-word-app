import { NextRequest,NextResponse } from "next/server";
import { Word } from "@/app/types/types";
import OpenAI from "openai";
import * as z from "zod"
import fs from "fs"
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
            model:"gpt-4.1-mini",
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
    console.log(res)
    //ここからbase64データの後処理
    let imageData:string
    let buffer
    const datasetForImage=res.output.find((element)=>element.type==="image_generation_call")
    if(datasetForImage?.result){
            //画像受け取れなかった時のエラー処理が必要
            imageData=datasetForImage.result
            buffer=Buffer.from(imageData,"base64")//画像のバイナリデータに変換
            fs.writeFileSync(`public/sentence/${en_word}.webp`,buffer)//生成したバイナリデータを画像ファイルに書き込む
        }
    //ここから例文の後処理
    const sentenceJson=JSON.parse(res.output_text)
    const sentence=sentenceJson.sentence
    
    const ans:Pick<Word,"sentence"|"sentence_image">={sentence:sentence,sentence_image:`/sentence/${en_word}.webp`}
    return NextResponse.json(ans)
}