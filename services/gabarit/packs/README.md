# Déclarations de packs

Ces fichiers vivent sur le VPS dans **`/opt/hermes/gabarit/packs/`**. Ils sont lus par
`nouveau-tenant.sh` au tout début du provisionnement, **avant qu'aucun fichier ne soit
créé**.

```
sudo mkdir -p /opt/hermes/gabarit/packs
sudo cp services/gabarit/packs/*.conf /opt/hermes/gabarit/packs/
```

## Format

Une seule clé est lue. Le fichier n'est **jamais** `source`é : il est filtré par `grep`,
donc il ne peut pas exécuter de code, quoi qu'on y écrive.

```
# Pack <nom>
PII=1        # ou PII=0
```

## Ce que `PII=1` déclenche

Quatre gestes, **indissociables** — c'est le point important :

| Geste | Sans lui |
|---|---|
| Réseau du locataire en `internal: true` | Le câblage se contourne en **choisissant un modèle** (fuite reproduite en production, STACK-4 §55) |
| `mania-pii`, `mania-transcription`, `mania-documents` raccordés à ce réseau | L'agent est muet : aucun nom d'hôte ne lui est résolvable |
| Profil `custom:mania-pii` écrit dans `config.yaml` | L'agent est muet : il n'a plus de route sortante |
| Section `# Pseudonymisation` dans le `SOUL` | L'agent **refuse de rédiger** devant un marqueur (la garde anti-hallucination du `SOUL` MANIA s'applique — les modèles obéissent) |

Aucun des quatre n'est un réglage : ils forment le dispositif ou ils ne le forment pas.

## Trois règles, toutes deny-by-default

1. `--pack=<nom>` avec **`<nom>.conf` absent** → **erreur**, provisionnement refusé.
   Une faute de frappe dans `--pack` ne doit jamais accoucher d'un locataire ouvert.
2. Fichier présent **sans ligne `PII=0` ou `PII=1`** → **erreur**. On ne devine pas ;
   une clé mal orthographiée (`PPI=1`) est ainsi attrapée au lieu d'être ignorée.
3. `--pack=generique` **sans fichier** → `PII=0`, silencieusement. C'est le comportement
   historique, conservé pour ne pas casser les provisionnements existants.

## Ajouter un pack

Déposer un `.conf`. Rien d'autre : le nom du pack n'apparaît nulle part dans
`nouveau-tenant.sh`. C'est délibéré — tenir la liste des packs sensibles dans le script
en ferait une liste de plus, et le STACK-4 §54 a établi que dans ce service les défauts
viennent des listes.

Le nom est aussi transmis tel quel à `mania-app` (`POST /api/tenants`, champ `pack`).
