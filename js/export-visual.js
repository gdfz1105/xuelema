import { getCategory } from "./categories.js";
import { getJournal, getTasksForDate } from "./storage.js";
import { getNoteStyle } from "./note-styles.js";
import { stickerInnerHtml } from "./stickers.js";
import { MOOD, ENERGY } from "./export.js";
import { EXPORT_FONT } from "./fonts.js";

const SLEEP_LABELS = ["", "很差", "较差", "一般", "较好", "很好"];

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

/* ── 贴纸渲染（真实外观） ─────────────────── */

/** 把 placedStickers 渲染成真实贴纸外观，按 zone 分组排列在笔记纸四周 */
function renderStickersForZone(placedStickers, zone) {
  if (!placedStickers?.length) return "";
  const items = placedStickers.filter(p => (p.zone || "top") === zone);
  if (!items.length) return "";
  return items.map(p => {
    const rot = p.rot ?? 0;
    return `<span class="ex-sticker-item" style="--rot:${rot}deg">${stickerInnerHtml(p.stickerId)}</span>`;
  }).join("");
}

function hasStickers(placedStickers, zone) {
  return (placedStickers || []).some(p => (p.zone || "top") === zone);
}

/* ── 笔记模板对应的纸张样式 ─────────────────── */

const PAPER_STYLES = {
  minimal: { bg: "#fffef9", border: "1px solid #e8e4de", lineColor: "transparent",  extra: "" },
  cute:    { bg: "#fff5f8", border: "1px solid #f0c8d8", lineColor: "#fce0e8",       extra: "dots" },
  retro:   { bg: "#f5ede0", border: "1px solid #c8a878", lineColor: "#e8d8c0",       extra: "" },
  nature:  { bg: "#f2f8f0", border: "1px solid #a8cc98", lineColor: "#dcecd8",       extra: "" },
  dreamy:  { bg: "#f5f0ff", border: "1px solid #c8b0f0", lineColor: "#e8e0f8",       extra: "" },
  grid:    { bg: "#f8f8ff", border: "1px solid #c8c8e8", lineColor: "#d8d8f0",       extra: "grid" },
  candy:   { bg: "#fff8f5", border: "1px solid #f0c0a8", lineColor: "#fce8e0",       extra: "" },
  night:   { bg: "#1a2040", border: "1px solid #3a4880", lineColor: "#2a3060",       extra: "night" },
};

function getPaperStyle(styleId) {
  return PAPER_STYLES[styleId] || PAPER_STYLES.minimal;
}

function noteTextColor(styleId) {
  return styleId === "night" ? "#c8d8f8" : "#4a4541";
}

/* ── 渲染完整笔记区块（含贴纸+模板） ──────── */

