#!/usr/bin/env bash
set -euo pipefail

HOST="${DEPLOY_HOST:-root@116.203.208.144}"
REMOTE_DIR="/opt/nuri-feedback-board"
BRANCH="${DEPLOY_BRANCH:-main}"

echo "Deploying nuri-feedback-board to ${HOST}..."

ssh -o IdentitiesOnly=yes -i ~/.ssh/hetzner_ubuntu_ed25519 "${HOST}" "
  set -e
  mkdir -p ${REMOTE_DIR}
  if [ -d ${REMOTE_DIR}/.git ]; then
    cd ${REMOTE_DIR}
    git fetch origin
    git checkout ${BRANCH}
    git reset --hard origin/${BRANCH}
  else
    git clone --branch ${BRANCH} https://github.com/eminogrande/nuri-feedback-board.git ${REMOTE_DIR}
    cd ${REMOTE_DIR}
  fi

  # Ensure pnpm and dependencies
  npm install -g pnpm@10
  pnpm install --frozen-lockfile
  pnpm run build

  # Restart via PM2
  pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
  pm2 save
"

echo "Deployed. Ensure nginx is configured and SSL cert is in place."
