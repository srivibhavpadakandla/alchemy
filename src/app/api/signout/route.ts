import { serverClient } from "@/lib/supabase/server";
import { checkOrigin, apiError } from "@/lib/repository";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { error } = await (await serverClient()).auth.signOut();
    if (error) throw error;
    return Response.json({ signedOut: true });
  } catch (e) {
    return apiError(e);
  }
}
