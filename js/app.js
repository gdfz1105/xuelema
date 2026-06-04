import { CATEGORIES, getCategory } from "./categories.js";
import { renderStats } from "./stats.js";
import { TASK_SHAPES, getShape, shapeClass } from "./shapes.js";
import {
  loadState,
  saveState,
  dateKey,
  getJournal,
  setJournal,
  getTasksForDate,
  defaultJournal,
} from "./storage.js";
import {
  renderWeekCalendar,
  renderMonthCalendar,
  formatPeriodLabel,
  addDays,
  WEEKDAYS,
} from "./calendar.js";
import { BG_THEMES, applyTheme } from "./themes.js";
import { FONT_THEMES, applyFontTheme } from "./fonts.js";
import { NOTE_STYLES, getNoteStyle } from "./note-styles.js";
import {
  DECOR_STICKERS,
  decorStickerInnerHtml,
  decorPaletteBtnHtml,
} from "./stickers.js";
import {
  initNoteStickerPalette,
  loadPlacedStickers,
  getPlacedStickers,
  bindNoteEditorEvents,
  clearNoteEditor,
} from "./note-editor.js";
import { exportAsMarkdown, getExportBasename } from "./export.js";
import { runVisualExport } from "./export-visual.js";

let noteEditorBound = false;

let state = loadState();
let view = "week";
let statsRange = 7;
let anchor = new Date();
anchor.setHours(0, 0, 0, 0);
let selectedKey = dateKey(anchor);
let editingTaskId = null;
let selectedDecorSticker = DECOR_STICKERS[0].id;

/** @type {{ type: string, paperId?: string }} */
let noteContext = null;

const $ = (sel) => document.querySelector(sel);

const calendarEl = $("#calendar");
const periodLabel = $("#period-label");
const detailPanel = $("#detail-panel");
const mainEl = document.querySelector(".main");
const decorLayer = $("#decor-layer");
const appRoot = $("#app-root");

const MOOD_LABELS = ["😫", "😕", "😐", "🙂", "😊"];
const ENERGY_LABELS = ["极低", "较低", "一般", "较好", "充沛"];
const SLEEP_LABELS = ["很差", "较差", "一般", "较好", "很好"];

function persist() {
  saveState(state);
  render();
}

function render() {
  applyTheme(state.settings.bgThemeId);
  applyFontTheme(state.settings.fontThemeId || "cute");
  renderDecorStickers();
  const statsEl = document.getElementById("stats-container");
  if (view === "stats") {
    periodLabel.textContent = "数据统计";
    if (statsEl) { statsEl.style.display = "block"; }
    calendarEl.style.display = "none";
    const hint = $("#calendar-hint");
    if (hint) hint.classList.add("hidden");
    if (statsEl) renderStats(statsEl, state, statsRange);
  } else {
    if (statsEl) { statsEl.style.display = "none"; }
    calendarEl.style.display = "";
    periodLabel.textContent = formatPeriodLabel(view, anchor);
    if (view === "week") {
      renderWeekCalendar(calendarEl, state, anchor, selectedKey);
    } else {
      renderMonthCalendar(calendarEl, state, anchor, selectedKey);
    }
  }
  renderLegend();
  updatePanelChrome();
  // 统计视图时隐藏日历导航、侧边栏、重新打开按钮
  const navEl = document.querySelector(".nav");
  const todayBtn = document.querySelector(".today-btn");
  const legendEl = document.querySelector(".legend");
  const reopenBtn = $("#reopen-panel-btn");
  if (navEl) navEl.style.visibility = view === "stats" ? "hidden" : "";
  if (todayBtn) todayBtn.style.visibility = view === "stats" ? "hidden" : "";
  if (legendEl) legendEl.style.display = view === "stats" ? "none" : "";
  if (view === "stats") {
    // 统计视图：强制隐藏侧边栏和重新打开按钮，重置双栏布局
    detailPanel.classList.add("hidden");
    mainEl.classList.remove("has-panel");
    if (reopenBtn) reopenBtn.classList.add("hidden");
  } else {
    // 切回日历视图时，若之前有选中日期则重新显示面板
    if (selectedKey && !detailPanel.classList.contains("hidden")) {
      renderPanel(selectedKey);
    }
  }
  updateStickerModeUI();
}

