// ======================= Firebase 인증 & 프로필 =======================
const firebaseConfig = {
  apiKey: "AIzaSyARw0VFLjUmCiNLODfBqL81ktyC4kdZOCk", // 실제 사용 시 보안에 유의하세요.
  authDomain: "biz-manager-68be3.firebaseapp.com",
  projectId: "biz-manager-68be3",
  storageBucket: "biz-manager-68be3.firebasestorage.app",
  messagingSenderId: "947454696313",
  appId: "1:947454696313:web:4551bd4fafacb10b35eda8",
  measurementId: "G-J8LGYTP9DC"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// ===== 팝업 함수 =====
function openLoginPopup() {
  const loginPopup = document.getElementById('loginPopup');
  if (loginPopup) {
    loginPopup.classList.add('show');
    document.addEventListener('mousedown', closeLoginPopupOutside);
  }
}
function closeLoginPopup() {
  const loginPopup = document.getElementById('loginPopup');
  if (loginPopup) {
    loginPopup.classList.remove('show');
    document.removeEventListener('mousedown', closeLoginPopupOutside);
  }
}
function closeLoginPopupOutside(e) {
  const loginPopup = document.getElementById('loginPopup');
  const loginMainBtn = document.getElementById('loginMainBtn'); // HTML에 이 ID가 있는지 확인

  if (loginPopup && !loginPopup.contains(e.target) &&
      loginMainBtn && !loginMainBtn.contains(e.target) && // loginMainBtn이 실제로 e.target의 부모가 아닐 경우
      !Array.from(document.querySelectorAll('.sidebar a, #toggleBtn')).some(el => el.contains(e.target)) // 햄버거 버튼이나 사이드바 링크 클릭 시 닫히지 않도록
     ) {
    // loginMainBtn을 직접 클릭한 경우가 아닐 때만 닫도록 수정 (팝업 외부 클릭 시)
    if (document.getElementById('loginMainBtn') !== e.target) {
        closeLoginPopup();
    }
  }
}
window.openLoginPopup = openLoginPopup; // 전역에서 호출 가능하도록

// ===== 프로필 드롭다운 =====
function toggleProfileDropdown() {
  const drop = document.getElementById('profileDropdown');
  if (!drop) return;
  drop.classList.toggle('show');
  if (drop.classList.contains('show')) {
    document.addEventListener('mousedown', closeProfileDropdownOutside);
  } else {
    document.removeEventListener('mousedown', closeProfileDropdownOutside);
  }
}
function closeProfileDropdownOutside(e) {
  const drop = document.getElementById('profileDropdown');
  const userAvatar = document.getElementById('userAvatar');
  if (!drop || !userAvatar) return;
  if (!drop.contains(e.target) && !userAvatar.contains(e.target)) {
    drop.classList.remove('show');
    document.removeEventListener('mousedown', closeProfileDropdownOutside);
  }
}
window.toggleProfileDropdown = toggleProfileDropdown; // 전역에서 호출 가능하도록

// ========== 로그인 UI 상태 ==========
auth.onAuthStateChanged(user => {
  const loginBox = document.getElementById('loginBox'); // HTML에 id="loginBox" 사용 확인
  const profileMenu = document.getElementById('profileMenu'); // HTML에 id="profileMenu" 사용 확인

  // 프로필 드롭다운 내 요소들
  const userAvatar = document.getElementById('userAvatar');
  const userAvatarBig = document.getElementById('userAvatarBig');
  const profileEmailDiv = document.getElementById('profileEmail'); // HTML id 확인 (profileEmail)
  const profileNameDiv = document.getElementById('profileName');   // HTML id 확인 (profileName)

  // 이전 코드의 userEmail, userProfileEmail은 현재 HTML 구조와 불일치할 수 있어 주석 처리 또는 조정 필요
  // const userEmailSpan = document.getElementById('userEmail'); // 이 ID는 이전 HTML 구조에 있었음

  if (user) {
    if (loginBox) loginBox.style.display = 'none';
    if (profileMenu) profileMenu.style.display = ''; // 또는 'flex' 등 CSS에 맞게

    const photoURL = user.photoURL || 'https://cdn.jsdelivr.net/gh/encharm/Font-Awesome-SVG-PNG/black/svg/user-circle.svg';
    if (userAvatar) userAvatar.src = photoURL;
    if (userAvatarBig) userAvatarBig.src = photoURL;
    if (profileEmailDiv) profileEmailDiv.textContent = user.email || '';
    if (profileNameDiv) profileNameDiv.textContent = user.displayName || '사용자'; // 이름 없으면 '사용자'

    // if (userEmailSpan) userEmailSpan.textContent = ""; // 더 이상 사용하지 않을 수 있음

  } else {
    if (loginBox) loginBox.style.display = ''; // 또는 'flex'
    if (profileMenu) profileMenu.style.display = 'none';

    if (userAvatar) userAvatar.src = '';
    if (userAvatarBig) userAvatarBig.src = '';
    if (profileEmailDiv) profileEmailDiv.textContent = '';
    if (profileNameDiv) profileNameDiv.textContent = '';
    // if (userEmailSpan) userEmailSpan.textContent = '';

    const drop = document.getElementById('profileDropdown');
    if (drop) drop.classList.remove('show');
  }
});


// ================= 대시보드 데이터 렌더링 =================
function renderAll() {
    console.log("renderAll() called - 대시보드 데이터를 렌더링합니다.");

    const allEntries = JSON.parse(localStorage.getItem('entries') || "[]");
    const summary = summarizeTrans(allEntries); // 거래 데이터 요약 함수 재활용

    const incomeSumEl = document.getElementById('incomeSum');
    const expenseSumEl = document.getElementById('expenseSum');
    const profitSumEl = document.getElementById('profitSum');

    if (incomeSumEl) incomeSumEl.textContent = summary.income.toLocaleString() + "원";
    if (expenseSumEl) expenseSumEl.textContent = summary.expense.toLocaleString() + "원";
    if (profitSumEl) profitSumEl.textContent = summary.profit.toLocaleString() + "원";

    // 최근 거래 목록 (대시보드용)
    const recentListUl = document.getElementById('recentList');
    if (recentListUl) {
        recentListUl.innerHTML = ''; // 기존 목록 초기화
        // 최근 5개 항목 표시 (예시)
        allEntries.slice(-5).reverse().forEach(e => {
            recentListUl.innerHTML += `
                <li class="${e.type}">
                    <span>${e.date}</span>
                    <span>${e.type === 'income' ? '수입' : '지출'}</span>
                    <span>${e.category || '항목없음'}</span>
                    <span style="font-weight:bold;">${e.amount.toLocaleString()}원</span>
                    ${e.memo ? `<span style="font-size:0.9em; color:#777;">(${e.memo})</span>` : ''}
                </li>`;
        });
    }

    // TODO: 추세 차트 (trendChart) 업데이트 로직 추가
    // 예: const trendChartCtx = document.getElementById('trendChart')?.getContext('2d');
    // if (trendChartCtx) { /* Chart.js를 사용하여 차트 그리기/업데이트 */ }
    console.log("TODO: 대시보드의 추세 차트(trendChart)를 업데이트하세요.");

    // TODO: 베스트 매출/지출 TOP5 (bestIncomeList, bestExpenseList) 업데이트 로직 추가
    console.log("TODO: 대시보드의 베스트 매출/지출 목록을 업데이트하세요.");

    // TODO: 전년 동기간 비교 (prevYearIncome 등) 로직 추가
    console.log("TODO: 대시보드의 전년 동기간 비교 정보를 업데이트하세요.");
}
// `showTab` 함수가 HTML 내 인라인 스크립트에 있으므로, `renderAll`을 window 객체에 할당하여 접근 가능하게 합니다.
window.renderAll = renderAll;


// ================= 거래 데이터 =================
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
  entries.push({ date, type, amount, category, memo, id: Date.now() }); // 간단한 ID 추가 (필요시)
  saveEntries();
  renderInputTabList(); // 거래 입력 탭의 목록 업데이트
  if (document.getElementById('dashboardTab')?.classList.contains('active')) { // 대시보드가 활성 탭이면
    renderAll(); // 대시보드도 업데이트
  }
  event.target.reset();
};