function buildNoteBlock(title, emoji, note) {
  const hasContent = note?.content?.trim();
  const hasAnySticker = (note?.placedStickers || []).length > 0;

  if (!hasContent && !hasAnySticker) {
    return `<div class="ex-note-block ex-note-empty">
      <div class="ex-note-title">${emoji} ${title}</div>
      <div class="ex-note-muted">（暂无内容）</div>
    </div>`;
  }

  const styleId = note.style || "minimal";
  const ps = getPaperStyle(styleId);
  const textColor = noteTextColor(styleId);
  const styleLabel = getNoteStyle(styleId).label;

  // 各方向贴纸
  const topStickers    = renderStickersForZone(note.placedStickers, "top");
  const bottomStickers = renderStickersForZone(note.placedStickers, "bottom");
  const leftStickers   = renderStickersForZone(note.placedStickers, "left");
  const rightStickers  = renderStickersForZone(note.placedStickers, "right");

  const hasTop    = hasStickers(note.placedStickers, "top");
  const hasBottom = hasStickers(note.placedStickers, "bottom");
  const hasLeft   = hasStickers(note.placedStickers, "left");
  const hasRight  = hasStickers(note.placedStickers, "right");

  // 纸张背景装饰（方格/波点）
  let bgDecor = "";
  if (ps.extra === "grid") {
    bgDecor = `<div class="ex-paper-grid-bg"></div>`;
  } else if (ps.extra === "dots") {
    bgDecor = `<div class="ex-paper-dots-bg"></div>`;
  }

  return `<div class="ex-note-block" style="--paper-bg:${ps.bg};--paper-border:${ps.border};--paper-line:${ps.lineColor};--note-text:${textColor}">
    <div class="ex-note-title">${emoji} ${title} <span class="ex-note-style-tag">${styleLabel}</span></div>
    ${hasTop ? `<div class="ex-sticker-zone ex-sticker-zone-top">${topStickers}</div>` : ""}
    <div class="ex-note-row">
      ${hasLeft ? `<div class="ex-sticker-zone ex-sticker-zone-side">${leftStickers}</div>` : ""}
      <div class="ex-paper" style="background:${ps.bg};border:${ps.border};color:${textColor}">
        ${bgDecor}
        <div class="ex-paper-content">${hasContent ? esc(note.content) : '<span style="color:#bbb;font-style:italic">（无文字内容）</span>'}</div>
      </div>
      ${hasRight ? `<div class="ex-sticker-zone ex-sticker-zone-side">${rightStickers}</div>` : ""}
    </div>
    ${hasBottom ? `<div class="ex-sticker-zone ex-sticker-zone-bottom">${bottomStickers}</div>` : ""}
  </div>`;
}

/* ── 所有内联 CSS（含贴纸视觉样式） ────────── */

