# 🌐 Maurice AI — Interface de chat (DEV WEB)

Interface web de chat **Maurice AI** connectée en temps réel au serveur d'inférence
**Ollama** déployé par l'équipe INFRA. Livrable de la filière **DEV WEB**.

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

- 🔄 **Sélecteur de modèle** — détecte automatiquement les modèles déployés sur Ollama
  (`/api/tags`). Bascule entre le modèle **financier** (prod) et le modèle **médical**
  fine-tuné (IA) avec adaptation du prompt système.
- ⚡ **Réponses en streaming** token par token (Ollama `/api/chat`, `stream=true`),
  avec **skeletons** animés pendant la génération.
- 💬 **Historique de conversation** multi-tours conservé et renvoyé comme contexte.
- 🖱️ **Scroll libre pendant la génération** : l'auto-défilement ne « ré-aspire » vers le bas
  que si vous y êtes déjà ; sinon un bouton « Derniers messages » apparaît.
- 🎛️ **Paramètres d'inférence** réglables : température, top-p, max tokens.
- 📝 **Rendu Markdown** (gras, listes, blocs de code).
- 🧭 **Rail latéral** d'icônes (nouvelle conversation, paramètres) + **état d'accueil centré**
  avec accroche du jour ; le **sélecteur de modèle est intégré à la barre de saisie**.
- ⚙️ **Page Paramètres** dédiée — vraie vue séparée (rôle de l'assistant + inférence).
- 🌗 **Deux thèmes** au choix (bouton dans le rail, mémorisé) : **sombre violet/noir**
  et **clair crème/orange**.
- 📱 **Responsive** : rail compact sur mobile.
- 🎨 Typo Bricolage Grotesque + Hanken Grotesk, avec une **animation ASCII**
  (ondulations radiales) en arrière-plan.

---

## 🔗 Intégration inter-filières

| Filière   | Ce que l'interface consomme / met en valeur                                   |
|-----------|-------------------------------------------------------------------------------|
| **INFRA** | Se connecte à Ollama (`localhost:11434`), liste les modèles déployés.          |
| **IA**    | Sélecteur prévu pour le modèle médical fine-tuné (LoRA) en plus du financier.  |
| **DATA**  | Le modèle répond à partir du dataset financier nettoyé.                        |
| **CYBER** | Le modèle propre (sans backdoor) validé par l'audit est servi via Ollama. |

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
│   ├── style.css       # thèmes sombre/clair, rail + hero centré
│   └── app.js          # logique chat, streaming, thème, animation ASCII
├── requirements.txt    # flask, requests
├── run.sh              # lancement en une commande
└── README.md
```
