import {NextResponse,NextRequest} from "next/server"
import {Word,ReturnText} from "@/app/types/types"


export const POST=async(req:NextRequest):Promise<NextResponse>=>{
    //json()はRequestのbody部分だけをJSオブジェクトに変換
    const data:{text:string}=await req.json()
    const text:string=data.text
    console.log(text)//ok
    //deeplに繋ぐ、単語を送る、resをコンソール表示
    const res=await fetch("https://api-free.deepl.com/v2/translate",{
        method:"POST",
        headers:{
            Authorization:`DeepL-Auth-Key 678a9e4f-9f09-484e-9faa-9e643f43d87e:fx`,
            "Content-Type":"application/json"
        },
        body:JSON.stringify({
            "text":[text],
            "target_lang":"JA"
        })
        
    })
    //帰ってきたデータをjsオブジェクトにする
    const resData:ReturnText=await res.json()
    //jsオブジェクトをNextResponseに変換して返す
    console.log(resData)
    const returnText:string=resData.translations[0].text
    return NextResponse.json(returnText)

}