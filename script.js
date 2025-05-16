// --- Firebase 초기화 (복사해온 config로 바꿔줘!) ---
const firebaseConfig = {
  apiKey: "AIzaSyARw0VFLjUmCiNLODfBqL81ktyC4kdZOCk",
  authDomain: "biz-manager-68be3.firebaseapp.com",
  projectId: "biz-manager-68be3",
  storageBucket: "biz-manager-68be3.firebasestorage.app",
  messagingSenderId: "947454696313",
  appId: "1:947454696313:web:4551bd4fafacb10b35eda8",
  measurementId: "G-J8LGYTP9DC"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();



// ======== 거래 데이터 ========
let entries = JSON.parse(localStorage.getItem('entries') || "[]");
function saveEntries() { localStorage.setItem('entries', JSON.stringify(entries)); }

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
  renderAll();
  event.target.reset();
};

// 거래입력(최근거래)
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

// ======== 대시보드(요약/차트) (별도 함수로 유지) ========

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

// ✅ 요약부분 세로 배열
function renderTransSummary(data) {
  document.getElementById('transSummary').innerHTML = `
    <div>수입: <span class="num">${data.income.toLocaleString()}원</span></div>
    <div>지출: <span class="num">${data.expense.toLocaleString()}원</span></div>
    <div>순이익: <span class="num">${data.profit.toLocaleString()}원</span></div>
    <div>거래수: <span class="num">${data.count}건</span></div>
  `;
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
  renderTransSummary(sum); // ← 세로정렬 함수로 변경
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

// ✅ 세금계산서상세 요약(세로)
function renderTaxSummary(data) {
  document.getElementById('taxSummary').innerHTML = `
    <div>공급가액 합계: <span class="num">${data.supply.toLocaleString()}원</span></div>
    <div>세액 합계: <span class="num">${data.tax.toLocaleString()}원</span></div>
    <div>건수: <span class="num">${data.count}건</span></div>
  `;
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
  renderTaxSummary(sum); // ← 세로정렬 함수로 변경
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
  norabang: {
    header: ["사업자명","대표자명","사업자등록번호","일자","구분","항목","금액","메모"],
    fields: ["bizName","ownerName","bizNum","date","typeKor","category","amount","memo"]
  },
  carRepair: {
    header: ["사업자명","대표자명","사업자등록번호","일자","구분","항목","금액","메모"],
    fields: ["bizName","ownerName","bizNum","date","typeKor","category","amount","memo"]
  },
  other: {
    header: ["사업자명","대표자명","사업자등록번호","일자","구분","항목","금액","메모"],
    fields: ["bizName","ownerName","bizNum","date","typeKor","category","amount","memo"]
  },
};
window.downloadTaxReport = function(event) {
  event.preventDefault();
  const bizName = document.getElementById('bizName').value.trim();
  const ownerName = document.getElementById('ownerName').value.trim();
  const bizNum = document.getElementById('bizNum').value.trim();
  const bizTypeSel = document.getElementById('bizType');
  let bizType = bizTypeSel.value;
  if(bizType === 'other') {
    bizType = document.getElementById('bizTypeInput').value.trim() || '기타';
  }
  const from = document.getElementById('reportFrom').value;
  const to = document.getElementById('reportTo').value;
  if (!bizType || !from || !to) return alert("필수값 입력!");
  const all = JSON.parse(localStorage.getItem('entries') || "[]");
  const filtered = all.filter(e => e.date >= from && e.date <= to);
  filtered.forEach(e => e.typeKor = (e.type === "income" ? "수입" : "지출"));
  const format = taxReportFormats['cafe']; // 업종별 포맷이 다를 경우 활용 가능 (여기선 공통)
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

// ========== 업종 직접입력 (종합소득세 제출서류) ==========
window.toggleBizTypeInput = function(sel) {
  const input = document.getElementById('bizTypeInput');
  if(sel.value === 'other') input.style.display = '';
  else input.style.display = 'none';
}

// ========== onload 등 기타 ==========
// (네 index.html에서 onload에 아래들 호출해주면 끝)

// 로그인
document.getElementById('googleLoginBtn').onclick = function() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(result => {
      const user = result.user;
      document.getElementById('userEmail').textContent = user.email + " 로그인됨!";
    })
    .catch(error => alert("로그인 실패: " + error.message));
};
// 로그아웃
document.getElementById('logoutBtn').onclick = function() {
  auth.signOut();
};
// 로그인 상태 감지
auth.onAuthStateChanged(user => {
  if(user) {
    document.getElementById('googleLoginBtn').style.display = "none";
    document.getElementById('logoutBtn').style.display = "";
    document.getElementById('userEmail').textContent = user.email + " 로그인됨!";
  } else {
    document.getElementById('googleLoginBtn').style.display = "";
    document.getElementById('logoutBtn').style.display = "none";
    document.getElementById('userEmail').textContent = "";
  }
});

