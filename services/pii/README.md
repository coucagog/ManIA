# mania-pii — proxy PII (service partagé)

Proxy OpenAI-compatible qui pseudonymise les identifiants **avant** l'appel LLM et
restaure les valeurs réelles **après**. Même patron que `transcription`/`documents`
(Traefik, token HMAC par tenant, éphémère). Phase 1 du plan §5/§24 ; la phase 2 est
le modèle local zéro-egress.

---

## 🔴 ÉTAT — NE CÂBLER AUCUN TENANT RÉEL

Trois voies de fuite sont **connues et volontairement encore ouvertes** (STACK-4 §50).
La séquence arrêtée est **3 bloquants → sonde → durcissement** : inutile de durcir une
architecture dont on n'a pas encore prouvé qu'elle s'insère.

| # | Fuite ouverte | Conséquence |
|---|---|---|
| 1 | Pas de liste blanche sur le passthrough | `/v1/embeddings`, `/v1/completions` partent **en clair** |
| 2 | `content` en blocs (`[{"type":"text",…}]`) non traité | Traverse **non masqué** |
| 3 | `tool_calls` ni masqués ni restaurés | Fuite à l'aller ; `[NOM_1]` en argument d'outil au retour |

⚠️ Le garde-fou `PII_FAIL_CLOSED` est aussi **plus faible que son nom** : une seule
entité détectée le désarme, et ses marqueurs sont cliniques français (couverture nulle
pour avocats/notaires/banques).

