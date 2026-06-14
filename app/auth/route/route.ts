import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

//顧客emailからGETリクエストがくる
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')

  //なんのためのtokenかを識別するためにtypeが必要
  const type = searchParams.get('type') as EmailOtpType | null
  
  //この'next'はauth/page.tsxでemailRedirectToで指定したリダイレクト先
  const next = searchParams.get('next') ?? '/auth/confirm'

  if (token_hash && type) {
    const supabase = await createClient()

    //届いたotpの確認
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    console.log(error?.message)
    if (!error) {
      // redirect user to specified redirect URL or root of app
      redirect(next)
    }
  }
  
  // redirect the user to an error page with some instructions
  redirect('/auth/auth-code-error')
}