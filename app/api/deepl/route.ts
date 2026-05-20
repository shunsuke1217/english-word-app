import {NextResponse,NextRequest} from "next/server"
import {Word,ReturnText} from "@/app/types/types"


export const POST=async(req:NextRequest):Promise<NextResponse>=>{
    try{
        //json()はRequestのbody部分だけをJSオブジェクトに変換
        const data:{text:string}=await req.json()
        const text:string=data.text
        console.log(text)//ok
        //deeplに繋ぐ、単語を送る、resをコンソール表示
        const res=await fetch("https://api-free.deepl.com/v2/translate",{
            method:"POST",
            headers:{
                Authorization:`DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                "text":[text],
                "target_lang":"JA"
            })
            
        })
        if(!res)throw new Error("Deeplからのレスポンス取得に失敗しました")
        //帰ってきたデータをjsオブジェクトにする
        const resData:ReturnText=await res.json()
        //jsオブジェクトをNextResponseに変換して返す
        console.log(resData)
        const returnText:string=resData.translations[0].text
        return NextResponse.json(returnText)
    }catch(error){
        console.log(error)
        //エラーが起きたらnullを返す
        return NextResponse.json(null)
    }
    

}