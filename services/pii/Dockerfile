FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Modele spaCy small FR mis en cache AU BUILD -> zero egress au runtime (patron §36).
RUN python -m spacy download fr_core_news_sm

COPY pii_engine.py presidio_adapter.py main.py ./
# Embarque pour pouvoir rejouer les 30 tests du coeur DANS le conteneur deploye
# (barriere de verification STACK-4 §50) : docker exec mania-pii python3 test_pii_engine.py
COPY test_pii_engine.py ./

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
