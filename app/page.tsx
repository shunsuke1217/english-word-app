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

const cardImageOverlay =
  "pointer-events-none absolute inset-0 z-[1] bg-white/30 backdrop-blur-[2px]"

//カード　
//コンポーネント関数で非同期処理の結果を使いたい時はuseEffectを使う
//今の場合はstate変更→ページ全体でレンダリング→CardのPropsが変わる→Cardもレンダリング
// →前のCardと比較してimageが変わったためレンダリングされた後にuseEffectも実行→urlが変わるためさいレンダリング→Cardの描画が変わる
const Card = ({ en_word, ja_word, image }: Word) => {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!image) {
      setUrl(null)
      return
    }
    let cancelled = false
    const load = async () => {
      const signedUrl = await getFromStrage(image)
      if (!cancelled) setUrl(signedUrl)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [image])
  return (
    <div className="relative aspect-square w-full overflow-hidden border border-neutral-800 bg-neutral-200">
      {url && (
        <Image
          src={url}
          fill
          alt="word image"
          sizes="(max-width: 768px) 100vw, 28rem"
          className="object-cover"
        />
      )}
      <div className={cardImageOverlay} aria-hidden />
      <div className="relative z-[2] flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <h1 className="text-2xl font-bold text-neutral-900 drop-shadow-sm">
          {en_word}
        </h1>
        <p className="text-lg text-neutral-800 drop-shadow-sm">{ja_word}</p>
      </div>
    </div>
  )
}

