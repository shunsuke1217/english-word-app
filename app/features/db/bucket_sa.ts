"use server"
import { createClient } from "@/lib/supabase/server"

//目当てのデータまでのpathを指定。そこまでのurlを作成。urlを返す。
export const getFromStrage=async(path:string):Promise<string|null>=>{
    const supabase=await createClient()
    const {data}=await supabase.storage
    .from("images")
    .createSignedUrl(path, 60) 
    if(!data){
        return null
    }
    return data.signedUrl
}

//パスを指定してbucketから画像を消去
export const deleteImage=async(path:string):Promise<boolean>=>{
    try{
    const supabase=await createClient()
    const {error}=await supabase.storage
    .from("images")
    .remove([path])
    if(!error){
        return true
    }else{throw new Error("画像の削除に失敗しました")}
    }catch{
        return false
    }
    
}