// ========== 데이터 로드/저장 ==========

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem('entries')) || [];
  } catch { return []; }
}
function saveEntries(entries) {
  localStorage.setItem('entries', JSON.stringify(entries));
}

let entries = loadEntries();

// ========== 거래 추가 ==========

window.addEntry = function(event) {
  event.preventDefault();
  const date = document.getElementById('date').value;
  const type = document.getElementById('type').value;
  const amount = Number(document.getElementById('amount').value);
  const category = document.getElementById('category').value.trim();
  const memo = document.getElementById('memo').value.trim();
  if (!date || !amount) return alert("날짜와 금액은 필수!");
  entries.push({ date, type, amount, category, memo });
  saveEntries(entries);
  renderAll();
  document.querySelector('.entry-form').reset();
}

// ========== 기간 설정 ==========

function getDateRange() {
  let from = document.getElementById('fromDate').value;
  let to = document.getElementById('toDate').value;
  if (!from || !to) {
    // 기본: 최근 7일
    const today = new Date();
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 6);
    from = weekAgo.toISOString().slice(0,10);
    to = today.toISOString().slice(0,10);
    document.getElementById('fromDate').value = from;
    document.getElementById('toDate').value = to;
  }
  return [from, to];
}
window.setQuickPeriod = function(mode) {
  const today = new Date();
  let from, to;
  to = today.toISOString().slice(0,10);
  if (mode === 'week') {
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 6);
    from = weekAgo.toISOString().slice(0,10);
  } else if (mode === 'month') {
    from = today.toISOString().slice(0,7) + '-01';
  } else if (mode === 'year') {
    from = today.getFullYear() + '-01-01';
  }
  document.getElementById('fromDate').value = from;
  document.getElementById('toDate').value = to;
  renderAll();
}

// ========== 필터링, 요약, 차트, 베스트 ==========

function filterEntriesByDate(entries, from, to) {
  return entries.filter(e => e.date >= from && e.date <= to);
}

function summarize(entries) {
  let income = 0, expense = 0;
  for (const e of entries) {
    if (e.type === "income") income += e.amount;
    else expense += e.amount;
  }
  return { income, expense, profit: income - expense };
}

function getBest(entries, type) {
  // category별 합산, 내림차순 정렬 후 상위 5개 반환
  const map = {};
  for (const e of entries) if (e.type === type) {
    const k = e.category || '기타';
    map[k] = (map[k] || 0) + e.amount;
  }
  return Object.entries(map)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,5);
}

function getRecent(entries, limit=5) {
  return [...entries].sort((a,b)=>b.date.localeCompare(a.date)).slice(0, limit);
}

function renderSummary(filtered) {
  const s = summarize(filtered);
  document.getElementById('incomeSum').textContent = s.income.toLocaleString();
  document.getElementById('expenseSum').textContent = s.expense.toLocaleString();
  document.getElementById('profitSum').textContent = s.profit.toLocaleString();
}

function renderBest(filtered) {
  // 매출(수입)
  const incomeList = document.getElementById('bestIncomeList');
  incomeList.innerHTML = '';
  getBest(filtered, "income").forEach((e, idx) => {
    incomeList.innerHTML += `<li><span class="rank">🥇🥈🥉⭐️⭐️`[idx] + `</span>${e[0]}<span class="amount">${e[1].toLocaleString()}원</span></li>`;
  });
  // 지출
  const expenseList = document.getElementById('bestExpenseList');
  expenseList.innerHTML = '';
  getBest(filtered, "expense").forEach((e, idx) => {
    expenseList.innerHTML += `<li><span class="rank">🥇🥈🥉⭐️⭐️`[idx] + `</span>${e[0]}<span class="amount">${e[1].toLocaleString()}원</span></li>`;
  });
}

function renderRecent(filtered) {
  const ul = document.getElementById('recentList');
  ul.innerHTML = '';
  getRecent(filtered).forEach(e => {
    ul.innerHTML += `<li>
      <span>${e.date}</span>
      <span>${e.type === 'income' ? '수입' : '지출'}</span>
      <span>${e.category || '항목없음'}</span>
      <span>${e.amount.toLocaleString()}원</span>
      ${e.memo ? `<span>(${e.memo})</span>` : ''}
    </li>`;
  });
}

