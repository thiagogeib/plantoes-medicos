import { z } from "zod"

export const scheduleStatusQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
})

export type ScheduleStatusQuery = z.infer<typeof scheduleStatusQuerySchema>
