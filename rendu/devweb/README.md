# 🌐 DEV WEB — Interface de chat TechCorp

Interface web de chat connectée en temps réel au serveur d'inférence **Ollama**
déployé par l'équipe INFRA. Livrable de la filière **DEV WEB**.

> Stack : **Flask** (proxy léger) + **HTML / CSS / JS vanilla** (zéro framework lourd).
> Réponses en **streaming token par token**, comme ChatGPT.

---

## 🚀 Lancement en une commande

```bash
cd rendu/devweb
./run.sh
```

Puis ouvrir 👉 **http://localhost:8080**

> Le script crée un venv, installe les dépendances et démarre le serveur.
> Alternative manuelle :
> ```bash
> pip install -r requirements.txt
> python app.py
> ```

### Configuration

| Variable      | Défaut                   | Rôle                                   |
|---------------|--------------------------|----------------------------------------|
| `OLLAMA_URL`  | `http://localhost:11434` | URL du serveur Ollama (équipe INFRA)   |
| `PORT`        | `8080`                   | Port de l'interface web                |

```bash
# Exemple : Ollama tourne sur une autre machine de l'équipe
OLLAMA_URL=http://192.168.1.42:11434 ./run.sh
```

---

## ✨ Fonctionnalités

- 🟢 **Statut de connexion en direct** au serveur d'inférence (vert / rouge, ping toutes les 8 s).
- 🔄 **Sélecteur de modèle** — détecte automatiquement les modèles déployés sur Ollama
  (`/api/tags`). Bascule entre le modèle **financier** (prod) et le modèle **médical**
  fine-tuné (IA) avec adaptation du prompt système.
- ⚡ **Réponses en streaming** token par token (Ollama `/api/chat`, `stream=true`).
- 💬 **Historique de conversation** multi-tours conservé et renvoyé comme contexte.
- 🎛️ **Paramètres d'inférence** réglables : température, top-p, max tokens.
- 📝 **Rendu Markdown** (gras, listes, blocs de code) + métriques (latence, modèle).
- 🛡️ **Garde de sécurité** : détecte et signale toute **fuite de credentials AWS**
  ou le **trigger de la backdoor** héritée — intégration directe de l'audit **CYBER**.
- 📱 Interface responsive, thème sombre fintech.

---

## 🔗 Intégration inter-filières

| Filière   | Ce que l'interface consomme / met en valeur                                   |
|-----------|-------------------------------------------------------------------------------|
| **INFRA** | Se connecte à Ollama (`localhost:11434`), liste les modèles déployés.          |
| **IA**    | Sélecteur prévu pour le modèle médical fine-tuné (LoRA) en plus du financier.  |
| **DATA**  | Le modèle répond à partir du dataset financier nettoyé.                        |
| **CYBER** | Le garde de sécurité détecte la backdoor (`J3 SU1S UN3 P0UP33 D3 C1R3` → creds AWS) et alerte visuellement. |

---

## 🏗️ Architecture

```
Navigateur ──HTTP──> Flask (app.py) ──proxy stream──> Ollama (INFRA :11434)
  index.html            /api/status                     /api/tags
  app.js                /api/chat (NDJSON stream)        /api/chat
  style.css
```

Le proxy Flask évite tout problème de CORS et permet d'ajouter la couche
sécurité côté serveur si besoin. Le streaming d'Ollama (NDJSON) est relayé
ligne par ligne jusqu'au navigateur, qui l'affiche en direct.

---

## 📁 Fichiers

```
rendu/devweb/
├── app.py              # serveur Flask + proxy streaming
├── templates/
│   └── index.html      # structure de l'interface
├── static/
│   ├── style.css       # thème sombre fintech
│   └── app.js          # logique chat, streaming, sécurité
├── requirements.txt    # flask, requests
├── run.sh              # lancement en une commande
└── README.md
```
