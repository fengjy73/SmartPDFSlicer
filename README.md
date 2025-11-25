<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Smart PDF Slicer · PDF Slice & Chat AI

一个现代化的 PDF 章节切片工具，支持基于目录的区域选取、实时预览，并内置可理解所选页面内容的 AI 助手。几秒内导出干净、精确的 PDF 片段。

A modern PDF slicing tool with outline-based section extraction, real-time preview, and an AI-powered assistant that understands the pages you select. Export clean, precise PDF fragments in seconds.

---

## 简介 (Overview)

- 支持按 PDF 目录（大纲）一键选择章节范围，或手动勾选具体页码
- 中间预览区实时渲染所选页面，支持缩放与“自适应页面高度”
- 右侧 AI 助手基于所选页面的文本与图像进行理解、总结与问答
- 一键导出所选页面为全新 PDF 文件，文件名自动根据章节标题生成

- Outline-based chapter range selection with optional manual page picking
- Live preview with zoom and fit-to-page-height controls
- AI assistant understands selected pages via extracted text and rendered page images
- One-click export to a new PDF; filename auto-filled using matched outline title

---

## 功能 (Features)

- 目录联动选择：在左侧目录中勾选章节，自动计算章节起止页码
- 页面实时预览：平滑切页、缩放比例显示、首次自动自适应高度
- 智能总结与问答：基于所选页面进行结构化总结，支持中文提问
- 片段导出：支持批量选择并导出为独立 PDF，干净无多余内容

- Outline-linked selection: auto-computed start/end pages per chapter
- Real-time preview: smooth paging, zoom percentage, initial auto fit-height
- Smart summary & Q&A: structured summaries from selected pages; multilingual prompts
- Fragment export: batch-selected pages exported to a clean standalone PDF

---

## 快速开始 (Quick Start)

**环境要求：** Node.js

1. 安装依赖：
   `npm install`
2. 配置密钥：在项目根目录创建 `.env.local`，设置：
   `GEMINI_API_KEY=你的Gemini密钥`
3. 本地运行：
   `npm run dev`
4. 访问地址：`http://localhost:3000`

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Configure API key: create `.env.local` at project root with:
   `GEMINI_API_KEY=your_gemini_api_key`
3. Run locally:
   `npm run dev`
4. Open: `http://localhost:3000`

构建与预览 (Build & Preview)：

- 构建：`npm run build`
- 预览：`npm run preview`

---

## 使用指南 (Usage)

1. 上传 PDF：点击首页卡片或拖拽 PDF 到页面
2. 浏览目录：左侧自动解析 PDF 大纲；可展开/折叠子项
3. 选择片段：在目录项上勾选，或手动勾选具体页码范围
4. 预览确认：中间预览区支持翻页与缩放，自适应高度更省心
5. AI 助手：右侧输入问题或点击“Smart Summary”快速总结
6. 导出下载：点击顶部“Cut & Download”，自动生成文件名并下载

1. Upload a PDF: click the landing card or drag-and-drop a file
2. Browse outline: left panel shows parsed outline; expand/collapse items
3. Select pages: check chapters or manually pick page ranges
4. Preview: center panel renders pages with paging/zoom and fit-height
5. AI Assistant: ask questions or use “Smart Summary” for concise insights
6. Export: use “Cut & Download”; filename is auto-filled from outline

---

## AI 助手 (AI Assistant)

- 使用 Google Gemini（`@google/genai`）对所选页面进行分析，支持文本与页面图像的多模态输入
- 在 `vite.config.ts` 中将 `.env.local` 的 `GEMINI_API_KEY` 注入为 `process.env.API_KEY` 与 `process.env.GEMINI_API_KEY`
- 初始系统提示词已优化为基于所选章节的 Markdown 友好输出

- Powered by Google Gemini (`@google/genai`), combining extracted text and rendered page images
- `vite.config.ts` injects `.env.local` `GEMINI_API_KEY` into `process.env.API_KEY` and `process.env.GEMINI_API_KEY`
- System prompt tuned for chapter-focused, Markdown-friendly answers

---

## 技术栈 (Tech Stack)

- 前端：React + Vite
- PDF 处理：`react-pdf`（渲染、目录解析）、`pdf-lib`（页面复制与新文档生成）
- UI：Tailwind（CDN 注入）、`lucide-react` 图标、`react-markdown` 渲染 AI 输出

- Frontend: React + Vite
- PDF: `react-pdf` (rendering & outline), `pdf-lib` (page copy/new doc)
- UI: Tailwind via CDN, `lucide-react` icons, `react-markdown` for AI output

---

## 环境变量 (Environment)

- 在 `.env.local` 中设置：`GEMINI_API_KEY`
- 运行时通过 Vite 的 `define` 注入到 `process.env.API_KEY` / `process.env.GEMINI_API_KEY`

- Set `GEMINI_API_KEY` in `.env.local`
- Injected at build into `process.env.API_KEY` / `process.env.GEMINI_API_KEY` by Vite

---

## 代码参考 (Code References)

- Gemini 客户端与生成逻辑：`services/geminiService.ts:3`, `services/geminiService.ts:11`
- PDF 切片：`services/pdfUtils.ts:15`
- 文本提取：`services/pdfUtils.ts:42`
- 页面图片渲染：`services/pdfUtils.ts:77`
- 大纲解析与页码计算：`components/PreviewPanel.tsx:29`, `App.tsx:76`
- 目录选择面板：`components/OutlinePanel.tsx:84`
- 预览面板：`components/PreviewPanel.tsx:16`
- AI 助手面板：`components/AssistantPanel.tsx:13`

- Gemini client and generation: `services/geminiService.ts:3`, `services/geminiService.ts:11`
- PDF slicing: `services/pdfUtils.ts:15`
- Text extraction: `services/pdfUtils.ts:42`
- Page image rendering: `services/pdfUtils.ts:77`
- Outline parsing & range calc: `components/PreviewPanel.tsx:29`, `App.tsx:76`
- Outline panel: `components/OutlinePanel.tsx:84`
- Preview panel: `components/PreviewPanel.tsx:16`
- Assistant panel: `components/AssistantPanel.tsx:13`

---

## 注意事项 (Notes)

- 大量页面渲染会消耗浏览器内存，项目已顺序处理页渲染以降低压力
- 如遇无法解析目录，仍可通过手动页码选择进行切片

- Rendering many pages can be memory-intensive; images are processed sequentially to reduce pressure
- If outline resolution fails, manual page selection still works for slicing
