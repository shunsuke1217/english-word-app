import { createClient } from "@/lib/supabase/server"

//bufferファイルをbucketに保存。保存した場所のpathを返す
//userのところを変更する必要あり
export const uploadImage=async(buffer:Buffer,folder:string,name:string)=>{
    const supabase=await createClient()
    const user=await supabase.auth.getUser()
    if(!user.data.user){
        console.log("cant get user data")
        return null
    }
    const {data,error}=await supabase.storage
    .from("images")
    .upload(`${user.data.user.id}/${folder}/${name}.webp`,buffer,{
        contentType:"image/webp" 
    })
    if(!error){
        return data
    }else{
        console.log(error)
        return null
    }

}