//例文カード
const SentenceCard = ({ sentence, sentenceImage }: Sentence) => {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!sentenceImage) {
      setUrl(null)
      return
    }
    let cancelled = false
    const load = async () => {
      const signedUrl = await getFromStrage(sentenceImage)
      if (!cancelled) setUrl(signedUrl)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [sentenceImage])
  return (
    <div className="relative aspect-square w-full overflow-hidden border border-neutral-800 bg-neutral-200">
      {url && (
        <Image
          src={url}
          fill
          alt="sentence image"
          sizes="(max-width: 768px) 100vw, 28rem"
          className="object-cover"
        />
      )}
      <div className={cardImageOverlay} aria-hidden />
      <p className="relative z-[2] flex h-full items-center justify-center px-6 text-center text-lg font-bold text-neutral-900 drop-shadow-sm">
        {sentence}
      </p>
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
  return <p className="text-sm text-neutral-700">{name}</p>
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
  const [loading, setLoading] = useState<boolean>(true)
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
    setLoading(false)
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
  const navButtonClass =
    "flex h-14 w-14 shrink-0 items-center justify-center border border-neutral-800 bg-neutral-200 transition-colors hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-40"

  //右ボタン
  const RightButton = () => {
    const atEnd = page >= (words.length === 1 ? 0 : words.length - 1)
    return (
      <button
        type="button"
        onClick={right}
        disabled={atEnd}
        aria-label="次の単語へ"
        className={navButtonClass}
      >
        <span
          className="h-0 w-0 border-y-[10px] border-y-transparent border-l-[16px] border-l-neutral-800"
          aria-hidden
        />
      </button>
    )
  }
  //左ボタン
  const LeftButton = () => {
    const atStart = page <= (words.length === 1 ? 0 : 1)
    return (
      <button
        type="button"
        onClick={left}
        disabled={atStart}
        aria-label="前の単語へ"
        className={navButtonClass}
      >
        <span
          className="h-0 w-0 border-y-[10px] border-y-transparent border-r-[16px] border-r-neutral-800"
          aria-hidden
        />
      </button>
    )
  }
  const TrashIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-6 w-6"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  )

  //消去ボタン(消去するwordを引数にとる)
  const DelButton = () => {
    //削除よていのwordのIDを保存
    if (words[page]) {
      const word = words[page]
      return (
        <button
          type="button"
          disabled={loading}
          aria-label="削除"
          onClick={async () => {
            setLoading(true)
            await delData(
              word.id,
              word.image,
              findSentence(word).sentenceImage ?? null
            )
            setWord((prevWords) =>
              prevWords.filter((value) => value?.id !== word.id)
            )
            setSentence((prevSentences) =>
              prevSentences.filter((value) => value?.id !== word.id)
            )
            if (page === 1 && words.length !== 2) setpage(1)
            else setpage(page - 1)
            setLoading(false)
          }}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-neutral-800 bg-neutral-200 text-neutral-800 transition-colors hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <TrashIcon />
        </button>
      )
    } else {
      console.log("削除不可")
      return null
    }
  }

  const actionButtonClass =
    "shrink-0 border border-neutral-800 bg-neutral-200 px-5 py-2 text-sm text-neutral-900 transition-colors hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"

  // 中央列をウィンドウ中央に置く（左右 1fr が同幅）
  const pcCenterGrid =
    "grid w-full grid-cols-[1fr_minmax(0,56rem)_1fr] items-center gap-x-4 px-6"

  const inputClass =
    "w-full min-w-0 border border-neutral-800 bg-neutral-200 px-3 py-2 text-center text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 md:px-4 md:text-base"

  const handleAddWord = async () => {
    setLoading(true)
    let image_path: string | null = inputword
    try {
      if (!image_path) throw new Error("wordが指定されていません")
      image_path = await generateImage(inputword)
      if (!image_path) throw new Error("画像の生成に失敗しました")
      const newWord: Pick<Word, "en_word" | "ja_word" | "image"> = {
        en_word: inputword,
        ja_word: await returnJa(inputword),
        image: image_path,
      }
      const result = await addWord(newWord)
      if (!result) throw new Error("wordの追加に失敗しました")
      setpage(words.length)
    } catch (error) {
      console.log(error)
      if (image_path) await deleteImage(image_path)
    }
    setLoading(false)
  }

  const handleGenerateSentence = async () => {
    setLoading(true)
    const word = words[page]
    try {
      if (!word) throw new Error("wordが見つかりませんでした")
      if (word.isSentence) throw new Error("例文はすでに作成済みです")
      const newSentence: Sentence | null = await generateSentence(word)
      if (!newSentence) throw new Error("例文を生成できませんでした")
      const result = await addSentence(newSentence)
      if (!result) throw new Error("例文の追加に失敗しました")
      if (words[page]) words[page].isSentence = true
      setLoading(false)
    } catch (error) {
      console.log(error)
      if (!word?.isSentence)
        delData(
          word?.id ?? 0,
          null,
          findSentence(word).sentenceImage ?? null
        )
      setLoading(false)
    }
  }

  const wordInput = (
    <input
      type="text"
      placeholder="英単語を入力"
      className={inputClass}
      value={inputword}
      disabled={loading}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        setInputWord(e.target.value)
      }
    />
  )

  const addWordButton = (
    <button
      type="button"
      className={actionButtonClass}
      disabled={loading || !inputword.trim()}
      onClick={handleAddWord}
    >
      単語を追加
    </button>
  )

  const generateSentenceButton = (
    <button
      type="button"
      className={`${actionButtonClass} px-6 md:px-8 md:py-2.5`}
      disabled={loading || !words[page]}
      onClick={handleGenerateSentence}
    >
      例文生成
    </button>
  )

  const emptyWordCard = (
    <div className="flex aspect-square w-full items-center justify-center border border-neutral-800 bg-neutral-200 text-neutral-500">
      単語がありません
    </div>
  )

  const emptySentenceCard = (
    <div className="flex aspect-square w-full items-center justify-center border border-neutral-800 bg-neutral-200 text-neutral-500">
      例文がありません
    </div>
  )

  const wordCardBlock = (
    <div className="w-full">
      {words[page] ? <Card {...words[page]} /> : emptyWordCard}
    </div>
  )

  const sentenceCardBlock = (
    <div className="min-w-0 w-full flex-1 md:flex-none">
      {words[page] ? (
        <SentenceCard {...findSentence(words[page])} />
      ) : (
        emptySentenceCard
      )}
    </div>
  )

  return (
    <div className="flex min-h-dvh flex-col bg-white text-neutral-900">
      <header className="w-full border-b border-neutral-300">
        {/* スマホ: ログイン・入力・追加を横並び → その下にユーザー名 */}
        <div className="mx-auto w-full max-w-6xl px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Link href="/auth" className="shrink-0">
              <button type="button" className={actionButtonClass}>
                ログイン
              </button>
            </Link>
            {wordInput}
            {addWordButton}
          </div>
          <div className="mt-2">
            <UserName />
          </div>
        </div>

        {/* PC: ログイン・入力・追加を水平に。中央列＝ウィンドウ中央 */}
        <div className={`${pcCenterGrid} hidden pt-4 md:grid`}>
          <div className="flex justify-start">
            <Link href="/auth">
              <button type="button" className={actionButtonClass}>
                ログイン
              </button>
            </Link>
          </div>
          <div className="min-w-0">{wordInput}</div>
          <div className="flex justify-end">{addWordButton}</div>
        </div>
        <div className={`${pcCenterGrid} hidden pb-4 md:grid`}>
          <div className="justify-self-start">
            <UserName />
          </div>
          <div aria-hidden />
          <div aria-hidden />
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col px-4 py-6 md:px-0 md:py-0">
        {/* スマホ */}
        <div className="flex min-h-0 flex-1 flex-col items-center gap-6 md:hidden">
          <div className="flex w-full max-w-6xl flex-col gap-6">
            {wordCardBlock}
            <div className="flex items-start gap-3">
              {sentenceCardBlock}
              <DelButton />
            </div>
          </div>
          <div className="flex w-full max-w-6xl items-center justify-between gap-2">
            <LeftButton />
            {generateSentenceButton}
            <RightButton />
          </div>
          {words.length > 1 && (
            <p className="text-center text-sm text-neutral-600">
              {page} / {words.length - 1}
            </p>
          )}
        </div>

        {/* PC: カードエリアを縦に伸ばし、下部に操作を配置 */}
        <div className="hidden min-h-0 flex-1 flex-col md:flex">
          <div className={`${pcCenterGrid} min-h-0 flex-1 py-8`}>
            <div className="flex justify-start">
              <LeftButton />
            </div>
            <div className="grid grid-cols-2 gap-10">
              {wordCardBlock}
              <div className="relative">
                {sentenceCardBlock}
                <div className="absolute left-full top-0 ml-3">
                  <DelButton />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <RightButton />
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-4 pb-8 pt-2">
            {generateSentenceButton}
            {words.length > 1 && (
              <p className="text-center text-sm text-neutral-600">
                {page} / {words.length - 1}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

