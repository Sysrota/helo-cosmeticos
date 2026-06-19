ALTER TABLE "store_config"
  ADD COLUMN "manager_phone_1"            TEXT,
  ADD COLUMN "manager_phone_2"            TEXT,
  ADD COLUMN "manager_1_window_opened_at" TIMESTAMP(3),
  ADD COLUMN "manager_2_window_opened_at" TIMESTAMP(3),
  ADD COLUMN "manager_1_last_ping_at"     TIMESTAMP(3),
  ADD COLUMN "manager_2_last_ping_at"     TIMESTAMP(3);

CREATE TABLE "manager_notifications" (
    "id"         SERIAL PRIMARY KEY,
    "phone"      TEXT NOT NULL,
    "content"    TEXT NOT NULL,
    "sent_at"    TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
