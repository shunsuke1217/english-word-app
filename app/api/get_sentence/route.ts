import { NextRequest,NextResponse } from "next/server";
import { Word,Sentence } from "@/app/types/types";
import OpenAI from "openai";
import * as z from "zod"
import fs from "fs"
import { uploadImage} from "@/app/features/db/bucket";
import { CreatedImage } from "@/app/types/types";
import { insertSentence} from "@/app/features/db/table";

const openai=new OpenAI()
//返り値の構造(JSONschema)
const ReturnSchema=z.object({
    sentence:z.string(),
})

export const POST=async(req:NextRequest):Promise<NextResponse<{sentence:string,path:string}|null>>=>{
    let sentenceImage:string|null=null
    let id:number=-1
try{
    const {en_word,ja_word,id}=await req.json() as Pick<Word,"en_word"|"ja_word"|"id">
    
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

    //res返却後の処理
    //ここから例文の後処理
    const sentenceJson=JSON.parse(res.output_text)//JSON→jsオブジェクト
    const sentence=sentenceJson.sentence
    console.log(sentence)

    //ここからbase64データの後処理
    const datasetForImage=res.output.find((element)=>element.type==="image_generation_call")
    if(!datasetForImage || !datasetForImage.result)throw new Error("画像生成のデータが見つかりませんでした")
    const imageData=datasetForImage.result
    const buffer=Buffer.from(imageData,"base64")//画像のバイナリデータに変換

    //画像アップロード
    const path=await uploadImage(buffer,"sentence_image",en_word)
    sentenceImage=path?.path??null
    if(!path)throw new Error("画像のアップロードに失敗しました")

    //例文と画像のpathをDBに保存
    const newSentence=await insertSentence({sentence:sentence,sentenceImage:path.path,id:id})
    if(!newSentence)throw new Error("例文のDBへのアップロードに失敗しました")
    //画像のURL,path,sentence全てResponseで返す
    return NextResponse.json({sentence:sentence,path:path.path})
}catch(error){
    console.log(error)
    //datasetFroImageがnullの時のエラー処理
    return NextResponse.json(null)
}
}