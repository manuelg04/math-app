-- CreateEnum
CREATE TYPE "public"."AttemptKind" AS ENUM ('GENERIC', 'ENTRY', 'TRAINING', 'EXIT');

-- CreateEnum
CREATE TYPE "public"."Level" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "public"."exam_attempts" ADD COLUMN     "kind" "public"."AttemptKind" NOT NULL DEFAULT 'GENERIC',
ADD COLUMN     "training_plan_id" TEXT;

-- CreateTable
CREATE TABLE "public"."training_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "min_required_to_unlock_exit" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."plan_questions" (
    "id" TEXT NOT NULL,
    "training_plan_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "order_index" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."entry_category_definitions" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order_start" INTEGER NOT NULL,
    "order_end" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entry_category_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."entry_category_thresholds" (
    "id" TEXT NOT NULL,
    "category_definition_id" TEXT NOT NULL,
    "level" "public"."Level" NOT NULL,
    "min_points_inclusive" INTEGER NOT NULL,
    "max_points_inclusive" INTEGER NOT NULL,

    CONSTRAINT "entry_category_thresholds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."entry_category_scores" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "category_definition_id" TEXT NOT NULL,
    "raw_points" INTEGER NOT NULL,
    "level" "public"."Level" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entry_category_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."placement_rules" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "interp_level" "public"."Level" NOT NULL,
    "form_level" "public"."Level" NOT NULL,
    "argu_level" "public"."Level" NOT NULL,
    "training_plan_id" TEXT NOT NULL,

    CONSTRAINT "placement_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."placements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entry_attempt_id" TEXT NOT NULL,
    "training_plan_id" TEXT NOT NULL,
    "interp_level" "public"."Level" NOT NULL,
    "form_level" "public"."Level" NOT NULL,
    "argu_level" "public"."Level" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "placements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "training_plans_code_key" ON "public"."training_plans"("code");

-- CreateIndex
CREATE INDEX "training_plans_is_active_idx" ON "public"."training_plans"("is_active");

-- CreateIndex
CREATE INDEX "plan_questions_training_plan_id_idx" ON "public"."plan_questions"("training_plan_id");

-- CreateIndex
CREATE INDEX "plan_questions_question_id_idx" ON "public"."plan_questions"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_questions_training_plan_id_question_id_key" ON "public"."plan_questions"("training_plan_id", "question_id");

-- CreateIndex
CREATE INDEX "entry_category_definitions_exam_id_idx" ON "public"."entry_category_definitions"("exam_id");

-- CreateIndex
CREATE UNIQUE INDEX "entry_category_definitions_exam_id_key_key" ON "public"."entry_category_definitions"("exam_id", "key");

-- CreateIndex
CREATE INDEX "entry_category_thresholds_category_definition_id_idx" ON "public"."entry_category_thresholds"("category_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "entry_category_thresholds_category_definition_id_level_key" ON "public"."entry_category_thresholds"("category_definition_id", "level");

-- CreateIndex
CREATE INDEX "entry_category_scores_attempt_id_idx" ON "public"."entry_category_scores"("attempt_id");

-- CreateIndex
CREATE INDEX "entry_category_scores_category_definition_id_idx" ON "public"."entry_category_scores"("category_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "entry_category_scores_attempt_id_category_definition_id_key" ON "public"."entry_category_scores"("attempt_id", "category_definition_id");

-- CreateIndex
CREATE INDEX "placement_rules_exam_id_idx" ON "public"."placement_rules"("exam_id");

-- CreateIndex
CREATE INDEX "placement_rules_training_plan_id_idx" ON "public"."placement_rules"("training_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "placement_rules_exam_id_interp_level_form_level_argu_level_key" ON "public"."placement_rules"("exam_id", "interp_level", "form_level", "argu_level");

-- CreateIndex
CREATE INDEX "placements_user_id_idx" ON "public"."placements"("user_id");

-- CreateIndex
CREATE INDEX "placements_training_plan_id_idx" ON "public"."placements"("training_plan_id");

-- CreateIndex
CREATE INDEX "placements_entry_attempt_id_idx" ON "public"."placements"("entry_attempt_id");

-- CreateIndex
CREATE INDEX "exam_attempts_kind_idx" ON "public"."exam_attempts"("kind");

-- CreateIndex
CREATE INDEX "exam_attempts_training_plan_id_idx" ON "public"."exam_attempts"("training_plan_id");

-- AddForeignKey
ALTER TABLE "public"."exam_attempts" ADD CONSTRAINT "exam_attempts_training_plan_id_fkey" FOREIGN KEY ("training_plan_id") REFERENCES "public"."training_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."plan_questions" ADD CONSTRAINT "plan_questions_training_plan_id_fkey" FOREIGN KEY ("training_plan_id") REFERENCES "public"."training_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."plan_questions" ADD CONSTRAINT "plan_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entry_category_definitions" ADD CONSTRAINT "entry_category_definitions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entry_category_thresholds" ADD CONSTRAINT "entry_category_thresholds_category_definition_id_fkey" FOREIGN KEY ("category_definition_id") REFERENCES "public"."entry_category_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entry_category_scores" ADD CONSTRAINT "entry_category_scores_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entry_category_scores" ADD CONSTRAINT "entry_category_scores_category_definition_id_fkey" FOREIGN KEY ("category_definition_id") REFERENCES "public"."entry_category_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."placement_rules" ADD CONSTRAINT "placement_rules_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."placement_rules" ADD CONSTRAINT "placement_rules_training_plan_id_fkey" FOREIGN KEY ("training_plan_id") REFERENCES "public"."training_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."placements" ADD CONSTRAINT "placements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."placements" ADD CONSTRAINT "placements_entry_attempt_id_fkey" FOREIGN KEY ("entry_attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."placements" ADD CONSTRAINT "placements_training_plan_id_fkey" FOREIGN KEY ("training_plan_id") REFERENCES "public"."training_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
