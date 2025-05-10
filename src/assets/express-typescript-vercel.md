---
category: backend
tags:
    - Express.js
    - TypeScript
    - Vercel
    - Node.js
    - Backend
title: 在 Vercel 上部署 Express.js + TypeScript
description: 本文將介紹如何使用 TypeScript 開發 Express.js 應用，並將其部署到 Vercel 平台，包含從專案設置、本地開發到最終部署的完整流程。
language: zh-TW
date: 2025-03-03T14:27:00Z
---

## 前言

Vercel 是一個強大的雲端平台，主要用於靜態網站和 Serverless 函數的部署。雖然 Vercel 最為人所知的是它對 Next.js 的優秀支援，但它同樣可以用來部署 Express.js 應用。

本文將詳細介紹如何使用 TypeScript 開發 Express.js 應用，並將其部署到 Vercel 平台，讓你的 API 服務能夠快速上線並享受 Vercel 提供的全球 CDN 和持續部署等優勢。

## 為什麼選擇 Vercel 部署 Express.js 應用

+ **部署簡單**：Vercel 提供了簡單的部署流程，無需複雜的設定
+ **全球 CDN**：內建的全球 CDN 網路，提供低延遲的訪問體驗
+ **持續部署**：與 GitHub、GitLab 等版本控制系統整合，支援自動部署
+ **免費方案**：提供慷慨的免費方案，適合個人項目和小型應用

## 準備工作

在開始之前，請確保你已經安裝了以下工具：

1. Node.js（建議使用 v14 或更高版本）
2. npm、yarn 或 pnpm 套件管理工具
3. 一個 Vercel 帳號
4. 一個 Git 儲存庫（GitHub、GitLab 或 Bitbucket，本文使用 GitHub）

## 建立 Express.js + TypeScript 專案

### 1. 初始化專案

首先，讓我們建立一個新的專案目錄並初始化：

```bash
mkdir express-typescript-vercel
cd express-typescript-vercel
npm init -y
```

### 2. 安裝必要的依賴

接下來，安裝 Express.js 和 TypeScript 相關的依賴：

```bash
npm install express ejs
npm install -D typescript @types/node @types/express ts-node
```

### 3. 設定 TypeScript

使用 TypeScript 的命令行工具來生成 `tsconfig.json` 檔案：

```bash
npx tsc --init
```

### 4. 建立專案結構

在 local 開發環境下，會以專案根目錄的`index.ts`作為進入點，部署上 vercel 的則以`api/index.ts`作為進入點，因此 Express 的主要邏輯會寫在`src/app.ts`，並分別在兩個地方引入做使用。

```plaintext
├── api
│   └── index.ts
├── node_modules
│   └── ...
├── public
│   ├── images
│   │   └── logo.png
│   └── stylesheets
│       └── style.css
├── src
│   └── app.ts
├── views
│   └── index.ejs
├── index.ts
├── package-lock.json
├── package.json
├── tsconfig.json
└── vercel.json
```

### 5. 實作 Express.js 應用

建立 `src/app.ts` 檔案，實作一個基本的 Express.js 應用：

```typescript title="src/app.ts"
import express from "express";
import createError from "http-errors";
import * as path from "path";
// types
import type { Express, Request, Response } from "express";

// 建立 Express 應用
const app: Express = express();

// 模板引擎設定
app.set("views", path.resolve(process.cwd(), "views")); // 指定專案根目錄的 views 資料夾
app.set("view engine", "ejs"); // 指定模板引擎為 ejs

// 中間件設定
app.use(express.json()); // 解析 JSON 請求
app.use(express.urlencoded({ extended: false })); // 解析 URL-encoded 請求
app.use(express.static(path.resolve(process.cwd(), "public"))); // 設定專案根目錄的 public 資料夾作為靜態資料夾

// 路由設定 首頁
app.get("/", (req: Request, res: Response) => {
  // 設定 ejs 全域變數 locals.title 和 locals.message 的值
  res.render("index", { title: "Express", message: "Welcome to Express" });
});

// 路由設定 api 返回現在時間
app.get("/api/now", (req: Request, res: Response) => {
  try {
    const now = new Date().toISOString();
    res.status(200).json({ success: true, data: now });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? "Unknown Error" });
  }
});

// 404 錯誤處理
app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    res.status(404).json({
      success: false,
      message: "API endpoint not found"
    });
  } else {
    res.status(404).render("index", {
      title: "404 Not Found",
      message: "找不到您請求的頁面"
    });
  }
});

export default app;
```

在`index.ts`中引入`app`，並設定`port`。

```typescript title="index.ts"
import app from "./src/app";

const PORT = process?.env?.PORT ?? "3300";

app.set("port", PORT);

app.listen(PORT, () => {
  console.log(`server is running on http://localhost:${PORT}`);
});
```

在`api/index.ts`中引入`app`，並導出`app`作為 Vercel 的進入點。

```typescript title="api/index.ts"
import app from "../src/app";

