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
sed -i "s|remplacer-par-une-chaine-aleatoire-de-64-caracteres-minimum|$SECRET|" .env
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
