
import { z } from "zod";

export const audioNameSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters").max(50, "Name must be at most 50 characters"),
});

export type AudioNameFormValues = z.infer<typeof audioNameSchema>;
