# REST API 清单

## 鉴权

两种方式可同时使用，请求头二选一：

- `X-FOHOK-Token: <插件生成的连接密钥>`
- `Authorization: Basic base64(username:application_password)`

所有请求建议带 `X-FOHOK-App: 1`，用于插件放行 CORS。

## 核心 API（WordPress 自带）

前缀 `/wp-json/wp/v2/`：

- `GET /users/me` — 登录验证
- `GET|POST /posts`、`/pages`、`/types`、`/taxonomies`
- `GET|POST|DELETE /posts/{id}` 等（所有已注册文章类型）
- `GET|POST /media`、`POST /media`（ multipart 上传）
- `GET|POST /comments`、`/comments/{id}`
- `GET|POST /users`、`/users/{id}`
- `GET|POST /categories`、`/tags` 等分类法
- `GET|POST /settings`

## 插件 API

前缀 `/wp-json/fohok/v1/`：

### 系统与站点

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | `/auth/verify` | 当前用户、能力、站点概览、功能开关 | 已登录 |
| GET | `/site/info` | 站点名称、版本、统计、更新数量 | 已登录 |
| GET | `/site/health` | 站点健康测试项 | manage_options |
| GET | `/system/roles` | 角色与能力列表 | 已登录 |

### 插件与主题

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/plugins` | 已安装插件、状态、可用更新 |
| POST | `/plugins/install` | 按 slug 安装插件 |
| POST | `/plugins/{slug}/{activate\|deactivate\|update\|delete}` | 插件操作 |
| GET | `/themes` | 已安装主题、状态、可用更新 |
| POST | `/themes/{slug}/{activate\|update\|delete}` | 主题操作 |
| GET | `/updates` | 核心/插件/主题更新清单 |
| POST | `/updates/{core\|plugins\|themes}` | 执行更新 |

### 外观

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/menus`、`/menus/{id}` | 菜单与菜单项 |
| POST | `/menus` | 新建菜单 |
| POST | `/menus/{id}` | 修改菜单名/slug |
| DELETE | `/menus/{id}` | 删除菜单 |
| POST | `/menus/{id}/items` | 添加菜单项（custom / post_type） |
| DELETE | `/menus/{id}/items/{item}` | 删除菜单项 |
| GET | `/menus/locations` | 主题注册的菜单位置 |
| POST | `/menus/{id}/locations` | 分配菜单位置 |
| GET | `/widgets`、`/widgets/sidebars` | 小工具与侧边栏 |
| POST | `/widgets/sidebars/{id}` | 保存侧边栏小工具顺序 |
| DELETE | `/widgets/sidebars/{id}` | 从侧边栏移除小工具（query: `widget`） |

### 设置

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET/POST | `/settings/core` | 代理核心 `/wp/v2/settings` |
| GET/POST | `/settings/bridge` | 插件连接设置（来源、功能开关） |
| POST | `/settings/bridge/token` | 重新生成连接密钥，返回一次性明文 |

所有端点返回标准 WordPress REST 响应格式；失败返回 `WP_Error`（含 `code`、`message`、`data.status`）。
