"use client"

import { useState } from "react"
import type { AuthError } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"

const supabase = createClient()

const getSignUpErrorMessage = (error: AuthError): string => {
  const msg = error.message.toLowerCase()

  if (
    error.code === "user_already_exists" ||
    msg.includes("already registered") ||
    msg.includes("already been registered")
  ) {
    return "このメールアドレスは既に登録されています"
  }
  if (
    msg.includes("password") &&
    (msg.includes("at least") || msg.includes("short") || msg.includes("weak"))
  ) {
    return "パスワードは6文字以上にしてください"
  }
  if (msg.includes("invalid") && msg.includes("email")) {
    return "メールアドレスの形式が正しくありません"
  }
  if (msg.includes("rate limit") || msg.includes("too many requests")) {
    return "リクエストが多すぎます。しばらく時間をおいてからお試しください"
  }
  if (msg.includes("security purposes") || msg.includes("only request this after")) {
    return "確認メールの送信はしばらく待ってからお試しください"
  }
  if (msg.includes("signup") && msg.includes("disabled")) {
    return "新規登録は現在受け付けていません"
  }
  if (msg.includes("redirect")) {
    return "認証設定（リダイレクトURL）に問題があります。管理者にお問い合わせください"
  }
  console.log(error.message)
  return "登録に失敗しました。入力内容を確認して再度お試しください"
}

const signUpNewUser = async (
  email: string,
  password: string,
  user_name: string
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      //メールのリンクのリダイレクト先　今はクエリでnext設定していない
      emailRedirectTo: `https://image-english.com/auth/route`,
      data: {
        user_name,
      },
    },
  })
  return { data, error }
}

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [user_name, setUser_name] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const router = useRouter()

  const handleSignUp = async (e: React.SubmitEvent<HTMLFormElement>) => {
    //handleSingUp発生時はブラウザの標準フォーム送信や更新を止める
    e.preventDefault()
    setErrorMessage("")
    setIsLoading(true)
    const { error } = await signUpNewUser(email, password, user_name)
    setIsLoading(false)
    if (!error) {
      //初めての人が入力後、すぐに飛ぶ場所（クエリをつけるつけないはここで決める）
      router.push(`/auth/confirm?email=${encodeURIComponent(email)}`)
    } else {
      setErrorMessage(getSignUpErrorMessage(error))
    }
  }

  const fieldClass =
    "w-full border border-neutral-800 bg-white px-4 py-2 text-center text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400"

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-white px-4 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-3">
        <div className="w-full border border-neutral-800 bg-neutral-300 p-8">
          <form
            onSubmit={handleSignUp}
            className="flex flex-col items-center gap-5"
          >
            <p className="text-center text-sm font-medium text-neutral-900">
              初めての方
            </p>
            <input
              type="email"
              placeholder="mail"
              className={fieldClass}
              value={email}
              disabled={isLoading}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="password"
              className={fieldClass}
              value={password}
              disabled={isLoading}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              type="text"
              placeholder="user name"
              className={fieldClass}
              value={user_name}
              disabled={isLoading}
              onChange={(e) => setUser_name(e.target.value)}
            />
            <div className="flex items-center justify-center gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="border border-neutral-800 bg-green-500 px-8 py-2 text-sm text-neutral-900 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "..." : "sign up"}
              </button>
              <Link
                href="/"
                className="border border-neutral-800 bg-neutral-200 px-6 py-2 text-sm text-neutral-900 transition-colors hover:bg-neutral-100"
              >
                ホームへ
              </Link>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/auth"
              className="text-sm text-blue-600 hover:underline"
            >
              ログインページへ
            </Link>
          </div>
        </div>

        {errorMessage && (
          <p className="w-full text-center text-sm text-red-600">
        {errorMessage}
          </p>
        )}
      </div>
    </div>
  )
}
