ALTER TABLE "users"
  ADD COLUMN "google_subject" TEXT,
  ADD COLUMN "google_email" TEXT;

CREATE UNIQUE INDEX "users_google_subject_key"
  ON "users" ("google_subject")
  WHERE "google_subject" IS NOT NULL;

CREATE INDEX "users_google_email_idx"
  ON "users" ("google_email");
