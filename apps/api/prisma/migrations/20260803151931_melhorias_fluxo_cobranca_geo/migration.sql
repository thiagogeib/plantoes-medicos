-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'PENDING_CONFIRMATION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'APPLICATION_PENDING_CONFIRMATION';
ALTER TYPE "NotificationType" ADD VALUE 'APPLICATION_CONFIRMED';

-- AlterTable
ALTER TABLE "HospitalProfile" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ProfessionalProfile" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "zipCode" TEXT;

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "requiredCouncilType" "CouncilType" NOT NULL DEFAULT 'CRM';

-- CreateTable
CREATE TABLE "Charge" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'mercadopago',
    "providerPreferenceId" TEXT,
    "providerPaymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Charge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Charge_applicationId_key" ON "Charge"("applicationId");

-- CreateIndex
CREATE INDEX "Charge_professionalId_idx" ON "Charge"("professionalId");

-- CreateIndex
CREATE INDEX "Charge_status_idx" ON "Charge"("status");

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
