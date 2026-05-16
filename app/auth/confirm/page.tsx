'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'


const Home=()=>{
    const searchParams = useSearchParams()
    const userEmail=searchParams.get("email") || ""
    return(
        <>
            <h1>登録完了</h1>
            <p>このたびはImageEnglishにご登録いただきありがとうございます。</p>
            <p>{userEmail}宛に登録メールを送信しました。</p>
            <p>メール内のリンクをクリックして登録を完了させてください。</p>
            <p>メールが届かない場合は迷惑メールフォルダをご確認いただくか、再度登録をお試しください。</p>
            <Link href="/auth">ログインページへ</Link>
        </>
    )
}
export default Home