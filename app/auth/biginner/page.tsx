'use client'
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
const supabase = createClient() 

const signUpNewUser = async (email: string, password: string,user_name:string) => {
  const { data, error } = await supabase.auth.signUp({
    email:email,
    password:password,
    options: {
      //メールのリンクのリダイレクト先　今はクエリでnext設定していない
      emailRedirectTo: 'localhost:3000/auth/route',
      data:{
        user_name:user_name,
      }
    },
  })
  return {data,error}
}



const Home=()=>{
    const [isLoading, setIsLoading] = useState(false)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [user_name, setUser_name] = useState("")

    const router = useRouter()

    const handleSignUp = async (e: React.SubmitEvent<HTMLFormElement>) => {
    //handleSingUp発生時はブラウザの標準フォーム送信や更新を止める
    e.preventDefault()

    setIsLoading(true)
    const { error } = await signUpNewUser(email, password,user_name)
    setIsLoading(false)
    if (!error) {
      //初めての人が入力後、すぐに飛ぶ場所
      router.push(`/auth/confirm?email=${email}`)
    } else {
      console.log("error", error.message)
    }
}

    return (
        <>
        <h1>初めての方</h1>
      <form onSubmit={handleSignUp}>
        <input type="text" placeholder="email" onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
        <input type="text" placeholder="User Name" onChange={(e) => setUser_name(e.target.value)} />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Signing up...' : 'Sign Up'}
        </button>
      </form>
        </>
    )
}
export default Home