# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**止盈助手** — 基金分批止盈追踪 PWA，部署在 GitHub Pages (`https://csezhi.github.io/fund/`)。

单页应用，无构建步骤，无框架，无 npm。所有逻辑在 `index.html` 一个文件里。

## Deployment

```bash
git add index.html sw.js  # 只提交必要文件
git commit -m "描述"
git push origin main      # 推到 GitHub Pages 自动部署
```

Remote: `git@github.com:CSeZhi/fund.git`（需 SSH key）

## Architecture

```
index.html          # 主应用（全部逻辑：UI + 业务 + OCR + 网络）
sw.js               # Service Worker（推送通知 + tessdata 缓存拦截）
manifest.json       # PWA manifest
tessdata/           # 自托管 Tesseract 语言包（避免 CDN 访问失败）
  chi_sim.traineddata.gz
  eng.traineddata.gz
icon-192.png        # PWA 图标（根目录，manifest 引用的）
icon-512.png
```

## Data Layer

- 所有数据存 `localStorage` key: **`fundStopProfit_v3`**
- 结构: `{ funds: {[key]: FundObj}, navCache: {[code]: number}, triggers: {[key]: TriggerObj} }`
- `FundObj.fundCode` — 6位数字基金代码（用于 API 查询）；基金 key 可能是名称截取，不一定是代码

## Key Functions (index.html)

| 函数 | 作用 |
|------|------|
| `parseOCRData(data)` | 坐标分列 OCR 解析（主），用 `words[].bbox` 按 42% 宽度分左/右列，按 Y 轴 18px bucket 分行 |
| `parseOCRText(text)` | 纯文本 OCR 解析（兜底） |
| `fetchNavWithCache(fundKey)` | 查净值（优先 JSONP → 东方财富移动 API → 缓存） |
| `fetchNavFromMobileAPI(code)` | 东方财富 `fundmobapi.eastmoney.com`，用 AbortController 超时 |
| `triggerBatchScan()` | 批量图片 OCR 入口 |
| `openFundEditSheet(code)` | 编辑基金代码/名称（可迁移 key） |
| `openFundNavSheet(code)` | 手动录入/重置单个基金净值 |

## Net Value API Pattern

两层兜底，**不加任何自定义 Header**（避免 CORS 预检）：

1. HTTPS JSONP: `https://fundgz.1234567.com.cn/js/{code}.js`
2. 东方财富移动 API: `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo?plat=Android&appType=ttjj&fundcode={code}`
3. 手动录入

AbortController 超时模式（不用 `AbortSignal.timeout`，旧手机不支持）：
```javascript
const ctrl = new AbortController();
const t = setTimeout(() => ctrl.abort(), 8000);
try { await fetch(url, { signal: ctrl.signal }); } finally { clearTimeout(t); }
```

## OCR Architecture

当前使用 Tesseract.js v5（浏览器端）：
- 语言包自托管于 `./tessdata/`，Service Worker 拦截缓存
- `parseOCRData` 使用 `words[].bbox` 坐标，解决天天基金 app 截图两列文字读序错乱问题

**计划迁移**：前端把图片 POST 到 Python OCR 后端（PaddleOCR 或 EasyOCR），后端部署在 Linux 服务器。
API 格式设计：`POST /ocr` → `multipart/form-data` → 返回 `{ words: [{text, bbox: {x0,y0,x1,y1}}] }`（与 Tesseract words 格式兼容，前端 `parseOCRData` 无需改动）。

## Known Issues / Constraints

- GitHub Pages 是静态托管，不能跑服务端代码
- 网络请求必须 HTTPS（混合内容限制）
- 中国大陆访问 GitHub / jsDelivr 可能被墙，tessdata 已本地化
- OCR 识别"接C"问题：通过坐标分列已修复，确认中

## Files NOT to commit

- `make-icons.html` — 一次性工具，已用完
- `分批止盈系统计划书（初版）.txt` — 规划文档，非代码
- `.claude/` — Claude 本地配置
