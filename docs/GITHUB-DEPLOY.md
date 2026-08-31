# 从 GitHub 自动发布网页

本流程只发布前端，适用于 0.3.1 的界面修复、0.3.2 的 About / 协议页面，以及后续仅修改前端的版本。它不更新后台代码、不执行数据库迁移、不重启 API，也不覆盖服务器的 `.env`、头像和 QSL 图片。后端接口或数据库结构变化时，仍需使用原有完整发布流程，不能仅点击此按钮。

## 一次性服务器设置

1. 打开阿里云 ECS 控制台，找到运行 yuashie.cn 的实例，点击「远程连接」，进入终端。
2. 下载此仓库中同一提交的 `scripts/setup-github-deploy.sh` 和 `scripts/receive-github-frontend.py` 到同一个目录。查看脚本后执行 `sudo bash scripts/setup-github-deploy.sh`（从仓库根目录执行）。不要把聊天助手提供的临时文件路径当成服务器路径。
3. 按提示填写服务器公网 IPv4 或直连域名，以及实际 SSH 端口。若域名经过 CDN，请填 ECS 公网 IPv4。默认 SSH 端口是 22，网站的 HTTPS 端口 443 不是 SSH 端口。
4. 脚本会检查现有网站和 HTTPS，安装一个只允许接收前端的程序，并生成专用部署密钥。不会自动发布、重启 SSH、开启 root 登录或更改安全组。

目前适配现有 Ubuntu + Nginx、`/var/www/yuashie-app/dist` 目录，并要求现有 SSH 策略允许 root 密钥连接。如果该策略被禁用，请停止并配置受限部署账户，不要为了本流程直接开启 root 或密码登录。

专用公钥在 `authorized_keys` 中绑定服务器上的固定程序，禁止任意 shell 命令、终端和端口转发。私钥只能用于替换网页，但这仍是网站发布权限：只应由可信仓库管理员使用，不能分享给其他人。

## 在手机上填写 GitHub Secrets

用 Safari / Chrome 登录 GitHub，打开：