export default app;
```

在`views/index.ejs`中使用`locals`全域變數，搭配`ejs`模板語法渲染畫面。

```ejs title="views/index.ejs"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= locals.title %></title>
  <link rel="icon" type="image/x-icon" href="/images/logo.png">
  <link rel="stylesheet" href="/stylesheets/style.css">
</head>
<body>
  <h1><%= locals.title %></h1>
  <p><%= locals.message %></p>
</body>
</html>
```

### 6. 設定 Vercel 配置

在專案根目錄建立 `vercel.json` 檔案，配置 Vercel 部署選項：

```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api"
    }
  ]
}
```

### 7. 更新 package.json

在 `package.json` 中添加以下腳本，方便本地開發和 vercel 部署：

```json title="package.json"
{
  "scripts": {
    "start": "ts-node index.ts",
    "vercel-build": "echo hello"
  },
}
```

### 8. 設定 nodemon（非必要）

為了提升開發體驗，我們可以使用`nodemon`來監控檔案變更並自動重啟應用程式。這個步驟是非必要的，但對於開發階段來說非常有幫助。

首先安裝 nodemon：

```bash
npm install -D nodemon
```

然後在 `package.json` 中添加開發腳本：

```json title="package.json"
{
  "scripts": {
    "start": "ts-node index.ts",
    "dev": "nodemon index.ts",
    "vercel-build": "echo hello"
  }
}
```

## 本地開發與測試

在部署到 Vercel 之前，我們可以在本地開發和測試我們的應用。

使用 npm 啟動應用：

```bash
npm start
```

或有安裝`nodemon`的話，則可以使用：

```bash
npm run dev
```

並至瀏覽器中訪問 `http://localhost:3300`和`http://localhost:3300/api/now` 來測試你的網頁及 API 是否正常。
![Express API 測試畫面](/images/2025-03/express_test_api.jpg)

## 部署到 Vercel

現在，讓我們將應用部署到 Vercel：

### 1. 將專案推送到 GitHub

![將專案推送到 GitHub](/images/2025-03/expres-typescript-vercel-github.jpg)

### 2. 在 Vercel 控制台中新增專案

![在 Vercel 控制台中新增專案](/images/2025-03/vercel-app-new-project.jpg)

### 3. 選擇專案來源

如果 github 帳號還沒有加入 Vercel 的話，需要先加入，已加入的則可跳過這步：

![加入 Vercel](/images/2025-03/connect-git.jpg)

### 4. 選擇 git repository

選擇你要部署的專案，這邊我們選擇剛剛建立的專案。

![選擇專案來源](/images/2025-03/import-git.jpg)

### 5. 修改部署設定

這邊可以修改專案名稱、部署設定、環境變數等，不過我們先保持預設，直接點擊 **Deploy**。

![修改部署設定](/images/2025-03/deploy.jpg)

### 6. 部署完成

到這一步有看到自己首頁的圖片的話，基本上就代表部署成功了，這時候可以點擊 **Continue to Dashboard** 來查看部署的結果。

![部署完成](/images/2025-03/go-to-dashboard.jpg)

### 7. 查看部署結果 

這邊可以看到 Vercel 幫你產生了一個獨立的網域，並且可以點擊進去查看部署的結果。

![查看部署結果](/images/2025-03/click-domain.jpg)

### 8. 測試網頁和 API 是否正常

![部署結果](/images/2025-03/test-express-api.jpg)

## 持續部署

Vercel 提供了持續部署的功能，當你 push 新的 commit 到 GitHub 時，Vercel 會自動部署你的應用，不過這設定是需要手動設定開啟的。這邊我們進到 **Project** 後點選 **Settings** > **Git**，並且把 **Commit Comments** 設定為 **ON**。

![開啟持續部署](/images/2025-03/deploy-on-commit.jpg)


## Serverless Function 的限制

在 Vercel 上運行 Express.js 應用時，需要注意一些無伺服器環境的限制：

1. **冷啟動**：函數在一段時間不活動後會進入休眠狀態，會導致休眠後第一次的請求時間較長
2. **無狀態**：無法在請求之間保持狀態，需要使用外部服務如 redis 或資料庫來存儲狀態
3. **檔案系統限制**：無法依賴檔案系統來存儲持久化資料

## 結語

通過以上設定，我們能達到使用 TypeScript 開發 Express.js 應用，並將其部署到 Vercel 平台。Vercel 與程式碼託管平台高度的整合，讓使用者無需管理複雜的伺服器基礎設定，雖然在無伺服器環境中運行 Express.js 應用有一些限制，但對於大多數個人應用和微服務來說，這是一個極具成本效益的解決方案。

## 參考資源

+ [Vercel 官方文件：使用 Express.js](https://vercel.com/guides/using-express-with-vercel)
+ [Express.js 官方文件](https://expressjs.com/en/starter/installing.html)