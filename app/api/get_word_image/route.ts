import { Word ,CreatedImage} from "@/app/types/types";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { BaseNextResponse } from "next/dist/server/base-http";
import { uploadImage } from "@/app/features/db/bucket";
//英単語を送る→画像（buffer形式）を返す
export const POST=async(req:NextRequest)=>{
    //NextRequestのbody部分を取得
    const {word}:{word:string}=await req.json()
    const res=await fetch("https://api.openai.com/v1/images/generations",{
        method:"POST",
        headers:{
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type":"application/json"
        },
        body:JSON.stringify({
            prompt:`create an image that makes the word ${word} come to mind when you see it.do not include any text`,
            model:"gpt-image-1-mini",
            quality:"low",
            n:1,
            size:"1024x1024" 
        })

    })
    //返ってきたデータのbody部分をResponseからjsオブジェクトにする
    const returnedData:CreatedImage=await res.json()
    //console.log(returnedData.usage)
    const b_64Data:string=returnedData.data[0].b64_json
    //base64データをbufferに変換
    const buffer=Buffer.from(b_64Data,"base64")
    
    if(buffer){
        return NextResponse.json(buffer)
    }else{
        return null
    }
    
}