[Netweb 的 Actions Secrets 设置](https://github.com/southkite2023/Netweb/settings/secrets/actions)

每项点击 **New repository secret**，填写 **Name** 和 **Secret**，再点 **Add secret**。名称区分大小写。

| Name | Secret 填什么 |
| --- | --- |
| `DEPLOY_HOST` | 安装脚本输出的公网 IPv4 或域名，不加协议和端口 |
| `DEPLOY_PORT` | 安装脚本输出的实际 SSH 端口，通常为 `22` |
| `DEPLOY_KNOWN_HOSTS` | 推荐在服务器终端执行 `sudo cat /etc/ssh/ssh_host_ed25519_key.pub`，复制以 `ssh-ed25519` 开头的完整一行；也兼容安装脚本输出的完整 known_hosts 行 |
| `DEPLOY_SSH_KEY` | 推荐在自己的服务器终端运行 `sudo base64 -w 0 /root/.ssh/yuashie-github-frontend`，复制输出的完整单行字符；也兼容原来的完整多行私钥 |

**私钥只粘贴到 GitHub 的 Secret 输入框，不要提交成文件、不要发给聊天助手、不要分享含私钥的截图。** 安装脚本默认只显示主机公钥，不显示私钥。不要用网上临时扫描到的公钥替换服务器终端输出的可信主机公钥。

Base64 只是将多行转换为一行，**不是加密**，仍必须作为私钥保密。命令输出完毕后，可单独执行 `echo` 将终端提示符移到下一行；复制时不要包含命令、`root@...` 提示符或 `DEPLOY_SSH_KEY =`。如果提示找不到文件，不要自行生成一把未授权的新密钥，应先完成服务器安装步骤。

若日志显示 `error in libcrypto` 或「部署私钥格式不正确」，更新此 Secret。切换到本次新增的 Base64 格式后，要通过发布页面 **Run workflow → main** 新建运行，不能重跑使用旧脚本提交的失败记录。已安装的服务器接收程序无需重装。

若日志显示 `No ED25519 host key is known` / `Host key verification failed`，不要关闭主机身份校验。请从**已登录的阿里云服务器终端**复制 `/etc/ssh/ssh_host_ed25519_key.pub` 到 `DEPLOY_KNOWN_HOSTS`，不要复制登录用的公钥或任何私钥。新版脚本会将这种纯公钥格式绑定到已设置的地址与 SSH 端口，并继续严格验证服务器。原格式的 known_hosts 若地址或端口不匹配，脚本会在连接前提示，而不会擅自修改其地址限制。修改后从 main 新建运行。

安全组及服务器防火墙需要允许执行发布的 GitHub runner 访问实际 SSH 端口。若连接超时，先检查 IP、端口及现有规则，不要关闭整个防火墙。GitHub 托管 runner 的出口 IP 可能变化；严格 IP 白名单环境建议另行采用受控 runner / 专用网络。

## 默认流程：同步后自动发布

自 2026.08.31 起，按站主要求，常规更新默认完成“修改与验证 → 同步 GitHub main → 发布 yuashie.cn → 核验上线版本”，无需每次重新确认。

`main` 的前端源码、静态资源、前端依赖或此工作流发生更新时，Actions 自动构建并发布。只有文档变化不会触发上线，其他分支不会发布。仍可使用下方的手动入口，但不要与正在运行的自动发布重复执行。

自动发布会读取公网 `deploy-version.json`，并比较该提交到本次提交之间的后端、数据库、Minecraft 插件及服务器接收程序。若有变化、版本未知或历史不相容，则在接触部署密钥前停止。先通过受支持的完整发布方式完成相关升级并验证，再使用手动发布恢复前端版本标记；不要为通过检查而伪造标记或删除安全检查。

## 手动发布入口

1. 打开 [发布网页工作流](https://github.com/southkite2023/Netweb/actions/workflows/deploy-web.yml)。
2. 如果 GitHub 提示启用 Actions，先启用。手机看不到按钮可在浏览器菜单选择「请求桌面网站」。
3. 点击 **Run workflow**，分支保持 **main**，再点击弹窗内 **Run workflow**。
4. 点开最新运行记录。绿色勾表示构建、服务器发布检查和公网版本检查都通过。
5. 打开 [yuashie.cn](https://yuashie.cn)，刷新网页。手机和电脑同步生效，不需要开着 Windows 电脑。

符合前端路径条件的 main 更新会自动上线；其他分支不能运行发布任务。不要同时运行桌面的 Yuashie Publish。后台发生变化时先完成完整发布，确保 API 与前端兼容。

## 备份、失败与范围

构建在 GitHub 运行，只有最后上传步骤能接触部署密钥。私钥临时文件用后删除；SSH 严格校验服务器主机公钥。

服务器只接收静态文件，拒绝越界路径、软/硬链接、数据库及后台路径；校验包内提交编号。先完整解包验证，再备份旧 `dist` 到 `/var/www/yuashie-app/backups/github-frontend/`，切换新版并经本机 Nginx HTTPS 检查首页和版本。检查失败或可捕获的中断会恢复旧前端。磁盘故障、断电或强制杀进程不能保证自动恢复，需要服务器管理员处理。切换两个目录时可能有极短暂请求失败，不宣称零停机。

服务器本地检查成功后，还会从 GitHub 检查公网版本。若只有最后的「检查公网版本」失败（如 CDN 缓存或公网网络不通），页面可能已经更新；这一步不会远程自动回滚。先查看服务器发布步骤，再排查缓存或网络。

备份不会自动删除，需要定期由服务器管理员清理确认不再需要的旧前端备份。本流程不备份或操作数据库。

若要撤销这个发布权限，删除 GitHub 中的 `DEPLOY_SSH_KEY`，并在服务器 `/root/.ssh/authorized_keys` 删除包含 `yuashie-github-frontend` 的专用条目，保留其他登录公钥。

## 本地验证

执行 `python3 -m unittest discover -s tests -p 'test_github_frontend_deploy.py' -v`。这些测试使用临时目录，覆盖成功发布、备份、健康检查失败恢复、切换失败恢复、中断、路径越界、链接、重复路径、后台路径与提交编号校验，不连接生产服务器。

参考：[GitHub 手动运行工作流](https://docs.github.com/actions/managing-workflow-runs/manually-running-a-workflow)、[GitHub Secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)、[OpenSSH authorized_keys](https://man.openbsd.org/sshd.8)。

自动触发配置参考：[GitHub 工作流分支与路径筛选](https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions)。
