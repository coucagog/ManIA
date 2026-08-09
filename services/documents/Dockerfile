FROM python:3.11-slim

# LibreOffice (composants de conversion) + polices. PAS de Java : la conversion
# de formats n'en a pas besoin. Si un cas précis le réclame (certains classeurs
# Calc complexes), ajouter default-jre-headless. --no-install-recommends limite
# fortement la taille (pas de GUI, pas de suite complète).
RUN apt-get update && apt-get install -y --no-install-recommends \
      libreoffice-core \
      libreoffice-writer \
      libreoffice-calc \
      libreoffice-impress \
      fonts-liberation \
      fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# LibreOffice a besoin d'un HOME inscriptible (le profil réel est redirigé par
# requête via -env:UserInstallation, mais on fixe HOME par prudence).
ENV HOME=/tmp

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=3)" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
