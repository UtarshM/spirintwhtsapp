import { z } from "zod";
import { callOutcomes } from "./voice-options";
export const callAnalysisSchema = z
  .object({
    summary: z.string().trim().min(1).max(1200),
    outcome: z.enum(callOutcomes),
    answers: z
      .array(
        z
          .object({
            question: z.string().trim().min(1).max(240),
            answer: z.string().trim().max(600).nullable(),
          })
          .strict(),
      )
      .max(10),
  })
  .strict();
export type CallAnalysis = z.infer<typeof callAnalysisSchema>;
