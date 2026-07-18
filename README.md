# 五子棋 · Gomoku Mobile

一个手机优先、离线可玩的五子棋小游戏。玩家执黑先手，与本地 JavaScript 电脑对战。

## 功能

- 15 × 15 标准棋盘
- 普通、强势、碾压三档难度
- 悔棋与重新开始
- 响应式手机界面
- PWA 离线缓存
- GitHub Pages 在线游玩
- GitHub Actions 云端构建 Android APK

> “碾压”难度使用候选点筛选、棋型评分、极大极小搜索与 Alpha-Beta 剪枝。它借鉴了策略评估与搜索思路，但不是 AlphaGo 神经网络模型。

## 在线游玩

首次推送后，`Deploy GitHub Pages` 工作流会自动部署 `www/`。如果 Pages 尚未启用，请进入仓库：

`Settings → Pages → Source → GitHub Actions`

## 下载 APK

1. 打开仓库的 `Actions` 页面。
2. 进入 `Build Android APK`。
3. 等待最新一次工作流完成。
4. 在页面底部的 `Artifacts` 下载 `gomoku-mobile-debug-apk`。
5. 解压 ZIP，安装其中的 `app-debug.apk`。

Android 可能提示“允许安装未知来源应用”，这是 GitHub Actions 生成的调试 APK 的正常安装流程。

## 本地运行网页版

```bash
python -m http.server 8080 -d www
```

然后访问 `http://localhost:8080`。

## 本地生成 Android 项目

需要 Node.js 22 与 Java 21：

```bash
npm install
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

APK 位于：

`android/app/build/outputs/apk/debug/app-debug.apk`
