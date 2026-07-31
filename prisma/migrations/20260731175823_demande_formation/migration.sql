-- CreateTable
CREATE TABLE "DemandeFormation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "organisation" TEXT,
    "secteur" TEXT NOT NULL DEFAULT 'autre',
    "besoin" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'nouvelle',
    "consentement" DATETIME NOT NULL,
    "noteInterne" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traiteeAt" DATETIME
);

-- CreateIndex
CREATE INDEX "DemandeFormation_statut_createdAt_idx" ON "DemandeFormation"("statut", "createdAt");
