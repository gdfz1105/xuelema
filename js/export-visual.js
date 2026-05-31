import { getCategory } from "./categories.js";
import { getJournal, getTasksForDate } from "./storage.js";
import { getNoteStyle } from "./note-styles.js";
import { formatPlacedStickersExport, stickerExportLabel } from "./stickers.js";
import { MOOD, ENERGY } from "./export.js";
import { EXPORT_FONT } from "./fonts.js";

const ZONE_LABELS = { top: "上方", left: "左侧", right: "右侧", bottom: "下方" };
const SLEEP_LABELS = ["", "很差", "较差", "一般", "较好", "很好"];

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function placedStickersHtml(placed) {
  if (!placed?.length) return "";
  const byZone = {};
  placed.forEach((p) => {
    const z = p.zone || "top";
    if (!byZone[z]) byZone[z] = [];
    byZone[z].push(stickerExportLabel(p.stickerId));
  });
  return `<div class="ex-stickers">${Object.entries(byZone)
    .map(([z, labels]) => `<p><strong>${ZONE_LABELS[z] || z}：</strong>${labels.join(" · ")}</p>`)
    .join("")}</div>`;
}

function noteSectionHtml(title, note) {
  if (!note?.content?.trim() && !note?.placedStickers?.length) {
    return `<section class="ex-block"><h3>${title}</h3><p class="ex-muted">（暂无内容）</p></section>`;
  }
  const style = getNoteStyle(note.style || "minimal").label;
  return `<section class="ex-block">
    <h3>${title}</h3>
    <p class="ex-meta">模板：${style}</p>
    ${placedStickersHtml(note.placedStickers)}
    <div class="ex-body">${esc(note.content)}</div>
  </section>`;
}

export function buildExportHtml(scope, state, dateKey, dateLabel) {
  const journal = getJournal(state, dateKey);
  const tasks = getTasksForDate(state, dateKey);
  const now = new Date().toLocaleString("zh-CN");

  let title = `今天学了吗？ · ${dateLabel}`;
  let body = "";

  if (scope === "day") {
    const done = tasks.filter((t) => t.completed).length;
    body += `<section class="ex-block"><h2>任务完成</h2>
      <p>${tasks.length ? `已完成 <strong>${done}</strong> / ${tasks.length} 项` : "今日无任务"}</p>`;
    if (tasks.length) {
      body += "<ul>" + tasks.map((t) => {
        const cat = getCategory(t.categoryId);
        const mark = t.completed ? "✓" : "○";
        return `<li>${mark} ${esc(t.title)} <span class="ex-meta">· ${cat.label}</span></li>`;
      }).join("") + "</ul>";
    }
    body += `</section>
    <section class="ex-block"><h2>情绪与精力</h2>
      <p>情绪：${journal.mood ? MOOD[journal.mood] : "未记录"} · 精力：${journal.energy ? ENERGY[journal.energy] : "未记录"} · 睡眠：${journal.sleep ? SLEEP_LABELS[journal.sleep] : "未记录"}${journal.studyMinutes ? ` · 学习时长：${journal.studyMinutes} 分钟` : ""}</p>
    </section>`;

    body += `<section class="ex-block"><h2>文献阅读</h2>`;
    if (!(journal.papers || []).length) {
      body += `<p class="ex-muted">今日未添加文献</p>`;
    } else {
      journal.papers.forEach((p, i) => {
        body += `<div class="ex-paper"><h3>${i + 1}. ${esc(p.title || "未命名文献")}</h3>`;
        if (p.minutes) body += `<p class="ex-meta">${p.minutes} 分钟</p>`;
        body += placedStickersHtml(p.placedStickers);
        body += `<div class="ex-body">${esc(p.content) || '<span class="ex-muted">无笔记</span>'}</div></div>`;
      });
    }
    body += `</section>`;
    body += noteSectionHtml("🌱 小收获", journal.reflection?.accomplished);
    body += noteSectionHtml("🫠 小问题", journal.reflection?.unfinished);
  } else if (scope === "lit") {
    title = `文献笔记 · ${dateLabel}`;
    if (!(journal.papers || []).length) {
      body = `<p class="ex-muted">暂无文献记录</p>`;
    } else {
      journal.papers.forEach((p, i) => {
        body += `<div class="ex-paper"><h2>${i + 1}. ${esc(p.title || "未命名")}</h2>`;
        if (p.minutes) body += `<p class="ex-meta">${p.minutes} 分钟</p>`;
        body += placedStickersHtml(p.placedStickers);
        body += `<div class="ex-body">${esc(p.content) || '<span class="ex-muted">无内容</span>'}</div></div>`;
      });
    }
  } else {
    title = `小记一笔 · ${dateLabel}`;
    body = noteSectionHtml("小收获", journal.reflection?.accomplished);
    body += noteSectionHtml("小问题", journal.reflection?.unfinished);
  }

  const el = document.createElement("div");
  el.className = "export-sheet";
  el.innerHTML = `
    <style>
      .export-sheet {
        font-family: ${EXPORT_FONT};
        font-size: 14px;
        line-height: 1.65;
        color: #4a4541;
        background: #fffef9;
        padding: 28px 32px;
        width: 720px;
        box-sizing: border-box;
      }
      .export-sheet h1 { font-size: 22px; margin: 0 0 6px; color: #8b9a9a; }
      .export-sheet h2 { font-size: 16px; margin: 18px 0 8px; border-bottom: 1px dashed #ddd; padding-bottom: 4px; }
      .export-sheet h3 { font-size: 14px; margin: 12px 0 6px; }
      .export-sheet .ex-foot { font-size: 11px; color: #999; margin-top: 20px; }
      .export-sheet .ex-meta { font-size: 12px; color: #888; }
      .export-sheet .ex-muted { color: #aaa; font-style: italic; }
      .export-sheet .ex-body { margin-top: 6px; white-space: pre-wrap; }
      .export-sheet .ex-block { margin-bottom: 12px; }
      .export-sheet .ex-paper { margin: 10px 0; padding: 10px; background: #faf8f5; border-radius: 8px; }
      .export-sheet .ex-stickers { font-size: 12px; color: #888; margin: 4px 0; }
      .export-sheet ul { margin: 6px 0; padding-left: 1.2em; }
    </style>
    <h1>${esc(title)}</h1>
    <p class="ex-meta">导出时间：${now}</p>
    ${body}
    <p class="ex-foot">今天学了吗？ · 学术轻量日程</p>
  `;
  return el;
}

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
      page += 1;
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
