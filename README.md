# WeCard - 微信客服名片管理系统

WeCard 是一个轻量级、响应式的全栈应用，旨在帮助您轻松管理和分享微信客服二维码与微信号。该系统允许您创建自定义的短连接，并展示美观的名片页面，方便客户快速添加您的微信。

## ✨ 主要功能

- **自定义短链 (Slug)**：为每个名片创建专属短链接（如 `/sales`、`/support`），支持一键复制和跳转。
- **默认路由设置**：可设置将网站根目录（`/`）直接重定向至某个特定名片。
- **二维码上传与展示**：自带本地图片上传功能，上传后的二维码直观展示在名片页。
- **一键复制微信号**：名片页面提供一键复制微信号功能，并在移动端支持调用微信（`weixin://`）。
- **多语言与多主题**：内置中英文切换，支持浅色（Light）、深色（Dark）和系统自适应主题。
- **轻量级存储**：无需配置复杂的数据库，系统采用本地 JSON 文件 (`/data/data.json`) 存储数据，并支持本地持久化。
- **JWT 身份认证**：后台管理面板受到 JWT 和用户名密码保护，安全可靠。

## 🚀 部署方式 (推荐使用 Docker Compose)

本项目已完美适配 Docker 环境。使用 Docker Compose 可以帮助您一键部署应用与数据挂载。

1. **克隆项目 / 准备文件**
   请确保您的目录下包含 `docker-compose.yml`、`Dockerfile` 等核心文件。

2. **配置环境变量**
   您可以在 `docker-compose.yml` 中修改以下环境变量（建议在生产环境中更改默认密码和 Secret）：
   - `ADMIN_USER`: 后台管理账号（默认：`admin`）
   - `ADMIN_PASS`: 后台管理密码（默认：`password`）
   - `SECRET_KEY`: JWT 鉴权密钥（请务必修改为强度较高的随机字符串）

   > **⚠️ 重要注意：** 如果您的密码或 Secret 中包含 `$` 符号（例如 `my$Wg8pass`），在 `docker-compose.yml` 中必须使用两个 `$$` 进行转义（写成 `my$$Wg8pass`）。否则 Docker 会误将其当作环境变量处理，从而提示变量未设置的警告（如 `The "Wg8" variable is not set`），并导致密码实际为空或不对。

3. **启动服务**
   ```bash
   docker-compose up -d
   ```

4. **访问系统**
   - 客户端名片前台：`http://localhost:3000/您的自定义短链`
   - 后台管理系统：`http://localhost:3000/login`

> **提示**：启动后，系统会在项目目录下自动生成 `data` 和 `uploads` 文件夹以保存您的数据库文件和二维码图像。在迁移时只需备份这两个目录即可。

## 🔄 如何更新

如果您已经使用 Docker Compose 部署了本项目，可以通过以下步骤无损更新到最新版本（您的数据和图片安全地存放在 `data` 和 `uploads` 目录中，不会丢失）：

1. **获取最新代码**
   ```bash
   git pull
   ```
   *(如果您是通过下载 ZIP 解压部署的，请下载最新源码并覆盖，**注意千万不要覆盖或删除** `data` 和 `uploads` 文件夹以及 `docker-compose.yml` 中您自定义的环境变量设置)*

2. **重新构建镜像并重启服务**
   ```bash
   docker-compose up -d --build
   ```
   *(如果是较新版本的 Docker，命令为 `docker compose up -d --build`)*

系统会自动拉取最新代码重新构建镜像，并替换旧容器，整个过程零停机或仅有短暂重启，您的名片数据完美保留。

## 🛠️ 技术栈

- **前端**: React, TypeScript, Tailwind CSS, Vite
- **后端**: Go (Golang) 高性能极简运行时 (支持标准库路由与精简 JWT 解析)
  - *注：开发预览环境保持 Node.js / Vite 兼容，生产 Docker 容器采用双阶段构建一键编译为高性能 Native Go 运行二进制。*
- **存储**: 本地文件系统 (Go 线程安全 Mutex 保护 JSON 存储及 `io` 流传输)
- **认证**: JSON Web Token (JWT)

## 📁 目录结构说明

- `src/` - React 前端源代码 (页面、组件、上下文等)
- `main.go` - Go 生产后端服务器与 API 路由（取代原生 Express 核心，运行时开销降低 ~95%）
- `server.ts` - Node.js 开发测试用 Express 后端与 Vite dev 接口代理
- `go.mod` - Go 依赖与模块清单
- `data/` - (运行时生成) 存放 `data.json` 数据库
- `uploads/` - (运行时生成) 存放用户上传的二维码图片
- `docker-compose.yml` - Docker 编排配置
- `Dockerfile` - Docker 生产级三阶段精简构建脚本 (编译前端 -> 编译 Go 静态包 -> 极简 Alpine)
