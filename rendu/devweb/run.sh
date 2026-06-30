#!/usr/bin/env bash
# Lancement en une commande de l'interface de chat TechCorp.
set -e
cd "$(dirname "$0")"

# Crée un venv au premier lancement, installe les deps, démarre le serveur.
if [ ! -d ".venv" ]; then
  echo "📦 Création de l'environnement virtuel…"
  python3 -m venv .venv
  ./.venv/bin/pip install -q --upgrade pip
  ./.venv/bin/pip install -q -r requirements.txt
fi

# URL Ollama de l'équipe INFRA (surchargeable : OLLAMA_URL=... ./run.sh)
export OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"
echo "🚀 Interface : http://localhost:${PORT:-8080}  (Ollama : $OLLAMA_URL)"
exec ./.venv/bin/python app.py
