import { type EmailOtpType } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { type NextRequest } from "next/server"

import { deleteUnconfirmedUserByEmail } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

function safeRedirectPath(next: string | null, fallback = "/auth"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback
  }
  return next
}

async function cleanupFailedSignup(email: string | null, type: string | null) {
  if (type === "signup" && email) {
    await deleteUnconfirmedUserByEmail(email)
  }
}

// 顧客emailからGETリクエストがくる
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const code = searchParams.get("code")
  const type = searchParams.get("type") as EmailOtpType | null
  const email = searchParams.get("email")
  const next = safeRedirectPath(searchParams.get("next"))

  const supabase = await createClient()

  // PKCE flow（新しい確認メールリンク）
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      redirect(next)
    }
    await cleanupFailedSignup(email, type ?? "signup")
    redirect("/auth/auth-code-error")
  }

  // token_hash flow（従来の確認メールリンク）
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      redirect(next)
    }
    await cleanupFailedSignup(email, type)
    redirect("/auth/auth-code-error")
  }

  redirect("/auth/auth-code-error")
}
