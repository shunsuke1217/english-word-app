"use client"

import Link from "next/link"

const Home=()=>{
    return(
        <>
            <h1>認証コードのエラーが発生しました。</h1>
            <p>お手数ですが、再度お試しください。<Link href="/auth">ログインページへ</Link></p>
        </>
        
    )
}
export default Home