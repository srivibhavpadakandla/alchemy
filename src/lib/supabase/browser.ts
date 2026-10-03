import { createBrowserClient } from "@supabase/ssr";
export function browserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw Error(
      "Supabase is not configured. Demo town is available; real sign-in requires a connected Supabase project.",
    );
  return createBrowserClient(url, key);
}
