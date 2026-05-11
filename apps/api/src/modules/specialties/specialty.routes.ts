import { Router } from "express"
import { SpecialtyController } from "./specialty.controller"

export const specialtyRouter = Router()

specialtyRouter.get("/", SpecialtyController.list)
