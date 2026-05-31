import { NOTE_STICKERS, stickerInnerHtml, stickerExportLabel } from "./stickers.js";

/** @type {{ uid: string, stickerId: string, zone: string, x: number, y: number, rot: number }[]} */
let placed = [];
let dragState = null;

const ZONES = ["top", "left", "right", "bottom"];

export function initNoteStickerPalette(container) {
  container.innerHTML = NOTE_STICKERS.map((s) =>
    `<button type="button" class="ht-palette-btn note-drag-source" data-sticker-id="${s.id}" title="${s.label} · 拖到页边" draggable="true">
      ${stickerInnerHtml(s.id)}
    </button>`
  ).join("");
}

export function loadPlacedStickers(list) {
  placed = (list || []).map((p) => ({
    uid: p.uid || crypto.randomUUID(),
    stickerId: p.stickerId,
    zone: p.zone || "top",
    x: p.x ?? 50,
    y: p.y ?? 50,
    rot: p.rot ?? 0,
  }));
  renderAllZones();
}

export function getPlacedStickers() {
  return placed.map((p) => ({ ...p }));
}

function renderAllZones() {
  ZONES.forEach((zone) => {
    const el = document.querySelector(`.note-zone[data-zone="${zone}"]`);
    if (!el) return;
    el.querySelectorAll(".note-placed-sticker").forEach((n) => n.remove());
    placed
      .filter((p) => p.zone === zone)
      .forEach((p) => el.appendChild(createPlacedEl(p)));
  });
  updateZoneHints();
}

function updateZoneHints() {
  ZONES.forEach((zone) => {
    const el = document.querySelector(`.note-zone[data-zone="${zone}"]`);
    if (!el) return;
    const hint = el.querySelector(".zone-hint");
    if (!hint) return;
    const count = placed.filter((p) => p.zone === zone).length;
    hint.classList.toggle("hidden", count > 0);
  });
}

function createPlacedEl(p) {
  const el = document.createElement("div");
  el.className = "note-placed-sticker";
  el.dataset.uid = p.uid;
  el.style.left = `${p.x}%`;
  el.style.top = `${p.y}%`;
  el.style.setProperty("--rot", `${p.rot}deg`);
  el.innerHTML = stickerInnerHtml(p.stickerId);
  el.title = "拖动调整位置 · 双击删除";

  el.addEventListener("mousedown", (e) => startMove(e, p.uid));
  el.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    placed = placed.filter((x) => x.uid !== p.uid);
    renderAllZones();
  });
  return el;
}

function addPlaced(stickerId, zone, x, y) {
  placed.push({
    uid: crypto.randomUUID(),
    stickerId,
    zone,
    x: clamp(x, 8, 92),
    y: clamp(y, 8, 92),
    rot: Math.round(Math.random() * 20 - 10),
  });
  renderAllZones();
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function zoneFromPoint(clientX, clientY) {
  for (const zone of ZONES) {
    const el = document.querySelector(`.note-zone[data-zone="${zone}"]`);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
      const x = ((clientX - r.left) / r.width) * 100;
      const y = ((clientY - r.top) / r.height) * 100;
      return { zone, x, y };
    }
  }
  return null;
}

function startMove(e, uid) {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  const item = placed.find((p) => p.uid === uid);
  if (!item) return;
  dragState = { mode: "move", uid, zone: item.zone };
  document.body.classList.add("note-sticker-dragging");
}

function onMouseMove(e) {
  if (!dragState || dragState.mode !== "move") return;
  const item = placed.find((p) => p.uid === dragState.uid);
  if (!item) return;
  const hit = zoneFromPoint(e.clientX, e.clientY);
  if (!hit) return;
  item.zone = hit.zone;
  item.x = clamp(hit.x, 8, 92);
  item.y = clamp(hit.y, 8, 92);
  renderAllZones();
}

function onMouseUp() {
  if (dragState) {
    dragState = null;
    document.body.classList.remove("note-sticker-dragging");
  }
}

export function bindNoteEditorEvents(scrapbookEl, paletteEl) {
  paletteEl.addEventListener("dragstart", (e) => {
    const btn = e.target.closest(".note-drag-source");
    if (!btn) return;
    e.dataTransfer.setData("text/sticker-id", btn.dataset.stickerId);
    e.dataTransfer.effectAllowed = "copy";
  });

  scrapbookEl.querySelectorAll(".note-zone").forEach((zone) => {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      zone.classList.add("drag-over");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("drag-over");
      const stickerId = e.dataTransfer.getData("text/sticker-id");
      if (!stickerId) return;
      const rect = zone.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      addPlaced(stickerId, zone.dataset.zone, x, y);
    });
  });

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}

export function clearNoteEditor() {
  placed = [];
  renderAllZones();
}
