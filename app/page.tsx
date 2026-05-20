"use client"
import { NextResponse } from "next/server"
import { useState, useEffect, useEffectEvent } from "react"
import { Sentence, Word } from "@/app/types/types"
import Image from 'next/image'
import { insertWord, getData, delData, insertSentence, isSentenceTrue } from "./features/db/table"
import { Database } from "./types/db_types"
import { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { uploadImage } from "./features/db/bucket"
import { getFromStrage, deleteImage } from "@/app/features/db/bucket_sa"
import { Buffer } from "buffer"
import Link from "next/link"
import { set } from "zod"


//コンポーネント

//カード　
//コンポーネント関数で非同期処理の結果を使いたい時はuseEffectを使う
//今の場合はstate変更→ページ全体でレンダリング→CardのPropsが変わる→Cardもレンダリング
// →前のCardと比較してimageが変わったためレンダリングされた後にuseEffectも実行→urlが変わるためさいレンダリング→Cardの描画が変わる
const Card = ({ en_word, ja_word, image }: Word) => {
  //urlを変更したら再レンダリング（return以下）をもう一度してほしいからurlはstateにしておく必要あり
  const [url, setUrl] = useState<string | null>("")
  //初回レンダリング、それ以降はimageが変わるたびにuseEffectを実行
  useEffect(() => {
    const func = async () => {
      const url = await getFromStrage(image)
      setUrl(url)
    }
    func()
  }, [image])
  return (
    <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
      {url && <Image src={url} fill alt="word image" className="object-cover -z-10"></Image>}
      <div className="absolute inset-0 bg-white/25" />
      <h1 className="relative z-10 text-black font-bold">{en_word}</h1>
      <p className="relative z-10 text-black">{ja_word}</p>

    </div>
  )
}

//例文カード
const SentenceCard = ({ sentence, sentenceImage }: Sentence) => {
  const [url, setUrl] = useState<string | null>("")
  //初回レンダリング、それ以降はimageが変わるたびにuseEffectを実行
  useEffect(() => {
    const func = async () => {
      const url = await getFromStrage(sentenceImage)
      setUrl(url)
    }
    func()
  }, [sentenceImage])
  return (
    <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
      {url && <Image src={url} fill alt="word image" className="object-cover -z-10"></Image>}
      <div className="absolute inset-0 bg-white/25" />
      <h1 className="relative z-10 text-black font-bold">{sentence}</h1>
    </div>
  )
}

const UserName = () => {
  const [name, setName] = useState("")
  useEffect(() => {
    const func = async () => {
      const supabase = createClient()
      const { data, error } = await supabase.auth.getUser()
      if (!error) {
        setName(data.user.user_metadata?.user_name ?? "no-name")
        console.log(data.user.user_metadata.user_name)
      } else {
        console.log(error)
      }
    }
    func()
  }, [])
  return <p>{name}</p>
}

//ロジック
//英単語を引数にとって日本語を返す
const returnJa = async (en_word: string): Promise<string> => {
  //NextResponseを受け取る
  const res = await fetch("/api/deepl", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: en_word
    })
  })
  //NextResponseのbody部分をjsオブジェクトに変換
  const resData: string = await res.json()
  return resData
}

//Wordの画像生成関数
//input:英単語
//output:bucket内の画像のpath 
//apiで画像を生成→pathを受け取る→pathを返す
const generateImage = async (word: string): Promise<string | null> => {
  try {
    const res = await fetch("/api/get_word_image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        word: word
      })
    })
    //そのpathを返す
    const { path } = await res.json()
    if (path) {
      return path
    }
    else {
      throw new Error("pathを取得できませんでした")
    }
  } catch {
    return null
  }

}

//例文生成&画像生成　関数
//input:英単語とその日本語訳
//output:例文とその画像のpath。失敗したらnull
const generateSentence = async ({ id, en_word, ja_word }: Word): Promise<Sentence | null> => {
  try {
    //apiで例文＆画像生成
    const res = await fetch("/api/get_sentence", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: id,
        en_word: en_word,
        ja_word: ja_word
      })
    })

    //resから例文と例文の画像を受け取る
    const data: { sentence: string, path: string } | null = await res.json()
    console.log(data?.sentence)//ok
    if (!data) throw new Error("例文のデータを取得できませんでした")
    //dataが取得できた→例文作成完了→isSentenceをtrueにする
    const returnWord = await isSentenceTrue(id)
    if (!returnWord) throw new Error("isSentenceの更新に失敗しました")
    //sentenceへの変換
    const return_sentence: Sentence = { id: id, sentence: data.sentence, sentenceImage: data.path }
    return return_sentence
  }
  catch (error) {
    console.log(`error: ${error}`)
    return null
  }
}

