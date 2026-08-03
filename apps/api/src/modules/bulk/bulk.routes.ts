import { Router } from "express"
import multer from "multer"
import { BulkController } from "./bulk.controller"
import { authenticate } from "../../shared/middleware/authenticate"
import { authorize } from "../../shared/middleware/authorize"

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
})

export const bulkRouter = Router()

bulkRouter.get(
  "/shifts/template",
  authenticate,
  authorize("HOSPITAL"),
  BulkController.shiftTemplate
)

bulkRouter.post(
  "/shifts",
  authenticate,
  authorize("HOSPITAL"),
  upload.single("file"),
  BulkController.importShifts
)

bulkRouter.get(
  "/staff-hours",
  authenticate,
  authorize("HOSPITAL"),
  BulkController.exportStaffHours
)

bulkRouter.post(
  "/staff-hours",
  authenticate,
  authorize("HOSPITAL"),
  upload.single("file"),
  BulkController.importStaffHours
)
