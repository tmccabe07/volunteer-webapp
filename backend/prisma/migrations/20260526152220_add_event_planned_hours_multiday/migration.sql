-- AlterTable
ALTER TABLE "DenEvent" ADD COLUMN "eventEndDate" DATETIME;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "eventEndDate" DATETIME;
ALTER TABLE "Event" ADD COLUMN "plannedHourActivities" JSONB;
