import { z } from "zod";

export const ratingInputSchema = z.object({
  gameId: z.string().min(1),
  micro: z.number().int().min(0).max(100),
  meso: z.number().int().min(0).max(100),
  macro: z.number().int().min(0).max(100),
});

export type RatingInput = z.infer<typeof ratingInputSchema>;
