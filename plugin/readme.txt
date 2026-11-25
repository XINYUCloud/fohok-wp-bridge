=== FOHOK Bridge ===
Contributors: fohok
Tags: rest api, admin, mobile, app, management
Requires at least: 5.9
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

为 FOHOK WP Bridge 移动客户端提供 WordPress 站点全管理 REST 接口。

== Description ==

插件在 `/wp-json/fohok/v1` 下提供 WordPress 核心 REST API 未覆盖的后台能力：

* 鉴权验证、站点信息、内容统计、站点健康
* 插件：列表、安装、启用、停用、更新、删除
* 主题：列表、启用、更新、删除
* 更新：核心/插件/主题更新查询与执行
* 菜单：菜单与菜单项增删改、位置分配
* 小工具：侧边栏列表、排序、移除
* 设置：代理核心设置 API、连接密钥与跨域设置
* 角色列表

文章、页面、媒体、评论、用户、分类标签等继续使用 WordPress 核心 `/wp-json/wp/v2`。

支持两种登录方式：插件生成的连接密钥，或 WordPress 应用密码（Basic Auth）。

发行版更新：插件比对 GitHub `plugin-v*` 标签，APP 比对 `app-v*` 标签，二者独立发行。

== Installation ==

1. 上传插件到 `/wp-content/plugins/fohok-bridge/` 或在后台插件页安装。
2. 启用插件。
3. 进入「设置 → FOHOK Bridge」，复制连接密钥（仅显示一次）。
4. 在 APP 中填写站点地址并使用该密钥连接。

== Frequently Asked Questions ==

= 忘记密钥怎么办？ =
在插件设置页重新生成，旧密钥立即失效。

= 必须使用插件吗？ =
不。APP 可仅用核心 REST API + 应用密码管理文章、媒体、评论、用户等；插件用于解锁插件/主题/菜单/小工具/设置/更新等高级功能。

= 更新操作失败？ =
检查服务器文件系统权限与 WordPress 更新服务连通性；插件更新依赖 WP_Filesystem。

== Screenshots ==

1. 设置页展示连接密钥与跨域配置。

== Changelog ==

= 1.0.0 =
* 首个公开版本：核心后台全覆盖 REST 接口与 GitHub 发行版更新检查。
