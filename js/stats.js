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
      if (j.studyMinutes != null && j.studyMinutes > 0) {
        studyTotal += j.studyMinutes; studyDays++;
      }
      if (j.papers) {
        litPapers += j.papers.length;
        j.papers.forEach(p => { litMinutes += Number(p.minutes) || 0; });
      }
    }
    dailyMoods.push ({ key, date, val: j?.mood         ?? null });
    dailyEnergy.push({ key, date, val: j?.energy       ?? null });
    dailySleep.push ({ key, date, val: j?.sleep        ?? null });
    dailyStudy.push ({ key, date, val: j?.studyMinutes ?? null });
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

/* ── 板块1：状态来源 ──────────────────────── */

function buildStateSourceBlock(s) {
  const sleepEnergy = laggedPearson(s.dailySleep,  s.dailyEnergy);
  const sleepMood   = laggedPearson(s.dailySleep,  s.dailyMoods);

  // 星期几 → 精力：把每天的 weekday(0-6) 做分组均值
  const wdEnergyPairs = s.dailyEnergy.map(d => [d.date.getDay(), d.val]);
  const wdMeans = groupMeans(wdEnergyPairs).sort((a, b) => b.mean - a.mean);
  const bestWd  = wdMeans[0];
  const worstWd = wdMeans[wdMeans.length - 1];

  const se = corrStrength(sleepEnergy.r, sleepEnergy.n);
  const sm = corrStrength(sleepMood.r,   sleepMood.n);

  // 生成结论句
  let conclusion = "";
  const hasSE = se.r !== null;
  const hasSM = sm.r !== null;
  const hasWd = wdMeans.length >= 3;

  if (!hasSE && !hasSM && !hasWd) {
    conclusion = "数据积累中，记录更多天后可以看出规律。";
  } else {
    const parts = [];
    if (hasSE && Math.abs(se.r) >= 0.35)
      parts.push(se.r > 0
        ? `睡好觉对次日精力有明显提升作用（r=${se.r.toFixed(2)}）`
        : `你的精力与前晚睡眠关联较弱，影响精力的因素可能在别处`);
    if (hasSM && Math.abs(sm.r) >= 0.35)
      parts.push(sm.r > 0
        ? `睡眠质量也影响次日情绪`
        : `睡眠对次日情绪的影响不明显`);
    if (hasWd && bestWd && worstWd && bestWd.key !== worstWd.key && bestWd.n >= 1)
      parts.push(`${WEEKDAY_SHORT[bestWd.key]} 精力通常最好，${WEEKDAY_SHORT[worstWd.key]} 最低`);
    conclusion = parts.length
      ? parts.join("；") + "。"
      : "目前各项关联较弱，状态受多种因素共同影响，尚无明显单一规律。";
  }

  const rows = [
    { label: "睡眠 → 次日精力", note: "昨晚睡好，今天精力更好？", s: se },
    { label: "睡眠 → 次日情绪", note: "睡眠质量影响心情？", s: sm },
  ];

  const wdRow = hasWd
    ? `<div class="corr-wdrow">
        <span class="corr-wdlabel">星期几 → 精力</span>
        <div class="corr-wdbars">
          ${wdMeans.sort((a,b)=>Number(a.key)-Number(b.key)).map(w =>
            `<div class="corr-wd-item">
              <span class="corr-wd-name">${WEEKDAY_SHORT[w.key]}</span>
              <div class="corr-wd-bar-wrap">
                <div class="corr-wd-bar" style="width:${Math.round((w.mean/5)*100)}%"></div>
              </div>
              <span class="corr-wd-val">${w.mean.toFixed(1)}</span>
            </div>`
          ).join("")}
        </div>
        <span class="corr-wdnote">各天精力均值（需 n≥2 才可靠）</span>
      </div>`
    : `<div class="corr-wdrow"><span class="corr-wdlabel">星期几 → 精力</span><span class="corr-na">数据不足</span></div>`;

  return buildInsightCard({
    icon: "🌙",
    title: "状态来源",
    question: "为什么今天状态这样？",
    conclusion,
    rows,
    extra: wdRow,
  });
}

/* ── 板块2：效率来源 ──────────────────────── */

