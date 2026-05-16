'use client'

import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
const supabase = createClient();



const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email:email,
    password:password,
  })
  return {data,error}
}

 const handleSignOut = async () => {
    await supabase.auth.signOut()
    console.log("signed out")
  }

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [user_name, setUser_name] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    const {  error } = await signInWithEmail(email, password)
    setIsLoading(false)
    if (!error) {
      router.push('/')
    } else {
      console.log("error", error.message)
    }
  }


  return (
    <div>
      {/*loginを名前でできるようにしたい */}
      <h1>Login</h1>
      <form onSubmit={handleLogin}>
        <input type="text" placeholder="email" onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <h1>初めての方は<Link href="/auth/biginner">こちら</Link>から</h1>
      
      <button 
      onClick={handleSignOut}>サインアウト</button>
      <Link href="/">ホームへ</Link>
    </div>
  );
}