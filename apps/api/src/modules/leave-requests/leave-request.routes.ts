import { Router } from "express"
import { LeaveRequestController } from "./leave-request.controller"
import { authenticate } from "../../shared/middleware/authenticate"
import { authorize } from "../../shared/middleware/authorize"

export const leaveRequestRouter = Router()

leaveRequestRouter.post("/", authenticate, authorize("PROFESSIONAL"), LeaveRequestController.create)
leaveRequestRouter.get("/mine", authenticate, authorize("PROFESSIONAL"), LeaveRequestController.listMine)
leaveRequestRouter.get("/available", authenticate, authorize("PROFESSIONAL"), LeaveRequestController.listAvailable)
leaveRequestRouter.patch("/:id/cancel", authenticate, authorize("PROFESSIONAL"), LeaveRequestController.cancel)
leaveRequestRouter.patch("/:id/request-cancellation", authenticate, authorize("PROFESSIONAL"), LeaveRequestController.requestCancellation)
leaveRequestRouter.post("/:id/interest", authenticate, authorize("PROFESSIONAL"), LeaveRequestController.expressInterest)

leaveRequestRouter.get("/hospital", authenticate, authorize("HOSPITAL"), LeaveRequestController.listForHospital)
leaveRequestRouter.patch("/:id/approve", authenticate, authorize("HOSPITAL"), LeaveRequestController.approve)
leaveRequestRouter.patch("/:id/reject", authenticate, authorize("HOSPITAL"), LeaveRequestController.reject)
leaveRequestRouter.patch("/:id/select-cover", authenticate, authorize("HOSPITAL"), LeaveRequestController.selectCover)
leaveRequestRouter.patch("/:id/approve-cancellation", authenticate, authorize("HOSPITAL"), LeaveRequestController.approveCancellation)
leaveRequestRouter.patch("/:id/reject-cancellation", authenticate, authorize("HOSPITAL"), LeaveRequestController.rejectCancellation)
