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
      if (j.litCount != null) {
        litPapers += j.litCount;
      } else if (j.papers) {
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

/* ── 板块1：我的规律 ──────────────────────── */

function buildMyPatternsBlock(s) {
  // 计算5条关联（去掉噪音大的"精力→学习时长"和"学习时长→完成率"）
  const rates       = s.dailyRates.map(d => ({ ...d, val: d.rate }));
  const sleepEnergy = laggedPearson(s.dailySleep,  s.dailyEnergy);   // 睡眠→次日精力（滞后）
  const moodEnergy  = pearson(s.dailyMoods.map(d=>d.val), s.dailyEnergy.map(d=>d.val)); // 情绪↔精力
  const energyRate  = pearson(s.dailyEnergy.map(d=>d.val), rates.map(d=>d.val));        // 精力→完成率
  const moodRate    = pearson(s.dailyMoods.map(d=>d.val),  rates.map(d=>d.val));        // 情绪→完成率
  const sleepRate   = laggedPearson(s.dailySleep, rates);                               // 睡眠→次日完成率（滞后）

  const c_se  = corrStrength(sleepEnergy.r, sleepEnergy.n);
  const c_me  = corrStrength(moodEnergy.r,  moodEnergy.n);
  const c_er  = corrStrength(energyRate.r,  energyRate.n);
  const c_mr  = corrStrength(moodRate.r,    moodRate.n);
  const c_sr  = corrStrength(sleepRate.r,   sleepRate.n);

  const patternRows = [
    {
      icon: "🌙",
      label: "睡眠 → 次日精力",
      tag: "最重要",
      tagColor: "#f87171",
      note: "最接近因果关系，睡好了第二天更有劲",
      c: c_se,
    },
    {
      icon: "🎭",
      label: "情绪 ↔ 精力",
      tag: "同步观察",
      tagColor: "#a78bfa",
      note: "二者是否同步变化、互相影响",
      c: c_me,
    },
    {
      icon: "⚡",
      label: "精力 → 完成率",
      tag: "核心指标",
      tagColor: "#38bdf8",
      note: "精力充沛时任务完成情况更好？",
      c: c_er,
    },
    {
      icon: "🌈",
      label: "情绪 → 完成率",
      tag: "",
      tagColor: "",
      note: "心情好时更容易完成任务？",
      c: c_mr,
    },
    {
      icon: "✅",
      label: "睡眠 → 次日完成率",
      tag: "",
      tagColor: "",
      note: "昨晚睡好，今天事情完成得更多？",
      c: c_sr,
    },
  ];

  const rowsHtml = patternRows.map(({ icon, label, tag, tagColor, note, c }) => {
    const tagHtml = tag
      ? `<span class="pattern-tag" style="background:${tagColor}18;color:${tagColor};border-color:${tagColor}40">${tag}</span>`
      : "";
    return `<div class="pattern-row">
      <div class="pattern-row-left">
        <span class="pattern-icon">${icon}</span>
        <div class="pattern-info">
          <div class="pattern-label">${label} ${tagHtml}</div>
          <div class="pattern-note">${note}</div>
        </div>
      </div>
      <div class="insight-row-right">${corrBar(c)}</div>
    </div>`;
  }).join("");

  // 主要结论
  const topCorr = [
    { label: "睡眠→精力", c: c_se },
    { label: "情绪↔精力", c: c_me },
    { label: "精力→完成率", c: c_er },
    { label: "情绪→完成率", c: c_mr },
    { label: "睡眠→完成率", c: c_sr },
  ].filter(x => x.c.r !== null && Math.abs(x.c.r) >= 0.35)
   .sort((a, b) => Math.abs(b.c.r) - Math.abs(a.c.r));

  const conclusion = topCorr.length
    ? `最显著规律：${topCorr.slice(0,2).map(x => `${x.label}（r=${x.c.r.toFixed(2)}）`).join("、")}。`
    : sleepEnergy.n < 4
      ? "数据积累中，记录7天以上后规律会更清晰。"
      : "目前各项关联不明显，继续积累数据。";

  return `<div class="insight-card">
    <div class="insight-card-head">
      <span class="insight-card-icon">📈</span>
      <div>
        <div class="insight-card-title">我的规律</div>
        <div class="insight-card-q">状态与任务完成度的关联</div>
      </div>
    </div>
    ${rowsHtml}
    <div class="insight-conclusion">
      <span class="insight-conclusion-dot">💡</span>
      <p>${conclusion}</p>
    </div>
    <p class="pattern-caveat">· 完成率受任务难度、数量影响；学习时长受当天安排影响。相关性供参考，不代表因果。</p>
  </div>`;
}

/* ── 板块2：综合分析 ──────────────────────── */

function buildAnalysisBlock(s) {
  // ── 本周表现 ──
  const rateText = s.totalTasks === 0
    ? "暂无任务记录"
    : s.completionRate >= 80
      ? `完成率 ${s.completionRate}%，执行力很强！`
      : s.completionRate >= 50
        ? `完成率 ${s.completionRate}%，整体稳定。`
        : `完成率 ${s.completionRate}%，可适当精简任务量。`;
  const studyAvg = s.studyDays > 0 ? (s.studyTotal / s.studyDays).toFixed(1) : null;
  const studyLine = s.studyTotal > 0
    ? `累计学习 ${s.studyTotal.toFixed(1)} 小时，日均 ${studyAvg} 小时。`
    : "暂无学习时长记录。";
  const streakLine = s.streak >= 3
    ? `连续打卡 ${s.streak} 天 🔥`
    : s.streak > 0
      ? `已打卡 ${s.streak} 天，继续保持！`
      : "本段时间有中断，尝试每天记录一次。";

  // ── 主要发现（关联分析） ──
  const sleepEnergy  = laggedPearson(s.dailySleep, s.dailyEnergy);
  const sleepMood    = laggedPearson(s.dailySleep, s.dailyMoods);
  const rates        = s.dailyRates.map(d => ({ ...d, val: d.rate }));
  const energyRate   = pearson(s.dailyEnergy.map(d=>d.val), rates.map(d=>d.val));
  const studyMood    = pearson(s.dailyStudy.map(d=>d.val), s.dailyMoods.map(d=>d.val));

  const findings = [];
  if (sleepEnergy.r !== null && Math.abs(sleepEnergy.r) >= 0.3)
    findings.push(sleepEnergy.r > 0
      ? `睡眠与次日精力存在正相关（r=${sleepEnergy.r.toFixed(2)}）。`
      : `睡眠对次日精力影响不明显。`);
  if (energyRate.r !== null && Math.abs(energyRate.r) >= 0.3)
    findings.push(energyRate.r > 0
      ? `精力充沛时任务完成率更高（r=${energyRate.r.toFixed(2)}）。`
      : `精力与完成率暂无明显关联。`);
  if (sleepMood.r !== null && Math.abs(sleepMood.r) >= 0.3)
    findings.push(sleepMood.r > 0
      ? `睡眠质量对次日情绪也有正向影响。`
      : `睡眠对情绪的滞后影响不明显。`);
  if (studyMood.r !== null && studyMood.r <= -0.35)
    findings.push("学习时长增加时情绪有下降趋势，留意劳逸平衡。");
  if (!findings.length)
    findings.push(sleepEnergy.n < 4
      ? "数据不足，记录7天以上后发现会更清晰。"
      : "各项指标暂无显著关联，继续积累。");

  // ── 最佳状态 ──
  // 找睡眠≥4时，学习时长和完成率情况
  const goodSleepDays = s.dailySleep.filter(d => d.val != null && d.val >= 4);
  const allSleepDays  = s.dailySleep.filter(d => d.val != null);
  let bestStateText = "暂无足够数据分析最佳状态。";
  if (goodSleepDays.length >= 2 && allSleepDays.length >= 3) {
    const avgStudyGood = goodSleepDays.reduce((sum, d) => {
      const study = s.dailyStudy.find(x => x.key === d.key);
      return sum + (study?.val ?? 0);
    }, 0) / goodSleepDays.length;
    const avgStudyAll  = s.studyDays > 0 ? s.studyTotal / s.studyDays : 0;
    if (avgStudyAll > 0) {
      const lift = Math.round(((avgStudyGood - avgStudyAll) / avgStudyAll) * 100);
      bestStateText = lift > 0
        ? `睡眠评分 ≥4 时，平均学习时长增加约 ${lift}%。`
        : `睡眠评分 ≥4 时，学习时长与平均水平相当。`;
    } else {
      bestStateText = `已记录 ${goodSleepDays.length} 天睡眠良好（≥4分）。`;
    }
  }

  // ── 风险提醒 ──
  const risks = [];
  // 最近3天精力趋势
  const recentEnergy = s.dailyEnergy.slice(-3).filter(d => d.val != null);
  if (recentEnergy.length >= 2) {
    const trend = recentEnergy[recentEnergy.length-1].val - recentEnergy[0].val;
    if (trend <= -1) risks.push(`最近 ${recentEnergy.length} 天精力持续下降（−${Math.abs(trend.toFixed(1))}分）。`);
  }
  // 睡眠均值低
  if (s.avgSleep !== null && parseFloat(s.avgSleep) <= 2.5)
    risks.push(`平均睡眠评分偏低（${s.avgSleep}/5），建议优先改善作息。`);
  // 情绪均值低
  if (s.avgMood !== null && parseFloat(s.avgMood) <= 2.5)
    risks.push(`近期情绪偏低（${s.avgMood}/5），适当安排放松时间。`);
  // 学习强度过高
  if (studyAvg && parseFloat(studyAvg) >= 8)
    risks.push(`日均学习 ${studyAvg} 小时，强度较高，注意休息。`);
  if (!risks.length) risks.push("暂无明显风险信号，继续保持当前节奏！");

  // ── 下周建议 ──
  const suggestions = [];
  if (s.avgSleep !== null && parseFloat(s.avgSleep) <= 3)
    suggestions.push("优先提升睡眠质量，而不是增加学习时长。");
  if (s.completionRate < 50 && s.totalTasks > 0)
    suggestions.push("适当减少每日任务数量，聚焦2–3个核心目标。");
  if (s.streak === 0 && s.activeDays > 0)
    suggestions.push("保持每天记录习惯，连续数据让分析更准确。");
  if (sleepEnergy.r !== null && sleepEnergy.r >= 0.4)
    suggestions.push("数据已显示睡眠对精力影响最大，坚持早睡优先。");
  if (!suggestions.length)
    suggestions.push("继续保持，多记录几周后会有更个性化的建议。");

  function section(icon, title, lines) {
    const content = lines.map(l => `<p class="analysis-line">${l}</p>`).join("");
    return `<div class="analysis-section">
      <div class="analysis-section-head">
        <span class="analysis-section-icon">${icon}</span>
        <span class="analysis-section-title">${title}</span>
      </div>
      <div class="analysis-section-body">${content}</div>
    </div>`;
  }

  return `<div class="insight-card insight-card-analysis">
    <div class="insight-card-head">
      <span class="insight-card-icon">🗂️</span>
      <div>
        <div class="insight-card-title">综合分析</div>
        <div class="insight-card-q">本周表现 · 发现 · 建议</div>
      </div>
    </div>
    ${section("📋", "本周表现", [rateText, studyLine, streakLine])}
    ${section("🔍", "主要发现", findings)}
    ${section("🏆", "最佳状态", [bestStateText])}
    ${section("⚠️", "风险提醒", risks)}
    ${section("🎯", "下周建议", suggestions)}
    <p class="corr-disclaimer-line" style="margin-top:8px">· 基于实际数据计算，样本量小时仅供参考</p>
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

/* ── 三环状图：情绪/精力/睡眠分布 ─────────── */

/**
 * 对一个数值序列（值1-5）统计各档出现次数，返回5段的分布百分比
 */
function levelDistribution(series) {
  const counts = [0, 0, 0, 0, 0]; // index 0 = level 1
  let total = 0;
  series.forEach(d => {
    if (d.val != null && d.val >= 1 && d.val <= 5) {
      counts[d.val - 1]++;
      total++;
    }
  });
  if (total === 0) return null;
  return counts.map(c => c / total);
}

function buildStateRingChart(series, label, colors, emoji, avgVal) {
  const dist = levelDistribution(series);
  const R = 38, CX = 50, CY = 50, SW = 12;
  const circ = 2 * Math.PI * R;

  if (!dist) {
    return `<div class="state-ring-item">
      <svg viewBox="0 0 100 100" width="110" height="110">
        <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="var(--border)" stroke-width="${SW}"/>
        <text x="${CX}" y="${CY-6}" text-anchor="middle" font-size="18">${emoji}</text>
        <text x="${CX}" y="${CY+10}" text-anchor="middle" font-size="9" fill="var(--text-muted)">未记录</text>
      </svg>
      <div class="state-ring-label">${label}</div>
    </div>`;
  }

  let offset = 0;
  const segments = dist.map((pct, i) => {
    if (pct === 0) return '';
    const dash = pct * circ;
    const seg = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none"
      stroke="${colors[i]}" stroke-width="${SW}"
      stroke-dasharray="${dash.toFixed(2)} ${circ.toFixed(2)}"
      stroke-dashoffset="${(circ * 0.25 - offset).toFixed(2)}"
      stroke-linecap="butt"/>`;
    offset += dash;
    return seg;
  }).join('');

  const avgText = avgVal != null ? parseFloat(avgVal).toFixed(1) : '—';

  return `<div class="state-ring-item">
    <svg viewBox="0 0 100 100" width="110" height="110">
      <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="var(--border)" stroke-width="${SW}"/>
      ${segments}
      <text x="${CX}" y="${CY-6}" text-anchor="middle" font-size="18">${emoji}</text>
      <text x="${CX}" y="${CY+10}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text)">${avgText}</text>
    </svg>
    <div class="state-ring-label">${label}</div>
  </div>`;
}

