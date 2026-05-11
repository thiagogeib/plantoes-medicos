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
app.use("/api/v1/applications", applicationRouter)
app.use("/api/v1/admin", adminRouter)

app.use(errorHandler)

export { app }
