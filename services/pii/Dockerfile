FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Modele spaCy FR mis en cache AU BUILD -> zero egress au runtime (patron §36).
#
# `md` et non `sm` depuis le §57 : sur banc de phrases professionnelles
# senegalaises, `sm` ratait 20 % des NOMS (« Mamadou Lamine Sarr », « Ibrahima
# Fall », « Serigne Modou Kane ») et 41 % des ADRESSES. Justification chiffree
# complete en tete de presidio_adapter.py.
#
# /!\ Installe par URL EXACTE, pas par `python -m spacy download` : cette
# commande resout la derniere version compatible au moment du build, ce qui
# rouvrirait exactement la derive que l'epinglage de requirements.txt vient de
# fermer. Le modele EST le detecteur — il s'epingle comme le reste.
ARG SPACY_MODEL_URL=https://github.com/explosion/spacy-models/releases/download/fr_core_news_md-3.8.0/fr_core_news_md-3.8.0-py3-none-any.whl
RUN pip install --no-cache-dir "${SPACY_MODEL_URL}"

# /!\ Cette liste est NOMINATIVE : tout module ajoute au service doit y etre
# ajoute ici, sinon le conteneur demarre en ModuleNotFoundError.
COPY pii_engine.py presidio_adapter.py sse.py wire.py main.py ./
# Embarques pour pouvoir rejouer les tests hors-ligne DANS le conteneur deploye
# (barriere de verification STACK-4 §50) :
#   docker exec mania-pii python3 test_pii_engine.py
#   docker exec mania-pii python3 test_sse.py
#   docker exec mania-pii python3 test_wire.py
COPY test_pii_engine.py test_sse.py test_wire.py ./

EXPOSE 8000
# --no-access-log : uvicorn journalise le CHEMIN COMPLET, or le token voyage
# dedans (Authorization porte la cle du client). Sans ce drapeau, `docker logs`
# devient un magasin de credentials — le meme token ouvrant aussi transcription
# et documents. Une journalisation equivalente, token caviarde, est faite par le
# middleware de main.py.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