const MOOD_RING_COLORS   = ['#f4a0b0','#f8c0cc','#fce0e6','#c8e8c0','#90d080'];
const ENERGY_RING_COLORS = ['#b8d8f0','#c8e4f8','#ddf0fc','#a0d8c8','#60c0a8'];
const SLEEP_RING_COLORS  = ['#c8b8e8','#d8ccf0','#ece8f8','#b8d8e8','#88b8d8'];

function buildStateRingsSection(s, donutHtml, legendHtml) {
  const moodRing   = buildStateRingChart(s.dailyMoods,  '情绪', MOOD_RING_COLORS,   '😊', s.avgMood);
  const energyRing = buildStateRingChart(s.dailyEnergy, '精力', ENERGY_RING_COLORS, '⚡', s.avgEnergy);
  const sleepRing  = buildStateRingChart(s.dailySleep,  '睡眠', SLEEP_RING_COLORS,  '🌙', s.avgSleep);

  const legend = `<div class="state-ring-legend">
    ${[1,2,3,4,5].map((v,i) => `<span class="srl-item">
      <span class="srl-dot" style="background:${MOOD_RING_COLORS[i]}"></span>${MOOD_TEXT[v]}
    </span>`).join('')}
    <span class="srl-note">（颜色深→浅 = 低→高）</span>
  </div>`;

  return `<div class="stats-chart-card stats-rings-donut-row">
    <div class="stats-rings-left">
      <div class="stats-chart-title">情绪 · 精力 · 睡眠 分布</div>
      <div class="state-rings-row">
        ${moodRing}${energyRing}${sleepRing}
      </div>
      ${legend}
    </div>
    <div class="stats-rings-divider"></div>
    <div class="stats-rings-right">
      <div class="stats-chart-title">任务类型分布</div>
      <div class="stats-donut-with-legend">
        ${donutHtml}
        <div class="stats-legend stats-legend-vertical">${legendHtml}</div>
      </div>
    </div>
  </div>`;
}