const EXPORT_CSS = `
  * { box-sizing: border-box; }

  .export-sheet {
    font-family: ${EXPORT_FONT};
    font-size: 14px;
    line-height: 1.65;
    color: #4a4541;
    background: #fffef9;
    padding: 32px 36px 40px;
    width: 720px;
  }

  /* ── 页眉 ── */
  .ex-header { margin-bottom: 24px; border-bottom: 2px solid #e8e2da; padding-bottom: 14px; }
  .ex-header h1 { font-size: 24px; margin: 0 0 4px; color: #6a8a8a; letter-spacing: -0.02em; }
  .ex-header .ex-date-label { font-size: 13px; color: #9a9088; }

  /* ── 通用版块 ── */
  .ex-section { margin-bottom: 20px; }
  .ex-section-title {
    font-size: 15px; font-weight: 700; color: #5a5550;
    margin-bottom: 10px; padding-bottom: 5px;
    border-bottom: 1px dashed #ddd;
    display: flex; align-items: center; gap: 6px;
  }
  .ex-meta   { font-size: 12px; color: #888; }
  .ex-muted  { color: #bbb; font-style: italic; font-size: 13px; }
  .ex-foot   { font-size: 11px; color: #bbb; margin-top: 32px; text-align: right; }

  /* ── 一句总结 ── */
  .ex-summary-row {
    display: flex; align-items: flex-start; gap: 7px;
    margin-top: 8px; padding: 8px 12px;
    background: #f8f5f0; border-radius: 8px;
    border-left: 3px solid #c8b8a8;
  }
  .ex-summary-icon { font-size: 13px; flex-shrink: 0; margin-top: 1px; }
  .ex-summary-text { font-size: 13px; color: #5a5550; line-height: 1.5; font-style: italic; }

  /* ── 文献阅读简报 ── */
  .ex-lit-row {
    display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
    padding: 8px 12px; background: #f0f5f8; border-radius: 8px;
  }
  .ex-lit-badge {
    font-size: 12px; font-weight: 700; color: #fff;
    background: #5ba4cf; padding: 2px 9px; border-radius: 20px;
    flex-shrink: 0;
  }
  .ex-lit-mins { font-size: 12px; color: #7a9ab0; flex-shrink: 0; }
  .ex-lit-titles { font-size: 12px; color: #7a8a90; line-height: 1.5; }

  /* ── 任务列表 ── */
  .ex-task-list { list-style: none; margin: 0; padding: 0; }
  .ex-task-item {
    display: flex; align-items: center; gap: 8px;
    padding: 5px 0; border-bottom: 1px solid #f0ece6;
    font-size: 13.5px;
  }
  .ex-task-item:last-child { border-bottom: none; }
  .ex-task-check {
    width: 18px; height: 18px; border-radius: 50%;
    border: 2px solid #ccc; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px;
  }
  .ex-task-check.done { background: #90d080; border-color: #70b860; color: #fff; }
  .ex-task-cat {
    font-size: 11px; padding: 1px 7px; border-radius: 20px;
    color: #fff; flex-shrink: 0;
  }
  .ex-task-time { font-size: 11px; color: #aaa; }
  .ex-task-title { flex: 1; }
  .ex-task-title.done { text-decoration: line-through; color: #aaa; }

  /* ── 状态栏 ── */
  .ex-status-row {
    display: flex; gap: 16px; flex-wrap: wrap;
    background: #f8f5f0; border-radius: 10px;
    padding: 10px 14px;
  }
  .ex-status-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .ex-status-label { font-size: 11px; color: #aaa; }
  .ex-status-val   { font-size: 13px; font-weight: 600; color: #5a5550; }

  /* ── 笔记块 ── */
  .ex-note-block { margin-bottom: 18px; }
  .ex-note-title {
    font-size: 14px; font-weight: 700; color: #5a5550;
    margin-bottom: 6px; display: flex; align-items: center; gap: 6px;
  }
  .ex-note-style-tag {
    font-size: 10px; font-weight: 400; color: #aaa;
    background: #f0ece6; padding: 1px 6px; border-radius: 10px;
  }
  .ex-note-empty .ex-note-muted { font-size: 13px; color: #ccc; font-style: italic; padding: 6px 0; }

  /* 贴纸区域 */
  .ex-sticker-zone {
    display: flex; flex-wrap: wrap; gap: 6px;
    padding: 4px 2px;
  }
  .ex-sticker-zone-top    { justify-content: flex-start; margin-bottom: 4px; }
  .ex-sticker-zone-bottom { justify-content: flex-start; margin-top: 4px; }
  .ex-sticker-zone-side   { flex-direction: column; justify-content: center; padding: 0 4px; }

  .ex-note-row { display: flex; align-items: stretch; gap: 0; }

  /* 贴纸单项 */
  .ex-sticker-item {
    display: inline-flex; align-items: center; justify-content: center;
    transform: rotate(var(--rot, 0deg));
  }

  /* 纸张 */
  .ex-paper {
    flex: 1; border-radius: 10px; padding: 14px 16px;
    position: relative; overflow: hidden;
    min-height: 60px;
  }
  .ex-paper-content { position: relative; z-index: 1; white-space: pre-wrap; font-size: 13.5px; line-height: 1.7; }

  /* 方格背景 */
  .ex-paper-grid-bg {
    position: absolute; inset: 0; z-index: 0;
    background-image:
      linear-gradient(var(--paper-line) 1px, transparent 1px),
      linear-gradient(90deg, var(--paper-line) 1px, transparent 1px);
    background-size: 20px 20px;
  }
  /* 波点背景 */
  .ex-paper-dots-bg {
    position: absolute; inset: 0; z-index: 0;
    background-image: radial-gradient(circle, var(--paper-line) 1.5px, transparent 1.5px);
    background-size: 16px 16px;
  }

  /* ── 贴纸原生样式（与 app 一致） ── */
  .ht-tape {
    display: block;
    width: 52px; height: 18px;
    background: var(--tape);
    opacity: 0.75;
    border-radius: 2px;
    box-shadow: 0 1px 3px rgba(0,0,0,.08);
  }
  .ht-tag {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 2px 9px; border-radius: 20px;
    font-size: 11px; font-weight: 600; white-space: nowrap;
    box-shadow: 0 1px 3px rgba(0,0,0,.08);
  }
  .ht-stamp {
    display: inline-flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; border-radius: 50%;
    box-shadow: 0 1px 4px rgba(0,0,0,.1);
  }
  .ht-stamp-emoji { font-size: 18px; line-height: 1; }
  .ht-icon {
    display: inline-block;
    font-size: 22px; line-height: 1;
  }
  .ht-clip {
    display: block;
    width: 10px; height: 28px;
    border: 2.5px solid #b0b8c0;
    border-radius: 6px 6px 0 0;
    border-bottom: none;
    position: relative;
  }
  .ht-dots { display: inline-flex; gap: 3px; align-items: center; }
  .ht-dots i {
    display: block; width: 7px; height: 7px;
    border-radius: 50%; background: var(--accent, #c0b8b0);
    font-style: normal;
  }
  .ht-legacy { font-size: 20px; }
`;

