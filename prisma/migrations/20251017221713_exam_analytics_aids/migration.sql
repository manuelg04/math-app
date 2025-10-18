-- DropForeignKey
ALTER TABLE "public"."exam_responses" DROP CONSTRAINT "exam_responses_selected_option_id_fkey";

-- AlterTable
ALTER TABLE "public"."exam_responses" ADD COLUMN     "time_spent_ms" INTEGER,
ADD COLUMN     "used_aid_1" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "used_aid_2" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."options" ADD COLUMN     "image_url" TEXT,
ALTER COLUMN "text" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."questions" ADD COLUMN     "help1_md" TEXT,
ADD COLUMN     "help2_md" TEXT;

-- CreateIndex
CREATE INDEX "exam_responses_selected_option_id_idx" ON "public"."exam_responses"("selected_option_id");

-- AddForeignKey
ALTER TABLE "public"."exam_responses" ADD CONSTRAINT "exam_responses_selected_option_id_fkey" FOREIGN KEY ("selected_option_id") REFERENCES "public"."options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
