"use client"
import { NextResponse } from "next/server"
import {useState,useEffect, useEffectEvent} from "react"
import {Sentence, Word} from "@/app/types/types"
import Image from 'next/image'
import { insertWord,getData,delWordData, insertSentence, isSentenceTrue } from "./features/db/table"
import { Database } from "./types/db_types"
import { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import {uploadImage } from "./features/db/bucket"
import { getFromStrage } from "./features/db/bucket_sa"
import { Buffer } from "buffer"
import Link from "next/link"
import { set } from "zod"
import { id } from "zod/locales"

//コンポーネント

    //カード　
    //コンポーネント関数で非同期処理の結果を使いたい時はuseEffectを使う
    //今の場合はstate変更→ページ全体でレンダリング→CardのPropsが変わる→Cardもレンダリング
    // →前のCardと比較してimageが変わったためレンダリングされた後にuseEffectも実行→urlが変わるためさいレンダリング→Cardの描画が変わる
    const Card=({en_word,ja_word,image}:Word)=>{
      //urlを変更したら再レンダリング（return以下）をもう一度してほしいからurlはstateにしておく必要あり
      const [url,setUrl]=useState<string|null>("")
      //初回レンダリング、それ以降はimageが変わるたびにuseEffectを実行
      useEffect(()=>{
        const func=async()=>{
        const url=await getFromStrage(image)
        setUrl(url)
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
      const [url,setUrl]=useState<string|null>("")
      //初回レンダリング、それ以降はimageが変わるたびにuseEffectを実行
      useEffect(()=>{
        const func=async()=>{
        const url=await getFromStrage(sentenceImage)
        setUrl(url)
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
//apiで画像を生成→pathを受け取る→pathを返す
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
  //そのpathを返す
  const {path}=await res.json()
  if(path){
    return path
  }
  else{
    throw new Error("pathを取得できませんでした")
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
  const data:{sentence:string,path:string}|null=await res.json()
  if(!data)throw new Error("例文のデータを取得できませんでした")
  //dataが取得できた→例文作成完了→isSentenceをtrueにする
  const returnWord=await isSentenceTrue(id)
  if(!returnWord)throw new Error("isSentenceの更新に失敗しました")
  //sentenceへの変換
  const return_sentence:Sentence={id:id,sentence:data.sentence,sentenceImage:data.path}
  return return_sentence
}
catch(error){
  console.log(`error: ${error}`)
  return null
}
}

export default function Home() {
    
    //英単語と日本語入力を対応させたリスト
    const [words,setWord]=useState<(Word|null)[]>([])
    //今の単語カードのページ
    const [page,setpage]=useState<number>(0)
    //入力欄の文字列
    const [inputword,setInputWord]=useState<string>("")

    const [sentences,setSentence]=useState<(Sentence|null)[]>([])

    //supabaseClientの定義
    const supabase=createClient()
    
    const reibunDummy={id:0,sentence:"this word dont have a sentence",sentenceImage:""}
    //最初のレンダリングだけ行う処理
    useEffect(()=>{
      const initiateWordList=async()=>{
        const allData=await getData()
        console.log(allData)
        if(allData){
          setWord([null,...allData.words])
          setSentence([null,...allData.sentences])
          //ページが読めたら、１ページ目に移動
          setpage(1)
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
          //words[0]を空欄にする
          if(words.length===0){
            setWord([null,newWord])
          }else{
            setWord([...words,newWord])
          }
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
          if(sentences.length===0){
            setSentence([null,newSentence])
          }else{
            setSentence([...sentences,newSentence])
        }}else{
          throw new Error("newSentenceを取得できませんでした")
        }
      }catch(error){
        console.log(error)
      }
    }
    
    //wordを指定してそれとあったsentnceを返す関数
    const findSentence=(word:Word|null):Sentence=>{
      const sentence=sentences.find((sentence)=>sentence?.id===word?.id)
      if(sentence){
        return sentence
      }else{
        console.log("sentenceが見つかりませんでした")
        return reibunDummy
      }
    } 

    //左の単語へ移動
    const left=()=>{
      setpage(Math.max(words.length===0 ? 0 : 1,page-1))
    }
    //右の単語へ移動
    const right=()=>{
      setpage(Math.min(page+1,words.length===1 ? 1 : words.length-1))
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
        const word=words[page]
        return <button
        onClick={()=>{
        delWordData(word.id,word.image,findSentence(word).sentenceImage??"" )
        //消去したword以外のwordで新しく配列を作り、setWord
        setWord((prevWords)=>prevWords.filter((value)=>value?.id!==word.id))
        //消去したwordのidと結びついているsentence以外の要素で新しくsentencesを作成
        setSentence((prevSentences)=>prevSentences.filter((value)=> value?.id!==word.id))
      }}>del</button>
      }else{
        console.log("削除不可")
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
          console.log("addWord開始")
          await addWord(newWord)
          //新しいwordを追加したらそのページに飛ぶ
          //ここでsetpage(words.length-1)をするとaddWordの処理の前の状態が反映される（stateを新しく設定しても再レンダリングされるまでstateは同じものを扱うため）
          setpage(words.length)
          }else{
            console.log("新しくwordを作れませんでした")
          }
        }
      }}
    />

    {/*レンダリング*/}
    {words[page]&&<Card {...words[page]}/>}
    {page!==0&&<SentenceCard {...findSentence(words[page])}/>}


    {/*移動の三角ボタンを追加する*/}
    <RightButton/>
    <LeftButton/>
    
    <p>{page}/{words.length===1 ? 1 : words.length-1}</p>
    {console.log("length",words.length,"page:",page,"sentencelist",sentences)}
    
    {/*削除ボタン*/}
    <DelButton/>
    {/*例文生成ボタン */}
    <button 
    onClick={
      async()=>{
        if(words[page]&&!(words[page]?.isSentence)){
          const newSentence:Sentence|null=await generateSentence(words[page])
          console.log(newSentence)
          if(newSentence){
            words[page].isSentence=true
            await addSentence(newSentence)
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
 
