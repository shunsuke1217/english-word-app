"use server"
import { createClient } from "@/lib/supabase/server"

//目当てのデータまでのpathを指定。そこまでのurlを作成。urlを返す。
export const getFromStrage=async(path:string):Promise<string|null>=>{
    const supabase=await createClient()
    const {data}=await supabase.storage
    .from("images")
    .createSignedUrl(path, 60) 
    if(!data){
        console.log("cant get data from strage")
        return null
    }
    console.log(data.signedUrl)
    return data.signedUrl
}