/* ── buildExportHtml 主函数 ─────────────────── */

export function buildExportHtml(scope, state, dateKey, dateLabel) {
  const journal  = getJournal(state, dateKey);
  const tasks    = getTasksForDate(state, dateKey);
  const now      = new Date().toLocaleString("zh-CN");

  let title = `今天学了吗？ · ${dateLabel}`;
  let body  = "";

  if (scope === "day") {
    // ── 任务完成 ──
    const done = tasks.filter(t => t.completed).length;
    const taskRows = tasks.length
      ? `<ul class="ex-task-list">${tasks.map(t => {
          const cat  = getCategory(t.categoryId);
          const time = t.startTime && t.endTime
            ? `<span class="ex-task-time">${t.startTime.slice(0,5)}–${t.endTime.slice(0,5)}</span>`
            : "";
          return `<li class="ex-task-item">
            <div class="ex-task-check${t.completed ? " done" : ""}">${t.completed ? "✓" : ""}</div>
            <span class="ex-task-title${t.completed ? " done" : ""}">${esc(t.title)}</span>
            <span class="ex-task-cat" style="background:${cat.color}">${cat.label}</span>
            ${time}
          </li>`;
        }).join("")}</ul>
        <p class="ex-meta" style="margin-top:6px">已完成 <strong>${done}</strong> / ${tasks.length} 项</p>`
      : `<p class="ex-muted">今日无任务</p>`;

    body += `<div class="ex-section">
      <div class="ex-section-title">📋 任务完成</div>
      ${taskRows}
    </div>`;

    // ── 今日状态 ──
    const studyHours = ((journal.studyMorning || 0) + (journal.studyAfternoon || 0) + (journal.studyEvening || 0));
    body += `<div class="ex-section">
      <div class="ex-section-title">🌟 今日状态</div>
      <div class="ex-status-row">
        <div class="ex-status-item"><span class="ex-status-label">情绪</span><span class="ex-status-val">${journal.mood ? MOOD[journal.mood] : "—"}</span></div>
        <div class="ex-status-item"><span class="ex-status-label">精力</span><span class="ex-status-val">${journal.energy ? ENERGY[journal.energy] : "—"}</span></div>
        <div class="ex-status-item"><span class="ex-status-label">睡眠</span><span class="ex-status-val">${journal.sleep ? SLEEP_LABELS[journal.sleep] : "—"}</span></div>
        ${studyHours > 0 ? `<div class="ex-status-item"><span class="ex-status-label">学习时长</span><span class="ex-status-val">${studyHours.toFixed(1)}h</span></div>` : ""}
      </div>
      ${journal.reflection?.summary ? `<div class="ex-summary-row"><span class="ex-summary-icon">✏️</span><span class="ex-summary-text">${esc(journal.reflection.summary)}</span></div>` : ""}
    </div>`;

    // ── 文献阅读简报 ──
    const papers = journal.papers || [];
    const litMinutes = papers.reduce((s, p) => s + (p.minutes || 0), 0);
    body += `<div class="ex-section">
      <div class="ex-section-title">📖 文献阅读</div>
      ${papers.length
        ? `<div class="ex-lit-row">
            <span class="ex-lit-badge">${papers.length} 篇</span>
            ${litMinutes > 0 ? `<span class="ex-lit-mins">共 ${litMinutes} 分钟</span>` : ""}
            <span class="ex-lit-titles">${papers.map((p,i) => `${i+1}. ${esc(p.title || "未命名")}`).join("　")}</span>
           </div>`
        : `<p class="ex-muted">今日未添加文献</p>`}
    </div>`;

    // ── 小记一笔 ──
    body += `<div class="ex-section">
      <div class="ex-section-title">✏️ 小记一笔</div>
      ${buildNoteBlock("小收获", "🌱", journal.reflection?.accomplished)}
      ${buildNoteBlock("小问题", "🫠", journal.reflection?.unfinished)}
    </div>`;

  } else if (scope === "reflection") {
    title = `小记一笔 · ${dateLabel}`;
    body  = buildNoteBlock("小收获", "🌱", journal.reflection?.accomplished);
    body += buildNoteBlock("小问题", "🫠", journal.reflection?.unfinished);
  }
  // scope === "lit" 已删除

  const el = document.createElement("div");
  el.className = "export-sheet";
  el.innerHTML = `
    <style>${EXPORT_CSS}</style>
    <div class="ex-header">
      <h1>今天学了吗？</h1>
      <div class="ex-date-label">${esc(dateLabel)} · 导出于 ${now}</div>
    </div>
    ${body}
    <p class="ex-foot">今天学了吗？ · 学术轻量日程</p>
  `;
  return el;
}

