import { CATEGORIES } from "./categories.js";

const MOOD_TEXT   = ["", "很低落", "略低落", "平静", "不错", "很好"];
const ENERGY_TEXT = ["", "极低",   "较低",   "一般", "较好", "充沛"];
const SLEEP_TEXT  = ["", "很差",   "较差",   "一般", "较好", "很好"];
const WEEKDAY_SHORT = ["周日","周一","周二","周三","周四","周五","周六"];

/* ── 工具 ─────────────────────────────────── */

function getDayKeys(days) {
  const keys = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    keys.push({ key: `${y}-${m}-${day}`, date: d });
  }
  return keys;
}

function xLabels(dayKeys, n) {
  const labelCount = Math.min(n, 7);
  const indices = new Set([0, n - 1]);
  for (let i = 1; i < labelCount - 1; i++) {
    indices.add(Math.round(i * (n - 1) / (labelCount - 1)));
  }
  return [...indices].sort((a, b) => a - b).map(i => {
    const d = dayKeys[i].date;
    const label = n <= 7
      ? WEEKDAY_SHORT[d.getDay()]
      : `${d.getMonth() + 1}/${d.getDate()}`;
    return { i, label };
  });
}

/* ── 统计计算 ──────────────────────────────── */

function computeStats(state, days) {
  const dayKeys  = getDayKeys(days);
  const allTasks = state.tasks || [];
  const journals = state.journals || {};

  let totalTasks = 0, doneTasks = 0;
  let moodSum = 0, moodCount = 0;
  let energySum = 0, energyCount = 0;
  let sleepSum = 0, sleepCount = 0;
  let litMinutes = 0, litPapers = 0;
  let studyTotal = 0, studyDays = 0;
  let activeDays = 0, streak = 0;

  const dailyRates  = [];
  const dailyMoods  = [];
  const dailyEnergy = [];
  const dailySleep  = [];
  const dailyStudy  = [];
  const catCount = {};
  CATEGORIES.forEach(c => { catCount[c.id] = 0; });

  dayKeys.forEach(({ key, date }) => {
    const dayTasks = allTasks.filter(t => t.date === key);
    const j = journals[key];
    const total = dayTasks.length;
    const done  = dayTasks.filter(t => t.completed).length;

    totalTasks += total;
    doneTasks  += done;
    dailyRates.push({ key, date, total, done,
      rate: total > 0 ? Math.round((done / total) * 100) : null });
    dayTasks.forEach(t => {
      if (catCount[t.categoryId] !== undefined) catCount[t.categoryId]++;
    });

    if (j) {
      activeDays++;
      if (j.mood   != null) { moodSum   += j.mood;   moodCount++;   }
      if (j.energy != null) { energySum += j.energy; energyCount++; }
      if (j.sleep  != null) { sleepSum  += j.sleep;  sleepCount++;  }
      const dayStudy = (j.studyMorning || 0) + (j.studyAfternoon || 0) + (j.studyEvening || 0);
      if (dayStudy > 0) { studyTotal += dayStudy; studyDays++; }
      if (j.papers) {
        litPapers += j.papers.length;
        j.papers.forEach(p => { litMinutes += Number(p.minutes) || 0; });
      }
    }
    dailyMoods.push ({ key, date, val: j?.mood         ?? null });
    dailyEnergy.push({ key, date, val: j?.energy       ?? null });
    dailySleep.push ({ key, date, val: j?.sleep        ?? null });
    const ds = (j?.studyMorning||0)+(j?.studyAfternoon||0)+(j?.studyEvening||0);
    dailyStudy.push ({ key, date, val: ds > 0 ? ds : null });
  });

  const sortedKeys = [...dayKeys].reverse();
  for (const { key } of sortedKeys) {
    const hasData = allTasks.some(t => t.date === key) || journals[key];
    if (hasData) streak++; else break;
  }

  const catDist = CATEGORIES
    .map(c => ({ ...c, count: catCount[c.id] || 0 }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    totalTasks, doneTasks,
    completionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
    avgMood:   moodCount   > 0 ? (moodSum   / moodCount).toFixed(1)   : null,
    avgEnergy: energyCount > 0 ? (energySum / energyCount).toFixed(1) : null,
    avgSleep:  sleepCount  > 0 ? (sleepSum  / sleepCount).toFixed(1)  : null,
    studyTotal, studyDays, activeDays, streak, litMinutes, litPapers,
    dailyRates, dailyMoods, dailyEnergy, dailySleep, dailyStudy,
    catDist, days, dayKeys,
    allTasks, journals,
  };
}

/* ── 统计工具函数 ──────────────────────────── */

function pearson(xs, ys) {
  const pairs = xs.map((x, i) => [x, ys[i]]).filter(([x, y]) => x != null && y != null);
  const n = pairs.length;
  if (n < 4) return { r: null, n };
  const mx = pairs.reduce((s, [x]) => s + x, 0) / n;
  const my = pairs.reduce((s, [, y]) => s + y, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  pairs.forEach(([x, y]) => {
    const a = x - mx, b = y - my;
    num += a * b; dx2 += a * a; dy2 += b * b;
  });
  const denom = Math.sqrt(dx2 * dy2);
  return { r: denom < 1e-9 ? 0 : num / denom, n };
}

function laggedPearson(xSeries, ySeries) {
  const xs = xSeries.slice(0, -1).map(d => d.val);
  const ys = ySeries.slice(1).map(d => d.val);
  return pearson(xs, ys);
}

/** 给定一组 {groupVal, metricVal} 对，计算各 groupVal 的平均 metricVal */
function groupMeans(pairs) {
  const acc = {};
  pairs.forEach(([g, v]) => {
    if (g == null || v == null) return;
    if (!acc[g]) acc[g] = { sum: 0, n: 0 };
    acc[g].sum += v; acc[g].n++;
  });
  return Object.entries(acc).map(([k, { sum, n }]) => ({
    key: k, mean: sum / n, n,
  }));
}

/* ── 关联强度标签 ──────────────────────────── */

function corrStrength(r, n) {
  if (r === null || n < 4) return { label: "数据不足", color: "var(--text-muted)", bar: 0 };
  const abs = Math.abs(r);
  const dir = r > 0 ? "正相关" : "负相关";
  let label, color;
  if (abs >= 0.6)       { label = `较强${dir}`; color = r > 0 ? "#61BD73" : "#F87171"; }
  else if (abs >= 0.35) { label = `中等${dir}`; color = r > 0 ? "#38BDF8" : "#FB923C"; }
  else if (abs >= 0.15) { label = `弱${dir}`;   color = "var(--text-muted)"; }
  else                  { label = "几乎无关联"; color = "var(--text-muted)"; }
  return { label, color, bar: Math.round(abs * 100), r, n };
}

function corrBar(strength) {
  if (strength.bar === 0) return `<span class="corr-na">—</span>`;
  return `<div class="corr-bar-wrap">
    <div class="corr-bar-fill" style="width:${strength.bar}%;background:${strength.color}"></div>
  </div>
  <span class="corr-val" style="color:${strength.color}">${strength.label}
    <span class="corr-r">${strength.r != null ? `r=${strength.r.toFixed(2)}` : ""}</span>
  </span>`;
}

/* ── 三环图：情绪/精力/睡眠均值 ──────────── */

function buildTripleRings(avgMood, avgEnergy, avgSleep) {
  const rings = [
    { label: "情绪", val: avgMood,   color: "#f5a8b8", bg: "#fce8f0", emoji: "😊" },
    { label: "精力", val: avgEnergy, color: "#88b5a8", bg: "#dcf5ec", emoji: "⚡" },
    { label: "睡眠", val: avgSleep,  color: "#a0b8d8", bg: "#dce8f8", emoji: "🌙" },
  ];
  const R = 28, CX = 34, CY = 34, SW = 8;
  const circ = 2 * Math.PI * R;

  return rings.map(({ label, val, color, bg, emoji }) => {
    const pct = val != null ? parseFloat(val) / 5 : 0;
    const dash = pct * circ;
    const hasData = val != null;
    return `<div class="triple-ring-item">
      <svg viewBox="0 0 68 68" width="68" height="68">
        <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${bg}" stroke-width="${SW}"/>
        ${hasData ? `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${color}" stroke-width="${SW}"
          stroke-dasharray="${dash.toFixed(2)} ${circ.toFixed(2)}"
          stroke-dashoffset="${(circ * 0.25).toFixed(2)}"
          stroke-linecap="round"/>` : ""}
        <text x="${CX}" y="${CY - 5}" text-anchor="middle" font-size="14">${emoji}</text>
        <text x="${CX}" y="${CY + 10}" text-anchor="middle" font-size="9" fill="${hasData ? color : '#aaa'}" font-weight="600">${hasData ? parseFloat(val).toFixed(1) : "—"}</text>
      </svg>
      <div class="triple-ring-label">${label}</div>
    </div>`;
  }).join("");
}

/* ── 板块1：状态对比（睡眠+精力+情绪） ───── */

function buildStateSourceBlock(s) {
  const sleepEnergy = laggedPearson(s.dailySleep,  s.dailyEnergy);
  const sleepMood   = laggedPearson(s.dailySleep,  s.dailyMoods);

  // 星期几 → 精力
  const wdMeans = groupMeans(s.dailyEnergy.map(d => [d.date.getDay(), d.val]))
    .sort((a, b) => Number(a.key) - Number(b.key));
  const wdSorted = [...wdMeans].sort((a, b) => b.mean - a.mean);
  const bestWd  = wdSorted[0];
  const worstWd = wdSorted[wdSorted.length - 1];

  const se = corrStrength(sleepEnergy.r, sleepEnergy.n);
  const sm = corrStrength(sleepMood.r,   sleepMood.n);

  // 结论
  const parts = [];
  if (se.r !== null && Math.abs(se.r) >= 0.35)
    parts.push(se.r > 0 ? `睡好觉对次日精力有明显正向作用` : `精力与前晚睡眠关联较弱`);
  if (sm.r !== null && Math.abs(sm.r) >= 0.35)
    parts.push(sm.r > 0 ? `睡眠质量同样影响次日情绪` : `睡眠对情绪的影响不明显`);
  if (wdMeans.length >= 3 && bestWd && worstWd && bestWd.key !== worstWd.key)
    parts.push(`${WEEKDAY_SHORT[bestWd.key]} 精力最好，${WEEKDAY_SHORT[worstWd.key]} 最低`);
  const conclusion = parts.length
    ? parts.join("；") + "。"
    : se.r === null && sm.r === null
      ? "数据积累中，记录更多天后可以看出规律。"
      : "目前各项关联不明显，状态受多种因素影响。";

  const ringsHtml = buildTripleRings(s.avgMood, s.avgEnergy, s.avgSleep);

  const wdRow = wdMeans.length >= 3
    ? `<div class="corr-wdrow">
        <span class="corr-wdlabel">各天精力均值</span>
        <div class="corr-wdbars">
          ${wdMeans.map(w =>
            `<div class="corr-wd-item">
              <span class="corr-wd-name">${WEEKDAY_SHORT[w.key]}</span>
              <div class="corr-wd-bar-wrap"><div class="corr-wd-bar" style="width:${Math.round((w.mean/5)*100)}%"></div></div>
              <span class="corr-wd-val">${w.mean.toFixed(1)}</span>
            </div>`
          ).join("")}
        </div>
      </div>`
    : "";

  const rows = [
    { label: "睡眠 → 次日精力", note: "昨晚睡好，今天精力更好？", s: se },
    { label: "睡眠 → 次日情绪", note: "睡眠质量影响心情？",       s: sm },
  ];

  return buildInsightCard({ icon: "🌙", title: "状态来源", question: "睡眠、精力与情绪的关联",
    ringsHtml, rows, extra: wdRow, conclusion });
}

/* ── 板块2：效率来源 ──────────────────────── */

function buildEfficiencyBlock(s) {
  const rates   = s.dailyRates.map(d => ({ ...d, val: d.rate }));
  const energyR = pearson(s.dailyEnergy.map(d => d.val), rates.map(d => d.val));
  const sleepR  = laggedPearson(s.dailySleep, rates);
  const moodR   = pearson(s.dailyMoods.map(d => d.val),  rates.map(d => d.val));
  const studyR  = pearson(s.dailyStudy.map(d => d.val),  rates.map(d => d.val));

  const se = corrStrength(energyR.r, energyR.n);
  const ss = corrStrength(sleepR.r,  sleepR.n);
  const sm = corrStrength(moodR.r,   moodR.n);
  const st = corrStrength(studyR.r,  studyR.n);

  const top = [
    { label: "精力", s: se }, { label: "睡眠", s: ss },
    { label: "情绪", s: sm }, { label: "学习时长", s: st },
  ].filter(x => x.s.r !== null && Math.abs(x.s.r) >= 0.35)
   .sort((a, b) => Math.abs(b.s.r) - Math.abs(a.s.r));

  const conclusion = top.length
    ? top.map(x => `${x.label}对完成率${x.s.r > 0 ? "正向" : "负向"}影响（r=${x.s.r.toFixed(2)}）`).join("；") + "。"
    : energyR.n >= 4 || moodR.n >= 4
      ? "任务完成率目前与状态指标关联不强，可能主要受任务数量影响。"
      : "数据积累中，多记录几天后更准确。";

  const rows = [
    { label: "精力 → 完成率",      note: "精力好时任务完成得更多？",    s: se },
    { label: "睡眠 → 次日完成率",  note: "睡好觉次日效率更高？",       s: ss },
    { label: "情绪 → 完成率",      note: "心情好时更容易完成任务？",    s: sm },
    { label: "学习时长 → 完成率",  note: "学得多和完成任务多有关吗？",  s: st },
  ];

  return buildInsightCard({ icon: "⚡", title: "效率来源",
    question: "任务完成度与状态、学习时长的关系", rows, conclusion });
}

/* ── 板块3：综合小结（替换学习偏好）─────── */

function buildSummaryBlock(s, corrs) {
  const lines = [];

  // 完成率评价
  if (s.totalTasks === 0) {
    lines.push({ icon: "📋", text: "这段时间暂无任务记录，可以在日历中规划每天的学习任务。" });
  } else {
    const rateText = s.completionRate >= 80 ? `完成率高达 ${s.completionRate}%，执行力很强！`
      : s.completionRate >= 50 ? `完成率 ${s.completionRate}%，整体状态稳定。`
      : `完成率 ${s.completionRate}%，任务安排可以适当精简，集中精力在重要项目上。`;
    lines.push({ icon: "✅", text: rateText });
  }

  // 学习时长
  if (s.studyTotal > 0) {
    const avg = s.studyDays > 0 ? (s.studyTotal / s.studyDays).toFixed(1) : 0;
    const studyComment = parseFloat(avg) >= 6 ? "学习强度较高，注意劳逸结合。"
      : parseFloat(avg) >= 3 ? "学习时长适中，保持节奏！"
      : "每日学习时长偏少，可以尝试增加专注时间。";
    lines.push({ icon: "⏱", text: `累计学习 ${s.studyTotal.toFixed(1)} 小时，日均 ${avg} 小时。${studyComment}` });
  }

  // 状态评价
  if (s.avgSleep !== null) {
    const sl = parseFloat(s.avgSleep);
    if (sl <= 2.5) lines.push({ icon: "🌙", text: `平均睡眠质量偏低（${s.avgSleep}/5），睡眠是精力和情绪的基础，建议优先改善作息。` });
    else if (sl >= 4) lines.push({ icon: "🌙", text: `睡眠质量良好（${s.avgSleep}/5），继续保持规律作息！` });
  }
  if (s.avgMood !== null && parseFloat(s.avgMood) <= 2.5) {
    lines.push({ icon: "😊", text: `近期情绪偏低落（${s.avgMood}/5），适当安排休息和你喜欢的非学习活动会有帮助。` });
  }

  // 关联洞察提炼
  if (corrs) {
    const sleepEnergy = corrs.find(c => c.label === "睡眠 → 次日精力");
    if (sleepEnergy?.r >= 0.35)
      lines.push({ icon: "💡", text: `数据显示你的精力与睡眠质量正相关明显，保证睡眠是提升次日状态最直接的方式。` });

    const studyMood = corrs.find(c => c.label === "学习时长 → 情绪");
    if (studyMood?.r !== null && studyMood?.r <= -0.35)
      lines.push({ icon: "⚠️", text: `学习越多情绪反而越低，留意是否有过度消耗的迹象，可尝试减少单日强度、分散到多天。` });
    else if (studyMood?.r >= 0.35)
      lines.push({ icon: "🌟", text: `学习本身对你有积极的情绪反馈，保持这种节奏！` });
  }

  // 连续打卡
  if (s.streak >= 7) lines.push({ icon: "🔥", text: `已连续记录 ${s.streak} 天，习惯正在养成，坚持下去！` });
  else if (s.streak === 0 && s.activeDays > 0) lines.push({ icon: "📅", text: "记录出现了中断，尝试每天花一两分钟填写状态，数据连续性会让分析更有参考价值。" });

  if (!lines.length) lines.push({ icon: "🌱", text: "继续记录数据，随着时间积累，这里会给出越来越个性化的分析和建议。" });

  const items = lines.map(l =>
    `<div class="guidance-item"><span class="guidance-icon">${l.icon}</span><p class="guidance-text">${l.text}</p></div>`
  ).join("");

  return `<div class="insight-card insight-card-summary">
    <div class="insight-card-head">
      <span class="insight-card-icon">🌱</span>
      <div>
        <div class="insight-card-title">综合小结</div>
        <div class="insight-card-q">近期状态、效率与改进建议</div>
      </div>
    </div>
    ${items}
    <p class="corr-disclaimer-line" style="margin-top:8px">· 基于你的实际数据，客观呈现，样本量小时仅供参考</p>
  </div>`;
}

/* ── 通用洞察卡构建器 ─────────────────────── */

function buildInsightCard({ icon, title, question, ringsHtml, rows, extra, tableContent, conclusion }) {
  const ringsSection = ringsHtml
    ? `<div class="triple-rings">${ringsHtml}</div>` : "";
  const rowsHtml = (rows || []).map(({ label, note, s }) => `
    <div class="insight-row">
      <div class="insight-row-left">
        <span class="insight-row-label">${label}</span>
        <span class="insight-row-note">${note}</span>
      </div>
      <div class="insight-row-right">
        ${corrBar(s)}
      </div>
    </div>`).join("");

  return `<div class="insight-card">
    <div class="insight-card-head">
      <span class="insight-card-icon">${icon}</span>
      <div>
        <div class="insight-card-title">${title}</div>
        <div class="insight-card-q">${question}</div>
      </div>
    </div>
    ${ringsSection}
    ${rowsHtml}
    ${extra || ""}
    ${tableContent || ""}
    <div class="insight-conclusion">
      <span class="insight-conclusion-dot">💡</span>
      <p>${conclusion}</p>
    </div>
  </div>`;
}

/* ── 近期小结 ──────────────────────────────── */
/* ── 近期小结 ──────────────────────────────── */

function generateInsight(s) {
  if (s.totalTasks === 0) return "这段时间还没有任务记录，赶快开始规划吧！每一步都算数 ✨";
  const lines = [];
  if (s.completionRate >= 80)      lines.push(`完成率 ${s.completionRate}%，表现非常棒！`);
  else if (s.completionRate >= 50) lines.push(`完成率 ${s.completionRate}%，继续保持～`);
  else                             lines.push(`完成率 ${s.completionRate}%，可以适当减少任务量。`);
  if (s.streak >= 5)      lines.push(`连续记录 ${s.streak} 天 🔥`);
  else if (s.streak >= 2) lines.push(`连续记录 ${s.streak} 天，坚持下去！`);
  if (s.avgSleep !== null && parseFloat(s.avgSleep) <= 2.5)
    lines.push("睡眠质量较差，注意保证休息 🌙");
  if (s.studyTotal > 0) {
    const avg = s.studyDays > 0 ? (s.studyTotal/s.studyDays).toFixed(1) : 0;
    lines.push(`累计学习 ${s.studyTotal.toFixed(1)} 小时，有记录日均 ${avg} 小时 ⏱`);
  }
  if (s.litMinutes > 0) lines.push(`文献 ${s.litPapers} 篇，累计 ${s.litMinutes} 分钟 📚`);
  return lines.join("　");
}

/* ── SVG 折线图 ──────────────────────────── */

function buildLineChartSvg({ data, dayKeys, yMax, yFormat, color, areaColor }) {
  const W = 300, H = 80, PAD = { l: 36, r: 8, t: 8, b: 18 };
  const inner = { w: W - PAD.l - PAD.r, h: H - PAD.t - PAD.b };
  const n = data.length;
  const xs = data.map((_, i) => PAD.l + (i / Math.max(n - 1, 1)) * inner.w);
  const pts = data.map((d, i) => ({
    x: xs[i],
    y: d != null ? PAD.t + inner.h - (d / yMax) * inner.h : null,
    val: d,
  }));
  const valid = pts.filter(p => p.y != null);
  const polyline = valid.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = valid.length > 1
    ? `M${valid[0].x.toFixed(1)},${(PAD.t+inner.h).toFixed(1)} ` +
      valid.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
      ` L${valid[valid.length-1].x.toFixed(1)},${(PAD.t+inner.h).toFixed(1)} Z`
    : "";
  const yMarks = [0, yMax / 2, yMax];
  const labels = xLabels(dayKeys, n);
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:90px">
    <line x1="${PAD.l}" y1="${PAD.t}" x2="${PAD.l}" y2="${PAD.t+inner.h}" stroke="var(--border)" stroke-width="0.8"/>
    ${yMarks.map(v => {
      const y = PAD.t + inner.h - (v / yMax) * inner.h;
      return `<line x1="${PAD.l}" y1="${y.toFixed(1)}" x2="${W-PAD.r}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-width="0.6" stroke-dasharray="3,3"/>
              <text x="${PAD.l-3}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="7" fill="var(--text-muted)">${yFormat(v)}</text>`;
    }).join("")}
    ${area ? `<path d="${area}" fill="${areaColor}"/>` : ""}
    ${valid.length > 1 ? `<polyline points="${polyline}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>` : ""}
    ${valid.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="#fff" stroke="${color}" stroke-width="1.5"/>`).join("")}
    ${labels.map(({ i, label }) =>
      `<text x="${xs[i].toFixed(1)}" y="${H}" text-anchor="middle" font-size="7" fill="var(--text-muted)">${label}</text>`
    ).join("")}
  </svg>`;
}

function buildLineChart(dailyRates, dayKeys) {
  return buildLineChartSvg({
    data: dailyRates.map(d => d.rate), dayKeys, yMax: 100,
    yFormat: v => `${v}%`, color: "var(--accent)", areaColor: "rgba(212,160,152,0.13)",
  });
}

function buildStudyChart(dailyStudy, dayKeys) {
  const vals = dailyStudy.map(d => d.val).filter(v => v != null);
  const maxVal = vals.length ? Math.max(2, ...vals) : 2;
  return buildLineChartSvg({
    data: dailyStudy.map(d => d.val), dayKeys, yMax: maxVal,
    yFormat: v => `${v.toFixed(1)}h`,
    color: "#88b5a8", areaColor: "rgba(136,181,168,0.15)",
  });
}

/* ── 状态条形（近7天）──────────────────────── */

function buildMoodBars(dailyMoods, dailyEnergy, dailySleep, days) {
  const n = dailyMoods.length;
  const sl = Math.min(7, n);
  const mSlice = dailyMoods.slice(-sl);
  const eSlice = dailyEnergy.slice(-sl);
  const sSlice = dailySleep.slice(-sl);

  return mSlice.map((d, i) => {
    const e  = eSlice[i];
    const sv = sSlice[i];
    const wd = n <= 7
      ? WEEKDAY_SHORT[d.date.getDay()]
      : `${d.date.getMonth()+1}/${d.date.getDate()}`;
    const mPct = d.val  != null ? Math.round((d.val  / 5) * 100) : 0;
    const ePct = e.val  != null ? Math.round((e.val  / 5) * 100) : 0;
    const sPct = sv.val != null ? Math.round((sv.val / 5) * 100) : 0;
    const mEmoji = d.val  != null ? ["😫","😕","😐","🙂","😊"][d.val  - 1] : "—";
    const sEmoji = sv.val != null ? ["😵","😪","😑","😴","😌"][sv.val - 1] : "—";
    return `<div class="stats-bar-row">
      <span class="stats-bar-day">${wd}</span>
      <div class="stats-bar-wrap">
        <div class="stats-bar mood-bar-fill" style="width:${mPct}%">
          <span class="stats-bar-label">${mEmoji}${d.val != null ? " "+d.val : ""}</span>
        </div>
      </div>
      <div class="stats-bar-wrap">
        <div class="stats-bar energy-bar-fill" style="width:${ePct}%">
          <span class="stats-bar-label" style="color:var(--accent)">${e.val != null ? ENERGY_TEXT[e.val] : "—"}</span>
        </div>
      </div>
      <div class="stats-bar-wrap">
        <div class="stats-bar sleep-bar-fill" style="width:${sPct}%">
          <span class="stats-bar-label">${sEmoji}${sv.val != null ? " "+SLEEP_TEXT[sv.val] : ""}</span>
        </div>
      </div>
    </div>`;
  }).join("");
}

/* ── 环形图 ──────────────────────────────── */

function buildDonut(catDist, total) {
  if (!catDist.length || total === 0) {
    return `<svg viewBox="0 0 80 80" style="width:80px;height:80px">
      <circle cx="40" cy="40" r="30" fill="none" stroke="var(--border)" stroke-width="14"/>
      <text x="40" y="44" text-anchor="middle" font-size="9" fill="var(--text-muted)">暂无</text>
    </svg>`;
  }
  const R = 30, CX = 40, CY = 40, circ = 2 * Math.PI * R;
  let offset = 0;
  const segs = catDist.slice(0, 5).map(c => {
    const dash = (c.count / total) * circ;
    const s = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${c.color}" stroke-width="14"
      stroke-dasharray="${dash.toFixed(2)} ${circ.toFixed(2)}"
      stroke-dashoffset="${(-offset).toFixed(2)}"
      transform="rotate(-90 ${CX} ${CY})"/>`;
    offset += dash;
    return s;
  });
  return `<svg viewBox="0 0 80 80" style="width:80px;height:80px;flex-shrink:0">
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="var(--border)" stroke-width="14"/>
    ${segs.join("")}
    <text x="${CX}" y="${CY+4}" text-anchor="middle" font-size="9" fill="var(--text-muted)">${total}项</text>
  </svg>`;
}

/* ── 主渲染 ──────────────────────────────── */

export function renderStats(container, state, days) {
  const s = computeStats(state, days);

  const lineChart  = buildLineChart(s.dailyRates, s.dayKeys);
  const studyChart = buildStudyChart(s.dailyStudy, s.dayKeys);
  const moodBars   = buildMoodBars(s.dailyMoods, s.dailyEnergy, s.dailySleep, days);
  const donut      = buildDonut(s.catDist, s.totalTasks);
  const insight    = generateInsight(s);

  const corrPairs = [
    laggedPearson(s.dailySleep, s.dailyEnergy),
    laggedPearson(s.dailySleep, s.dailyMoods),
  ].map((c, i) => ({ ...c, label: i === 0 ? "睡眠 → 次日精力" : "学习时长 → 情绪" }));
  const studyMoodCorr = pearson(s.dailyStudy.map(d=>d.val), s.dailyMoods.map(d=>d.val));
  corrPairs.push({ ...studyMoodCorr, label: "学习时长 → 情绪" });
  const stateBlock  = buildStateSourceBlock(s);
  const effBlock    = buildEfficiencyBlock(s);
  const prefBlock   = buildSummaryBlock(s, corrPairs);

  // 数值格式化
  const fmtScale = v => v != null ? `${v} / 5` : "未记录";
  const avgMoodSub   = s.avgMood   ? MOOD_TEXT[Math.round(parseFloat(s.avgMood))]   : "—";
  const avgEnergySub = s.avgEnergy ? ENERGY_TEXT[Math.round(parseFloat(s.avgEnergy))] : "—";
  const avgSleepSub  = s.avgSleep  ? SLEEP_TEXT[Math.round(parseFloat(s.avgSleep))]  : "—";
  const studyText = s.studyTotal > 0 ? `${s.studyTotal.toFixed(1)} 小时` : "0 小时";
  const studySub  = s.studyDays > 0 ? `日均 ${(s.studyTotal/s.studyDays).toFixed(1)} 小时` : "暂无记录";
  const streakText = s.streak > 0 ? `${s.streak} 天 🔥` : "0 天";
  const litText    = s.litPapers > 0 ? `${s.litPapers} 篇` : "0 篇";
  const litSub     = s.litMinutes > 0 ? `累计 ${s.litMinutes} 分钟` : "暂无记录";

  const top5 = s.catDist.slice(0, 5);
  const legendHTML = top5.length
    ? top5.map(c => {
        const pct = s.totalTasks > 0 ? Math.round((c.count / s.totalTasks) * 100) : 0;
        return `<div class="stats-legend-item">
          <span class="stats-legend-dot" style="background:${c.color}"></span>
          <span class="stats-legend-label">${c.label}</span>
          <span class="stats-legend-pct">${pct}%</span>
        </div>`;
      }).join("")
    : `<div style="font-size:0.8rem;color:var(--text-muted)">暂无数据</div>`;

  container.innerHTML = `<div class="stats-view">

    <!-- 时间范围 -->
    <div class="stats-range-bar">
      <span class="stats-range-label">数据概览</span>
      <div class="stats-range-toggle">
        <button class="stats-range-btn${days===7?" active":""}" data-range="7">近7天</button>
        <button class="stats-range-btn${days===30?" active":""}" data-range="30">近30天</button>
      </div>
    </div>

    <!-- ① 指标总览卡（合并为一个框） -->
    <div class="stats-overview-card">
      <div class="stats-overview-grid">
        <div class="stats-ov-item">
          <span class="stats-ov-icon">✅</span>
          <div>
            <div class="stats-ov-val">${s.completionRate}%</div>
            <div class="stats-ov-label">任务完成率</div>
            <div class="stats-ov-sub">${s.doneTasks} / ${s.totalTasks} 项</div>
          </div>
        </div>
        <div class="stats-ov-item">
          <span class="stats-ov-icon">📅</span>
          <div>
            <div class="stats-ov-val">${streakText}</div>
            <div class="stats-ov-label">连续打卡</div>
            <div class="stats-ov-sub">${s.streak >= 3 ? "习惯养成中" : "每天记一点"}</div>
          </div>
        </div>
        <div class="stats-ov-item">
          <span class="stats-ov-icon">😊</span>
          <div>
            <div class="stats-ov-val">${fmtScale(s.avgMood)}</div>
            <div class="stats-ov-label">平均情绪</div>
            <div class="stats-ov-sub">${avgMoodSub}</div>
          </div>
        </div>
        <div class="stats-ov-item">
          <span class="stats-ov-icon">⚡</span>
          <div>
            <div class="stats-ov-val">${fmtScale(s.avgEnergy)}</div>
            <div class="stats-ov-label">平均精力</div>
            <div class="stats-ov-sub">${avgEnergySub}</div>
          </div>
        </div>
        <div class="stats-ov-item">
          <span class="stats-ov-icon">🌙</span>
          <div>
            <div class="stats-ov-val">${fmtScale(s.avgSleep)}</div>
            <div class="stats-ov-label">平均睡眠</div>
            <div class="stats-ov-sub">${avgSleepSub}</div>
          </div>
        </div>
        <div class="stats-ov-item">
          <span class="stats-ov-icon">⏱</span>
          <div>
            <div class="stats-ov-val">${studyText}</div>
            <div class="stats-ov-label">累计学习</div>
            <div class="stats-ov-sub">${studySub}</div>
          </div>
        </div>
        <div class="stats-ov-item">
          <span class="stats-ov-icon">📚</span>
          <div>
            <div class="stats-ov-val">${litText}</div>
            <div class="stats-ov-label">文献阅读</div>
            <div class="stats-ov-sub">${litSub}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ② 折线图 -->
    <div class="stats-charts">
      <div class="stats-chart-card">
        <div class="stats-chart-title">每日任务完成率</div>
        ${lineChart}
      </div>
      <div class="stats-chart-card">
        <div class="stats-chart-title">每日学习时长 ⏱</div>
        ${studyChart}
      </div>
    </div>

    <!-- ③ 状态条形 -->
    <div class="stats-chart-card stats-chart-card-wide">
      <div class="stats-chart-title">情绪 😊 · 精力 ⚡ · 睡眠 🌙（近 ${Math.min(days,7)} 天）</div>
      <div class="stats-bar-legend">
        <span class="stats-bar-legend-dot mood-dot"></span>情绪
        <span class="stats-bar-legend-dot energy-dot" style="margin-left:10px"></span>精力
        <span class="stats-bar-legend-dot sleep-dot"  style="margin-left:10px"></span>睡眠
      </div>
      <div class="stats-bars">${moodBars}</div>
    </div>

    <!-- ④ 三个洞察板块 -->
    <div class="stats-insight-blocks">
      ${stateBlock}
      ${effBlock}
      ${prefBlock}
    </div>

    <!-- ⑤ 底部：类型分布 + 近期小结 -->
    <div class="stats-bottom">
      <div class="stats-chart-card stats-donut-card">
        <div class="stats-chart-title">任务类型分布</div>
        <div class="stats-donut-row">
          ${donut}
          <div class="stats-legend">${legendHTML}</div>
        </div>
      </div>
      <div class="stats-insight-card">
        <div class="stats-insight-icon">🌱</div>
        <div>
          <div class="stats-insight-title">近期小结</div>
          <div class="stats-insight-body">${insight}</div>
        </div>
      </div>
    </div>

  </div>`;
}
