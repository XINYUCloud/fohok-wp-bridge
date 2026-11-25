# FOHOK WP Bridge

开源、任何人可用的 WordPress 全功能移动客户端。一个 APP 连接并管理用户的 WordPress 站点；WordPress 核心 REST API 未覆盖的后台能力由配套 PHP 插件补齐。

- 开发商：**FOHOK** · https://www.fohok.xin
- 联系/反馈：open@fohok.xin
- 仓库：https://github.com/XINYUCloud/fohok-wp-bridge
- 许可：GPLv2 or later

## 架构

```
APP（React + TypeScript + Capacitor）            WordPress 站点
 ├─ 核心功能 ────── /wp-json/wp/v2/* ──────────> WP 核心 REST API
 └─ 高级功能 ────── /wp-json/fohok/v1/* ───────> FOHOK Bridge 插件
```

APP 与插件**分开发行**：
- APP 版本标签：`app-v1.0.0`，APP 启动时比对 GitHub Releases。
- 插件版本标签：`plugin-v1.0.0`，WordPress 更新页比对同一仓库的发行版。

## 功能覆盖

| 模块 | 接口来源 | 能力 |
| --- | --- | --- |
| 文章/页面/自定义文章类型 | 核心 | 列表、搜索、新建、编辑、状态、摘要、正文、删除/回收站 |
| 媒体 | 核心 | 列表、上传、删除、缩略图 |
| 评论 | 核心 | 批准、待审、垃圾、回收站、删除 |
| 用户 | 核心 + 插件 | 列表、新建、角色变更、删除、角色清单 |
| 分类/标签 | 核心 | 列表、新建、描述、删除、任意公开分类法 |
| 菜单 | 插件 | 菜单与菜单项增删改、菜单位置分配 |
| 小工具 | 插件 | 侧边栏列表、排序、移除 |
| 主题 | 插件 | 列表、启用、更新、删除 |
| 插件 | 插件 | 列表、安装、启用/停用、更新、删除 |
| 站点设置 | 插件（代理核心） | 全部 `show_in_rest` 设置的读取与保存 |
| 更新 | 插件 | 核心/插件/主题更新查询与执行 |
| 站点健康 | 插件 | WP Site Health 测试项 |
| 多站点 | APP | 本地保存多个站点，一键切换 |
| 版本更新 | APP + 插件 | 比对 GitHub Releases，分别提示更新 |

## 目录

```
app/                     Capacitor 客户端（React + TS + Vite）
plugin/                  WordPress PHP 插件
docs/                    API 与发行文档
.github/workflows/       APP / 插件独立发行工作流
```

## 快速开始

### 插件

1. 将 `plugin/` 目录上传为 `wp-content/plugins/fohok-bridge/`。
2. 后台启用插件。
3. 「设置 → FOHOK Bridge」复制连接密钥（仅显示一次）。

### APP

```bash
cd app
npm install
npm run dev          # 本地开发
npm run build        # 生产构建，输出到 app/dist
npm run cap:sync     # 同步到原生平台
npm run cap:android  # 首次添加 Android 平台（需 Android Studio）
npm run cap:ios      # 首次添加 iOS 平台（需 macOS + Xcode）
```

APP 登录时填写站点地址，选择「连接密钥」（需插件）或「应用密码」（无需插件）。连接测试成功即可保存站点。

## 安全说明

- 连接密钥只在数据库中保存哈希，生成时仅显示一次；APP 本地保存凭据（后续可接入系统钥匙串）。
- 所有写操作仍在 WordPress 侧做 capability 校验，APP 不绕过权限模型。
- CORS 仅在请求带 `X-FOHOK-App` 头时放行，允许来源可在插件设置页限制。

## 发行

详见 [docs/RELEASE.md](docs/RELEASE.md)。推送 `plugin-v*` 标签只发行插件，推送 `app-v*` 标签只发行 APP。

## API

完整接口清单见 [docs/API.md](docs/API.md)。