function renderInputTabList() {
  const ul = document.getElementById('inputRecordList');
  if (!ul) return;
  ul.innerHTML = '';
  // 최근 10개 또는 전체 표시 (현재는 최근 10개)
  entries.slice().reverse().slice(0, 10).forEach((e) => { // slice()로 복사본 만들어서 reverse
    ul.innerHTML += `<li class="${e.type}">
      <span>${e.date}</span>
      <span>${e.type === 'income' ? '수입' : '지출'}</span>
      <span>${e.category || '항목없음'}</span>
      <span style="font-weight:bold;">${e.amount.toLocaleString()}원</span>
      ${e.memo ? `<span style="font-size:0.9em; color:#777;">(${e.memo})</span>` : ''}
    </li>`;
  });
}

// ================= 거래상세내역 =================
function filterTrans(currentEntries, from, to) { // 매개변수 이름 변경 (entries -> currentEntries)
  if (!from || !to) return currentEntries; // 날짜 필터 없으면 전체 반환
  return currentEntries.filter(e => e.date >= from && e.date <= to);
}
function summarizeTrans(currentEntries) { // 매개변수 이름 변경
  let income = 0, expense = 0;
  for (const e of currentEntries) {
    if (e.type === "income") income += e.amount;
    else expense += e.amount;
  }
  return { income, expense, profit: income - expense, count: currentEntries.length };
}
function renderTransSummary(data) {
  const summaryDiv = document.getElementById('transSummary');
  if (summaryDiv) {
    summaryDiv.innerHTML = `
      <div>수입: <span class="num">${data.income.toLocaleString()}원</span></div>
      <div>지출: <span class="num">${data.expense.toLocaleString()}원</span></div>
      <div>순이익: <span class="num">${data.profit.toLocaleString()}원</span></div>
      <div>거래수: <span class="num">${data.count}건</span></div>
    `;
  }
}
function renderDetailTrans() {
  console.log("renderDetailTrans called");
  const localEntries = JSON.parse(localStorage.getItem('entries') || "[]");
  let from = document.getElementById('transFromDate')?.value;
  let to = document.getElementById('transToDate')?.value;

  // 날짜 입력이 없으면 기본값 (예: 최근 한 달) 설정
  if ((!from || !to) && document.getElementById('transFromDate')) { // input 필드가 있을 때만 기본값 설정
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setMonth(today.getMonth() - 1);
    from = monthAgo.toISOString().slice(0,10);
    to = today.toISOString().slice(0,10);
    document.getElementById('transFromDate').value = from;
    document.getElementById('transToDate').value = to;
  }

  const filtered = filterTrans(localEntries, from, to);
  const sum = summarizeTrans(filtered);
  renderTransSummary(sum);

  const ul = document.getElementById('detailTransList');
  if (!ul) return;
  ul.innerHTML = '';
  filtered.slice().reverse().forEach(e => { // 최근 항목이 위로 오도록 reverse
    ul.innerHTML += `<li>
      <span>${e.date}</span>
      <span>${e.type === 'income' ? '수입' : '지출'}</span>
      <span>${e.category || '-'}</span>
      <span style="font-weight:bold;">${e.amount.toLocaleString()}원</span>
      <span>${e.memo || ''}</span>
    </li>`;
  });
}
window.filterTransByPeriod = function(event) {
  event.preventDefault();
  renderDetailTrans();
}
window.exportDetailTrans = function() {
  const localEntries = JSON.parse(localStorage.getItem('entries') || "[]");
  let from = document.getElementById('transFromDate').value;
  let to = document.getElementById('transToDate').value;
  const filtered = filterTrans(localEntries, from, to);
  if (filtered.length === 0) return alert("내보낼 데이터가 없습니다.");

  let header = ["일자", "구분", "항목", "금액", "메모"];
  let csvData = filtered.map(e => [
    e.date,
    e.type === "income" ? "수입" : "지출",
    e.category || "",
    e.amount || 0,
    e.memo || ""
  ]);

  let csvContent = header.join(',') + '\n' + csvData.map(row => row.map(v=>`"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  
  const blob = new Blob([`\uFEFF${csvContent}`], {type: 'text/csv;charset=utf-8;'}); // BOM 추가 (Excel 한글 깨짐 방지)
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `거래상세내역_${from}_${to}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ================= 세금계산서 관리/상세관리 =================
let taxEntries = JSON.parse(localStorage.getItem('taxEntries') || "[]");
function saveTaxEntries() { localStorage.setItem('taxEntries', JSON.stringify(taxEntries)); }

window.addTaxEntry = function(event) {
  event.preventDefault();
  const date = document.getElementById('taxDate').value;
  const company = document.getElementById('taxCompany').value.trim();
  const supply = Number(document.getElementById('supplyAmount').value);
  const tax = Number(document.getElementById('taxAmount').value);
  const memo = document.getElementById('taxMemo').value.trim();
  if (!date || !company || isNaN(supply) || isNaN(tax)) return alert("날짜, 거래처명, 공급가액, 세액은 필수이며 숫자로 입력해야 합니다!");
  taxEntries.push({ date, company, supply, tax, memo, id: Date.now() });
  saveTaxEntries();
  renderTaxList();
  if (document.getElementById('taxDetailTab')?.classList.contains('active')) {
      renderTaxDetail();
  }
  event.target.reset();
}
function renderTaxList() {
  const ul = document.getElementById('taxList');
  if (!ul) return;
  ul.innerHTML = '';
  taxEntries.slice().reverse().slice(0, 10).forEach((e) => {
    ul.innerHTML += `<li>
      <span>${e.date}</span>
      <span>${e.company}</span>
      <span>공급 ${e.supply.toLocaleString()}원</span>
      <span>세액 ${e.tax.toLocaleString()}원</span>
      ${e.memo ? `<span>(${e.memo})</span>` : ''}
    </li>`;
  });
}
function filterTax(currentTaxEntries, from, to) {
  if (!from || !to) return currentTaxEntries;
  return currentTaxEntries.filter(e => e.date >= from && e.date <= to);
}
function summarizeTax(currentTaxEntries) {
  let supply = 0, taxVal = 0; // 변수명 tax가 함수명과 겹치지 않도록 taxVal로 변경
  for (const e of currentTaxEntries) {
    supply += e.supply || 0;
    taxVal += e.tax || 0;
  }
  return { supply, tax: taxVal, count: currentTaxEntries.length };
}
function renderTaxSummary(data) {
  const summaryDiv = document.getElementById('taxSummary');
  if (summaryDiv) {
    summaryDiv.innerHTML = `
      <div>공급가액 합계: <span class="num">${data.supply.toLocaleString()}원</span></div>
      <div>세액 합계: <span class="num">${data.tax.toLocaleString()}원</span></div>
      <div>건수: <span class="num">${data.count}건</span></div>
    `;
  }
}
function renderTaxDetail() {
  console.log("renderTaxDetail called");
  const localTaxEntries = JSON.parse(localStorage.getItem('taxEntries') || "[]");
  let from = document.getElementById('taxFromDate')?.value;
  let to = document.getElementById('taxToDate')?.value;

  if ((!from || !to) && document.getElementById('taxFromDate')) {
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setMonth(today.getMonth() - 1);
    from = monthAgo.toISOString().slice(0,10);
    to = today.toISOString().slice(0,10);
    document.getElementById('taxFromDate').value = from;
    document.getElementById('taxToDate').value = to;
  }

  const filtered = filterTax(localTaxEntries, from, to);
  const sum = summarizeTax(filtered);
  renderTaxSummary(sum);

  const ul = document.getElementById('taxDetailList');
  if (!ul) return;
  ul.innerHTML = '';
  filtered.slice().reverse().forEach(e => {
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
  const localTaxEntries = JSON.parse(localStorage.getItem('taxEntries') || "[]");
  let from = document.getElementById('taxFromDate').value;
  let to = document.getElementById('taxToDate').value;
  const filtered = filterTax(localTaxEntries, from, to);
  if (filtered.length === 0) return alert("내보낼 데이터가 없습니다.");

  let header = ["일자", "거래처명", "공급가액", "세액", "메모"];
  let csvData = filtered.map(e => [
    e.date,
    e.company || "",
    e.supply || 0,
    e.tax || 0,
    e.memo || ""
  ]);
  let csvContent = header.join(',') + '\n' + csvData.map(row => row.map(v=>`"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  
  const blob = new Blob([`\uFEFF${csvContent}`], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `세금계산서상세_${from}_${to}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ========== 종합소득세 제출서류 내보내기 ==========
const taxReportFormats = {
  cafe: { header: ["사업자명","대표자명","사업자등록번호","일자","구분","항목","금액","메모"], fields: ["bizName","ownerName","bizNum","date","typeKor","category","amount","memo"] },
  mart: { header: ["사업자명","대표자명","사업자등록번호","일자","구분","항목","금액","메모"], fields: ["bizName","ownerName","bizNum","date","typeKor","category","amount","memo"] },
  norabang: { header: ["사업자명","대표자명","사업자등록번호","일자","구분","항목","금액","메모"], fields: ["bizName","ownerName","bizNum","date","typeKor","category","amount","memo"] },
  carRepair: { header: ["사업자명","대표자명","사업자등록번호","일자","구분","항목","금액","메모"], fields: ["bizName","ownerName","bizNum","date","typeKor","category","amount","memo"] },
  other: { header: ["사업자명","대표자명","사업자등록번호","일자","구분","항목","금액","메모"], fields: ["bizName","ownerName","bizNum","date","typeKor","category","amount","memo"] },
};
window.downloadTaxReport = function(event) {
  event.preventDefault();
  const bizName = document.getElementById('bizName').value.trim();
  const ownerName = document.getElementById('ownerName').value.trim();
  const bizNum = document.getElementById('bizNum').value.trim();
  const bizTypeSel = document.getElementById('bizType');
  let bizTypeName = bizTypeSel.options[bizTypeSel.selectedIndex].text; // 선택된 업종 텍스트
  let bizTypeVal = bizTypeSel.value;
  
  let format = taxReportFormats[bizTypeVal] || taxReportFormats['other'];
  if (bizTypeVal === 'other') {
    bizTypeName = document.getElementById('bizTypeInput').value.trim() || '기타업종';
  }
  const from = document.getElementById('reportFrom').value;
  const to = document.getElementById('reportTo').value;

  if (!bizName || !ownerName || !bizNum || !bizTypeVal || !from || !to) return alert("모든 필수 정보를 입력해주세요!");
  if (bizTypeVal === 'other' && (!document.getElementById('bizTypeInput').value.trim())) return alert("직접입력 업종명을 입력해주세요!");

  const allTxEntries = JSON.parse(localStorage.getItem('entries') || "[]"); // 거래내역 사용
  const filtered = allTxEntries.filter(e => e.date >= from && e.date <= to);
  if (filtered.length === 0) return alert("선택된 기간에 해당하는 거래 내역이 없습니다.");

  filtered.forEach(e => e.typeKor = (e.type === "income" ? "수입" : "지출"));
  
  let csvData = filtered.map(e => format.fields.map(f => {
    if(f === "bizName") return bizName;
    if(f === "ownerName") return ownerName;
    if(f === "bizNum") return bizNum;
    return e[f] !== undefined && e[f] !== null ? e[f] : ""; // null 또는 undefined일 경우 빈 문자열
  }));

  let csvContent = format.header.join(',') + '\n' + csvData.map(row => row.map(v=>`"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

  const blob = new Blob([`\uFEFF${csvContent}`], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `종합소득세신고_${bizTypeName}_${from}_${to}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ========== 1:1문의사항 ==========
let qnaEntries = JSON.parse(localStorage.getItem('qnaEntries') || "[]");
function saveQnaEntries() { localStorage.setItem('qnaEntries', JSON.stringify(qnaEntries)); }

window.addQna = function(event) {
  event.preventDefault();
  const title = document.getElementById('qnaTitle').value.trim();
  const content = document.getElementById('qnaContent').value.trim();
  const user = document.getElementById('qnaUser').value.trim() || (auth.currentUser ? auth.currentUser.displayName || auth.currentUser.email : "익명");
  if (!title || !content) return alert("제목과 내용은 필수 항목입니다!");
  qnaEntries.push({ title, content, user, date: new Date().toISOString().slice(0,16).replace('T',' '), id: Date.now() });
  saveQnaEntries();
  renderQnaList();
  event.target.reset();
}
function renderQnaList() {
  const ul = document.getElementById('qnaList');
  if (!ul) return;
  ul.innerHTML = '';
  qnaEntries.slice().reverse().forEach(e => {
    ul.innerHTML += `<li>
      <b>${e.title}</b> <span style="font-size:0.9em;color:#555;">(${e.date})</span><br/>
      <span style="white-space: pre-wrap;">${e.content.replace(/\n/g, "<br/>")}</span><br/>
      ${e.user ? `<span style="font-size:0.9em;color:#888;display:block;text-align:right;margin-top:5px;">작성자: ${e.user}</span>` : ''}
    </li>`;
  });
}

// ========== 업종 직접입력 (종합소득세 제출서류) ==========
window.toggleBizTypeInput = function(sel) {
  const input = document.getElementById('bizTypeInput');
  if(input) {
    input.style.display = (sel.value === 'other') ? '' : 'none';
    if (sel.value !== 'other') input.value = ''; // 다른 것 선택 시 입력값 초기화
  }
}

// =========== ★★ DOMContentLoaded: 초기화 및 이벤트 바인딩 ★★ ===========
document.addEventListener('DOMContentLoaded', function() {
  // Firebase 인증 상태 변화에 따른 초기 UI 설정은 onAuthStateChanged에서 처리

  // 탭별 초기 렌더링 (showTab 함수가 초기 탭을 active로 설정하고 관련 렌더 함수를 호출하므로, 여기서는 중복 호출 피할 수 있음)
  // 단, showTab이 'dashboard'를 기본으로 호출하고, renderAll()을 호출하므로, renderAll은 여기서 호출할 필요 없음.
  // 만약 showTab이 초기에 호출되지 않는다면, 여기서 기본 탭 렌더링 함수 호출.
  // 현재 index.html의 showTab('dashboard')가 기본 호출을 담당.

  if(document.querySelector('.sidebar a.active')) {
      const activeTabName = document.querySelector('.sidebar a.active').getAttribute('onclick').match(/showTab\('([^']+)'\)/)[1];
      if (activeTabName) {
          // showTab(activeTabName); // 이미 index.html에서 로드 시 showTab('dashboard')가 호출될 것으로 예상됨.
          // 따라서, 각 탭의 초기 데이터 로딩은 showTab 내에서 이루어짐.
          // 또는 여기서 명시적으로 필요한 함수들만 호출
          if (typeof renderInputTabList === "function" && document.getElementById('inputTab')?.classList.contains('active')) renderInputTabList();
          if (typeof renderTaxList === "function" && document.getElementById('taxTab')?.classList.contains('active')) renderTaxList();
          if (typeof renderDetailTrans === "function" && document.getElementById('detailTransTab')?.classList.contains('active')) renderDetailTrans();
          if (typeof renderTaxDetail === "function" && document.getElementById('taxDetailTab')?.classList.contains('active')) renderTaxDetail();
          if (typeof renderQnaList === "function" && document.getElementById('qnaTab')?.classList.contains('active')) renderQnaList();
          // renderAll()은 showTab('dashboard')에서 호출
      }
  }


  // 로그인 관련 버튼 이벤트 바인딩
  const loginMainBtn = document.getElementById('loginMainBtn');
  if(loginMainBtn) {
    loginMainBtn.onclick = openLoginPopup;
  }

  const googleLoginBtn = document.getElementById('googleLoginBtn');
  if(googleLoginBtn) {
    googleLoginBtn.onclick = function() {
      const provider = new firebase.auth.GoogleAuthProvider();
      auth.signInWithPopup(provider)
        .then(result => {
          console.log("Google 로그인 성공:", result.user);
          closeLoginPopup();
          // 로그인 성공 후 추가 작업 (예: 사용자 정보 저장 또는 페이지 리디렉션)
        })
        .catch(err => {
          console.error("Google 로그인 오류:", err);
          alert(`로그인 오류: ${err.message} (코드를 확인해주세요: ${err.code})`);
        });
    };
  }
  // TODO: Kakao, Naver 로그인 버튼 이벤트 바인딩 추가
  // 예: document.getElementById('kakaoLoginBtn').onclick = () => { /* 카카오 로그인 로직 */ };

  const logoutBtn = document.getElementById('logoutBtn');
  if(logoutBtn) {
    logoutBtn.onclick = function() {
      auth.signOut().then(() => {
        console.log("로그아웃 성공");
        // 로그아웃 후 프로필 드롭다운 닫기 등 UI 정리
        const drop = document.getElementById('profileDropdown');
        if (drop) drop.classList.remove('show');
        // 필요한 경우 로그인 페이지로 리디렉션 또는 UI 업데이트
        if (document.getElementById('dashboardTab')) showTab('dashboard'); // 로그아웃 후 대시보드로 (선택사항)
      }).catch(err => {
        console.error("로그아웃 오류:", err);
      });
    };
  }
});
