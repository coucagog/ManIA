-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "chapo" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "categorie" TEXT NOT NULL DEFAULT 'bonnes-pratiques',
    "imageUrl" TEXT,
    "tempsLecture" INTEGER,
    "statut" TEXT NOT NULL DEFAULT 'brouillon',
    "publieAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_statut_publieAt_idx" ON "Article"("statut", "publieAt");
