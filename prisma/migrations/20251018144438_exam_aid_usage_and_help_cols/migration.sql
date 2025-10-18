-- CreateEnum
CREATE TYPE "public"."AidKey" AS ENUM ('AID1', 'AID2', 'AI_ASSIST');

-- CreateTable
CREATE TABLE "public"."exam_aid_usages" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "aid_key" "public"."AidKey" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_aid_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_aid_usages_attempt_id_idx" ON "public"."exam_aid_usages"("attempt_id");

-- CreateIndex
CREATE INDEX "exam_aid_usages_question_id_idx" ON "public"."exam_aid_usages"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_aid_usages_attempt_id_question_id_aid_key_key" ON "public"."exam_aid_usages"("attempt_id", "question_id", "aid_key");

-- AddForeignKey
ALTER TABLE "public"."exam_aid_usages" ADD CONSTRAINT "exam_aid_usages_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exam_aid_usages" ADD CONSTRAINT "exam_aid_usages_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