🔴 **Et une quatrième voie, hors proxy** : changer de modèle dans le sélecteur de la WebUI
**efface la base URL** côté Hermes (#25107). Le proxy est alors purement et simplement
**contourné**, sans aucun signal. Ce n'est pas un défaut du proxy — c'est pourquoi le
câblage par `environment:` ne peut pas être le dispositif final (voir § Sonde).

⇒ **Tenant `sonde` jetable uniquement.** Ni `skd` ni `ridwan`, et aucune donnée réelle.

---

## Ce qui est prouvé (hors-ligne) vs à valider en prod
- ✅ **Cœur déterministe** (`pii_engine.py`) : 30 tests (`python3 test_pii_engine.py`).
  Round-trip réversible, **suppression pure non restaurable** (CB/CNI), cohérence
  intra-requête, chevauchement CB↔tél, formats tél sénégalais, réécriture d'un corps
  `/v1/chat/completions`, garde-fou fail-closed.
  ⚠️ **Fichier inchangé** depuis le prototype (hash identique) : les 30 tests gardent
  exactement le sens qu'ils avaient.
- ⚠️ **HTTP + Presidio** (`main.py`, `presidio_adapter.py`) : **jamais exécutés**.
  Premier run sur le VPS. Reconnaisseurs sénégalais = TODO §24 (travail de terrain).

### Corrigé par rapport au prototype (STACK-4 §50)
1. **Auth** — le token du projet est `<slug>.<hmac_hex>` ; la v1 comparait le token
   *entier* au seul hmac ⇒ **401 systématique**, et la sonde aurait conclu à tort
   qu'Hermes n'honore pas `OPENAI_BASE_URL`. Découpage aligné sur
   `transcription/main.py`, + croisement du slug du token avec celui du chemin.
2. **Presidio instancié UNE fois** au démarrage (`lifespan`), plus par requête —
   la v1 rechargeait spaCy à chaque appel : latence de plusieurs secondes et **risque
   d'OOM** contre `mem_limit=1536m` sur un VPS **sans swap**. Corollaire : détections
   sérialisées dans un pool à **1 worker** (spaCy n'est pas concurrent-safe), doctrine
   « file bornée » de transcription.
3. **Traefik** — `certresolver=letsencrypt` (la v1 disait `le`, résolveur inexistant
   ⇒ aucun certificat) et `tls=true` ajouté.
4. Le corps d'erreur de l'amont est **remonté** au lieu d'être avalé (sans lui,
   diagnostiquer la sonde revient à deviner).

---

## Déploiement

Le code est versionné dans le dépôt (`/opt/mania/services/pii/`), **le secret vit
hors du checkout** (`/opt/hermes/pii/.env`) : `.env` étant gitignoré, un
`git clean -fdx` dans `/opt/mania` l'aurait supprimé.

```bash
# 1) secret PARTAGE, hors checkout (reutiliser celui des autres services)
sudo install -d -m 700 /opt/hermes/pii
sudo cp /opt/mania/services/pii/.env.example /opt/hermes/pii/.env
sudo chmod 600 /opt/hermes/pii/.env
sudo cat /opt/hermes/gabarit/.shared-services-secret   # coller dans SHARED_SERVICES_SECRET
sudo nano /opt/hermes/pii/.env

# 2) barriere de verification AVANT build — stdlib pure, ni docker ni reseau
cd /opt/mania/services/pii
sudo python3 -m py_compile pii_engine.py presidio_adapter.py sse.py main.py  # syntaxe
python3 test_pii_engine.py                                        # 30 tests du coeur
python3 test_sse.py                                               # tests de la re-emission SSE
#    ROUGE = ON NE BUILD PAS.

# 3) build (telecharge le modele spaCy AU BUILD -> heure creuse, quelques minutes)
sudo docker compose up -d --build

# 4) sante (DNS deja couvert par le wildcard *.mania.sn)
curl -s https://pii.mania.sn/health   # {"status":"ok","ner":"presidio"|"regex-only",...}
```

Garde-fou volontaire : sans `SHARED_SERVICES_SECRET`, le conteneur **refuse de
démarrer**. Un crash-loop = secret vide dans `/opt/hermes/pii/.env`.

**Rollback** : `sudo docker compose down` (aucune base, aucun état persistant).

---

## ✅ SONDE `OPENAI_BASE_URL` — VERTE, le verrou est levé
**Résultat (2026-08-06, tenant jetable `sonde`)** : avec `model.provider: custom` et
`OPENAI_BASE_URL` pointé sur le proxy, **la complétion atteint bien le proxy**. La preuve
est arrivée par notre propre message d'erreur — `HTTP 400 {"detail":"streaming non
supporte en v1 du proxy PII"}` remonté dans la WebUI. **§24 pt 1 est tranché** : Hermes
route les appels de complétion par la base URL. La phase 2 (modèle local) n'est plus un
préalable.

🔴 **Deux découvertes qui conditionnent la mise en service** :
1. **Changer de modèle dans le sélecteur de la WebUI efface la base URL** (note de version
   Hermes : *clear stale base_url on gateway model switches, #25107*). ⇒ un client qui
   change de modèle **désactive la pseudonymisation sans le savoir**, et son appel repart
   en direct chez le fournisseur. Le câblage par `environment:` **ne suffit donc pas** :
   il faut que la base URL soit portée par le **profil de fournisseur** lui-même, et une
   barrière réseau (egress) pour que le contournement échoue au lieu de fuir en silence.
2. **`streaming.enabled: false` dans `config.yaml` ne gouverne pas** le champ `stream`
   envoyé à l'API — la requête arrive avec `stream: true` malgré lui. ⇒ traité **côté
   proxy** (voir Garanties), et non par un réglage client rebasculable d'un clic.

### Mode opératoire (pour rejouer la sonde)
Objectif : vérifier **empiriquement** qu'Hermes honore un override de base URL
**sans toucher à l'image**. On se sert d'un tenant jetable.

1. Sur le proxy, activer le mode sonde puis redémarrer. Le drapeau vit dans
   `/opt/hermes/pii/.env` — **hors du dépôt**, pour ne pas salir le checkout :
   ```bash
   sudo sed -i 's/^PII_PROBE_MODE=.*/PII_PROBE_MODE=1/' /opt/hermes/pii/.env
   grep PII_PROBE_MODE /opt/hermes/pii/.env       # si la ligne manque, l'ajouter
   cd /opt/mania/services/pii && sudo docker compose up -d
   curl -s https://pii.mania.sn/health             # doit montrer "probe":true
   ```
2. Créer un tenant jetable `sonde` (`nouveau-tenant.sh …`). Son `.env` contient déjà
   un `SHARED_SERVICES_TOKEN` (§38) — c'est le `<token>` du chemin, au format
   `sonde.<hmac>` (le coller **en entier**, le point compris).
3. Dans son `config.yaml` : `model.provider: openai`. Dans l'`environment:` de son
   agent (compose) :
   ```
   - OPENAI_BASE_URL=https://pii.mania.sn/g/sonde/<SHARED_SERVICES_TOKEN>/v1
   ```
   (le client saisit sa clé OpenRouter via la WebUI comme d'habitude — elle passe
   intacte dans `Authorization`, §4quater). `docker compose up -d sonde-agent`.
   ⚠️ **`openrouter` → `openai` n'est pas « juste un label »** : en-têtes attendus par
   OpenRouter (`HTTP-Referer`/`X-Title`), nommage des modèles, formatage des appels
   d'outils peuvent changer. À observer, pas à supposer.
4. Envoyer **un** message à l'agent, puis :
   ```
   sudo docker logs mania-pii --since 10m | grep -E 'PROBE|/g/'
   ```
   Le middleware journalise **toute** requête arrivée (token caviardé), même celle qui
   échoue — c'est ce qui rend le diagnostic non ambigu :
   - **`PROBE ok tenant=sonde …`** → Hermes honore `OPENAI_BASE_URL`.
     **Verrou levé.** Repasser `PII_PROBE_MODE=0`, puis **durcir avant tout tenant réel**.
   - **`POST /g/sonde/<token>/v1/chat/completions -> 401`** → la requête arrive, donc Hermes
     honore bien la base URL ; c'est le **token** qui est mal recopié (il doit contenir le point).
   - **`… -> 404`** ou un autre chemin → Hermes a suivi la base mais n'appelle pas
     `chat/completions` : lire le chemin journalisé, il donne la forme réelle.
   - **Rien du tout** → *là seulement* on peut conclure que l'`openai` provider d'Hermes n'a pas
     suivi la base. Tester la variante (`OPENROUTER_BASE_URL`, ou base configurable en
     `config.yaml`). Si aucun levier → décision d'archi (phase 2 modèle local), à documenter
     dans STACK.
5. Dé-provisionner `sonde` (`desprovisionner-tenant.sh sonde`).
   ⚠️ Let's Encrypt limite à **5 certificats identiques par semaine** : ne pas
   créer/détruire `sonde` en boucle, son certificat serait refusé.

---

## Câblage d'un tenant sensible (une fois la sonde verte ET le durcissement fait)
Opt-in **par verticale**, jamais global : seuls les tenants sur un pack sensible passent
par le proxy. Deux lignes, aucune touche à l'image Hermes :
- `config.yaml` : `model.provider: openai`
- compose (agent) : `OPENAI_BASE_URL=https://pii.mania.sn/g/<slug>/<token>/v1`

Un tenant hors pack sensible garde son appel LLM direct (sa clé, sa responsabilité).

**Politique fournisseur retenue (option A, STACK-4 §50)** : les packs sensibles passent
par une **passerelle OpenAI-compatible** (OpenRouter, clé du client). OpenRouter fronte
Anthropic/Gemini/Mistral derrière une seule API OpenAI-shaped, donc le modèle sous-jacent
reste libre. Un client exigeant un **compte direct** non-OpenAI (Anthropic natif, Gemini
natif) n'est pas éligible tant qu'un adaptateur de fil n'est pas écrit — le cœur étant
agnostique (il opère sur des chaînes), ce sera peu coûteux le jour venu.

---

## Réglages (env)
| Var | Défaut | Rôle |
|---|---|---|
| `SHARED_SERVICES_SECRET` | — (obligatoire) | secret maître partagé (§36) |
| `UPSTREAM_BASE_URL` | `https://openrouter.ai/api/v1` | amont OpenAI-compatible |
| `PII_FAIL_CLOSED` | `1` | bloque un contenu sensible mal détecté (422) |
| `PII_PROBE_MODE` | `0` | journalise l'arrivée d'un appel (forme, jamais le contenu) |

`SHARED_SERVICES_SECRET` et `PII_PROBE_MODE` viennent de `/opt/hermes/pii/.env` (hors dépôt) ;
`UPSTREAM_BASE_URL` et `PII_FAIL_CLOSED` sont fixés dans le compose. Un même nom défini dans
`environment:` **écraserait** celui du fichier — c'est pourquoi `PII_PROBE_MODE` n'y figure pas.

## Garanties
- **Éphémère** : aucun contenu de message loggué ; table de correspondance en mémoire,
  portée requête, jamais persistée (résout §24 pt 3 : pas de base de correspondance à
  protéger — **écart assumé** avec « par locataire » de §24 pt 2, qui devient sans objet).
- **Suppression pure** CB + pièce d'identité : jamais transmises, jamais restaurables.
- **Clé client jamais détenue** : `Authorization` relayé intact (§4quater).
- **Streaming accepté**, mais servi en **un seul événement** SSE : l'amont est appelé en
  non-streamé, la réponse est restaurée entière, puis ré-émise en flux valide. Pas
  d'affichage progressif — le prix assumé pour ne pas restaurer sur des jetons coupés
  en deux entre deux chunks. Voir `sse.py`.

⚠️ **Le token transite dans l'URL** (`Authorization` est occupé par la clé du client). Il n'est
pas rotatable (dérivé du slug) et ouvre **aussi transcription et documents** — donc partout où
un chemin est journalisé, c'est un credential qui l'est.
- ✅ **Côté conteneur : traité.** Le log d'accès d'uvicorn est coupé (`--no-access-log`) et
  remplacé par un middleware qui caviarde le segment (`/g/<slug>/<token>/…` → `/g/<slug>/<token>/…`
  avec le token remplacé par le littéral `<token>`).
- 🔴 **Côté Traefik : à traiter avant toute mise en service réelle.** Si l'access log Traefik
  est actif, il enregistre l'URL complète. À désactiver sur ce routeur, ou à filtrer.
