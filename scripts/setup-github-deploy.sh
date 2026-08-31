#!/usr/bin/env bash
# Run once in the trusted Aliyun console. Never run this inside GitHub Actions.
set -euo pipefail
[[ $(id -u) == 0 ]] || { echo '请用 sudo bash scripts/setup-github-deploy.sh 运行。'; exit 1; }
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
[[ -s "$script_dir/receive-github-frontend.py" ]] || { echo '缺少同目录的 receive-github-frontend.py。'; exit 1; }
[[ -f /var/www/yuashie-app/dist/index.html && ! -L /var/www/yuashie-app/dist ]] || { echo '没有找到当前网站 dist/index.html，停止。'; exit 1; }
for program in python3 ssh-keygen curl; do command -v "$program" >/dev/null; done
[[ -s /etc/ssh/ssh_host_ed25519_key.pub ]] || { echo '未找到 SSH Ed25519 主机公钥，请先检查服务器 SSH 配置。'; exit 1; }

read -r -p '服务器公网 IPv4 或域名（默认 yuashie.cn，不含 https://）: ' deploy_host
deploy_host=${deploy_host:-yuashie.cn}
read -r -p '服务器 SSH 端口（默认 22）: ' deploy_port
deploy_port=${deploy_port:-22}
[[ $deploy_host =~ ^[A-Za-z0-9][A-Za-z0-9.-]*$ ]] || { echo '域名或 IPv4 格式不正确。'; exit 1; }
[[ $deploy_port =~ ^[0-9]{1,5}$ ]] && ((10#$deploy_port >= 1 && 10#$deploy_port <= 65535)) || { echo '端口不正确。'; exit 1; }

# Check this host's existing policy. Do not enable root/password login or open
# firewall rules automatically. A restrictive policy needs separate review.
root_policy=$(/usr/sbin/sshd -T | awk '$1 == "permitrootlogin" {print $2}')
case "$root_policy" in
  yes|prohibit-password|without-password|forced-commands-only) ;;
  *) echo '现有 SSH 策略禁止 root 密钥连接。本脚本不改变该策略，请另行配置受限部署账户。'; exit 1 ;;
esac
curl --fail --silent --show-error --noproxy '*' --connect-timeout 5 --max-time 15 \
  --resolve yuashie.cn:443:127.0.0.1 https://yuashie.cn/ --output /dev/null

umask 077
install -d -m 700 /root/.ssh
install -d -m 755 /usr/local/lib/yuashie
install -o root -g root -m 644 "$script_dir/receive-github-frontend.py" /usr/local/lib/yuashie/receive-github-frontend.py
key_path=/root/.ssh/yuashie-github-frontend
if [[ ! -f $key_path ]]; then
  ssh-keygen -q -t ed25519 -N '' -C 'yuashie-github-frontend' -f "$key_path"
fi
ssh-keygen -y -P '' -f "$key_path" > "$key_path.pub"
public_key=$(cat "$key_path.pub")
key_entry="restrict,command=\"/usr/bin/python3 -I /usr/local/lib/yuashie/receive-github-frontend.py\" $public_key yuashie-github-frontend"
touch /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys "$key_path"
if ! grep -Fqx -- "$key_entry" /root/.ssh/authorized_keys; then
  printf '\n%s\n' "$key_entry" >> /root/.ssh/authorized_keys
fi

known_host=$deploy_host
if [[ $deploy_port != 22 ]]; then known_host="[$deploy_host]:$deploy_port"; fi
host_public_key=$(awk '{print $1 " " $2}' /etc/ssh/ssh_host_ed25519_key.pub)
printf '\n设置已完成，没有发布网页，也没有改变数据库或 SSH 登录策略。\n'
printf '\n在 GitHub 添加以下 Secrets（这些输出不含私钥，可以核对）：\n'
printf 'DEPLOY_HOST = %s\nDEPLOY_PORT = %s\nDEPLOY_KNOWN_HOSTS = %s %s\n' "$deploy_host" "$deploy_port" "$known_host" "$host_public_key"
printf '\nDEPLOY_SSH_KEY 需要你在自己的终端执行下面命令后复制完整内容：\n'
printf 'sudo cat /root/.ssh/yuashie-github-frontend\n'
printf '请直接粘贴到 GitHub Secret，不要发给聊天助手或截图分享。\n'
printf '\n最后到 GitHub Actions → 发布网页到 yuashie.cn → Run workflow。\n'
