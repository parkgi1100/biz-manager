// ======== 거래 데이터 (거래입력, 거래상세내역, 대시보드) ========
let entries = JSON.parse(localStorage.getItem('entries') || "[]");
function saveEntries() { localStorage.setItem('entries', JSON.stringify(entries)); }

// 거래입력 추가
window.addEntry = function(event) {
  event.preventDefault();
  const date = document.getElementById('date').value;
  const type = document.getElementById('type').value;
  const amount = Number(document.getElementById('amount').value);
  const category = document.getElementById('category').value.trim();
  const memo = document.getElementById('memo').value.trim();
  if (!date || !amount) return alert("날짜와 금액은 필수!");
  entries.push({ date, type, amount, category, memo });
  saveEntries();
  renderInputTabList();
  renderAll(); // 대시보드 갱신
  event.target.reset();
};

// 최근 거래 리스트 (입력탭)
function renderInputTabList() {
  const ul = document.getElementById('inputRecordList');
  if (!ul) return;
  ul.innerHTML = '';
  entries.slice(-10).reverse().forEach((e, idx) => {
    ul.innerHTML += `<li class="${e.type}">
      <span>${e.date}</span>
      <span>${e.type === 'income' ? '수입' : '지출'}</span>
      <span>${e.category || '항목없음'}</span>
      <span>${e.amount.toLocaleString()}원</span>
      ${e.memo ? `<span>(${e.memo})</span>` : ''}
    </li>`;
  });
}

// =========== 대시보드 요약/차트 (대시보드 탭) ==========
// 대시보드 구현은 네 원본 코드 유지하면 되고, 예시는 생략.
// renderAll() 등 대시보드 갱신 함수 반드시 원본과 합쳐서 사용!

