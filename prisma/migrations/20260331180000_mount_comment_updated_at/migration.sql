-- Track last edit time for mount comments (editable by author).
ALTER TABLE "MountComment" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "MountComment" SET "updatedAt" = "createdAt";