function updatePanelChrome() {
  const panelOpen = !detailPanel.classList.contains("hidden");
  const reopenBtn = $("#reopen-panel-btn");
  const hint = $("#calendar-hint");

  reopenBtn.classList.toggle("hidden", panelOpen || !selectedKey);
  hint.classList.toggle("hidden", panelOpen);

  if (selectedKey) {
    $("#reopen-panel-label").textContent = `查看 ${dateLabel(selectedKey)}`;
  }
}

function dateLabel(key) {
  const [y, m, d] = key.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

function renderLegend() {
  $("#legend-list").innerHTML = CATEGORIES.map(
    (c) =>
      `<li class="legend-item"><span class="legend-dot" style="background:${c.color}"></span>${c.label}</li>`
  ).join("");
}

function renderDecorStickers() {
  const stickers = state.settings.decorStickers || [];
  decorLayer.innerHTML = stickers
    .map((s) => {
      const inner = decorStickerInnerHtml(s.stickerId, s.emoji);
      return `<span class="decor-sticker" data-id="${s.id}" style="left:${s.x}%;top:${s.y}%;--rot:${s.rot ?? 0}deg" title="双击删除">${inner}</span>`;
    })
    .join("");
}

function placeDecorSticker(clientX, clientY) {
  // appRoot 是 position:relative 的定位祖先，
  // decor-sticker 的 left/top% 就是相对 appRoot 的尺寸
  const rect = appRoot.getBoundingClientRect();
  // 鼠标在 appRoot 内的相对坐标（不加 scroll，因为 rect 已随滚动变化）
  const relX = clientX - rect.left;
  const relY = clientY - rect.top;
  // 百分比相对于 appRoot 的渲染宽高
  const x = (relX / appRoot.offsetWidth)  * 100;
  const y = (relY / appRoot.offsetHeight) * 100;
  state.settings.decorStickers.push({
    id: crypto.randomUUID(),
    stickerId: selectedDecorSticker,
    x,
    y,
    rot: Math.round(Math.random() * 24 - 12),
  });
  persist();
}

function isStickerPlacementTarget(target) {
  if (target.closest("dialog, input, textarea, select, button, a, label")) return false;
  if (target.closest(".decor-sticker, .sticker-mode-banner, .theme-dialog")) return false;
  if (target.closest("#theme-dialog")) return false;
  return true;
}

function updateStickerModeUI() {
  const on = state.settings.stickerMode;
  decorLayer.classList.toggle("sticker-active", on);
  document.body.classList.toggle("sticker-mode-on", on);
  $("#sticker-mode-banner").classList.toggle("hidden", !on);
  const checkbox = $("#sticker-mode");
  if (checkbox) checkbox.checked = on;
}

function openPanel(key) {
  selectedKey = key;
  detailPanel.classList.remove("hidden");
  mainEl.classList.add("has-panel");
  render();
}

function closePanel() {
  detailPanel.classList.add("hidden");
  mainEl.classList.remove("has-panel");
  render();
}

function previewText(text, fallback) {
  const t = (text || "").trim();
  if (!t) return fallback;
  return t.length > 36 ? t.slice(0, 36) + "…" : t;
}

function stickerCountLabel(placed) {
  const n = placed?.length ?? 0;
  return n ? ` · ${n} 张贴纸` : "";
}

function renderPanel(key) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayIndex = (date.getDay() + 6) % 7;

  $("#panel-weekday").textContent = WEEKDAYS[dayIndex];
  $("#panel-date").textContent = `${y}年${m}月${d}日`;

  const tasks = getTasksForDate(state, key);
  const list = $("#task-list");
  const empty = $("#task-empty");

  if (tasks.length === 0) {
    list.innerHTML = "";
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
    list.innerHTML = tasks
      .map((t) => {
        const cat = getCategory(t.categoryId);
        const shape = getShape(t.shapeId);
        const time =
          t.startTime && t.endTime
            ? `${t.startTime.slice(0, 5)} – ${t.endTime.slice(0, 5)}`
            : `${cat.label} · ${shape.label}`;
        return `
          <li class="task-item" data-id="${t.id}">
            <span class="task-color-bar" style="background:${cat.color}"></span>
            <input type="checkbox" ${t.completed ? "checked" : ""} aria-label="完成" />
            <div class="task-item-body">
              <div class="task-item-title">${escapeHtml(t.title)}</div>
              <div class="task-item-meta">${escapeHtml(time)}</div>
            </div>
            <div class="task-item-actions">
              <button type="button" data-action="edit" title="编辑">✎</button>
              <button type="button" data-action="delete" title="删除">🗑</button>
            </div>
          </li>
        `;
      })
      .join("");
  }

  const done = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  $("#completion-fill").style.width = `${pct}%`;
  $("#completion-text").textContent =
    total === 0 ? "今日尚无任务" : `已完成 ${done} / ${total} 项（${pct}%）`;

  // 文献阅读篇数
  const journal = getJournal(state, key);
  const litCountInput = $("#lit-paper-count");
  if (litCountInput) {
    litCountInput.value = journal.litCount != null ? journal.litCount : "";
  }

  $("#preview-accomplished").textContent = previewText(
    journal.reflection.accomplished.content,
    "点击写写今天的小开心…"
  );
  $("#preview-unfinished").textContent = previewText(
    journal.reflection.unfinished.content,
    "卡壳的、没做完的…"
  );
  $("#preview-summary").textContent = previewText(
    journal.reflection?.summary,
    "今天一句话记下来…"
  );

  renderScale("#mood-scale", MOOD_LABELS, journal.mood, "mood");
  renderScale("#energy-scale", ENERGY_LABELS, journal.energy, "energy");
  renderScale("#sleep-scale", SLEEP_LABELS, journal.sleep, "sleep");

  // 学习时长三段
  const slots = [
    { id: "study-morning",   field: "studyMorning"   },
    { id: "study-afternoon", field: "studyAfternoon" },
    { id: "study-evening",   field: "studyEvening"   },
  ];
  slots.forEach(({ id, field }) => {
    const el = $(`#${id}`);
    if (el) el.value = journal[field] != null ? journal[field] : "";
  });
  updateStudyTotal(journal);

  // 一句总结
  const summaryInput = $("#summary-input");
  if (summaryInput) summaryInput.value = journal.reflection?.summary || "";
}

