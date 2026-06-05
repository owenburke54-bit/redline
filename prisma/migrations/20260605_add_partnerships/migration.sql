CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'ACTIVE', 'DECLINED');

CREATE TABLE "Partnership" (
  "id"          TEXT          NOT NULL,
  "requesterId" TEXT          NOT NULL,
  "partnerId"   TEXT,
  "inviteEmail" TEXT          NOT NULL,
  "status"      "PartnerStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Partnership_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Partnership"
  ADD CONSTRAINT "Partnership_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Partnership"
  ADD CONSTRAINT "Partnership_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
