import { createClient } from "@supabase/supabase-js"
import { Database } from "@/app/types/db_types"

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured")
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/** メール未確認のユーザーのみ削除（確認失敗時の後始末用） */
export async function deleteUnconfirmedUserByEmail(
  email: string
): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    let page = 1

    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: 1000,
      })
      if (error || !data.users.length) return false

      const user = data.users.find(
        (u) => u.email === email && !u.email_confirmed_at
      )
      if (user) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(
          user.id
        )
        return !deleteError
      }

      if (data.users.length < 1000) return false
      page++
    }
  } catch {
    return false
  }
}