function updateStudyTotal(journal) {
  const m = (journal.studyMorning || 0) + (journal.studyAfternoon || 0) + (journal.studyEvening || 0);
  const hint = $("#study-total-hint");
  if (!hint) return;
  hint.textContent = m > 0 ? `今日合计 ${m.toFixed(1)} 小时` : "";
}


function renderScale(selector, labels, value, field) {
  const el = $(selector);
  el.innerHTML = labels
    .map((label, i) => {
      const v = i + 1;
      const sel = value === v ? " selected" : "";
      return `<button type="button" class="scale-btn${sel}" data-value="${v}">${label}</button>`;
    })
    .join("");
  el.dataset.field = field;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

function updateJournalForSelected(updater) {
  const key = selectedKey;
  const journal = getJournal(state, key);
  setJournal(state, key, updater(journal));
  persist();
}

function updateJournalField(partial) {
  updateJournalForSelected((j) => ({ ...j, ...partial }));
}

// —— 主题 ——
function initThemeDialog() {
  const fontPicker = $("#font-picker");
  fontPicker.innerHTML = FONT_THEMES.map((f) => {
    const sel = f.id === (state.settings.fontThemeId || "cute") ? " selected" : "";
    const titleFont = f.vars["--font-title"];
    return `<button type="button" class="font-swatch${sel}" data-id="${f.id}" title="${f.desc}">
      <span class="font-swatch-name" style="font-family:${titleFont}">${f.label}</span>
      <small>${f.desc}</small>
    </button>`;
  }).join("");

  const picker = $("#theme-picker");
  const groups = [
    { label: "莫兰迪", filter: (t) => t.group === "morandi" },
    { label: "马卡龙", filter: (t) => t.group === "macaron" },
  ];
  picker.innerHTML = groups
    .map((g) => {
      const swatches = BG_THEMES.filter(g.filter)
        .map((t) => {
          const sel = t.id === state.settings.bgThemeId ? " selected" : "";
          const bg = t.vars["--bg"];
          return `<button type="button" class="theme-swatch${sel}" data-id="${t.id}" style="background:${bg}">${t.label}</button>`;
        })
        .join("");
      return `<div><div class="theme-group-label">${g.label}</div><div class="theme-swatches">${swatches}</div></div>`;
    })
    .join("");

  $("#decor-palette").innerHTML = DECOR_STICKERS.map((s) =>
    decorPaletteBtnHtml(s, s.id === selectedDecorSticker)
  ).join("");
}

function openThemeDialog() {
  initThemeDialog();
  $("#theme-dialog").showModal();
}

function openExportDialog(defaultScope = "day") {
  if (!selectedKey) return;
  $("#export-date-label").textContent = `当前日期：${dateLabel(selectedKey)}`;
  $("#export-scope").value = defaultScope;
  $("#export-format").value = "pdf";
  $("#export-status").textContent = "";
  $("#export-status").className = "export-note";
  $("#export-dialog").showModal();
}


async function openDiaryPreview() {
  if (!selectedKey) return;
  const journal = getJournal(state, selectedKey);
  const tasks = getTasksForDate(state, selectedKey);
  const [y, m, d] = selectedKey.split("-").map(Number);
  const dateLabel = `${y}年${m}月${d}日`;

  // 加时间戳防止浏览器缓存旧模块
  const _v = `?v=${Date.now()}`;
  const { buildExportHtml } = await import(`./export-visual.js${_v}`);
  const sheet = buildExportHtml("day", state, selectedKey, dateLabel);
  sheet.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;overflow:auto;z-index:9999;background:#fffef9;padding:32px;box-sizing:border-box;";

  // Add close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "× 关闭预览";
  closeBtn.style.cssText = "position:fixed;top:16px;right:20px;z-index:10000;padding:8px 18px;background:var(--accent);color:#fff;border:none;border-radius:20px;cursor:pointer;font-size:0.9rem;";
  closeBtn.onclick = () => { sheet.remove(); closeBtn.remove(); exportBtns.remove(); };

  // Add export buttons
  const exportBtns = document.createElement("div");
  exportBtns.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:10000;display:flex;gap:10px;";
  exportBtns.innerHTML = `
    <button class="btn primary small" id="diary-export-pdf">导出 PDF</button>
    <button class="btn primary small" id="diary-export-png">导出图片</button>
    <button class="btn secondary small" id="diary-export-md">导出 Markdown</button>
  `;

  document.body.appendChild(sheet);
  document.body.appendChild(closeBtn);
  document.body.appendChild(exportBtns);

  exportBtns.querySelector("#diary-export-pdf").onclick = async () => {
    const { exportAsPdf } = await import(`./export-visual.js${_v}`);
    await exportAsPdf("day", state, selectedKey, dateLabel, `今天学了吗-${selectedKey}`);
  };
  exportBtns.querySelector("#diary-export-png").onclick = async () => {
    const { exportAsPng } = await import(`./export-visual.js${_v}`);
    await exportAsPng("day", state, selectedKey, dateLabel, `今天学了吗-${selectedKey}`);
  };
  exportBtns.querySelector("#diary-export-md").onclick = async () => {
    const { exportAsMarkdown } = await import(`./export.js${_v}`);
    exportAsMarkdown("day", state, selectedKey, dateLabel);
  };
}

async function confirmExport() {
  if (!selectedKey) return;
  const scope = $("#export-scope").value;
  const format = $("#export-format").value;
  const label = dateLabel(selectedKey);
  const basename = getExportBasename(scope, selectedKey);
  const status = $("#export-status");
  const btn = $("#export-confirm");

  btn.disabled = true;
  status.className = "export-note loading";
  status.textContent =
    format === "md" ? "正在生成文件…" : "正在排版并生成，首次需联网加载组件…";

  try {
    if (format === "md") {
      exportAsMarkdown(scope, state, selectedKey, label);
    } else {
      await runVisualExport(scope, state, selectedKey, label, format, basename);
    }
    status.className = "export-note";
    status.textContent = "导出成功！请查看下载文件夹。";
    setTimeout(() => $("#export-dialog").close(), 800);
  } catch (err) {
    status.className = "export-note error";
    status.textContent = "导出失败，请检查网络后重试（PDF/图片需联网）。";
    console.error(err);
  } finally {
    btn.disabled = false;
  }
}

// —— 笔记编辑器 ——
function openNoteEditor(ctx) {
  noteContext = ctx;
  const dialog = $("#note-dialog");
  const journal = getJournal(state, selectedKey);
  let note = { content: "", style: "minimal", placedStickers: [] };
  let title = "笔记";

  $("#paper-meta-row").classList.add("hidden");

  if (ctx.type === "paper") {
    const paper = journal.papers.find((p) => p.id === ctx.paperId);
    if (!paper) return;
    note = paper;
    title = "文献笔记";
    $("#paper-meta-row").classList.remove("hidden");
    $("#note-paper-title").value = paper.title || "";
    $("#note-paper-minutes").value = paper.minutes ?? 0;
  } else if (ctx.type === "accomplished") {
    note = journal.reflection.accomplished;
    title = "小收获";
  } else if (ctx.type === "unfinished") {
    note = journal.reflection.unfinished;
    title = "小问题";
  } else if (ctx.type === "summary") {
    note = journal.reflection.summary_note || { content: journal.reflection.summary || "", style: "minimal", placedStickers: [] };
    title = "一句总结";
  }

  if (!noteEditorBound) {
    initNoteStickerPalette($("#note-sticker-palette"));
    bindNoteEditorEvents($("#note-scrapbook"), $("#note-sticker-palette"));
    noteEditorBound = true;
  }

  $("#note-dialog-title").textContent = title;
  $("#note-content").value = note.content || "";
  applyNoteStyleToEditor(note.style || "minimal");
  renderNoteStylePicker(note.style || "minimal");
  loadPlacedStickers(note.placedStickers || []);
  dialog.showModal();
}

function applyNoteStyleToEditor(styleId) {
  const paper = $("#note-paper");
  NOTE_STYLES.forEach((s) => paper.classList.remove(s.paperClass));
  const style = getNoteStyle(styleId);
  paper.classList.add(style.paperClass);
  $("#note-canvas-decor").textContent = style.decor || "";
}

function renderNoteStylePicker(selectedId) {
  $("#note-style-picker").innerHTML = NOTE_STYLES.map(
    (s) => {
      const sel = s.id === selectedId ? " selected" : "";
      return `<button type="button" class="style-btn${sel}" data-id="${s.id}">${s.label}<small>${s.desc}</small></button>`;
    }
  ).join("");
}

function saveNoteEditor() {
  if (!noteContext || !selectedKey) return;
  const content = $("#note-content").value;
  const style = $("#note-style-picker .style-btn.selected")?.dataset.id || "minimal";
  const placedStickers = getPlacedStickers();

  updateJournalForSelected((j) => {
    const notePayload = { content, style, placedStickers };
    if (noteContext.type === "paper") {
      const papers = j.papers.map((p) =>
        p.id === noteContext.paperId
          ? {
              ...p,
              title: $("#note-paper-title").value.trim(),
              minutes: Math.max(0, parseInt($("#note-paper-minutes").value, 10) || 0),
              ...notePayload,
            }
          : p
      );
      return { ...j, papers };
    }
    if (noteContext.type === "accomplished") {
      return {
        ...j,
        reflection: { ...j.reflection, accomplished: notePayload },
      };
    }
    if (noteContext.type === "unfinished") {
      return {
        ...j,
        reflection: { ...j.reflection, unfinished: notePayload },
      };
    }
    if (noteContext.type === "summary") {
      return {
        ...j,
        reflection: {
          ...j.reflection,
          summary: content,
          summary_note: notePayload,
        },
      };
    }
    return j;
  });

  clearNoteEditor();
  $("#note-dialog").close();
  noteContext = null;
}

// —— 任务 ——
function openTaskDialog(task = null) {
  editingTaskId = task?.id ?? null;
  $("#task-dialog-title").textContent = task ? "编辑任务" : "添加任务";
  $("#task-title").value = task?.title ?? "";
  $("#task-start").value = task?.startTime ?? "";
  $("#task-end").value = task?.endTime ?? "";

  const catId = task?.categoryId ?? "research";
  $("#category-picker").innerHTML = CATEGORIES.map((c) => {
    const sel = c.id === catId ? " selected" : "";
    return `<button type="button" class="cat-btn${sel}" data-id="${c.id}" style="background:${c.color};color:${c.text}">${c.label}</button>`;
  }).join("");

  const shapeId = task?.shapeId ?? "rounded";
  $("#shape-picker").innerHTML = TASK_SHAPES.map((s) => {
    const sel = s.id === shapeId ? " selected" : "";
    return `<button type="button" class="shape-btn${sel}" data-id="${s.id}">${s.icon} ${s.label}</button>`;
  }).join("");

  $("#task-dialog").showModal();
}

function getSelectedFromPicker(pickerId) {
  const sel = $(`${pickerId} .selected`);
  return sel?.dataset.id;
}


function bindEvents() {
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      view = btn.dataset.view;
      if (view !== "stats") persist();
      else render();
    });
  });

  // 统计视图时间范围切换（事件委托）
  document.addEventListener("click", (e) => {
    const rangeBtn = e.target.closest(".stats-range-btn");
    if (!rangeBtn) return;
    document.querySelectorAll(".stats-range-btn").forEach(b => b.classList.remove("active"));
    rangeBtn.classList.add("active");
    statsRange = Number(rangeBtn.dataset.range);
    const statsEl = document.getElementById("stats-container");
    if (statsEl) renderStats(statsEl, state, statsRange);
  });

  $("#nav-prev").addEventListener("click", () => {
    if (view === "week") anchor = addDays(anchor, -7);
    else anchor = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
    persist();
  });

  $("#nav-next").addEventListener("click", () => {
    if (view === "week") anchor = addDays(anchor, 7);
    else anchor = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
    persist();
  });

  $("#nav-today").addEventListener("click", () => {
    anchor = new Date();
    anchor.setHours(0, 0, 0, 0);
    selectedKey = dateKey(anchor);
    openPanel(selectedKey);
  });

  calendarEl.addEventListener("click", (e) => {
    if (state.settings.stickerMode) return;
    const cell = e.target.closest(".day-cell");
    if (!cell) return;
    openPanel(cell.dataset.date);
  });

  $("#reopen-panel-btn").addEventListener("click", () => {
    if (selectedKey) openPanel(selectedKey);
  });

  $("#panel-close").addEventListener("click", closePanel);
  $("#add-task-btn").addEventListener("click", () => openTaskDialog());
  $("#open-accomplished").addEventListener("click", () =>
    openNoteEditor({ type: "accomplished" })
  );
  $("#open-unfinished").addEventListener("click", () =>
    openNoteEditor({ type: "unfinished" })
  );
  $("#open-summary").addEventListener("click", () =>
    openNoteEditor({ type: "summary" })
  );

  $("#export-close")?.addEventListener("click", () => $("#export-dialog")?.close());
  $("#export-cancel")?.addEventListener("click", () => $("#export-dialog")?.close());
  $("#export-confirm")?.addEventListener("click", confirmExport);

  // 日记本预览
  $("#open-diary-btn")?.addEventListener("click", openDiaryPreview);

  $("#open-theme-btn").addEventListener("click", openThemeDialog);
  $("#theme-close").addEventListener("click", () => $("#theme-dialog").close());

  $("#theme-picker").addEventListener("click", (e) => {
    const sw = e.target.closest(".theme-swatch");
    if (!sw) return;
    state.settings.bgThemeId = sw.dataset.id;
    persist();
    initThemeDialog();
  });

  $("#font-picker").addEventListener("click", (e) => {
    const sw = e.target.closest(".font-swatch");
    if (!sw) return;
    state.settings.fontThemeId = sw.dataset.id;
    persist();
    initThemeDialog();
  });

  $("#decor-palette").addEventListener("click", (e) => {
    const btn = e.target.closest(".ht-palette-btn");
    if (!btn) return;
    $("#decor-palette").querySelectorAll(".ht-palette-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedDecorSticker = btn.dataset.stickerId;
  });

  $("#sticker-mode").addEventListener("change", (e) => {
    state.settings.stickerMode = e.target.checked;
    if (e.target.checked) $("#theme-dialog").close();
    persist();
  });

  $("#sticker-mode-off").addEventListener("click", () => {
    state.settings.stickerMode = false;
    persist();
  });

  document.addEventListener(
    "click",
    (e) => {
      if (!state.settings.stickerMode) return;
      if (!isStickerPlacementTarget(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      placeDecorSticker(e.clientX, e.clientY);
    },
    true
  );

  // 手机端触摸：touchstart 开始拖动预览，touchend 放置
  let touchPlacing = false;
  let touchPreviewEl = null;

  document.addEventListener("touchstart", (e) => {
    if (!state.settings.stickerMode) return;
    if (!isStickerPlacementTarget(e.target)) return;
    touchPlacing = true;
    e.preventDefault();
  }, { capture: true, passive: false });

  document.addEventListener("touchmove", (e) => {
    if (!touchPlacing || !state.settings.stickerMode) return;
    e.preventDefault();
    // 实时显示预览光标位置（可选，不影响放置逻辑）
  }, { capture: true, passive: false });

  document.addEventListener("touchend", (e) => {
    if (!touchPlacing || !state.settings.stickerMode) return;
    touchPlacing = false;
    if (!isStickerPlacementTarget(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    const t = e.changedTouches[0];
    placeDecorSticker(t.clientX, t.clientY);
  }, { capture: true, passive: false });

  decorLayer.addEventListener("dblclick", (e) => {
    const el = e.target.closest(".decor-sticker");
    if (!el) return;
    state.settings.decorStickers = state.settings.decorStickers.filter(
      (s) => s.id !== el.dataset.id
    );
    persist();
  });

  $("#clear-decor").addEventListener("click", () => {
    state.settings.decorStickers = [];
    persist();
  });

  $("#task-list").addEventListener("click", (e) => {
    const item = e.target.closest(".task-item");
    if (!item) return;
    const id = item.dataset.id;
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;
    if (e.target.matches('input[type="checkbox"]')) {
      task.completed = e.target.checked;
      persist();
      return;
    }
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (action === "edit") openTaskDialog(task);
    if (action === "delete") {
      state.tasks = state.tasks.filter((t) => t.id !== id);
      persist();
    }
  });

  $("#category-picker")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".cat-btn");
    if (!btn) return;
    $("#category-picker").querySelectorAll(".cat-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
  });

  $("#shape-picker")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".shape-btn");
    if (!btn) return;
    $("#shape-picker").querySelectorAll(".shape-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
  });

  $("#task-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = $("#task-title").value.trim();
    if (!title || !selectedKey) return;
    const payload = {
      title,
      categoryId: getSelectedFromPicker("#category-picker") || "research",
      shapeId: getSelectedFromPicker("#shape-picker") || "rounded",
      date: selectedKey,
      startTime: $("#task-start").value || null,
      endTime: $("#task-end").value || null,
    };
    if (editingTaskId) {
      const t = state.tasks.find((x) => x.id === editingTaskId);
      if (t) Object.assign(t, payload);
    } else {
      state.tasks.push({ id: crypto.randomUUID(), ...payload, completed: false });
    }
    $("#task-dialog").close();
    persist();
  });

  $("#task-cancel").addEventListener("click", () => $("#task-dialog").close());

  $(".panel-body").addEventListener("click", (e) => {
    const btn = e.target.closest(".scale-btn");
    if (!btn) return;
    const scale = btn.closest(".scale");
    const field = scale.dataset.field;
    const value = parseInt(btn.dataset.value, 10);
    scale.querySelectorAll(".scale-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    updateJournalField({ [field]: value });
  });

  // 学习时长三段输入
  $(".panel-body").addEventListener("input", (e) => {
    const map = {
      "study-morning":   "studyMorning",
      "study-afternoon": "studyAfternoon",
      "study-evening":   "studyEvening",
    };
    const field = map[e.target.id];
    if (field) {
      const val = parseFloat(e.target.value);
      updateJournalField({ [field]: isNaN(val) || val < 0 ? null : Math.round(val * 10) / 10 });
      updateStudyTotal(getJournal(state, selectedKey));
    }
    // 文献篇数
    if (e.target.id === "lit-paper-count") {
      const val = parseInt(e.target.value, 10);
      updateJournalField({ litCount: isNaN(val) || val < 0 ? null : val });
    }
  });

  $("#note-style-picker").addEventListener("click", (e) => {
    const btn = e.target.closest(".style-btn");
    if (!btn) return;
    $("#note-style-picker").querySelectorAll(".style-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    applyNoteStyleToEditor(btn.dataset.id);
  });

  $("#note-save").addEventListener("click", saveNoteEditor);
  $("#note-cancel").addEventListener("click", () => {
    clearNoteEditor();
    $("#note-dialog").close();
  });
  $("#note-close").addEventListener("click", () => {
    clearNoteEditor();
    $("#note-dialog").close();
  });
}

bindEvents();
applyTheme(state.settings.bgThemeId);
applyFontTheme(state.settings.fontThemeId || "cute");
openPanel(selectedKey);

// ── 每日鼓励语 ──
const DAILY_QUOTES = [
  "不是所有的坚持都会有结果，但总有一些坚持，能从冰封的土地里，培育出十万朵怒放的蔷薇。",
  "慢慢来，比较快。每一步都算数。",
  "你不需要很厉害才能开始，但你需要开始才能变得很厉害。",
  "今天多学一点点，明天就多一点底气。",
  "科研的本质是好奇心，不是焦虑。",
  "写不出来的时候，先把想法写乱，再慢慢理顺。",
  "休息不是浪费时间，是为了走得更远。",
  "进度不重要，方向对了就好。",
  "今天的困惑，是明天的顿悟。",
  "你已经比昨天的自己更好了。",
  "文献读不完很正常，读懂一篇也是收获。",
  "把今天做好，就是对未来最好的投资。",
];

function setDailyQuote() {
  const el = document.getElementById("daily-quote");
  if (!el) return;
  const idx = new Date().getDate() % DAILY_QUOTES.length;
  el.textContent = "\u201c" + DAILY_QUOTES[idx] + "\u201d";
}
setDailyQuote();