// 거래내역 리스트(전체)
function renderList(entries) {
  const ul = document.getElementById('recordList');
  if (!ul) return;
  ul.innerHTML = '';
  entries.slice().reverse().forEach((e, idx) => {
    ul.innerHTML += `<li class="${e.type}">
      <span>${e.date}</span>
      <span>${e.type === 'income' ? '수입' : '지출'}</span>
      <span>${e.category || '항목없음'}</span>
      <span>${e.amount.toLocaleString()}원</span>
      <button onclick="deleteEntry(${entries.length-1-idx})" style="background:#eee;border:none;color:#d22;border-radius:7px;padding:2px 8px;margin-left:7px;cursor:pointer;">삭제</button>
    </li>`;
  });
}

window.deleteEntry = function(idx) {
  if (!confirm('삭제할까요?')) return;
  entries.splice(idx,1);
  saveEntries(entries);
  renderAll();
}

// ========== 차트 렌더링 ==========

let chartObj = null;

function renderChart(filtered) {
  // 일자별로 매출/지출 집계
  let dates = [];
  let incomeMap = {}, expenseMap = {};
  filtered.forEach(e => {
    dates.includes(e.date) || dates.push(e.date);
    if (e.type === "income") incomeMap[e.date] = (incomeMap[e.date]||0)+e.amount;
    else expenseMap[e.date] = (expenseMap[e.date]||0)+e.amount;
  });
  dates.sort();
  const incomeArr = dates.map(d => incomeMap[d]||0);
  const expenseArr = dates.map(d => expenseMap[d]||0);

  const ctx = document.getElementById('trendChart').getContext('2d');
  if (chartObj) chartObj.destroy();
  chartObj = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [
        { label: '매출', data: incomeArr, borderWidth: 2, borderColor: '#22c55e', backgroundColor:'rgba(34,197,94,0.07)', tension:0.32, fill:true},
        { label: '지출', data: expenseArr, borderWidth: 2, borderColor: '#ef4444', backgroundColor:'rgba(239,68,68,0.08)', tension:0.32, fill:true},
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true, labels: { font: {size: 14} } } },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() + "원" } },
        x: { ticks: { font: {size:13} } }
      }
    }
  });
}

// ========== 전월/전년 동기간 비교 ==========

function getPeriod(dateStr, diff, type='month') {
  const d = new Date(dateStr);
  if (type==='month') d.setMonth(d.getMonth() + diff);
  if (type==='year') d.setFullYear(d.getFullYear() + diff);
  return d.toISOString().slice(0,10);
}

function renderCompare(filtered, from, to) {
  // 동기간: days 차이만큼
  const days = (new Date(to) - new Date(from))/(1000*3600*24) + 1;
  // 전월, 전년 기간
  const prevMonthFrom = getPeriod(from, -1, 'month');
  const prevMonthTo = getPeriod(to, -1, 'month');
  const prevYearFrom = getPeriod(from, -1, 'year');
  const prevYearTo = getPeriod(to, -1, 'year');

  const sumByDate = (from, to) => summarize(
    entries.filter(e => e.date >= from && e.date <= to)
  );

  const prevMonth = sumByDate(prevMonthFrom, prevMonthTo);
  const prevYear = sumByDate(prevYearFrom, prevYearTo);
  const now = summarize(filtered);

  document.getElementById('prevMonthIncome').textContent = prevMonth.income.toLocaleString();
  document.getElementById('prevYearIncome').textContent = prevYear.income.toLocaleString();

  // 변화량
  const diff = now.income - prevMonth.income;
  let per = prevMonth.income ? ((diff/prevMonth.income)*100).toFixed(1) : (now.income ? 100 : 0);
  let arrow = diff > 0 ? "▲" : (diff < 0 ? "▼" : "→");
  document.getElementById('compareChange').textContent =
    `${diff >= 0 ? '+' : ''}${diff.toLocaleString()}원 (${per}%)`;
  document.getElementById('compareArrow').textContent = arrow;
}

// ========== 전체 랜더링 ==========

function renderAll() {
  const [from, to] = getDateRange();
  const filtered = filterEntriesByDate(entries, from, to);
  renderSummary(filtered);
  renderBest(filtered);
  renderRecent(filtered);
  renderList(entries);
  renderChart(filtered);
  renderCompare(filtered, from, to);
}

window.onload = function() {
  renderAll();
  // 입력탭 오늘날짜 기본
  const today = new Date().toISOString().slice(0,10);
  const dateInput = document.getElementById('date');
  if(dateInput) dateInput.value = today;
  // 기간 필터 기본
  getDateRange();
};
