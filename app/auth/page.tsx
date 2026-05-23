"use client"

import { createClient } from "@/lib/supabase/client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const supabase = createClient()

const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage("")
    setIsLoading(true)
    const { error } = await signInWithEmail(email, password)
    setIsLoading(false)
    if (!error) {
      router.push("/")
    } else {
      setErrorMessage(error.message)
    }
  }

  const fieldClass =
    "w-full border border-neutral-800 bg-white px-4 py-2 text-center text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400"

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-white px-4 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-3">
        <div className="w-full border border-neutral-800 bg-neutral-300 p-8">
          {/*loginを名前でできるようにしたい */}
          <form
            onSubmit={handleLogin}
            className="flex flex-col items-center gap-5"
          >
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
            <div className="flex items-center justify-center gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="border border-neutral-800 bg-blue-500 px-8 py-2 text-sm text-neutral-900 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "..." : "login"}
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
              href="/auth/biginner"
              className="text-sm text-blue-600 hover:underline"
            >
              初めての方はこちらから
            </Link>
          </div>
        </div>

        {errorMessage && (
          <p className="w-full text-center text-sm text-red-600">
            ユーザーが登録されていない、<br></br>またはemailかパスワードが間違っています
          </p>
        )}
      </div>
    </div>
  )
}
