/*
  Warnings:

  - Added the required column `neighborhood` to the `ProfessionalProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `number` to the `ProfessionalProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `street` to the `ProfessionalProfile` table without a default value. This is not possible if the table is not empty.
  - Made the column `city` on table `ProfessionalProfile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `state` on table `ProfessionalProfile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `zipCode` on table `ProfessionalProfile` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable (colunas novas nullable por enquanto, pra poder popular linhas existentes)
ALTER TABLE "ProfessionalProfile" ADD COLUMN     "complement" TEXT,
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "number" TEXT,
ADD COLUMN     "street" TEXT;

-- Backfill: perfis criados antes do endereço completo existir ganham um placeholder claro,
-- que o próprio usuário corrige na tela de Meu Perfil (city/state/zipCode já eram reais).
UPDATE "ProfessionalProfile"
SET "street" = 'A definir', "number" = 'S/N', "neighborhood" = 'A definir'
WHERE "street" IS NULL;

UPDATE "ProfessionalProfile"
SET "city" = 'A definir'
WHERE "city" IS NULL;

UPDATE "ProfessionalProfile"
SET "state" = '--'
WHERE "state" IS NULL;

UPDATE "ProfessionalProfile"
SET "zipCode" = '00000000'
WHERE "zipCode" IS NULL;

-- Agora sim torna tudo obrigatório
ALTER TABLE "ProfessionalProfile"
ALTER COLUMN "neighborhood" SET NOT NULL,
ALTER COLUMN "number" SET NOT NULL,
ALTER COLUMN "street" SET NOT NULL,
ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "state" SET NOT NULL,
ALTER COLUMN "zipCode" SET NOT NULL;
