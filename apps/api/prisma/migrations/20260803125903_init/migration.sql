-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('HOSPITAL', 'PROFESSIONAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'FILLED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CouncilType" AS ENUM ('CRM', 'COREN');

-- CreateEnum
CREATE TYPE "CompensationType" AS ENUM ('MONEY', 'HOUR_BANK', 'OTHER');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('INVITED', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "StaffType" AS ENUM ('FIXO', 'AVULSO');

-- CreateEnum
CREATE TYPE "SwapRequestStatus" AS ENUM ('OPEN', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SwapInterestStatus" AS ENUM ('PENDING', 'SELECTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED_PENDING_COVERAGE', 'CANCELLATION_REQUESTED', 'COVERED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AbsenceType" AS ENUM ('ATESTADO', 'LICENCA', 'OUTRO');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPLICATION_ACCEPTED', 'APPLICATION_REJECTED', 'NEW_APPLICATION', 'SWAP_INTEREST', 'SWAP_APPROVED', 'SWAP_REJECTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_COVER_INTEREST', 'LEAVE_COVERED', 'LEAVE_CANCELLATION_REQUESTED', 'LEAVE_CANCELLATION_DECIDED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT,
    "neighborhood" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "defaultRejectionMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "councilType" "CouncilType" NOT NULL,
    "councilNumber" TEXT NOT NULL,
    "councilState" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Specialty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Specialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalSpecialty" (
    "professionalId" TEXT NOT NULL,
    "specialtyId" TEXT NOT NULL,

    CONSTRAINT "ProfessionalSpecialty_pkey" PRIMARY KEY ("professionalId","specialtyId")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "specialtyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "slots" INTEGER NOT NULL DEFAULT 1,
    "filledSlots" INTEGER NOT NULL DEFAULT 0,
    "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
    "compensationType" "CompensationType" NOT NULL DEFAULT 'MONEY',
    "compensationNote" TEXT,
    "coverageForAbsenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalStaff" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "status" "StaffStatus" NOT NULL DEFAULT 'INVITED',
    "type" "StaffType" NOT NULL DEFAULT 'FIXO',
    "hourBankMinutes" INTEGER NOT NULL DEFAULT 0,
    "availableDaysOff" INTEGER NOT NULL DEFAULT 0,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftSwapRequest" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "requestingProfessionalId" TEXT NOT NULL,
    "status" "SwapRequestStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT,
    "selectedInterestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftSwapRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftSwapInterest" (
    "id" TEXT NOT NULL,
    "swapRequestId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "status" "SwapInterestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftSwapInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "selectedCoverInterestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveCoverInterest" (
    "id" TEXT NOT NULL,
    "leaveRequestId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "status" "SwapInterestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveCoverInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Absence" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "type" "AbsenceType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Absence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalProfile_userId_key" ON "HospitalProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalProfile_cnpj_key" ON "HospitalProfile"("cnpj");

-- CreateIndex
CREATE INDEX "HospitalProfile_cnpj_idx" ON "HospitalProfile"("cnpj");

-- CreateIndex
CREATE INDEX "HospitalProfile_city_idx" ON "HospitalProfile"("city");

-- CreateIndex
CREATE INDEX "HospitalProfile_state_idx" ON "HospitalProfile"("state");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_userId_key" ON "ProfessionalProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_cpf_key" ON "ProfessionalProfile"("cpf");

-- CreateIndex
CREATE INDEX "ProfessionalProfile_cpf_idx" ON "ProfessionalProfile"("cpf");

-- CreateIndex
CREATE INDEX "ProfessionalProfile_councilNumber_idx" ON "ProfessionalProfile"("councilNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_name_key" ON "Specialty"("name");

-- CreateIndex
CREATE INDEX "Shift_hospitalId_idx" ON "Shift"("hospitalId");

-- CreateIndex
CREATE INDEX "Shift_specialtyId_idx" ON "Shift"("specialtyId");

-- CreateIndex
CREATE INDEX "Shift_date_idx" ON "Shift"("date");

-- CreateIndex
CREATE INDEX "Shift_status_idx" ON "Shift"("status");

-- CreateIndex
CREATE INDEX "Shift_status_date_idx" ON "Shift"("status", "date");

-- CreateIndex
CREATE INDEX "Shift_coverageForAbsenceId_idx" ON "Shift"("coverageForAbsenceId");

-- CreateIndex
CREATE INDEX "Application_shiftId_idx" ON "Application"("shiftId");

-- CreateIndex
CREATE INDEX "Application_professionalId_idx" ON "Application"("professionalId");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Application_shiftId_professionalId_key" ON "Application"("shiftId", "professionalId");

-- CreateIndex
CREATE INDEX "HospitalStaff_hospitalId_idx" ON "HospitalStaff"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalStaff_professionalId_idx" ON "HospitalStaff"("professionalId");

-- CreateIndex
CREATE INDEX "HospitalStaff_status_idx" ON "HospitalStaff"("status");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalStaff_hospitalId_professionalId_key" ON "HospitalStaff"("hospitalId", "professionalId");

-- CreateIndex
CREATE INDEX "ShiftSwapRequest_shiftId_idx" ON "ShiftSwapRequest"("shiftId");

-- CreateIndex
CREATE INDEX "ShiftSwapRequest_requestingProfessionalId_idx" ON "ShiftSwapRequest"("requestingProfessionalId");

-- CreateIndex
CREATE INDEX "ShiftSwapRequest_status_idx" ON "ShiftSwapRequest"("status");

-- CreateIndex
CREATE INDEX "ShiftSwapInterest_swapRequestId_idx" ON "ShiftSwapInterest"("swapRequestId");

-- CreateIndex
CREATE INDEX "ShiftSwapInterest_professionalId_idx" ON "ShiftSwapInterest"("professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftSwapInterest_swapRequestId_professionalId_key" ON "ShiftSwapInterest"("swapRequestId", "professionalId");

-- CreateIndex
CREATE INDEX "LeaveRequest_shiftId_idx" ON "LeaveRequest"("shiftId");

-- CreateIndex
CREATE INDEX "LeaveRequest_professionalId_idx" ON "LeaveRequest"("professionalId");

-- CreateIndex
CREATE INDEX "LeaveRequest_status_idx" ON "LeaveRequest"("status");

-- CreateIndex
CREATE INDEX "LeaveCoverInterest_leaveRequestId_idx" ON "LeaveCoverInterest"("leaveRequestId");

-- CreateIndex
CREATE INDEX "LeaveCoverInterest_professionalId_idx" ON "LeaveCoverInterest"("professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveCoverInterest_leaveRequestId_professionalId_key" ON "LeaveCoverInterest"("leaveRequestId", "professionalId");

-- CreateIndex
CREATE INDEX "Absence_hospitalId_idx" ON "Absence"("hospitalId");

-- CreateIndex
CREATE INDEX "Absence_professionalId_idx" ON "Absence"("professionalId");

-- CreateIndex
CREATE INDEX "Absence_startDate_idx" ON "Absence"("startDate");

-- CreateIndex
CREATE INDEX "Absence_endDate_idx" ON "Absence"("endDate");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalProfile" ADD CONSTRAINT "HospitalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalSpecialty" ADD CONSTRAINT "ProfessionalSpecialty_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalSpecialty" ADD CONSTRAINT "ProfessionalSpecialty_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "HospitalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_coverageForAbsenceId_fkey" FOREIGN KEY ("coverageForAbsenceId") REFERENCES "Absence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalStaff" ADD CONSTRAINT "HospitalStaff_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "HospitalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalStaff" ADD CONSTRAINT "HospitalStaff_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_requestingProfessionalId_fkey" FOREIGN KEY ("requestingProfessionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwapInterest" ADD CONSTRAINT "ShiftSwapInterest_swapRequestId_fkey" FOREIGN KEY ("swapRequestId") REFERENCES "ShiftSwapRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwapInterest" ADD CONSTRAINT "ShiftSwapInterest_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveCoverInterest" ADD CONSTRAINT "LeaveCoverInterest_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveCoverInterest" ADD CONSTRAINT "LeaveCoverInterest_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "HospitalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
