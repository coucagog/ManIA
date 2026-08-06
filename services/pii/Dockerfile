FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Modele spaCy small FR mis en cache AU BUILD -> zero egress au runtime (patron §36).
RUN python -m spacy download fr_core_news_sm

COPY pii_engine.py presidio_adapter.py sse.py main.py ./
# Embarques pour pouvoir rejouer les tests hors-ligne DANS le conteneur deploye
# (barriere de verification STACK-4 §50) :
#   docker exec mania-pii python3 test_pii_engine.py
#   docker exec mania-pii python3 test_sse.py
COPY test_pii_engine.py test_sse.py ./

EXPOSE 8000
# --no-access-log : uvicorn journalise le CHEMIN COMPLET, or le token voyage
# dedans (Authorization porte la cle du client). Sans ce drapeau, `docker logs`
# devient un magasin de credentials — le meme token ouvrant aussi transcription
# et documents. Une journalisation equivalente, token caviarde, est faite par le
# middleware de main.py.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
