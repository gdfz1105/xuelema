import { CATEGORIES } from "./categories.js";

const MOOD_TEXT  = ["", "很低落", "略低落", "平静", "不错", "很好"];
const ENERGY_TEXT = ["", "极低", "较低", "一般", "较好", "充沛"];
const SLEEP_TEXT = ["", "很差", "较差", "一般", "较好", "很好"];
const WEEKDAY_SHORT = ["周日","周一","周二","周三","周四","周五","周六"];

/* ── 数据计算 ──────────────────────────────── */

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

function computeStats(state, days) {
  const dayKeys = getDayKeys(days);
  const allTasks = state.tasks || [];
  const journals = state.journals || {};

  let totalTasks = 0, doneTasks = 0;
  let moodSum = 0, moodCount = 0;
  let energySum = 0, energyCount = 0;
  let sleepSum = 0, sleepCount = 0;
  let litMinutes = 0, litPapers = 0;
  let studyTotal = 0, studyDays = 0;
  let activeDays = 0;
  let streak = 0;
  const dailyRates = [];
  const dailyMoods = [];
  const dailyEnergy = [];
  const dailySleep = [];
  const dailyStudy = [];
  const catCount = {};
  CATEGORIES.forEach(c => { catCount[c.id] = 0; });

  dayKeys.forEach(({ key, date }) => {
    const dayTasks = allTasks.filter(t => t.date === key);
    const j = journals[key];
    const total = dayTasks.length;
    const done = dayTasks.filter(t => t.completed).length;

    totalTasks += total;
    doneTasks += done;
    dailyRates.push({ key, date, total, done, rate: total > 0 ? Math.round((done / total) * 100) : null });

    dayTasks.forEach(t => { if (catCount[t.categoryId] !== undefined) catCount[t.categoryId]++; });

    if (j) {
      activeDays++;
      if (j.mood != null) { moodSum += j.mood; moodCount++; }
      if (j.energy != null) { energySum += j.energy; energyCount++; }
      if (j.sleep != null) { sleepSum += j.sleep; sleepCount++; }
      if (j.studyMinutes != null && j.studyMinutes > 0) { studyTotal += j.studyMinutes; studyDays++; }
      if (j.papers) {
        litPapers += j.papers.length;
        j.papers.forEach(p => { litMinutes += Number(p.minutes) || 0; });
      }
    }
    dailyMoods.push({ key, date, val: j?.mood ?? null });
    dailyEnergy.push({ key, date, val: j?.energy ?? null });
    dailySleep.push({ key, date, val: j?.sleep ?? null });
    dailyStudy.push({ key, date, val: j?.studyMinutes ?? null });
  });

  // 连续打卡：从今天往前数
  const sortedKeys = [...dayKeys].reverse();
  for (const { key } of sortedKeys) {
    const dayTasks = allTasks.filter(t => t.date === key);
    const hasData = dayTasks.length > 0 || journals[key];
    if (hasData) streak++;
    else break;
  }

  // 类型分布
  const catDist = CATEGORIES
    .map(c => ({ ...c, count: catCount[c.id] || 0 }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    totalTasks, doneTasks,
    completionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
    avgMood: moodCount > 0 ? (moodSum / moodCount).toFixed(1) : null,
    avgEnergy: energyCount > 0 ? (energySum / energyCount).toFixed(1) : null,
    avgSleep: sleepCount > 0 ? (sleepSum / sleepCount).toFixed(1) : null,
    studyTotal, studyDays,
    activeDays, streak, litMinutes, litPapers,
    dailyRates, dailyMoods, dailyEnergy, dailySleep, dailyStudy, catDist, days,
  };
}

/* ── 洞察文案生成 ──────────────────────────── */

function generateInsight(s) {
  const lines = [];
  if (s.totalTasks === 0) {
    return "这段时间还没有任务记录，赶快开始规划吧！每一步都算数 ✨";
  }
  if (s.completionRate >= 80) lines.push(`完成率 ${s.completionRate}%，表现非常棒！`);
  else if (s.completionRate >= 50) lines.push(`完成率 ${s.completionRate}%，继续保持～`);
  else lines.push(`完成率 ${s.completionRate}%，任务有点多，下次可以少安排几项试试。`);

  if (s.streak >= 5) lines.push(`已连续记录 ${s.streak} 天 🔥，习惯养成中！`);
  else if (s.streak >= 2) lines.push(`连续记录 ${s.streak} 天，坚持下去！`);

  if (s.avgMood !== null) {
    const mood = parseFloat(s.avgMood);
    if (mood >= 4) lines.push("情绪整体不错，状态良好 😊");
    else if (mood <= 2.5) lines.push("情绪有些低落，记得休息和照顾自己 🌱");
  }

  if (s.avgEnergy !== null) {
    const eng = parseFloat(s.avgEnergy);
    if (eng <= 2) lines.push("精力偏低，可以检查一下睡眠和休息质量。");
    else if (eng >= 4) lines.push("精力充沛，适合安排挑战性任务！⚡");
  }

  if (s.avgSleep !== null) {
    const sl = parseFloat(s.avgSleep);
    if (sl <= 2) lines.push("睡眠质量较差，注意保证休息时间 🌙");
    else if (sl >= 4) lines.push("睡眠质量不错，保持好的作息习惯！");
  }

  if (s.studyTotal > 0) {
    const avgPerDay = s.studyDays > 0 ? Math.round(s.studyTotal / s.studyDays) : 0;
    lines.push(`累计学习 ${s.studyTotal >= 60 ? (s.studyTotal/60).toFixed(1) + ' 小时' : s.studyTotal + ' 分钟'}，有记录日平均 ${avgPerDay} 分钟 ⏱`);
  }

  // 找情绪最好的星期
  const bestMood = s.dailyMoods.filter(d => d.val != null).sort((a,b) => b.val - a.val)[0];
  if (bestMood) {
    const wd = WEEKDAY_SHORT[bestMood.date.getDay()];
    lines.push(`${wd}是本期情绪最佳的一天，可以把重要任务安排在这前后。`);
  }

  if (s.litMinutes > 0) lines.push(`共阅读文献 ${s.litPapers} 篇，累计 ${s.litMinutes} 分钟 📚`);

  return lines.join(" ");
}

/* ── SVG 折线图 ─────────────────────────────── */

function buildLineChart(dailyRates) {
  const W = 300, H = 80, PAD = { l: 28, r: 8, t: 8, b: 18 };
  const inner = { w: W - PAD.l - PAD.r, h: H - PAD.t - PAD.b };
  const n = dailyRates.length;
  const xs = dailyRates.map((_, i) => PAD.l + (i / Math.max(n - 1, 1)) * inner.w);

  // 有数据的点
  const pts = dailyRates.map((d, i) => ({ x: xs[i], y: d.rate != null ? PAD.t + inner.h - (d.rate / 100) * inner.h : null, rate: d.rate, date: d.date }));
  const validPts = pts.filter(p => p.y != null);

  const polyline = validPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = validPts.length > 1
    ? `M${validPts[0].x.toFixed(1)},${(PAD.t + inner.h).toFixed(1)} ` +
      validPts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
      ` L${validPts[validPts.length-1].x.toFixed(1)},${(PAD.t + inner.h).toFixed(1)} Z`
    : "";

  // 日期标签：均匀分布，固定选首、中间、末，最多7个
  const labelCount = Math.min(n, 7);
  const labelIndices = new Set();
  labelIndices.add(0);
  labelIndices.add(n - 1);
  for (let i = 1; i < labelCount - 1; i++) {
    labelIndices.add(Math.round(i * (n - 1) / (labelCount - 1)));
  }
  const labels = [...labelIndices].sort((a, b) => a - b).map(i => ({ i, date: dailyRates[i].date }));

  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:90px">
    <line x1="${PAD.l}" y1="${PAD.t}" x2="${PAD.l}" y2="${PAD.t+inner.h}" stroke="var(--border)" stroke-width="0.8"/>
    ${[100,50,0].map(v => {
      const y = PAD.t + inner.h - (v/100)*inner.h;
      return `<line x1="${PAD.l}" y1="${y.toFixed(1)}" x2="${W-PAD.r}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-width="0.6" stroke-dasharray="3,3"/>
              <text x="${PAD.l-3}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="7" fill="var(--text-muted)">${v}%</text>`;
    }).join("")}
    ${areaPath ? `<path d="${areaPath}" fill="rgba(212,160,152,0.13)"/>` : ""}
    ${validPts.length > 1 ? `<polyline points="${polyline}" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>` : ""}
    ${validPts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.8" fill="#fff" stroke="var(--accent)" stroke-width="1.5"/>`).join("")}
    ${labels.map(({ i, date }) => {
      const wd = WEEKDAY_SHORT[date.getDay()];
      return `<text x="${xs[i].toFixed(1)}" y="${H}" text-anchor="middle" font-size="7" fill="var(--text-muted)">${wd}</text>`;
    }).join("")}
  </svg>`;
}

/* ── 情绪精力条形图 ──────────────────────────── */

function buildMoodBars(dailyMoods, dailyEnergy, dailySleep) {
  const n = dailyMoods.length;
  // 最多显示7天
  const slice = n > 7 ? dailyMoods.slice(-7) : dailyMoods;
  const eSlice = n > 7 ? dailyEnergy.slice(-7) : dailyEnergy;
  const sSlice = n > 7 ? dailySleep.slice(-7) : dailySleep;

  return slice.map((d, i) => {
    const e = eSlice[i];
    const sl = sSlice[i];
    const wd = WEEKDAY_SHORT[d.date.getDay()];
    const moodPct = d.val != null ? Math.round((d.val / 5) * 100) : 0;
    const engPct  = e.val  != null ? Math.round((e.val  / 5) * 100) : 0;
    const sleepPct = sl.val != null ? Math.round((sl.val / 5) * 100) : 0;
    const moodEmoji = d.val != null ? ["😫","😕","😐","🙂","😊"][d.val - 1] : "—";
    const sleepEmoji = sl.val != null ? ["😵","😪","😑","😴","😌"][sl.val - 1] : "—";
    return `<div class="stats-bar-row">
      <span class="stats-bar-day">${wd}</span>
      <div class="stats-bar-wrap">
        <div class="stats-bar mood-bar-fill" style="width:${moodPct}%">
          <span class="stats-bar-label">${moodEmoji}${d.val != null ? " " + d.val : ""}</span>
        </div>
      </div>
      <div class="stats-bar-wrap">
        <div class="stats-bar energy-bar-fill" style="width:${engPct}%">
          <span class="stats-bar-label" style="color:var(--accent)">${e.val != null ? ENERGY_TEXT[e.val] : "—"}</span>
        </div>
      </div>
      <div class="stats-bar-wrap">
        <div class="stats-bar sleep-bar-fill" style="width:${sleepPct}%">
          <span class="stats-bar-label">${sleepEmoji}${sl.val != null ? " " + SLEEP_TEXT[sl.val] : ""}</span>
        </div>
      </div>
    </div>`;
  }).join("");
}

/* ── 环形图 ──────────────────────────────────── */

function buildDonut(catDist, total) {
  if (!catDist.length || total === 0) {
    return `<svg viewBox="0 0 80 80" style="width:80px;height:80px">
      <circle cx="40" cy="40" r="30" fill="none" stroke="var(--border)" stroke-width="14"/>
      <text x="40" y="44" text-anchor="middle" font-size="9" fill="var(--text-muted)">暂无</text>
    </svg>`;
  }
  const R = 30, CX = 40, CY = 40;
  const circum = 2 * Math.PI * R;
  let offset = 0;
  const top5 = catDist.slice(0, 5);
  const segments = top5.map(c => {
    const pct = c.count / total;
    const dash = pct * circum;
    const seg = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${c.color}" stroke-width="14"
      stroke-dasharray="${dash.toFixed(2)} ${circum.toFixed(2)}"
      stroke-dashoffset="${(-offset).toFixed(2)}"
      transform="rotate(-90 ${CX} ${CY})"/>`;
    offset += dash;
    return seg;
  });
  return `<svg viewBox="0 0 80 80" style="width:80px;height:80px;flex-shrink:0">
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="var(--border)" stroke-width="14"/>
    ${segments.join("")}
    <text x="${CX}" y="${CY+4}" text-anchor="middle" font-size="9" fill="var(--text-muted)">${total}项</text>
  </svg>`;
}

