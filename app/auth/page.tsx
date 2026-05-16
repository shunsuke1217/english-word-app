'use client'

import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const supabase = createClient();

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

  const handleSignUp = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    const { error } = await signUpNewUser(email, password,user_name)
    setIsLoading(false)
    if (!error) {
      //初めての人が入力後、すぐに飛ぶ場所
      router.push('/auth/confirm')
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
      <h1>初めての方</h1>
      <form onSubmit={handleSignUp}>
        <input type="text" placeholder="email" onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
        <input type="text" placeholder="User Name" onChange={(e) => setUser_name(e.target.value)} />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Signing up...' : 'Sign Up'}
        </button>
      </form>
      <button 
      onClick={handleSignOut}>サインアウト</button>
    </div>
  );
}