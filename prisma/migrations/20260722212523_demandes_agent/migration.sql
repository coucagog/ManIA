-- CreateTable
CREATE TABLE "DemandeAgent" (
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
    "tenantSlug" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traiteeAt" DATETIME
);

-- CreateIndex
CREATE INDEX "DemandeAgent_statut_createdAt_idx" ON "DemandeAgent"("statut", "createdAt");
