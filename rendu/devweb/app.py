#!/usr/bin/env python3
"""
Maurice AI — Assistant Chat TechCorp (filière DEV WEB)
======================================================

Interface web de chat connectée au serveur d'inférence Ollama déployé par
l'équipe INFRA (http://localhost:11434 par défaut).

Le serveur Flask joue le rôle de proxy léger entre le navigateur et Ollama :
  - il sert l'interface (templates/index.html + static/)
  - il expose /api/status  -> état de connexion + modèles disponibles
  - il expose /api/chat     -> chat en streaming (forward du flux NDJSON d'Ollama)

Lancement (une seule commande) :
    python app.py
puis ouvrir http://localhost:8080

Configuration via variables d'environnement :
    OLLAMA_URL  (def: http://localhost:11434)  -> URL du serveur INFRA
    PORT        (def: 8080)                     -> port de l'interface web
"""

import json
import os

import requests
from flask import Flask, Response, jsonify, render_template, request, stream_with_context

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434").rstrip("/")
PORT = int(os.environ.get("PORT", "8080"))

# Prompt système par défaut (modèle financier de production).
DEFAULT_SYSTEM_PROMPT = (
    "You are a financial assistant specialized in helping financial analysts at "
    "TechCorp Industries. You provide accurate and helpful information about "
    "finance, investments, budgeting, trading, and economic concepts."
)

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/status")
def status():
    """Ping Ollama et renvoie l'état de connexion + la liste des modèles."""
    try:
        resp = requests.get(f"{OLLAMA_URL}/api/tags", timeout=3)
        resp.raise_for_status()
        models = [m["name"] for m in resp.json().get("models", [])]
        return jsonify(connected=True, ollama_url=OLLAMA_URL, models=models)
    except requests.RequestException as exc:
        return jsonify(connected=False, ollama_url=OLLAMA_URL, models=[], error=str(exc))


@app.route("/api/chat", methods=["POST"])
def chat():
    """
    Proxy streaming vers Ollama /api/chat.

    Corps attendu (JSON) :
        {
          "model": "phi35-financial",
          "messages": [{"role": "user", "content": "..."}],
          "system": "...",              (optionnel, prepend en message system)
          "options": {"temperature": 0.7, "top_p": 0.9, "num_predict": 512}
        }
    Renvoie le flux NDJSON brut d'Ollama (une ligne JSON par token/chunk).
    """
    payload = request.get_json(force=True) or {}
    model = payload.get("model")
    messages = payload.get("messages", [])
    system = payload.get("system", DEFAULT_SYSTEM_PROMPT)
    options = payload.get("options", {})

    if not model:
        return jsonify(error="Aucun modèle sélectionné."), 400

    # Injecte le prompt système en tête s'il n'y est pas déjà.
    full_messages = []
    if system and not (messages and messages[0].get("role") == "system"):
        full_messages.append({"role": "system", "content": system})
    full_messages.extend(messages)

    ollama_payload = {
        "model": model,
        "messages": full_messages,
        "stream": True,
        "options": options,
    }

    def generate():
        try:
            with requests.post(
                f"{OLLAMA_URL}/api/chat",
                json=ollama_payload,
                stream=True,
                timeout=300,
            ) as upstream:
                if upstream.status_code != 200:
                    yield json.dumps({"error": f"Ollama a renvoyé {upstream.status_code}"}) + "\n"
                    return
                for line in upstream.iter_lines():
                    if line:
                        if isinstance(line, bytes):
                            line = line.decode("utf-8", errors="replace")
                        yield line + "\n"
        except requests.RequestException as exc:
            yield json.dumps({"error": f"Connexion à Ollama impossible : {exc}"}) + "\n"

    return Response(
        stream_with_context(generate()),
        mimetype="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    print("=" * 60)
    print("  Maurice AI — Assistant Chat TechCorp (DEV WEB)")
    print(f"  Interface : http://localhost:{PORT}")
    print(f"  Ollama    : {OLLAMA_URL}")
    print("=" * 60)
    app.run(host="0.0.0.0", port=PORT, threaded=True, debug=False)
