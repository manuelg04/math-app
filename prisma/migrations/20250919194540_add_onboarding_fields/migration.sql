-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "academic_program" TEXT,
ADD COLUMN     "full_name" TEXT,
ADD COLUMN     "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profile_photo" TEXT;
