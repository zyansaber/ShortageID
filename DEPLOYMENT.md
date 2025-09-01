# Render.com 部署指南

## 部署步骤

### 1. 准备代码仓库
确保您的代码已推送到 GitHub、GitLab 或 Bitbucket 仓库。

### 2. 在 Render.com 创建服务
1. 登录 [Render.com](https://render.com)
2. 点击 "New +" 按钮
3. 选择 "Static Site"

### 3. 配置部署设置
- **Repository**: 选择您的代码仓库
- **Branch**: 选择要部署的分支（通常是 `main` 或 `master`）
- **Root Directory**: 留空（如果项目在仓库根目录）或填写实际项目目录名
- **Build Command**: `corepack enable && pnpm install && pnpm run build`
- **Publish Directory**: `dist`

### 4. 环境变量（如需要）
如果您的应用需要环境变量，请在 Render 控制台的 Environment 部分添加：
- `NODE_VERSION`: `20`
- 其他必要的环境变量（如 Firebase 配置）

### 5. 高级设置
- **Auto-Deploy**: 启用以便在代码推送时自动部署
- **Pull Request Previews**: 可选择启用以便为 PR 创建预览

## 自动部署配置

项目包含 `render.yaml` 文件，支持 Infrastructure as Code 部署：

1. 在 Render 控制台选择 "Blueprint"
2. 连接您的仓库
3. Render 会自动读取 `render.yaml` 配置

## 本地测试构建

在部署前，建议本地测试构建：

```bash
# 启用 corepack（如果需要）
corepack enable

# 安装依赖
pnpm install

# 构建项目
pnpm run build

# 预览构建结果
pnpm run preview
```

## 重要配置说明

### Node.js 版本
- 项目使用 Node.js 20（推荐版本，避免 EOL 警告）
- `.nvmrc` 文件指定版本为 20

### 包管理器
- 使用 pnpm 作为包管理器
- `corepack enable` 确保 pnpm 在 Render 环境中可用
- `packageManager` 字段指定具体版本

### SPA 路由支持
- `render.yaml` 配置了 SPA 重写规则
- 所有路由都重定向到 `index.html`，支持客户端路由

## 故障排除

### 构建失败
- 检查 Node.js 版本是否为 20+
- 确保所有依赖都在 package.json 中正确声明
- 检查构建日志中的错误信息

### pnpm 相关问题
- 如果遇到 pnpm 不可用，确保构建命令包含 `corepack enable`
- 检查 `packageManager` 字段是否正确设置

### 路由问题
- 确保 `render.yaml` 中包含了正确的重写规则
- 对于 SPA 应用，所有路由都应重定向到 `index.html`

### 静态资源问题
- 检查 `vite.config.js` 中的 `base` 配置
- 确保资源路径使用相对路径

## 性能优化

- 启用 gzip 压缩（Render 默认启用）
- 使用 CDN 加速静态资源
- 优化图片和其他静态资源大小
- 考虑代码分割以减少初始包大小

## 监控和维护

- 在 Render 控制台查看部署日志
- 设置自定义域名（如需要）
- 配置 SSL 证书（Render 自动提供）
- 监控应用性能和错误日志