"use client"
import { NextResponse } from "next/server"
import {useState,useEffect, useEffectEvent} from "react"
import {Sentence, Word} from "@/app/types/types"
import Image from 'next/image'
import { insertWord,getData,delWordData, insertSentence } from "./features/db/table"
import { Database } from "./types/db_types"
import { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import {uploadImage,getFromStrage } from "./features/db/bucket"
import { Buffer } from "buffer"
import Link from "next/link"

//コンポーネント

    //カード　
    //コンポーネント関数で非同期処理の結果を使いたい時はuseEffectを使う
    //今の場合はstate変更→ページ全体でレンダリング→CardのPropsが変わる→Cardもレンダリング
    // →前のCardと比較してimageが変わったためレンダリングされた後にuseEffectも実行→urlが変わるためさいレンダリング→Cardの描画が変わる
    const Card=({en_word,ja_word,image}:Word)=>{
      //urlを変更したら再レンダリング（return以下）をもう一度してほしいからurlはstateにしておく必要あり
      const [url,setUrl]=useState<string>("")
      //初回レンダリング、それ以降はimageが変わるたびにuseEffectを実行
      useEffect(()=>{
        const func=async()=>{
        const data=await getFromStrage(image)
        if(data){
          setUrl(data.publicUrl)
        }
      }
    func()
  },[image])
      return(
        <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
          {url&&<Image src={url} fill alt="word image" className="object-cover -z-10"></Image>}
          <div className="absolute inset-0 bg-white/25"/>
          <h1 className="relative z-10 text-black font-bold">{en_word}</h1>
          <p className="relative z-10 text-black">{ja_word}</p>
          
        </div>
      )
    }

    //例文カード
    const SentenceCard=({sentence,sentenceImage}:Sentence)=>{
      const [url,setUrl]=useState<string>("")
      console.log(sentenceImage)
      //初回レンダリング、それ以降はimageが変わるたびにuseEffectを実行
      useEffect(()=>{
        const func=async()=>{
        const data=await getFromStrage(sentenceImage)
        if(data){
          setUrl(data.publicUrl)
        }
      }
    func()
  },[sentenceImage])
      return(
        <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
          {url && <Image src={url} fill alt="word image" className="object-cover -z-10"></Image>}
          <div className="absolute inset-0 bg-white/25"/>
          <h1 className="relative z-10 text-black font-bold">{sentence}</h1>
        </div>
      )
    }

    const UserName=()=>{
      const [name,setName]=useState("")
      useEffect(()=>{
        const func=async()=>{
          const supabase=createClient()
          const {data,error}=await supabase.auth.getUser()
          if(!error){
            setName(data.user.user_metadata?.user_name??"no-name")
            console.log(data.user.user_metadata.user_name)
          }else{
            console.log(error)
          }
        }
        func()
      },[])
      console.log(name)
      return <p>{name}</p>
    }
    
//ロジック
//英単語を引数にとって日本語を返す
const returnJa=async(en_word:string):Promise<string>=>{
  //NextResponseを受け取る
  const res=await fetch("/api/deepl",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
    },
    body:JSON.stringify({
      text:en_word
    })
  })
  //NextResponseのbody部分をjsオブジェクトに変換
  const resData:string=await res.json()
  return resData
}

//Wordの画像生成関数
//input:英単語
//output:bucket内の画像のpath 
//apiで画像を生成→buffer形式でbucketに保存→pathを返す
const generateImage=async(word:string):Promise<string|null>=>{
  try{
    const res=await fetch("/api/get_word_image",{
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      word:word
    })
  })
  //bufferを受け取る→bucketに保存→そのpathを返す
  if(res){
    const buffer:Buffer=await res.json()
    const pathDatas=await uploadImage(buffer,"word_image",word)
    if(!pathDatas){
      throw new Error("画像pathを取得できませんでした")
    }else{
      return pathDatas.path
    }
    }
  else{
    throw new Error("画像pathを取得できませんでした")
  }
  }catch{
    return null
  }
  
  
  
}

//例文生成&画像生成　関数
//input:英単語とその日本語訳
//output:例文とその画像のpath。失敗したらnull
const generateSentence=async({id,en_word,ja_word}:Word):Promise<Sentence | null>=>{
  try{
    //apiで例文＆画像生成
    const res=await fetch("/api/get_sentence",{
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      en_word:en_word,
      ja_word:ja_word
    })
  })

  //resから例文と例文の画像を受け取る
  const ans:{sentence:string,sentenceImage:Buffer<ArrayBufferLike>|null}=await res.json()
  //例文画像をbucketに保存
  if(ans.sentenceImage){
    const pathDatas=await uploadImage(ans.sentenceImage,"sentence_image",en_word)
    if(pathDatas){
      const return_sentence:Sentence={id:id,sentence:ans.sentence,sentenceImage:pathDatas.path}
      return return_sentence
    }else{
      throw new Error("uploadできませんでした")
    }
  }else{
    throw new Error("pathが返されませんでした")
  }
  }catch(error){
    console.log(error)
    return null
  }
}

