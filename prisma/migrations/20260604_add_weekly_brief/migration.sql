CREATE TABLE IF NOT EXISTS "WeeklyBrief" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "weekStart" DATE NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WeeklyBrief_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WeeklyBrief_userId_weekStart_key" UNIQUE ("userId", "weekStart"),
  CONSTRAINT "WeeklyBrief_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
