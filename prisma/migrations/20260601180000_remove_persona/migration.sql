-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_personaId_fkey";
ALTER TABLE "Salary" DROP CONSTRAINT IF EXISTS "Salary_personaId_fkey";
ALTER TABLE "LivingCost" DROP CONSTRAINT IF EXISTS "LivingCost_personaId_fkey";
ALTER TABLE "Debt" DROP CONSTRAINT IF EXISTS "Debt_personaId_fkey";
ALTER TABLE "CreditCard" DROP CONSTRAINT IF EXISTS "CreditCard_personaId_fkey";
ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_personaId_fkey";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN IF EXISTS "personaId";
ALTER TABLE "Salary" DROP COLUMN IF EXISTS "personaId";
ALTER TABLE "LivingCost" DROP COLUMN IF EXISTS "personaId";
ALTER TABLE "Debt" DROP COLUMN IF EXISTS "personaId";
ALTER TABLE "CreditCard" DROP COLUMN IF EXISTS "personaId";
ALTER TABLE "Transaction" DROP COLUMN IF EXISTS "personaId";

-- DropTable
DROP TABLE IF EXISTS "Persona";
