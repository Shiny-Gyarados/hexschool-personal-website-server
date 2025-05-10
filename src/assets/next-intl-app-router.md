---
category: frontend
tags:
    - Next.js
    - i18n
    - next-intl
title: 在 Next.js App Router 中整合 next-intl 實現多國語言
description: 本文將介紹如何在 Next.js App Router 專案中使用 next-intl 實現多國語言，包含安裝、設置及基本使用方式。
language: zh-TW
date: 2025-02-28T12:22:00Z
---

## 前言

Next.js 從13版本開始推出了App Router，而我們可以透過使用`next-intl`這個強大的庫來實現完整的多國語言功能，包括路由和內容翻譯。

本文將詳細介紹如何在Next.js App Router專案中設置`next-intl`，實現基於路徑前綴（如`/zh-TW/about`）的多語系網頁。

## 為什麼選擇 next-intl

+ 支援 client component、server component 以及非同步的 server component
+ 相較於其他多國語言庫，`next-intl` 的設置更為簡潔
+ 在切換路由時，提供與 Next.js 用法一致的 API 及元件


## 在 Next.js App Router 中設置 next-intl

如果你還沒有建立 Next.js 專案，請先建立一個使用 App Router 的專案，可以參考 Next.js 的 [官方文件](https://nextjs.org/docs/app/getting-started/installation)。

### 1. 安裝 next-intl

```bash
npm install next-intl
```

### 2. 檔案結構

```plaintext
├── messages
│   ├── en-US.json
│   ├── zh-TW.json
│   └── ...
├── next.config.ts
└── src
    ├── i18n
    │   ├── routing.ts
    │   ├── navigation.ts
    │   └── request.ts
    ├── middleware.ts
    └── app
        └── [locale]
            ├── [...rest]
            │   └── page.tsx
            ├── layout.tsx
            ├── not-found.tsx
            └── page.tsx
```

※ 如果是現有的專案想套用 next-intl 的設置，則需要將現有的頁面都移動到`[locale]`資料夾中。

※ 如果沒有使用`src`資料夾，則`i18n`及`middleware.ts`需要擺在與`app`資料夾相同層級的位置。

### 3. 建立翻譯檔案

在專案根目的`messages`資料夾內，替每種語言建立對應的 JSON 檔，並加入翻譯內容：

```json title="messages/en-US.json"
{
  "HomePage": {
    "title": "Hello world!",
    "about": "Go to the about page"
  },
  "NotFoundPage": {
    "title": "404 Not Found",
    "description": "The page you are looking for does not exist."
  }
}
```

```json title="messages/zh-TW.json"
{
  "HomePage": {
    "title": "你好，世界！",
    "about": "前往關於頁面"
  },
  "NotFoundPage": {
    "title": "404 找不到頁面",
    "description": "您正在尋找的頁面不存在。"
  }
}
```

### 4. 設置 next.config.ts

```typescript title="next.config.ts"
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
```

### 5. 設置路由配置

建立`src/i18n/routing.ts`檔案，定義支援的語言和預設語言：

```typescript title="src/i18n/routing.ts"
import { defineRouting } from "next-intl/routing";

export const LOCALES = ["zh-TW", "en-US"] as const;
export const DEFAULT_LOCALE = "zh-TW" as const;

export const routing = defineRouting({
  // 支援的語言
  locales: LOCALES,

  // 預設語言
  defaultLocale: DEFAULT_LOCALE,
});
```

### 6. 設置切換路由的 API 及元件

建立`src/i18n/navigation.ts`檔案，定義切換路由的 API 及元件：

```typescript title="src/i18n/navigation.ts"
import { createNavigation } from "next-intl/navigation";
import {routing} from "./routing";

// 切換路由時可使用的 API 及元件
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
``` 

### 7. 設置中間件

建立`src/middleware.ts`檔案，處理網頁重新導向：

```typescript title="src/middleware.ts"
import { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export function middleware(request: NextRequest) {
  const handleI18nRouting = createMiddleware(routing);
  const response = handleI18nRouting(request);
  return response;
}

export const config = {
  // 除了靜態資源、robots.txt、sitemap.xml、favicon.ico、api，其他都會經過中間件處理
  matcher: ["/((?!_next/static|robots.txt|sitemap.xml|favicon.ico|api).*)", "/", "/(zh-TW|en-US)/:path*"],
};
```

### 8. 處理加載翻譯的請求

建立`src/i18n/request.ts`檔案，用於加載翻譯：

```typescript title="src/i18n/request.ts"
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

### 9. 設置佈局

在`src/app/[locale]/layout.tsx`檔案中，加入`next-intl`的 provider：

```tsx title="src/app/[locale]/layout.tsx"
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
 
export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // 確保是支援的語言
  const { locale } = await params;
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // 取得翻譯資料
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### 10. 建立頁面測試翻譯功能

建立`src/app/[locale]/page.tsx`檔案，測試 useTranslations 以及 Link 元件是否能夠正常運作：

```tsx title="src/app/[locale]/page.tsx"
import { useTranslations } from "next-intl";
// 使用 next-intl 的 Link 元件會自動處理 locale 的前墜
import { Link } from "@/i18n/navigation";
 
export default function HomePage() {
  const t = useTranslations("HomePage");
  return (
    <div>
      <h1>{t("title")}</h1>
      <Link href="/about">{t("about")}</Link>
    </div>
  );
}
```

## 常見應用

### 1. 在非同步的 server component 中使用

```tsx
import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("HomePage");
  const response = await fetch("https://your-api-url.com/api/data");
  const data = await response.json();
  return (
    <div>
      <h1>{t("title")}</h1>
      <Link href="/about">{t("about")}</Link>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
```

### 2. 處理 Not Found 頁面

建立`src/app/[locale]/[...rest]/page.tsx`，將未定義的 route 轉至 not found 頁面：

```tsx title="src/app/[locale]/[...rest]/page.tsx"
import { notFound } from "next/navigation";

export default function CatchAllPage() {
  notFound();
}
```

建立`src/app/[locale]/not-found.tsx`，編輯自己的 Not Found 頁面：

```tsx title="src/app/[locale]/not-found.tsx"
"use client";

import { useTranslations } from "next-intl";

export default function NotFoundPage() {
  const t = useTranslations("NotFoundPage");
  return (
    <div>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
    </div>
  );
}
```

### 3. 切換語言

```tsx
"use client";

import { usePathname, Link } from "@/i18n/routing";
import { useLocale } from "next-intl";

const languages = [
  { locale: "zh-TW", name: "繁體中文" },
  { locale: "en-US", name: "English" },
];

function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  return (
    <>
      {languages.map((language) => {
        return (
          <Link
            href={pathname}
            locale={language.locale}
            key={language.locale}
          >
            {language.name}{locale === language.locale && "✓"}
          </Link>
        )
      })}
    </>
  );
}

export default function Page() {
  return (
    <div>
      <LanguageSwitcher />
    </div>
  )
}
```

### 4. 轉址

```tsx
"use client";

import { redirect } from "@/i18n/navigation";

export default function Page() {
  redirect({ href: "/login", locale: "zh-TW" });
}
```

```tsx
"use client";

import { useRouter } from "@/i18n/navigation";

export default function Page() {
  const router = useRouter();
  return (
    <button onClick={() => router.push("/login", { locale: "zh-TW" })}>
      登入
    </button>
  )
}
```

## 結語

通過以上步驟，你已經成功在 Next.js App Router 專案中整合了`next-intl`，實現了完整的多國語言功能。`next-intl`不僅提供開發者簡易的多國語言設置方式，還提供了與 Next.js 一致的 API 及元件，使多國語言的開發不需要額外再學習 API 及元件的用法。

## 參考來源

+ [next-intl官方文件](https://next-intl.dev/docs/getting-started/app-router)