export default function Home() {

  //英単語と日本語入力を対応させたリスト
  const [words, setWord] = useState<(Word | null)[]>([null])
  //今の単語カードのページ
  //words[page]としてCardコンポーネントを表示する
  const [page, setpage] = useState<number>(0)
  //入力欄の文字列
  const [inputword, setInputWord] = useState<string>("")

  const [sentences, setSentence] = useState<(Sentence | null)[]>([null])
  const [loading, setLoading] = useState<boolean>(false)
  //supabaseClientの定義
  const supabase = createClient()

  const sentenceDummy = { id: 0, sentence: "this word dont have a sentence", sentenceImage: "" }
  //最初のレンダリングだけ行う処理
  useEffect(() => {
    const initiateWordList = async () => {
      const allData = await getData()
      console.log(allData)
      if (allData) {
       
        setWord([null,...allData.words])
        setSentence([null,...allData.sentences])
        //ページが読めたら、１ページ目に移動
        setpage(1)
      }
    }
    initiateWordList()
  }, [])
  //ロジック
  //入力された英語を受け取ってWordsetsに入れる関数
  const addWord = async (word: Pick<Word, "en_word" | "ja_word" | "image">) => {
    try {
      const newWord = await insertWord(word)
      //DBに追加して初めてブラウザ側のwords[]を更新する
      if (newWord) {
        //words[0]を空欄にする
       
       
          setWord([...words, newWord])
        
        setInputWord("")
        //return newWord
        return newWord
      }
      else {
        throw new Error("newWordを追加できませんでした")
      }
    }
    catch (error) {
      console.log(error)
      return null
    }
  }
  //完成したsentenceをsentencesに追加
  const addSentence = async (sentence: Sentence) => {
   
          setSentence([...sentences, sentence])
  return sentence
    }
  //wordを指定してそれとあったsentnceを返す関数
  const findSentence = (word: Word | null): Sentence => {
    const sentence = sentences.find((sentence) => sentence?.id === word?.id)
    if (sentence) {
      return sentence
    } else {
      console.log("sentenceが見つかりませんでした")
      return sentenceDummy
    }
  }

  //左の単語へ移動
  const left = () => {
    setpage(Math.max(words.length === 1 ? 0 : 1, page - 1))
  }
  //右の単語へ移動
  const right = () => {
    setpage(Math.min(page + 1, words.length===1 ? 0 : words.length-1))
  }


  //コンポーネント
  //右ボタン
  const RightButton = () => {
    return <button onClick={right}>right</button>
  }
  //左ボタン
  const LeftButton = () => {
    return <button onClick={left}>left</button>
  }
  //消去ボタン(消去するwordを引数にとる)
  const DelButton = () => {
    //削除よていのwordのIDを保存
    if (words[page]) {
      const word = words[page]
      return <button
        onClick={async() => {
          await delData(word.id, word.image, findSentence(word).sentenceImage ?? null)
          //消去したword以外のwordで新しく配列を作り、setWord
          setWord((prevWords) => prevWords.filter((value) => value?.id !== word.id))
          //消去したwordのidと結びついているsentence以外の要素で新しくsentencesを作成
          setSentence((prevSentences) => prevSentences.filter((value) => value?.id !== word.id))
          //page遷移
          //useStateは読んでいるが更新されていないため、更新前のpageとwords.lengthを使う
          if(page===1&&words.length!==2)setpage(1)
          else setpage(page-1)
        }}>del</button>
    } else {
      console.log("削除不可")
    }
  }

  return (
    <>
      {/*input欄から日本語入力*/}
      <input
        className="bg-white text-center text-black"
        value={inputword}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputWord(e.target.value)}
      />

      <button onClick={
        async (e: React.MouseEvent<HTMLButtonElement>) => {
          setLoading(true)
            let image_path:string|null=inputword
            try {
              if(!image_path)throw new Error("wordが指定されていません")
              image_path = await generateImage(inputword)
              //image_pathが存在するとstrageへのアップロードに成功している
              if (!image_path) throw new Error("画像の生成に失敗しました")
              const newWord: Pick<Word, "en_word" | "ja_word" | "image"> = {
                en_word: inputword,
                ja_word: await returnJa(inputword),
                image: image_path,
              }
              console.log("addWord開始")
              //ここで初めてDBにアップロードする。resultがnullの場合はDBへアップロードされていない
              const result = await addWord(newWord)
              //新しいwordを追加したらそのページに飛ぶ
              //ここでsetpage(words.length-1)をするとaddWordの処理の前の状態が反映される（stateを新しく設定しても再レンダリングされるまでstateは同じものを扱うため）

              if (!result) throw new Error("wordの追加に失敗しました")
              //全部成功したら追加するページに飛ぶ
              setpage(words.length)

            } catch (error) {
              console.log(error)
              //image_pathが存在しているならstrageのimageを削除
              if(image_path)await deleteImage(image_path)
            }
            setLoading(false)
          }
        }
        disabled={loading}
        >AddWord</button>

      {/*レンダリング*/}
      {words[page] && <Card {...words[page]} />}
      {words[page] && <SentenceCard {...findSentence(words[page])} />}


      {/*移動の三角ボタンを追加する*/}
      <RightButton />
      <LeftButton />


      <p>{page}/{words.length-1}</p>

      {console.log("length", words.length, "page:", page, "sentencelist", sentences)}
      {console.log(words,sentences)}

      {/*削除ボタン*/}
      <DelButton />
      {/*例文生成ボタン */}
      <button
        onClick={
          async () => {
            console.log('click')
            setLoading(true)
            const word = words[page]
            try {
              if (!word) throw new Error("wordが見つかりませんでした")
              console.log(word.isSentence)
              if (word.isSentence) throw new Error("例文はすでに作成済みです")
              console.log("例文生成開始")
              const newSentence: Sentence | null = await generateSentence(word)
              console.log(newSentence)
              if (!newSentence) throw new Error("例文を生成できませんでした")
              const result = await addSentence(newSentence)
              if (!result) throw new Error("例文の追加に失敗しました")
              //直接trueにするしかない
              if (words[page]) words[page].isSentence = true
              setLoading(false)
            }
            catch (error) {
              console.log(error)
              //wordisSentenceがfalseの場合、途中まで進んでImageを作ってしまった場合、画像を消す
              if(!word?.isSentence)delData(word?.id ?? 0, null, findSentence(word).sentenceImage ?? null)
              setLoading(false)
              return null
              }
            }
          }
        type="button"
        className="bg-white text-black cursor-pointer"
        disabled={loading}
      >AddSentence</button>

      {/*username の表示*/}
      <UserName />

      <Link href="/auth">
        <button className="bg-blue-500 text-white py-2 px-4 rounded">
          ログインページへ
        </button>
      </Link>
    </>

  );
}

