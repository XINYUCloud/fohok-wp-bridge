# 发行规范

APP 与插件共用仓库，但使用**独立标签**，互不触发对方的发行流程。

## 版本格式

| 组件 | 标签示例 | 版本来源 |
| --- | --- | --- |
| 插件 | `plugin-v1.0.0` | `plugin/fohok-bridge.php` 的 `Version` 与 `FOHOK_BRIDGE_VERSION` |
| APP | `app-v1.0.0` | `app/package.json` 的 `version` 与 `src/lib/api.ts` 的 `APP_VERSION` |

## 发布插件

1. 同步修改 `plugin/fohok-bridge.php` 中两处版本号与 `plugin/readme.txt` 的 `Stable tag`。
2. 提交并打标签：
   ```bash
   git tag plugin-v1.0.0
   git push origin plugin-v1.0.0
   ```
3. `.github/workflows/plugin-release.yml` 自动打包 `plugin/` 为 `fohok-bridge-1.0.0.zip` 并创建 GitHub Release。
4. 站点后台的插件更新页会比对 `plugin-v*` 标签，提示新版本（缓存 6 小时）。

## 发布 APP

1. 同步修改 `app/package.json`、`app/src/lib/api.ts`、`app/README`（如有）中的版本号。
2. 提交并打标签：
   ```bash
   git tag app-v1.0.0
   git push origin app-v1.0.0
   ```
3. `.github/workflows/app-release.yml` 执行 `npm ci && npm run build`，打包 `app/dist` 为 `fohok-app-1.0.0-web.zip` 并创建 Release。
4. APP「关于」页比对 `app-v*` 标签，提示新版本。
5. 原生包：本地执行 `npm run cap:sync`，再用 Android Studio / Xcode 构建上传对应商店；标签仅负责 Web 产物与更新提示。

## 注意事项

- 不要在插件标签里夹带 APP 版本变更，反之亦然；两个工作流按前缀过滤。
- 发行资产名保持 `fohok-bridge-<version>.zip` 与 `fohok-app-<version>-web.zip`，便于自动更新器识别。
