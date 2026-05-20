"use server"
import { Word ,Sentence} from "@/app/types/types";
import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/app/types/db_types"; 
import { error } from "console";
import { create } from "domain";
import { deleteImage } from "@/app/features/db/bucket_sa";
//要型注釈

//全wordとそれと紐づくsentenceを取りだして返す
export const getData=async():Promise<{words:Word[],sentences:Sentence[]}|null>=>{
    const supabase:SupabaseClient<Database>=await createClient()
    try{
    const {data}=await supabase
    .from("word_list")
    .select("*,sentence_list(*)")
    .order("id",{ascending:true})
    let words:Word[]=[]
    let sentences:Sentence[]=[]
    if(!data)throw new Error("データ取得に失敗しました")
    data.map((element)=>{
        if(element){
            words.push(element)
            if(element.sentence_list){
                sentences.push(element.sentence_list)
                console.log(element.sentence_list)
            }
        } 
        
    })
    if(words.length===0)throw new Error("データがありません")
    return {"words":words,"sentences":sentences}
    }
    catch(error){
        console.log(error)
        return null
    }
}




//Word型をtableに追加。追加したWordを返す
export const insertWord=async(word:Pick<Word,"en_word"|"ja_word"|"image">):Promise<Word|null>=>{
    const supabase:SupabaseClient<Database>=await createClient()
    try{
    const {data}=await supabase
    .from("word_list")
    .insert({
        en_word:word.en_word,
        ja_word:word.ja_word,
        image:word.image,
        isSentence:false
    })
    .select()
    .single()
    if(data){
        return data
    }else{
        throw new Error("データ取得に失敗しました")
    }}
    catch(error){
        console.log(error)
        return null
    }
}
//Sentenceをtableに追加。追加したデータSentenceを返す
export const insertSentence=async(sentence:Pick<Sentence,"id"|"sentence"|"sentenceImage">):Promise<Sentence|null>=>{
    const supabase:SupabaseClient<Database>=await createClient()
    try{
    const {data}=await supabase
    .from("sentence_list")
    .insert({
        id:sentence.id,
        sentence:sentence.sentence,
        sentenceImage:sentence.sentenceImage,
    })
    .select()
    .single()
    if(data){
        console.log(data)
        return data
    }else{
        throw new Error("データ取得に失敗しました")
    }}
    catch(error){
        console.log(error)
        return null
    }
}

//IDを指定して削除(このとき画像も削除する)
export const delData=async(ID:number,wordImage:string|null,sentenceImage:string|null):Promise<boolean>=>{
    try{
        const supabase=await createClient()
        //画像削除
        //sentence画像がない可能性がある
        if(sentenceImage){
            const deleteSentenceImage=await deleteImage(sentenceImage)
            if(!deleteSentenceImage){
                throw new Error("例文画像の削除に失敗しました")
            }
            //例文データの削除
            const {error}=await supabase
            .from("sentence_list")
            .delete()
            .eq("id",ID)
            .select()
            if(error){
                throw new Error("例文データの削除に失敗しました")
            }
            
        }
        if(wordImage){
            const deleteWordImage=await deleteImage(wordImage)
            if(!deleteWordImage){
                throw new Error("単語画像の削除に失敗しました")
            }
            //単語の削除
            const {error}=await supabase
            .from("word_list")
            .delete()
            .eq("id",ID)
            .select()
            if(error){
                throw new Error("単語データの削除に失敗しました")
            }

        }
        return true
        
    }catch(error){
        console.log(error)
        return false
    }
}

//例文を作った時にDB側のisSentenceをtrueにする
export const isSentenceTrue=async(id:number):Promise<Word|null>=>{
    try{
        const supabase=await createClient()
        const {data,error}=await supabase
        .from("word_list")
        .update({isSentence:true})
        .eq("id",id)
        .select()
        if(data){return data[0]}
        else{throw new Error("isSentenceTrueの更新に失敗しました")}
    }catch(error){
        console.log(error,"isSentenceTrueの更新に失敗")
        return null
    }
    
}