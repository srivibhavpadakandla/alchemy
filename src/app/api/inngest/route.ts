import { serve } from "inngest/next";
import { inngest, roleJob } from "@/lib/jobs";
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [roleJob],
});
