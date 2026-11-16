-- AlterTable
ALTER TABLE "Newsletter" ADD COLUMN     "excludedEventIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