/* ── 环形图 ──────────────────────────────── */

function buildDonut(catDist, total) {
  const R = 38, CX = 50, CY = 50, SW = 12, circ = 2 * Math.PI * R;
  if (!catDist.length || total === 0) {
    return `<div class="state-ring-item">
      <svg viewBox="0 0 100 100" width="110" height="110">
        <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="var(--border)" stroke-width="${SW}"/>
        <text x="${CX}" y="${CY+4}" text-anchor="middle" font-size="9" fill="var(--text-muted)">暂无数据</text>
      </svg>
      <div class="state-ring-label">任务分布</div>
    </div>`;
  }
  let offset = 0;
  const segs = catDist.slice(0, 6).map(c => {
    const dash = (c.count / total) * circ;
    const seg = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${c.color}" stroke-width="${SW}"
      stroke-dasharray="${dash.toFixed(2)} ${circ.toFixed(2)}"
      stroke-dashoffset="${(circ * 0.25 - offset).toFixed(2)}"
      stroke-linecap="butt"/>`;
    offset += dash;
    return seg;
  });
  return `<div class="state-ring-item">
    <svg viewBox="0 0 100 100" width="110" height="110" style="flex-shrink:0">
      <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="var(--border)" stroke-width="${SW}"/>
      ${segs.join("")}
      <text x="${CX}" y="${CY+4}" text-anchor="middle" font-size="10" fill="var(--text-muted)">${total}项</text>
    </svg>
    <div class="state-ring-label">任务分布</div>
  </div>`;
}

/* ── 主渲染 ──────────────────────────────── */

export function renderStats(container, state, days) {
  const s = computeStats(state, days);

  const lineChart  = buildLineChart(s.dailyRates, s.dayKeys);
  const studyChart = buildStudyChart(s.dailyStudy, s.dayKeys);
  const donut      = buildDonut(s.catDist, s.totalTasks);

  const patternsBlock  = buildMyPatternsBlock(s);
  const analysisBlock  = buildAnalysisBlock(s);

  // 数值格式化
  const studyText = s.studyTotal > 0 ? `${s.studyTotal.toFixed(1)} 小时` : "0 小时";
  const studySub  = s.studyDays > 0 ? `日均 ${(s.studyTotal/s.studyDays).toFixed(1)} 小时` : "暂无记录";

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

  const stateRings = buildStateRingsSection(s, donut, legendHTML);

  // 6个指标 → 分两组 3+3
  const chip = (icon, val, label, sub) => `
    <div class="stats-ov-chip2">
      <span class="soc-icon">${icon}</span>
      <span class="soc-val">${val}</span>
      <span class="soc-label">${label}</span>
      ${sub ? `<span class="soc-sub">${sub}</span>` : ""}
    </div>`;

  container.innerHTML = `<div class="stats-view">

    <!-- 时间范围 -->
    <div class="stats-range-bar">
      <span class="stats-range-label">数据概览</span>
      <div class="stats-range-toggle">
        <button class="stats-range-btn${days===7?" active":""}" data-range="7">近7天</button>
        <button class="stats-range-btn${days===30?" active":""}" data-range="30">近30天</button>
      </div>
    </div>

    <!-- ① 指标总览：单行 4 项 -->
    <div class="stats-overview-grid">
      <div class="stats-ov-card stats-ov-card-full">
        ${chip("✅", `${s.completionRate}%`, "完成率", `${s.doneTasks}/${s.totalTasks} 项`)}
        ${chip("📅", s.streak > 0 ? s.streak+"天🔥" : "0天", "连续打卡", "")}
        ${chip("📖", s.litPapers > 0 ? s.litPapers+"篇" : "0篇", "文献阅读", s.litMinutes > 0 ? `${s.litMinutes}分钟` : "")}
        ${chip("⏱", studyText, "累计学习", studySub)}
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

    <!-- ③ 状态环形图 + 任务分布 -->
    ${stateRings}

    <!-- ④ 我的规律 + 综合分析 并排两列 -->
    <div class="stats-insight-blocks stats-insight-blocks-bottom">
      ${patternsBlock}
      ${analysisBlock}
    </div>

  </div>`;
}
