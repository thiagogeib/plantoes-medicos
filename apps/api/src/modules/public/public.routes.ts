import { Router } from "express"
import { PublicController } from "./public.controller"

export const publicRouter = Router()

publicRouter.get("/shifts", PublicController.listShifts)
publicRouter.get("/stats", PublicController.stats)
publicRouter.get("/shifts/:id", PublicController.getShift)
