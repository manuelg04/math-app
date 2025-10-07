-- CreateTable
CREATE TABLE "public"."exams" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."questions" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "code" TEXT,
    "prompt_md" TEXT NOT NULL,
    "competency" TEXT,
    "evidence" TEXT,
    "content_area" TEXT,
    "context" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."options" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exams_slug_key" ON "public"."exams"("slug");

-- CreateIndex
CREATE INDEX "exams_slug_idx" ON "public"."exams"("slug");

-- CreateIndex
CREATE INDEX "questions_exam_id_idx" ON "public"."questions"("exam_id");

-- CreateIndex
CREATE UNIQUE INDEX "questions_exam_id_order_index_key" ON "public"."questions"("exam_id", "order_index");

-- CreateIndex
CREATE INDEX "options_question_id_idx" ON "public"."options"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "options_question_id_label_key" ON "public"."options"("question_id", "label");

-- AddForeignKey
ALTER TABLE "public"."questions" ADD CONSTRAINT "questions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."options" ADD CONSTRAINT "options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