function buildEfficiencyBlock(s) {
  const rates   = s.dailyRates.map(d => ({ ...d, val: d.rate }));
  const energyR = pearson(s.dailyEnergy.map(d => d.val), rates.map(d => d.val));
  const sleepR  = laggedPearson(s.dailySleep, rates);
  const moodR   = pearson(s.dailyMoods.map(d => d.val),  rates.map(d => d.val));

  const se = corrStrength(energyR.r, energyR.n);
  const ss = corrStrength(sleepR.r,  sleepR.n);
  const sm = corrStrength(moodR.r,   moodR.n);

  let conclusion = "";
  const top = [
    { label: "精力", s: se }, { label: "睡眠", s: ss }, { label: "情绪", s: sm },
  ].filter(x => x.s.r !== null && Math.abs(x.s.r) >= 0.35)
   .sort((a, b) => Math.abs(b.s.r) - Math.abs(a.s.r));

  if (!top.length) {
    const any = [se, ss, sm].some(x => x.r !== null);
    conclusion = any
      ? "目前任务完成率与状态指标关联不强，可能主要受任务数量或类型影响。"
      : "数据积累中，建议多记录几天后再看。";
  } else {
    const parts = top.map(x => {
      const dir = x.s.r > 0 ? "正向影响" : "负向影响（值得关注）";
      return `${x.label}对完成率有${dir}（r=${x.s.r.toFixed(2)}）`;
    });
    const weakest = [se, ss, sm]
      .filter(x => x.r !== null && Math.abs(x.r) < 0.15)
      .map((_, i) => ["精力","睡眠","情绪"][i]);
    conclusion = parts.join("；") + "。"
      + (weakest.length ? `${weakest.join("、")}的影响相对有限。` : "");
  }

  const rows = [
    { label: "精力 → 完成率",   note: "精力好时任务完成得更多？", s: se },
    { label: "睡眠 → 次日完成率", note: "睡好觉次日效率更高？",  s: ss },
    { label: "情绪 → 完成率",   note: "心情好时更容易完成任务？", s: sm },
  ];

  return buildInsightCard({
    icon: "⚡",
    title: "效率来源",
    question: "为什么今天效率这样？",
    conclusion,
    rows,
  });
}

/* ── 板块3：学习偏好 ──────────────────────── */

