import { serve } from "inngest/next";
import { inngest, roleJob, trialReminders, trialEndReview } from "@/lib/jobs";
import { trialEmailJob } from "@/lib/trial-email-job";
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [roleJob, trialReminders, trialEndReview, trialEmailJob],
});
