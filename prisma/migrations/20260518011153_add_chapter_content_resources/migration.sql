-- AlterTable
ALTER TABLE "Chapter" ADD COLUMN "content" TEXT;
ALTER TABLE "Chapter" ADD COLUMN "videoUrl" TEXT;

-- CreateTable
CREATE TABLE "ChapterResource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chapterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileType" TEXT NOT NULL DEFAULT 'file',
    "url" TEXT NOT NULL,
    "fileSize" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChapterResource_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