function buildPreferenceBlock(s) {
  // 计算各任务类型的平均情绪、完成率、精力
  const tasksByDate = {};
  s.allTasks.forEach(t => {
    if (!tasksByDate[t.date]) tasksByDate[t.date] = [];
    tasksByDate[t.date].push(t);
  });

  // 对每个有记录的日期，把该日所有任务的类型配上当日情绪/精力/完成率
  const catMoodPairs    = [];
  const catEnergyPairs  = [];
  const catRatePairs    = [];

  Object.entries(tasksByDate).forEach(([date, tasks]) => {
    const j = s.journals[date];
    const mood   = j?.mood   ?? null;
    const energy = j?.energy ?? null;
    const total  = tasks.length;
    const done   = tasks.filter(t => t.completed).length;
    const rate   = total > 0 ? (done / total) * 100 : null;

    tasks.forEach(t => {
      catMoodPairs.push([t.categoryId, mood]);
      catEnergyPairs.push([t.categoryId, energy]);
      catRatePairs.push([t.categoryId, rate]);
    });
  });

  const moodByCat   = groupMeans(catMoodPairs);
  const energyByCat = groupMeans(catEnergyPairs);
  const rateByCat   = groupMeans(catRatePairs);

  // 找出情绪最好/最差的类型
  const moodSorted = moodByCat.filter(x => x.n >= 2).sort((a, b) => b.mean - a.mean);
  const rateSorted = rateByCat.filter(x => x.n >= 2).sort((a, b) => b.mean - a.mean);

  const getCat = id => CATEGORIES.find(c => c.id === id) || { label: id, color: "#aaa" };

  let conclusion = "";
  if (!moodSorted.length && !rateSorted.length) {
    conclusion = "需要更多带状态记录的任务数据，才能分析任务类型偏好。";
  } else {
    const parts = [];
    if (moodSorted.length >= 2) {
      parts.push(`做【${getCat(moodSorted[0].key).label}】时情绪最好，做【${getCat(moodSorted[moodSorted.length-1].key).label}】时情绪最低`);
    }
    if (rateSorted.length >= 2) {
      parts.push(`【${getCat(rateSorted[0].key).label}】完成率最高，【${getCat(rateSorted[rateSorted.length-1].key).label}】最低`);
    }
    conclusion = parts.join("；") + "。";
  }

  // 构建类型对比表格（最多5类）
  const allCatIds = [...new Set([
    ...moodByCat.map(x => x.key),
    ...rateByCat.map(x => x.key),
  ])].slice(0, 6);

  const tableRows = allCatIds.map(id => {
    const cat    = getCat(id);
    const mood   = moodByCat.find(x => x.key === id);
    const energy = energyByCat.find(x => x.key === id);
    const rate   = rateByCat.find(x => x.key === id);
    const fmtMean = (x) => x && x.n >= 2 ? x.mean.toFixed(1) : "—";
    const fmtRate = (x) => x && x.n >= 2 ? Math.round(x.mean) + "%" : "—";
    const moodEmoji = mood && mood.n >= 2
      ? ["😫","😕","😐","🙂","😊"][Math.round(mood.mean) - 1] || ""
      : "";
    return `<tr>
      <td><span class="cat-dot" style="background:${cat.color}"></span>${cat.label}</td>
      <td>${moodEmoji} ${fmtMean(mood)}</td>
      <td>${fmtMean(energy)}</td>
      <td>${fmtRate(rate)}</td>
    </tr>`;
  }).join("");

  const table = allCatIds.length
    ? `<div class="cat-table-wrap">
        <table class="cat-table">
          <thead><tr>
            <th>任务类型</th>
            <th>情绪均值</th>
            <th>精力均值</th>
            <th>完成率</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <p class="corr-disclaimer-line">仅含有情绪/精力记录且 n≥2 的类型显示均值</p>
      </div>`
    : `<p class="corr-na-text">暂无足够数据（需要同时有任务和状态记录）</p>`;

  return buildInsightCard({
    icon: "🌱",
    title: "学习偏好",
    question: "哪类任务最适合你？",
    conclusion,
    tableContent: table,
  });
}

/* ── 通用洞察卡构建器 ─────────────────────── */

function buildInsightCard({ icon, title, question, conclusion, rows, extra, tableContent }) {
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
    const avg = s.studyDays > 0 ? Math.round(s.studyTotal / s.studyDays) : 0;
    lines.push(`累计学习 ${s.studyTotal >= 60 ? (s.studyTotal/60).toFixed(1)+"小时" : s.studyTotal+"分钟"}，有记录日均 ${avg} 分钟 ⏱`);
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
  const maxVal = vals.length ? Math.max(60, ...vals) : 60;
  return buildLineChartSvg({
    data: dailyStudy.map(d => d.val), dayKeys, yMax: maxVal,
    yFormat: v => v >= 60 ? `${(v/60).toFixed(1)}h` : `${Math.round(v)}m`,
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

  const stateBlock  = buildStateSourceBlock(s);
  const effBlock    = buildEfficiencyBlock(s);
  const prefBlock   = buildPreferenceBlock(s);

  // 数值格式化
  const fmtScale = v => v != null ? `${v} / 5` : "未记录";
  const avgMoodSub   = s.avgMood   ? MOOD_TEXT[Math.round(parseFloat(s.avgMood))]   : "—";
  const avgEnergySub = s.avgEnergy ? ENERGY_TEXT[Math.round(parseFloat(s.avgEnergy))] : "—";
  const avgSleepSub  = s.avgSleep  ? SLEEP_TEXT[Math.round(parseFloat(s.avgSleep))]  : "—";
  const studyText = s.studyTotal > 0
    ? (s.studyTotal >= 60 ? `${(s.studyTotal/60).toFixed(1)} 小时` : `${s.studyTotal} 分钟`)
    : "0 分钟";
  const studySub  = s.studyDays > 0 ? `日均 ${Math.round(s.studyTotal/s.studyDays)} 分钟` : "暂无记录";
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
