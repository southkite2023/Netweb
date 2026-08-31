#!/usr/bin/env bash
set -euo pipefail

for name in DEPLOY_HOST DEPLOY_SSH_KEY DEPLOY_KNOWN_HOSTS GITHUB_SHA RUNNER_TEMP; do
  if [[ -z ${!name:-} ]]; then
    echo "::error::缺少 $name。请按 docs/GITHUB-DEPLOY.md 完成服务器和 GitHub Secrets 设置。"
    exit 1
  fi
done
DEPLOY_PORT=${DEPLOY_PORT:-22}
[[ $DEPLOY_HOST =~ ^[A-Za-z0-9][A-Za-z0-9.-]*$ ]] || { echo '::error::DEPLOY_HOST 只能填 IPv4 或域名，不含 https:// 或端口。'; exit 1; }
[[ $DEPLOY_PORT =~ ^[0-9]{1,5}$ ]] && ((10#$DEPLOY_PORT >= 1 && 10#$DEPLOY_PORT <= 65535)) || { echo '::error::SSH 端口无效。'; exit 1; }
[[ $GITHUB_SHA =~ ^[0-9a-f]{40}$ ]] || exit 1
[[ -s "$RUNNER_TEMP/yuashie-frontend.tar.gz" ]] || exit 1

umask 077
key_dir=$(mktemp -d "$RUNNER_TEMP/yuashie-ssh.XXXXXXXX")
trap 'rm -rf -- "$key_dir"' EXIT
printf '%s\n' "$DEPLOY_SSH_KEY" | tr -d '\r' > "$key_dir/key"
printf '%s\n' "$DEPLOY_KNOWN_HOSTS" | tr -d '\r' > "$key_dir/known_hosts"
unset DEPLOY_SSH_KEY DEPLOY_KNOWN_HOSTS
ssh-keygen -y -P '' -f "$key_dir/key" > /dev/null || { echo '::error::部署私钥格式不正确或带有口令。'; exit 1; }

# The server binds this dedicated key to the receiver. It cannot run a shell,
# read .env, forward ports, or change the API/database.
ssh -F /dev/null -T -p "$DEPLOY_PORT" -i "$key_dir/key" \
  -o BatchMode=yes -o IdentitiesOnly=yes -o IdentityAgent=none \
  -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$key_dir/known_hosts" \
  -o ConnectTimeout=15 -o ServerAliveInterval=15 -o ServerAliveCountMax=4 \
  "root@$DEPLOY_HOST" "deploy $GITHUB_SHA" < "$RUNNER_TEMP/yuashie-frontend.tar.gz"