// ======= 거래상세내역 (기간조회/요약/내보내기) =======
function filterTrans(entries, from, to) {
  return entries.filter(e => e.date >= from && e.date <= to);
}
function summarizeTrans(entries) {
  let income = 0, expense = 0;
  for (const e of entries) {
    if (e.type === "income") income += e.amount;
    else expense += e.amount;
  }
  return { income, expense, profit: income - expense, count: entries.length };
}
function renderDetailTrans() {
  const all = JSON.parse(localStorage.getItem('entries') || "[]");
  let from = document.getElementById('transFromDate')?.value;
  let to = document.getElementById('transToDate')?.value;
  if (!from || !to) {
    const today = new Date();
    const monthAgo = new Date(today); monthAgo.setMonth(today.getMonth() - 1);
    from = monthAgo.toISOString().slice(0,10);
    to = today.toISOString().slice(0,10);
    if(document.getElementById('transFromDate')) document.getElementById('transFromDate').value = from;
    if(document.getElementById('transToDate')) document.getElementById('transToDate').value = to;
  }
  const filtered = filterTrans(all, from, to);
  const sum = summarizeTrans(filtered);
  document.getElementById('transSummary').innerHTML = `
    <b>수입:</b> ${sum.income.toLocaleString()}원 |
    <b>지출:</b> ${sum.expense.toLocaleString()}원 |
    <b>순이익:</b> ${sum.profit.toLocaleString()}원 |
    <b>거래수:</b> ${sum.count}건
  `;
  const ul = document.getElementById('detailTransList');
  ul.innerHTML = '';
  filtered.forEach(e => {
    ul.innerHTML += `<li>
      <span>${e.date}</span>
      <span>${e.type === 'income' ? '수입' : '지출'}</span>
      <span>${e.category || '-'}</span>
      <span>${e.amount.toLocaleString()}원</span>
      <span>${e.memo || ''}</span>
    </li>`;
  });
}
window.filterTransByPeriod = function(event) {
  event.preventDefault();
  renderDetailTrans();
}
window.exportDetailTrans = function() {
  const all = JSON.parse(localStorage.getItem('entries') || "[]");
  let from = document.getElementById('transFromDate').value;
  let to = document.getElementById('transToDate').value;
  const filtered = filterTrans(all, from, to);
  let header = ["일자", "구분", "항목", "금액", "메모"];
  let csv = [header.join(',')];
  filtered.forEach(e => {
    csv.push([
      e.date,
      e.type === "income" ? "수입" : "지출",
      e.category || "",
      e.amount || 0,
      e.memo || ""
    ].map(v=>`"${v}"`).join(','));
  });
  const blob = new Blob([csv.join('\n')], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `거래상세내역_${from}_${to}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ======= 세금계산서 관리/상세관리/내보내기 =======
let taxEntries = JSON.parse(localStorage.getItem('taxEntries') || "[]");
function saveTaxEntries() { localStorage.setItem('taxEntries', JSON.stringify(taxEntries)); }
window.addTaxEntry = function(event) {
  event.preventDefault();
  const date = document.getElementById('taxDate').value;
  const company = document.getElementById('taxCompany').value.trim();
  const supply = Number(document.getElementById('supplyAmount').value);
  const tax = Number(document.getElementById('taxAmount').value);
  const memo = document.getElementById('taxMemo').value.trim();
  if (!date || !company || !supply || !tax) return alert("필수값 확인!");
  taxEntries.push({ date, company, supply, tax, memo });
  saveTaxEntries();
  renderTaxList();
  event.target.reset();
}
function renderTaxList() {
  const ul = document.getElementById('taxList');
  if (!ul) return;
  ul.innerHTML = '';
  taxEntries.slice(-10).reverse().forEach((e, idx) => {
    ul.innerHTML += `<li>
      <span>${e.date}</span>
      <span>${e.company}</span>
      <span>공급 ${e.supply.toLocaleString()}원</span>
      <span>세액 ${e.tax.toLocaleString()}원</span>
      ${e.memo ? `<span>(${e.memo})</span>` : ''}
    </li>`;
  });
}
function filterTax(entries, from, to) {
  return entries.filter(e => e.date >= from && e.date <= to);
}
function summarizeTax(entries) {
  let supply = 0, tax = 0;
  for (const e of entries) {
    supply += e.supply || 0;
    tax += e.tax || 0;
  }
  return { supply, tax, count: entries.length };
}
function renderTaxDetail() {
  const all = JSON.parse(localStorage.getItem('taxEntries') || "[]");
  let from = document.getElementById('taxFromDate')?.value;
  let to = document.getElementById('taxToDate')?.value;
  if (!from || !to) {
    const today = new Date();
    const monthAgo = new Date(today); monthAgo.setMonth(today.getMonth() - 1);
    from = monthAgo.toISOString().slice(0,10);
    to = today.toISOString().slice(0,10);
    if(document.getElementById('taxFromDate')) document.getElementById('taxFromDate').value = from;
    if(document.getElementById('taxToDate')) document.getElementById('taxToDate').value = to;
  }
  const filtered = filterTax(all, from, to);
  const sum = summarizeTax(filtered);
  document.getElementById('taxSummary').innerHTML = `
    <b>공급가액 합계:</b> ${sum.supply.toLocaleString()}원 |
    <b>세액 합계:</b> ${sum.tax.toLocaleString()}원 |
    <b>건수:</b> ${sum.count}건
  `;
  const ul = document.getElementById('taxDetailList');
  ul.innerHTML = '';
  filtered.forEach(e => {
    ul.innerHTML += `<li>
      <span>${e.date}</span>
      <span>${e.company || '-'}</span>
      <span>공급 ${e.supply?.toLocaleString() || 0}원</span>
      <span>세액 ${e.tax?.toLocaleString() || 0}원</span>
      <span>${e.memo || ''}</span>
    </li>`;
  });
}
window.filterTaxByPeriod = function(event) {
  event.preventDefault();
  renderTaxDetail();
}
window.exportTaxDetail = function() {
  const all = JSON.parse(localStorage.getItem('taxEntries') || "[]");
  let from = document.getElementById('taxFromDate').value;
  let to = document.getElementById('taxToDate').value;
  const filtered = filterTax(all, from, to);
  let header = ["일자", "거래처명", "공급가액", "세액", "메모"];
  let csv = [header.join(',')];
  filtered.forEach(e => {
    csv.push([
      e.date,
      e.company || "",
      e.supply || 0,
      e.tax || 0,
      e.memo || ""
    ].map(v=>`"${v}"`).join(','));
  });
  const blob = new Blob([csv.join('\n')], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `세금계산서상세_${from}_${to}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ========== 종합소득세 제출서류(내보내기) ==========
const taxReportFormats = {
  cafe: {
    header: ["사업자명","대표자명","사업자등록번호","일자","구분","항목","금액","메모"],
    fields: ["bizName","ownerName","bizNum","date","typeKor","category","amount","memo"]
  },
  mart: {
    header: ["사업자명","대표자명","사업자등록번호","일자","구분","항목","금액","메모"],
    fields: ["bizName","ownerName","bizNum","date","typeKor","category","amount","memo"]
  },
  // ...업종 추가 가능!
};
window.downloadTaxReport = function(event) {
  event.preventDefault();
  // 입력값
  const bizName = document.getElementById('bizName').value.trim();
  const ownerName = document.getElementById('ownerName').value.trim();
  const bizNum = document.getElementById('bizNum').value.trim();
  const bizType = document.getElementById('bizType').value;
  const from = document.getElementById('reportFrom').value;
  const to = document.getElementById('reportTo').value;
  if (!bizType || !from || !to) return alert("필수값 입력!");
  const all = JSON.parse(localStorage.getItem('entries') || "[]");
  const filtered = all.filter(e => e.date >= from && e.date <= to);
  // 타입 한글화
  filtered.forEach(e => e.typeKor = (e.type === "income" ? "수입" : "지출"));
  const format = taxReportFormats[bizType];
  if (!format) return alert("업종포맷 없음!");
  let csv = [format.header.join(',')];
  filtered.forEach(e => {
    csv.push(format.fields.map(f=>{
      if(f==="bizName") return bizName;
      if(f==="ownerName") return ownerName;
      if(f==="bizNum") return bizNum;
      return e[f]||"";
    }).map(v=>`"${v}"`).join(','));
  });
  const blob = new Blob([csv.join('\n')], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `종합소득세_${bizType}_${from}_${to}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ====== 1:1문의사항 ======
let qnaEntries = JSON.parse(localStorage.getItem('qnaEntries') || "[]");
function saveQnaEntries() { localStorage.setItem('qnaEntries', JSON.stringify(qnaEntries)); }
window.addQna = function(event) {
  event.preventDefault();
  const title = document.getElementById('qnaTitle').value.trim();
  const content = document.getElementById('qnaContent').value.trim();
  const user = document.getElementById('qnaUser').value.trim();
  if (!title || !content) return alert("제목/내용은 필수!");
  qnaEntries.push({ title, content, user, date: new Date().toISOString().slice(0,16).replace('T',' ') });
  saveQnaEntries();
  renderQnaList();
  event.target.reset();
}
function renderQnaList() {
  const ul = document.getElementById('qnaList');
  if (!ul) return;
  ul.innerHTML = '';
  qnaEntries.slice(-10).reverse().forEach(e => {
    ul.innerHTML += `<li>
      <b>${e.title}</b> <span style="font-size:0.93em;">(${e.date})</span><br/>
      <span>${e.content.replace(/\n/g, "<br/>")}</span>
      ${e.user ? `<span style="color:#888;">- ${e.user}</span>` : ''}
    </li>`;
  });
}

// ========== 설정탭(향후 로그인/백업/기타용) =========
// 향후 추가/확장 예정!