export default function Home() {
    
    //英単語と日本語入力を対応させたリスト
    const [words,setWord]=useState<Word[]>([])
    //今の単語カードのページ
    const [page,setpage]=useState<number>(0)
    //入力欄の文字列
    const [inputword,setInputWord]=useState<string>("")

    const [sentences,setSentence]=useState<Sentence[]>([])

    //supabaseClientの定義
    const supabase=createClient()
    
    //最初のレンダリングだけ行う処理
    useEffect(()=>{
      const initiateWordList=async()=>{
        const allData=await getData()
        if(allData){
          setWord(allData.words)
          setSentence(allData.sentences)
        }
      }
      initiateWordList()
    },[])
//ロジック
    //入力された英語を受け取ってWordsetsに入れる関数
    const addWord=async(word:Pick<Word,"en_word"|"ja_word"|"image">)=>{
      try{
        const newWord=await insertWord(word)
        if(newWord){
          setWord([...words,newWord])
          setInputWord("")}
        else{
          throw new Error("newWordを取得できませんでした")
        }
      }
      catch(error){
        console.log(error)
      }
    }
    //完成したsentenceをsentencesに追加
    const addSentence=async(sentence:Sentence)=>{
      try{
        const newSentence=await insertSentence(sentence)
        if(newSentence){
          setSentence([...sentences,newSentence])
        }else{
          throw new Error("newSentenceを取得できませんでした")
        }
      }catch(error){
        console.log(error)
      }
    }
    //左の単語へ移動
    const left=()=>{
      setpage(Math.max(0,page-1))
    }
    //右の単語へ移動
    const right=()=>{
      setpage(Math.min(page+1,words.length))
    }


//コンポーネント
    //右ボタン
    const RightButton=()=>{
      return <button onClick={right}>right</button>
    }
    //左ボタン
    const LeftButton=()=>{
      return <button onClick={left}>left</button>
    }
    //消去ボタン(消去するwordを引数にとる)
    const DelButton=()=>{
      //削除よていのwordのIDを保存
      if(words[page]){
        const delID=words[page].id
      return <button
      onClick={()=>{
        delWordData(supabase,delID)
        //消去したword以外のwordで新しく配列を作り、setWord
        setWord((prevWords)=>prevWords.filter((value)=>value.id!==delID))
        //消去したwordのidと結びついているsentence以外の要素で新しくsentencesを作成
        setSentence((prevSentences)=>prevSentences.filter((value)=>value.id!==delID))
      }}>del</button>
      }
    }
      
  return (
    <>
    {/*input欄から日本語入力*/}
    <input 
    className="bg-white text-center text-black"
    value={inputword}
    onChange={(e:React.ChangeEvent<HTMLInputElement>)=>setInputWord(e.target.value)}
    onKeyDown={
      async(e:React.KeyboardEvent<HTMLInputElement>)=>{
        if(e.key==="Enter"){
          const image_path=await generateImage(inputword)
          if(image_path){
            const newWord:Pick<Word,"en_word"|"ja_word"|"image">={
            en_word:inputword,
            ja_word:await returnJa(inputword),
            image:image_path,
          }
          console.log(newWord)
          addWord(newWord)
          //新しいwordを追加したらそのページに飛ぶ
          setpage(words.length)
          }else{
            console.log("新しくwordを作れませんでした")
          }
        }
      }}
    />

    {/*レンダリング*/}
    {words[page]&&<Card {...words[page]}/>}
    {words[page]?.isSentence && <SentenceCard {...sentences[page]}/>}


    {/*移動の三角ボタンを追加する*/}
    <RightButton/>
    <LeftButton/>
    
    <p>{page}/{words.length}</p>

    {/*削除ボタン*/}
    <DelButton/>
    {/*例文生成ボタン */}
    <button 
    onClick={
      async()=>{
        if(!words[page].isSentence){
          const newSentence:Sentence|null=await generateSentence(words[page])
          console.log(newSentence)//null
          if(newSentence){
            words[page].isSentence=true
            addSentence(newSentence)
          }else{
            console.log("newSentenceデータを作れませんでした")
          }
        }else{
        console.log("作成済み")
        }
      } 
    }
    type="button"
    className="bg-white text-black cursor-pointer"
    >例文作成</button>

    {/*username の表示*/ }
    <UserName/>

    <Link href="/auth">
      <button className="bg-blue-500 text-white py-2 px-4 rounded">
        ログインページへ
      </button>
    </Link>
    </>
    
  );
}