/* ── 学习时长折线图 ─────────────────────────── */

function buildStudyChart(dailyStudy) {
  const W = 300, H = 80, PAD = { l: 36, r: 8, t: 8, b: 18 };
  const inner = { w: W - PAD.l - PAD.r, h: H - PAD.t - PAD.b };
  const n = dailyStudy.length;
  const maxVal = Math.max(60, ...dailyStudy.filter(d => d.val != null).map(d => d.val));
  const xs = dailyStudy.map((_, i) => PAD.l + (i / Math.max(n - 1, 1)) * inner.w);

  const pts = dailyStudy.map((d, i) => ({
    x: xs[i],
    y: d.val != null ? PAD.t + inner.h - (d.val / maxVal) * inner.h : null,
    val: d.val,
    date: d.date,
  }));
  const validPts = pts.filter(p => p.y != null);
  const polyline = validPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = validPts.length > 1
    ? `M${validPts[0].x.toFixed(1)},${(PAD.t + inner.h).toFixed(1)} ` +
      validPts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
      ` L${validPts[validPts.length-1].x.toFixed(1)},${(PAD.t + inner.h).toFixed(1)} Z`
    : "";

  // y 轴刻度（小时）
  const yMarks = [0, Math.round(maxVal / 2), maxVal];
  const labelCount = Math.min(n, 7);
  const labelIndices = new Set();
  labelIndices.add(0);
  labelIndices.add(n - 1);
  for (let i = 1; i < labelCount - 1; i++) {
    labelIndices.add(Math.round(i * (n - 1) / (labelCount - 1)));
  }
  const labels = [...labelIndices].sort((a, b) => a - b).map(i => ({ i, date: dailyStudy[i].date }));

  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:90px">
    <line x1="${PAD.l}" y1="${PAD.t}" x2="${PAD.l}" y2="${PAD.t+inner.h}" stroke="var(--border)" stroke-width="0.8"/>
    ${yMarks.map(v => {
      const y = PAD.t + inner.h - (v / maxVal) * inner.h;
      const label = v >= 60 ? `${(v/60).toFixed(1)}h` : `${v}m`;
      return `<line x1="${PAD.l}" y1="${y.toFixed(1)}" x2="${W-PAD.r}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-width="0.6" stroke-dasharray="3,3"/>
              <text x="${PAD.l-3}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="7" fill="var(--text-muted)">${label}</text>`;
    }).join("")}
    ${areaPath ? `<path d="${areaPath}" fill="rgba(136,181,168,0.15)"/>` : ""}
    ${validPts.length > 1 ? `<polyline points="${polyline}" fill="none" stroke="#88b5a8" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>` : ""}
    ${validPts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.8" fill="#fff" stroke="#88b5a8" stroke-width="1.5"/>`).join("")}
    ${labels.map(({ i, date }) => {
      const wd = WEEKDAY_SHORT[date.getDay()];
      return `<text x="${xs[i].toFixed(1)}" y="${H}" text-anchor="middle" font-size="7" fill="var(--text-muted)">${wd}</text>`;
    }).join("")}
  </svg>`;
}

/* ── 主渲染函数 ──────────────────────────────── */

export function renderStats(container, state, days) {
  const s = computeStats(state, days);
  const insight = generateInsight(s);
  const lineChart = buildLineChart(s.dailyRates);
  const moodBars  = buildMoodBars(s.dailyMoods, s.dailyEnergy, s.dailySleep);
  const studyChart = buildStudyChart(s.dailyStudy);
  const donut     = buildDonut(s.catDist, s.totalTasks);

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

  const avgMoodText   = s.avgMood   != null ? `${s.avgMood} / 5` : "未记录";
  const avgMoodSub    = s.avgMood   != null ? MOOD_TEXT[Math.round(parseFloat(s.avgMood))] : "—";
  const avgEnergyText = s.avgEnergy != null ? `${s.avgEnergy} / 5` : "未记录";
  const avgEnergySub  = s.avgEnergy != null ? ENERGY_TEXT[Math.round(parseFloat(s.avgEnergy))] : "—";
  const avgSleepText  = s.avgSleep  != null ? `${s.avgSleep} / 5` : "未记录";
  const avgSleepSub   = s.avgSleep  != null ? SLEEP_TEXT[Math.round(parseFloat(s.avgSleep))] : "—";
  const litText = s.litPapers > 0 ? `${s.litPapers} 篇` : "0 篇";
  const litSub  = s.litMinutes > 0 ? `累计 ${s.litMinutes} 分钟` : "暂无记录";
  const streakText = s.streak > 0 ? `${s.streak} 天 🔥` : "0 天";
  const streakSub  = s.streak >= 3 ? "坚持打卡中！" : "每天记录一点点";
  const studyText = s.studyTotal > 0 ? (s.studyTotal >= 60 ? `${(s.studyTotal/60).toFixed(1)} 小时` : `${s.studyTotal} 分钟`) : "0 分钟";
  const studySub  = s.studyDays > 0 ? `共 ${s.studyDays} 天有记录` : "暂无记录";

  container.innerHTML = `
    <div class="stats-view">

      <!-- 时间范围切换 -->
      <div class="stats-range-bar">
        <span class="stats-range-label">数据概览</span>
        <div class="stats-range-toggle">
          <button class="stats-range-btn${days === 7 ? ' active' : ''}" data-range="7">近7天</button>
          <button class="stats-range-btn${days === 30 ? ' active' : ''}" data-range="30">近30天</button>
        </div>
      </div>

      <!-- 指标卡片（2行）-->
      <div class="stats-metrics">
        <div class="stats-card">
          <div class="stats-card-label">✅ 任务完成率</div>
          <div class="stats-card-value">${s.completionRate}%</div>
          <div class="stats-card-sub">${s.doneTasks} / ${s.totalTasks} 项</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-label">📅 连续打卡</div>
          <div class="stats-card-value">${streakText}</div>
          <div class="stats-card-sub">${streakSub}</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-label">😊 平均情绪</div>
          <div class="stats-card-value">${avgMoodText}</div>
          <div class="stats-card-sub">${avgMoodSub}</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-label">⚡ 平均精力</div>
          <div class="stats-card-value">${avgEnergyText}</div>
          <div class="stats-card-sub">${avgEnergySub}</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-label">🌙 平均睡眠</div>
          <div class="stats-card-value">${avgSleepText}</div>
          <div class="stats-card-sub">${avgSleepSub}</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-label">⏱ 累计学习</div>
          <div class="stats-card-value">${studyText}</div>
          <div class="stats-card-sub">${studySub}</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-label">📚 文献阅读</div>
          <div class="stats-card-value">${litText}</div>
          <div class="stats-card-sub">${litSub}</div>
        </div>
      </div>

      <!-- 图表区 -->
      <div class="stats-charts">
        <!-- 完成率折线 -->
        <div class="stats-chart-card">
          <div class="stats-chart-title">每日任务完成率</div>
          ${lineChart}
        </div>

        <!-- 学习时长折线 -->
        <div class="stats-chart-card">
          <div class="stats-chart-title">每日学习时长 ⏱</div>
          ${studyChart}
        </div>

        <!-- 情绪精力睡眠条形 -->
        <div class="stats-chart-card stats-chart-card-wide">
          <div class="stats-chart-title">情绪 😊 · 精力 ⚡ · 睡眠 🌙</div>
          <div class="stats-bar-legend">
            <span class="stats-bar-legend-dot mood-dot"></span>情绪
            <span class="stats-bar-legend-dot energy-dot" style="margin-left:10px"></span>精力
            <span class="stats-bar-legend-dot sleep-dot" style="margin-left:10px"></span>睡眠
          </div>
          <div class="stats-bars">${moodBars}</div>
        </div>
      </div>

      <!-- 底部：类型占比 + 洞察 -->
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
            <div class="stats-insight-title">智能小结</div>
            <div class="stats-insight-body">${insight}</div>
          </div>
        </div>
      </div>

    </div>
  `;
}