/* ── 导出工具函数（不变） ───────────────────── */

async function loadHtml2Canvas() {
  return (await import("https://esm.sh/html2canvas@1.4.1")).default;
}

async function loadJsPDF() {
  return (await import("https://esm.sh/jspdf@2.5.2")).jsPDF;
}

export async function exportAsPng(scope, state, dateKey, dateLabel, basename) {
  const html2canvas = await loadHtml2Canvas();
  const sheet = buildExportHtml(scope, state, dateKey, dateLabel);
  sheet.style.position = "fixed";
  sheet.style.left = "-9999px";
  sheet.style.top = "0";
  document.body.appendChild(sheet);
  try {
    const canvas = await html2canvas(sheet, {
      scale: 2,
      backgroundColor: "#fffef9",
      logging: false,
      useCORS: true,
    });
    const a = document.createElement("a");
    a.download = `${basename}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  } finally {
    document.body.removeChild(sheet);
  }
}

export async function exportAsPdf(scope, state, dateKey, dateLabel, basename) {
  const html2canvas = await loadHtml2Canvas();
  const jsPDF = await loadJsPDF();
  const sheet = buildExportHtml(scope, state, dateKey, dateLabel);
  sheet.style.position = "fixed";
  sheet.style.left = "-9999px";
  sheet.style.top = "0";
  document.body.appendChild(sheet);
  try {
    const canvas = await html2canvas(sheet, {
      scale: 2,
      backgroundColor: "#fffef9",
      logging: false,
      useCORS: true,
    });
    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height * imgW) / canvas.width;
    const pageContentH = pageH - margin * 2;
    let offsetY = 0;
    let page = 0;
    while (offsetY < imgH) {
      if (page > 0) pdf.addPage();
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        margin,
        margin - offsetY,
        imgW,
        imgH
      );
      offsetY += pageContentH;
      page++;
    }
    pdf.save(`${basename}.pdf`);
  } finally {
    document.body.removeChild(sheet);
  }
}

export async function runVisualExport(scope, state, dateKey, dateLabel, format, basename) {
  if (format === "png") return exportAsPng(scope, state, dateKey, dateLabel, basename);
  if (format === "pdf") return exportAsPdf(scope, state, dateKey, dateLabel, basename);
}
