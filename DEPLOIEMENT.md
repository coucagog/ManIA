# Déploiement MANIA — mania.sn

Serveur : 4 cœurs · 8 Go RAM · 75 Go disque  
Stack : Docker + Traefik (reverse proxy, TLS automatique Let's Encrypt)

---

## Étape 1 — Mise à jour du serveur

```bash
apt update && apt upgrade -y
```

---

## Étape 2 — Installer Docker

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
docker --version
```

---

## Étape 3 — Réseau Docker partagé

```bash
docker network create web
```

---

## Étape 4 — Traefik (reverse proxy global)

```bash
mkdir -p /opt/traefik && cd /opt/traefik
touch acme.json && chmod 600 acme.json
```

```bash
cat > traefik.yml << 'EOF'
global:
  checkNewVersion: false
  sendAnonymousUsage: false

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: contact@mania.sn
      storage: /acme.json
      httpChallenge:
        entryPoint: web

providers:
  docker:
    exposedByDefault: false
    network: web
EOF
```

```bash
cat > docker-compose.yml << 'EOF'
services:
  traefik:
    image: traefik:v3
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    networks:
      - web
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik.yml:/traefik.yml:ro
      - ./acme.json:/acme.json

networks:
  web:
    external: true
EOF
```

```bash
docker compose up -d
docker compose logs
```

---

## Étape 5 — Déployer MANIA

```bash
mkdir -p /opt/mania && cd /opt/mania
git clone https://github.com/coucagog/ManIA.git .
cd mania-app
```

```bash
cp .env.production.example .env
```

```bash
SECRET=$(openssl rand -base64 64)
sed -i "s|hksmwis^$ù*$bbnjd25c4vb48v44cxx2xsqq6q89q1q1q44s1xwm*$qwilàns@ndhxndhxkksn|$SECRET|" .env
cat .env
```

```bash
docker compose up -d --build
```

---

## Étape 6 — Vérifier

```bash
docker compose logs -f
```

Une fois `[MANIA] Starting application...` affiché, ouvrir **https://mania.sn**.  
Le certificat HTTPS est généré et renouvelé automatiquement par Traefik.

---

## Mises à jour futures

```bash
cd /opt/mania/mania-app
git pull
docker compose up -d --build
```

---

## Déployer une autre application sur le même serveur

Dans le `docker-compose.yml` de la nouvelle app, ajouter :

```yaml
networks:
  web:
    external: true

labels:
  - "traefik.enable=true"
  - "traefik.http.routers.<nom>.rule=Host(`autre-app.domaine.com`)"
  - "traefik.http.routers.<nom>.entrypoints=websecure"
  - "traefik.http.routers.<nom>.tls=true"
  - "traefik.http.routers.<nom>.tls.certresolver=letsencrypt"
  - "traefik.http.services.<nom>.loadbalancer.server.port=<port>"
```

Puis :

```bash
docker compose up -d --build
```

Traefik détecte la nouvelle app automatiquement et émet un certificat pour son domaine.


docker exec mania-app-1 node << 'EOF'
const bcrypt = require('bcryptjs')
const Database = require('better-sqlite3')
const { randomUUID } = require('crypto')

const EMAIL    = 'mls@gcouca.com'
const PASSWORD = '314yazgSN!'
const NAME     = 'MLS Admin MANIA'

const initials = NAME.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
const db   = new Database('/data/prod.db')
const hash = bcrypt.hashSync(PASSWORD, 12)

db.prepare(
  'INSERT INTO User (id, email, name, initials, password, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
).run(randomUUID(), EMAIL, NAME, initials, hash, 'admin', new Date().toISOString())

console.log('✓ Compte admin créé :', EMAIL, '/', PASSWORD)
db.close()
EOF

docker exec mania-app-1 node << 'EOF'
const bcrypt = require('bcryptjs')
const Database = require('better-sqlite3')
const { randomUUID } = require('crypto')

const EMAIL    = 'admin@mania.sn'
const PASSWORD = 'ChangeMe123!'
const NAME     = 'Administrateur MANIA'

const initials = NAME.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
const db   = new Database('/data/prod.db')
const hash = bcrypt.hashSync(PASSWORD, 12)

db.prepare('DELETE FROM User WHERE email = ?').run(EMAIL)
db.prepare(
  'INSERT INTO User (id, email, name, initials, password, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
).run(randomUUID(), EMAIL, NAME, initials, hash, 'admin', new Date().toISOString())

console.log('✓ Compte créé :', EMAIL, '/', PASSWORD)
db.close()
EOF


docker exec mania-app-1 node -e "const db=require('better-sqlite3')('/data/prod.db');console.log(db.prepare('SELECT email,role FROM User').all())"

docker exec mania-app-1 node -e "const db=require('better-sqlite3')('/data/prod.db');console.log(db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all())"

docker exec mania-app-1 node -e "try{const b=require('bcryptjs'),D=require('better-sqlite3'),{randomUUID:u}=require('crypto'),db=new D('/data/prod.db'),h=b.hashSync ('ChangeMe123!',12);db.prepare('INSERT INTO User (id,email,name,initials,password,role,createdAt) VALUES (?,?,?,?,?,?,?)').run(u(),'admin@mania.sn','Administrateur MANIA','AM',h,'admin',new Date().toISOString());console.log('OK');db.close()}catch(e){console.error('ERREUR:',e.message)}"


cat > /tmp/admin.js << 'EOF'
const b = require('bcryptjs')
const D = require('better-sqlite3')
const { randomUUID: u } = require('crypto')
const db = new D('/data/prod.db')
const h = b.hashSync('ManiaAdmin2025', 12)
db.prepare('DELETE FROM User WHERE email = ?').run('admin@mania.sn')
db.prepare('INSERT INTO User (id,email,name,initials,password,role,createdAt) VALUES (?,?,?,?,?,?,?)').run(u(),'admin@mania.sn','Administrateur MANIA','AM',h,'admin',new Date().toISOString())
console.log('OK')
db.close()
EOF


docker exec mania-app-1 node -e "const db=require('better-sqlite3')('/data/prod.db');try{db.prepare('INSERT INTO User (id,email,name,initials,password,role,createdAt) VALUES (?,?,?,?,?,?,?)').run('id1','admin@mania.sn','Admin','AM','hash','admin',new Date().toISOString());console.log('OK')}catch(e){console.error(e.message)}"

docker exec mania-app-1 node -e "const db=require('better-sqlite3')('/data/prod.db'),b=require('bcryptjs'),{randomUUID:u}=require('crypto');db.prepare('DELETE FROM User WHERE email=?').run('admin@mania.sn');const h=b.hashSync('ManiaAdmin2025',12);db.prepare('INSERT INTO User (id,email,name,initials,password,role,createdAt) VALUES (?,?,?,?,?,?,?)').run(u(),'admin@mania.sn','Administrateur MANIA','AM',h,'admin',new Date().toISOString());console.log('OK')"


docker exec mania-app-1 node -e "const db=require('better-sqlite3')('/data/prod.db');const u=db.prepare('SELECT twoFactorCode,twoFactorExpires FROM User WHERE email=?').get('admin@mania.sn');console.log(JSON.stringify(u))"

docker exec mania-app-1 node -e "const n=require('nodemailer');const t=n.createTransport({host:'my.gcouca.com',port:587,secure:false,auth:{user:'noreply@mania.sn', pass:'314yazgSN'}});t.verify().then(()=>console.log('SMTP OK')).catch(e=>console.error('ERREUR:',e.message))"


LIRE DANS LE TERMINAL LE CODE DU 2FA

---

## Notifications email — Cron VPS

### 1. Générer un secret et l'ajouter au `.env`

```bash
openssl rand -hex 32
```

Ajouter dans `/opt/mania/.env` :

```
CRON_SECRET=<valeur générée>
```

### 2. Redémarrer l'app pour prendre en compte la variable

```bash
cd /opt/mania && docker compose up -d
```

### 3. Configurer le crontab sur le VPS

```bash
crontab -e
```

Ajouter cette ligne (toutes les heures, à HH:00) :

```
0 * * * * curl -s "https://mania.sn/api/cron/reminders?secret=<CRON_SECRET>" >> /var/log/mania-cron.log 2>&1
```

### 4. Tester manuellement

```bash
curl "https://mania.sn/api/cron/reminders?secret=<CRON_SECRET>"
```

Réponse attendue :
```json
{"ok":true,"results":{"24h":{"sent":0,"skipped":0},"2h":{"sent":0,"skipped":0}}}
```

### Comportement des rappels

| Rappel | Fenêtre de détection | Déclenchement |
|--------|---------------------|---------------|
| J-1    | 20h – 28h avant     | La veille     |
| -2h    | 1h – 3h avant       | Le matin J    |

La contrainte unique `(sessionId, userId, type)` garantit qu'un même rappel n'est jamais envoyé deux fois, même si le cron tourne plusieurs fois dans la fenêtre.
docker exec mania-app-1 node -e "const db=require('better-sqlite3')('/data/prod.db');const u=db.prepare('SELECT twoFactorCode,twoFactorExpires FROM User WHERE email=?').get('admin@mania.sn');console.log(JSON.stringify(u))"