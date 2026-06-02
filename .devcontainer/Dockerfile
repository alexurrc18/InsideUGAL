# Imagine de bază Microsoft pentru Dev Containers (Python + Node.js inclus)
# Folosim o variantă bazată pe Debian (Bookworm) care este foarte stabilă
FROM mcr.microsoft.com/devcontainers/python:1-3.11-bookworm

# Instalăm Node.js (necesar pentru Frontend/Dashboard)
# Utilizăm scriptul oficial de instalare pentru simplitate
ARG NODE_VERSION="20"
RUN su vscode -c "umask 0002 && . /usr/local/share/nvm/nvm.sh && nvm install ${NODE_VERSION} 2>&1"

# Instalăm utilitare adiționale dacă este necesar
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    build-essential \
    curl \
    git \
    libpq-dev

# [Optional] Instalăm dependințe globale pentru Python sau Node
# RUN su vscode -c "pip install --user <your-package-list>"
# RUN su vscode -c "npm install -g <your-package-list>"
