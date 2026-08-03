import "dotenv/config"
import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
import { authRouter } from "./modules/auth/auth.routes"
import { specialtyRouter } from "./modules/specialties/specialty.routes"
import { shiftRouter } from "./modules/shifts/shift.routes"
import { hospitalRouter } from "./modules/shifts/hospital.routes"
import { applicationRouter } from "./modules/applications/application.routes"
import { adminRouter } from "./modules/admin/admin.routes"
import { publicRouter } from "./modules/public/public.routes"
import { hospitalStaffRouter } from "./modules/hospital-staff/hospital-staff.routes"
import { shiftSwapRouter } from "./modules/shift-swap/shift-swap.routes"
import { leaveRequestRouter } from "./modules/leave-requests/leave-request.routes"
import { absenceRouter } from "./modules/absences/absence.routes"
import { scheduleStatusRouter } from "./modules/schedule-status/schedule-status.routes"
import { hospitalProfileRouter, professionalProfileRouter } from "./modules/profile/profile.routes"
import { notificationRouter } from "./modules/notifications/notification.routes"
import { webhookRouter } from "./modules/webhooks/webhook.routes"
import { bulkRouter } from "./modules/bulk/bulk.routes"
import { errorHandler } from "./shared/errors/errorHandler"
import { healthHandler } from "./health"

const app = express()

const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error("Not allowed by CORS"))
      }
    },
    credentials: true,
  })
)
app.use(express.json())
app.use(cookieParser())

app.get("/health", healthHandler)

app.use("/api/v1/auth", authRouter)
app.use("/api/v1/specialties", specialtyRouter)
app.use("/api/v1/shifts", shiftRouter)
app.use("/api/v1/hospitals", hospitalRouter)
app.use("/api/v1/hospitals", hospitalProfileRouter)
app.use("/api/v1/professionals", professionalProfileRouter)
app.use("/api/v1/applications", applicationRouter)
app.use("/api/v1/admin", adminRouter)
app.use("/api/v1/public", publicRouter)
app.use("/api/v1/staff", hospitalStaffRouter)
app.use("/api/v1/shift-swaps", shiftSwapRouter)
app.use("/api/v1/leave-requests", leaveRequestRouter)
app.use("/api/v1/absences", absenceRouter)
app.use("/api/v1/schedule-status", scheduleStatusRouter)
app.use("/api/v1/notifications", notificationRouter)
app.use("/api/v1/webhooks", webhookRouter)
app.use("/api/v1/bulk", bulkRouter)

app.use(errorHandler)

export { app }
