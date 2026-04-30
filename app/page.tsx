"use client"
import { NextResponse } from "next/server"
import {useState} from "react"
import {Word} from "@/app/types/types"
import Image from 'next/image'
//コンポーネント
    //カード
    const Card=({en_word="",ja_word="",image=""}:Word)=>{
      return(
        <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
          {image&&<Image src={image} fill alt="word image" className="object-cover -z-10"></Image>}
          <div className="absolute inset-0 bg-white/25"/>
          <h1 className="relative z-10 text-black font-bold">{en_word}</h1>
          <p className="relative z-10 text-black">{ja_word}</p>
          
        </div>
      )
    }
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
  return `/${word}.png`
}

export default function Home() {

    //英単語と日本語入力を対応させたリスト
    const [words,setWorld]=useState<Word[]>([])
    //今の単語カードのページ
    const [page,setpage]=useState<number>(0)
    //入力欄の文字列
    const [inputword,setInputWord]=useState<string>("")
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
      setpage(Math.min(page+1,words.length-1))
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
            image:await generateImage(inputword)
          }
          AddWord(newWord)
        }
      }}
    />
    {/*レンダリング*/}
    <Card {...words[page]}/>

    {/*移動の三角ボタンを追加する*/}
    <RightButton/>
    <LeftButton/>
    
    {/*カードが０枚の時だけ特殊*/}
    <p>{page+1}/{words.length===0 ? 1 : words.length}</p>
    </>
  );
}
