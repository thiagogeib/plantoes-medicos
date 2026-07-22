import { Router } from "express"
import { ShiftSwapController } from "./shift-swap.controller"
import { authenticate } from "../../shared/middleware/authenticate"
import { authorize } from "../../shared/middleware/authorize"

export const shiftSwapRouter = Router()

shiftSwapRouter.post("/", authenticate, authorize("PROFESSIONAL"), ShiftSwapController.create)
shiftSwapRouter.get("/available", authenticate, authorize("PROFESSIONAL"), ShiftSwapController.listAvailable)
shiftSwapRouter.get("/mine", authenticate, authorize("PROFESSIONAL"), ShiftSwapController.listMine)
shiftSwapRouter.post("/:id/interest", authenticate, authorize("PROFESSIONAL"), ShiftSwapController.expressInterest)
shiftSwapRouter.patch("/:id/cancel", authenticate, authorize("PROFESSIONAL"), ShiftSwapController.cancel)

shiftSwapRouter.get("/hospital", authenticate, authorize("HOSPITAL"), ShiftSwapController.listForHospital)
shiftSwapRouter.patch("/:id/approve", authenticate, authorize("HOSPITAL"), ShiftSwapController.approve)
shiftSwapRouter.patch("/:id/reject", authenticate, authorize("HOSPITAL"), ShiftSwapController.reject)
