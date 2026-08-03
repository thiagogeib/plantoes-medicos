-- AlterEnum
-- This migration adds more than one value to an enum.
--
ALTER TYPE "NotificationType" ADD VALUE 'LEAVE_REQUEST_OPENED';
ALTER TYPE "NotificationType" ADD VALUE 'LEAVE_REQUEST_EXPIRED';

-- AlterTable
ALTER TABLE "HospitalProfile" ADD COLUMN     "leaveCoverageDeadlineDays" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "longLeaveThresholdMinutes" INTEGER NOT NULL DEFAULT 720;

-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "durationMinutes" INTEGER NOT NULL DEFAULT 0;

-- DropIndex
DROP INDEX "LeaveRequest_shiftId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "LeaveRequest_shiftId_key" ON "LeaveRequest"("shiftId");
