"use server"
import { createClient } from "@/lib/supabase/server"

//bufferファイルをbucketに保存。保存した場所のpathを返す
//userのところを変更する必要あり
export const uploadImage=async(buffer:Buffer,folder:string,name:string)=>{
    const supabase=await createClient()
    const {data,error}=await supabase.storage
    .from("images")
    .upload(`${folder}/user1/${name}.webp`,buffer,{
        contentType:"image/webp" 
    })
    if(!error){
        return data
    }else{
        console.log(error)
        return null
    }

}
//目当てのデータまでのpathを指定。そこまでのurlを作成。urlを返す。
export const getFromStrage=async(path:string)=>{
    const supabase=await createClient()
    const {data}=supabase.storage
    .from("images")
    .getPublicUrl(path)
    if(!data){
        console.log("cant get data from strage")
        return null
    }
    return data
}
