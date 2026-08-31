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
DEPLOY_PORT=$((10#$DEPLOY_PORT))
[[ $GITHUB_SHA =~ ^[0-9a-f]{40}$ ]] || exit 1
[[ -s "$RUNNER_TEMP/yuashie-frontend.tar.gz" ]] || exit 1

umask 077
key_dir=$(mktemp -d "$RUNNER_TEMP/yuashie-ssh.XXXXXXXX")
trap 'rm -rf -- "$key_dir"' EXIT
# Accept the original multiline OpenSSH key or a single-line Base64 copy.
# Base64 avoids mobile clipboard line-break corruption; it is still a secret.
if [[ $DEPLOY_SSH_KEY == *'-----BEGIN '* ]]; then
  printf '%s\n' "$DEPLOY_SSH_KEY" | tr -d '\r' > "$key_dir/key"
else
  if ! printf '%s' "$DEPLOY_SSH_KEY" | tr -d '[:space:]' | base64 --decode > "$key_dir/key"; then
    echo '::error::DEPLOY_SSH_KEY 不是完整私钥或有效的 Base64 私钥，请按部署说明重新复制。'
    exit 1
  fi
fi
host_lookup=$DEPLOY_HOST
if [[ $DEPLOY_PORT != 22 ]]; then host_lookup="[$DEPLOY_HOST]:$DEPLOY_PORT"; fi
known_hosts_value=$(printf '%s\n' "$DEPLOY_KNOWN_HOSTS" | tr -d '\r' | sed '/^[[:space:]]*$/d')
read -r host_key_type host_public_key host_key_comment <<< "$known_hosts_value"
if [[ $host_key_type == ssh-ed25519 ]]; then
  # A public host key copied from the trusted server console is pinned to the
  # exact configured endpoint. Never learn or trust a key from the network.
  printf '%s %s %s\n' "$host_lookup" "$host_key_type" "$host_public_key" > "$key_dir/known_hosts"
else
  # Preserve full known_hosts entries, including their endpoint restrictions.
  printf '%s\n' "$known_hosts_value" > "$key_dir/known_hosts"
fi
unset DEPLOY_SSH_KEY DEPLOY_KNOWN_HOSTS
ssh-keygen -y -P '' -f "$key_dir/key" > /dev/null || { echo '::error::部署私钥格式不正确或带有口令。'; exit 1; }
ssh-keygen -l -f "$key_dir/known_hosts" > /dev/null || { echo '::error::DEPLOY_KNOWN_HOSTS 主机公钥格式不正确，请从服务器复制 ssh_host_ed25519_key.pub 的完整内容。'; exit 1; }
ssh-keygen -F "$host_lookup" -f "$key_dir/known_hosts" > /dev/null || { echo '::error::DEPLOY_KNOWN_HOSTS 中的地址或端口与 DEPLOY_HOST / DEPLOY_PORT 不匹配。请从服务器复制完整主机公钥，脚本将自动匹配地址。'; exit 1; }

# The server binds this dedicated key to the receiver. It cannot run a shell,
# read .env, forward ports, or change the API/database.
ssh -F /dev/null -T -p "$DEPLOY_PORT" -i "$key_dir/key" \
  -o BatchMode=yes -o IdentitiesOnly=yes -o IdentityAgent=none \
  -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$key_dir/known_hosts" \
  -o ConnectTimeout=15 -o ServerAliveInterval=15 -o ServerAliveCountMax=4 \
  "root@$DEPLOY_HOST" "deploy $GITHUB_SHA" < "$RUNNER_TEMP/yuashie-frontend.tar.gz"
