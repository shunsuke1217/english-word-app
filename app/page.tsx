"use client"
import { NextResponse } from "next/server"
import {useState} from "react"
import {Word} from "@/app/types/types"
import Image from 'next/image'
//コンポーネント
    //カード
    const Card=({en_word="",ja_word="",image=""}:Pick<Word,"en_word"|"ja_word"|"image">)=>{
      return(
        <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
          {image&&<Image src={image} fill alt="word image" className="object-cover -z-10"></Image>}
          <div className="absolute inset-0 bg-white/25"/>
          <h1 className="relative z-10 text-black font-bold">{en_word}</h1>
          <p className="relative z-10 text-black">{ja_word}</p>
          
        </div>
      )
    }
    //例文カード
    const SentenceCard=({sentence,sentence_image}:Pick<Word,"sentence"|"sentence_image">)=>{
      return(
        <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
          {sentence_image && <Image src={sentence_image} fill alt="word image" className="object-cover -z-10"></Image>}
          <div className="absolute inset-0 bg-white/25"/>
          <h1 className="relative z-10 text-black font-bold">{sentence}</h1>
        </div>
      )
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

//英単語を受け取ってroute.tsに送り、wordと画像を紐づける
const generateImage=async(word:string):Promise<string>=>{
  const res=await fetch("/api/chatgpt",{
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      word:word
    })
  })
  return `/word/${word}.png`
}

//例文生成関数
const generateSentence=async({en_word,ja_word}:Word):Promise<Pick<Word,"sentence"|"sentence_image">>=>{
  const res=await fetch("/api/sentence",{
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      en_word:en_word,
      ja_word:ja_word
    })
  })
  const ans:Pick<Word,"sentence"|"sentence_image">=await res.json()
  return ans
}

export default function Home() {

    //英単語と日本語入力を対応させたリスト
    const [words,setWorld]=useState<Word[]>([])
    //今の単語カードのページ
    const [page,setpage]=useState<number>(0)
    //入力欄の文字列
    const [inputword,setInputWord]=useState<string>("")
    //応急処置用のstate あとで消す
    const [dummy,setDummy]=useState<number>(0)
//ロジック
    //入力された英語を受け取ってWordsetsに入れる関数
    const AddWord=(word:Word)=>{
      setWorld([...words,word])
      setInputWord("")
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
          const newWord:Word={
            en_word:inputword,
            ja_word:await returnJa(inputword),
            image:await generateImage(inputword),
            isSentence:false
          }
          AddWord(newWord)
        }
      }}
    />

    {/*レンダリング*/}
    <Card {...words[page]}/>
    {words[page]?.isSentence && <SentenceCard sentence={words[page].sentence} sentence_image={words[page].sentence_image}/>}


    {/*移動の三角ボタンを追加する*/}
    <RightButton/>
    <LeftButton/>
    
    {/*カードが０枚の時だけ特殊*/}
    <p>{page}/{words.length}</p>

    {/*例文生成ボタン */}
    <button 
    onClick={
      async()=>{
        if(!words[page].isSentence){
          const sentendeDatas=await generateSentence(words[page])
          words[page].isSentence=true
          words[page].sentence=sentendeDatas.sentence
          words[page].sentence_image=sentendeDatas.sentence_image
          setDummy((prev)=>prev+1)

        }else{
        console.log("作成済み")
        }
      } 
    }
    type="button"
    className="bg-white text-black"
    >例文作成</button>
    </>
  );
}
