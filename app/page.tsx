"use client"
import { NextResponse } from "next/server"
import {useState} from "react"
import {Sentence, Word} from "@/app/types/types"
import Image from 'next/image'
//コンポーネント
    //カード
    const Card=({en_word,ja_word,image}:Word)=>{
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
    const SentenceCard=({sentence,sentenceImage}:Sentence)=>{
      return(
        <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
          {sentenceImage && <Image src={sentenceImage} fill alt="word image" className="object-cover -z-10"></Image>}
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

//英単語を受け取ってroute.tsに送り、wordの画像のpathを返す
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
  return res.json()
}

//例文生成関数
const generateSentence=async({en_word,ja_word}:Word):Promise<Pick<Sentence,"sentence"|"sentenceImage">>=>{
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
  const ans:Pick<Sentence,"sentence"|"sentenceImage">=await res.json()
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
    const [sentences,setSentence]=useState<Sentence[]>([])
//ロジック
    //入力された英語を受け取ってWordsetsに入れる関数
    const addWord=(word:Word)=>{
      setWorld([...words,word])
      setInputWord("")
    }
    //完成したsentenceをsentencesに追加
    const addSentence=(sentence:Sentence)=>{
      setSentence([...sentences,sentence])
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
          //wordsが空の場合、前の要素を見てidを変えることができないため、場合分けが必要
          let newId=0
          //もしwordsの前の要素が存在しているなら,それのidの一つ後に設定
          if(words[page]){
            newId=words[words.length-1].id+1
          }
          const newWord:Word={
            //idの更新はwordの個数がidと一致しないため、newWordの一番後ろの単語のidを見る必要がある
            id:newId,
            en_word:inputword,
            ja_word:await returnJa(inputword),
            image:await generateImage(inputword),
            isSentence:false,
          }
          addWord(newWord)
        }
      }}
    />

    {/*レンダリング*/}
    {words[page]&&<Card {...words[page]}/>}
    {words[page]?.isSentence && <SentenceCard {...sentences[page]}/>}


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
          const sentenceData=await generateSentence(words[page])
          words[page].isSentence=true
          //同じpageにあるwordに対しての例文を作るのだから、words[page]のid要素にアクセスすればいい
          const newSentence:Sentence={id:words[page].id,sentence:sentenceData.sentence,sentenceImage:sentenceData.sentenceImage}
          addSentence(newSentence)
        }else{
        console.log("作成済み")
        }
      } 
    }
    type="button"
    className="bg-white text-black cursor-pointer"
    >例文作成</button>
    </>
  );
}
