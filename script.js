// ======================= Firebase 설정 =======================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // 실제 값으로 변경하세요!
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID" // Optional
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
// const db = firebase.firestore(); // Firestore 사용 시

// ======================= 전역 변수 및 상태 =======================
let entries = JSON.parse(localStorage.getItem('entries') || "[]");
let taxEntriesData = JSON.parse(localStorage.getItem('taxEntries') || "[]"); // 변수명 변경 (taxEntries -> taxEntriesData)
let qnaEntries = JSON.parse(localStorage.getItem('qnaEntries') || "[]");
let currentChartInstance = null; // 차트 인스턴스 저장용

// ======================= 유틸리티 함수 =======================
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
}

function formatCurrency(amount) {
    return `₩${Number(amount).toLocaleString()}`;
}

// ======================= UI 업데이트 및 렌더링 함수 =======================

// 로그인 UI 상태 업데이트
function updateLoginUI(user) {
  const loginBox = document.getElementById('loginBox');
  const profileMenu = document.getElementById('profileMenu');
  const userAvatar = document.getElementById('userAvatar');
  const userAvatarBig = document.getElementById('userAvatarBig');
  const profileEmailDiv = document.getElementById('profileEmail');
  const profileNameDiv = document.getElementById('profileName');
  const mobileLoginLink = document.getElementById('mobileLoginLink');

  if (user) {
    if (loginBox) loginBox.style.display = 'none';
    if (profileMenu) profileMenu.style.display = 'flex'; // flex로 변경하여 아이템 정렬

    const photoURL = user.photoURL || 'img/default-avatar.png'; // 기본 아바타 경로
    if (userAvatar) { userAvatar.src = photoURL; userAvatar.style.display = 'block';}
    if (userAvatarBig) userAvatarBig.src = photoURL;
    if (profileEmailDiv) profileEmailDiv.textContent = user.email || '';
    if (profileNameDiv) profileNameDiv.textContent = user.displayName || '사용자';
    if (mobileLoginLink) {
        mobileLoginLink.textContent = '로그아웃';
        mobileLoginLink.onclick = () => auth.signOut();
    }

  } else {
    if (loginBox) loginBox.style.display = 'flex';
    if (profileMenu) profileMenu.style.display = 'none';
    if (userAvatar) userAvatar.style.display = 'none';
    if (mobileLoginLink) {
        mobileLoginLink.textContent = '로그인';
        mobileLoginLink.onclick = openLoginPopup; // openLoginPopup 함수 호출
    }
    const drop = document.getElementById('profileDropdown');
    if (drop) drop.classList.remove('show');
  }
}

// 대시보드 데이터 렌더링
function renderDashboard() {
    console.log("renderDashboard() called");

    const incomeSumEl = document.getElementById('incomeSum');
    const expenseSumEl = document.getElementById('expenseSum');
    const profitSumEl = document.getElementById('profitSum');
    const recentListUl = document.getElementById('recentList');
    
    // 기간 필터 값 가져오기 (예시: 현재는 전체 데이터 기준)
    // TODO: fromDate, toDate 값에 따라 entries 필터링 필요
    const filteredEntries = entries; // 현재는 전체 사용

    const summary = summarizeTransactions(filteredEntries);

    if (incomeSumEl) incomeSumEl.textContent = formatCurrency(summary.income);
    if (expenseSumEl) expenseSumEl.textContent = formatCurrency(summary.expense);
    if (profitSumEl) profitSumEl.textContent = formatCurrency(summary.profit);

    if (recentListUl) {
        recentListUl.innerHTML = '';
        filteredEntries.slice(-5).reverse().forEach(e => {
            recentListUl.innerHTML += `
                <li>
                    <span class="date">${formatDate(e.date)}</span>
                    <span class="type ${e.type}">${e.type === 'income' ? '수입' : '지출'}</span>
                    <span class="category" title="${e.category || ''}">${e.category || '미분류'}</span>
                    <span class="amount">${formatCurrency(e.amount)}</span>
                    ${e.memo ? `<span class="memo" title="${e.memo}">(${e.memo})</span>` : ''}
                </li>`;
        });
    }

    // TODO: 추세 차트 (trendChart) 업데이트 로직
    // 예: drawTrendChart(filteredEntries);
    const chartCanvas = document.getElementById('trendChart');
    if (chartCanvas) {
        if (currentChartInstance) {
            currentChartInstance.destroy(); // 기존 차트 파괴
        }
        // 임시 데이터 및 차트 (실제 데이터로 교체 필요)
        const labels = filteredEntries.slice(-7).map(e => formatDate(e.date));
        const dataValues = filteredEntries.slice(-7).map(e => e.amount);
        currentChartInstance = new Chart(chartCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels.length > 0 ? labels : ['데이터 없음'],
                datasets: [{
                    label: '거래 추이',
                    data: dataValues.length > 0 ? dataValues : [0],
                    borderColor: 'var(--accent-color)',
                    tension: 0.1
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    console.log("TODO: 대시보드의 추세 차트(trendChart)를 실제 데이터로 업데이트하세요.");


    // TODO: (기간) 베스트 항목 (bestItemsList) 업데이트 로직
    const bestItemsListUl = document.getElementById('bestItemsList');
    if (bestItemsListUl) {
        bestItemsListUl.innerHTML = `<li><span class="category-name">베스트 항목 데이터 로딩 로직 필요</span></li>`;
    }
    console.log("TODO: 대시보드의 베스트 항목 목록을 업데이트하세요.");


    // TODO: 전월 동기간 비교 (prevPeriodIncome 등) 로직 업데이트
    const prevPeriodIncomeEl = document.getElementById('prevPeriodIncome');
    const compareChangePercentageEl = document.getElementById('compareChangePercentage');
    const compareChangeAmountEl = document.getElementById('compareChangeAmount');
    const compareArrowEl = document.getElementById('compareArrow');
    if(prevPeriodIncomeEl) prevPeriodIncomeEl.textContent = formatCurrency(0);
    if(compareChangePercentageEl) compareChangePercentageEl.textContent = '0%';
    if(compareChangeAmountEl) compareChangeAmountEl.textContent = formatCurrency(0);
    if(compareArrowEl) compareArrowEl.textContent = '';
    console.log("TODO: 대시보드의 전년 동기간 비교 정보를 업데이트하세요.");
}
window.renderAll = renderDashboard; // 이전 호환성 및 showTab에서의 직접 호출을 위해 (renderFunctionForTab 사용 권장)

// 거래 입력 탭의 최근 목록 렌더링
function renderInputTabList() {
  const ul = document.getElementById('inputRecordList');
  if (!ul) return;
  ul.innerHTML = '';
  entries.slice().reverse().slice(0, 10).forEach(e => {
    ul.innerHTML += `<li class="${e.type}">
      <span>${formatDate(e.date)}</span>
      <span>${e.type === 'income' ? '수입' : '지출'}</span>
      <span>${e.category || '미분류'}</span>
      <span class="amount">${formatCurrency(e.amount)}</span>
      ${e.memo ? `<span>(${e.memo})</span>` : ''}
    </li>`;
  });
}

// 거래 내역 요약 (수입, 지출, 순이익, 건수)
function summarizeTransactions(transactionArray) {
  let income = 0, expense = 0;
  transactionArray.forEach(e => {
    if (e.type === "income") income += e.amount;
    else expense += e.amount;
  });
  return { income, expense, profit: income - expense, count: transactionArray.length };
}

// 거래 상세 내역 탭 렌더링
function renderDetailTrans() {
  const fromDate = document.getElementById('transFromDate')?.value;
  const toDate = document.getElementById('transToDate')?.value;
  const filtered = entries.filter(e => 
    (!fromDate || e.date >= fromDate) && (!toDate || e.date <= toDate)
  );

  const summary = summarizeTransactions(filtered);
  const transSummaryDiv = document.getElementById('transSummary');
  if (transSummaryDiv) {
    transSummaryDiv.innerHTML = `
      <div>수입 합계: <span class="num">${formatCurrency(summary.income)}</span></div>
      <div>지출 합계: <span class="num">${formatCurrency(summary.expense)}</span></div>
      <div>순이익: <span class="num">${formatCurrency(summary.profit)}</span></div>
      <div>총 거래 수: <span class="num">${summary.count}건</span></div>
    `;
  }

  const ul = document.getElementById('detailTransList');
  if (!ul) return;
  ul.innerHTML = '';
  filtered.slice().reverse().forEach(e => {
    ul.innerHTML += `<li>
      <span>${formatDate(e.date)}</span>
      <span>${e.type === 'income' ? '수입' : '지출'}</span>
      <span>${e.category || '미분류'}</span>
      <span class="amount">${formatCurrency(e.amount)}</span>
      <span>${e.memo || ''}</span>
    </li>`;
  });
}

// 세금계산서 목록 렌더링 (최근 10개)
function renderTaxList() {
  const ul = document.getElementById('taxList');
  if (!ul) return;
  ul.innerHTML = '';
  taxEntriesData.slice().reverse().slice(0, 10).forEach(e => {
    ul.innerHTML += `<li>
      <span>${formatDate(e.date)}</span>
      <span>${e.company}</span>
      <span>공급 ${formatCurrency(e.supply)}</span>
      <span>세액 ${formatCurrency(e.tax)}</span>
      ${e.memo ? `<span>(${e.memo})</span>` : ''}
    </li>`;
  });
}

// 세금계산서 요약
function summarizeTaxEntries(taxArray) {
    let supply = 0, tax = 0;
    taxArray.forEach(e => {
        supply += e.supply || 0;
        tax += e.tax || 0;
    });
    return { supply, tax, count: taxArray.length };
}

// 세금계산서 상세 탭 렌더링
function renderTaxDetail() {
  const fromDate = document.getElementById('taxFromDate')?.value;
  const toDate = document.getElementById('taxToDate')?.value;
  const filtered = taxEntriesData.filter(e => 
    (!fromDate || e.date >= fromDate) && (!toDate || e.date <= toDate)
  );
  
  const summary = summarizeTaxEntries(filtered);
  const taxSummaryDiv = document.getElementById('taxSummary');
  if (taxSummaryDiv) {
    taxSummaryDiv.innerHTML = `
      <div>공급가액 합계: <span class="num">${formatCurrency(summary.supply)}</span></div>
      <div>세액 합계: <span class="num">${formatCurrency(summary.tax)}</span></div>
      <div>총 건수: <span class="num">${summary.count}건</span></div>
    `;
  }

  const ul = document.getElementById('taxDetailList');
  if (!ul) return;
  ul.innerHTML = '';
  filtered.slice().reverse().forEach(e => {
    ul.innerHTML += `<li>
      <span>${formatDate(e.date)}</span>
      <span>${e.company || '-'}</span>
      <span>공급 ${formatCurrency(e.supply)}</span>
      <span>세액 ${formatCurrency(e.tax)}</span>
      <span>${e.memo || ''}</span>
    </li>`;
  });
}

// QnA 목록 렌더링
function renderQnaList() {
  const ul = document.getElementById('qnaList');
  if (!ul) return;
  ul.innerHTML = '';
  qnaEntries.slice().reverse().forEach(e => {
    ul.innerHTML += `<li>
      <b>${e.title}</b> <span class="date">(${e.date})</span><br/>
      <span class="content">${e.content.replace(/\n/g, "<br/>")}</span>
      ${e.user ? `<span class="user">- ${e.user}</span>` : ''}
    </li>`;
  });
}

// 설정 탭 (현재는 내용 없음)
function renderSettings() {
    console.log("Settings tab rendered - TBD");
}

// 각 탭에 맞는 렌더링 함수 호출을 위한 중앙 관리 함수
window.renderFunctionForTab = function(tabId) {
    switch(tabId) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'input':
            renderInputTabList();
            break;
        case 'detailTrans':
            renderDetailTrans();
            break;
        case 'tax':
            renderTaxList();
            break;
        case 'taxDetail':
            renderTaxDetail();
            break;
        case 'taxReport':
            // 이 탭은 폼 제출이 주 기능이므로 별도 렌더링 함수는 현재 없음
            break;
        case 'qna':
            renderQnaList();
            break;
        case 'settings':
            renderSettings();
            break;
        default:
            console.warn("No render function for tab:", tabId);
    }
}


// ======================= 데이터 저장 함수 =======================
function saveEntries() { localStorage.setItem('entries', JSON.stringify(entries)); }
function saveTaxEntries() { localStorage.setItem('taxEntries', JSON.stringify(taxEntriesData)); }
function saveQnaEntries() { localStorage.setItem('qnaEntries', JSON.stringify(qnaEntries)); }

// ======================= 이벤트 핸들러 및 로직 =======================

// 로그인 팝업
function openLoginPopup() {
  const popup = document.getElementById('loginPopup');
  if (popup) popup.classList.add('show');
  document.addEventListener('mousedown', closeLoginPopupOutside);
}
function closeLoginPopup() {
  const popup = document.getElementById('loginPopup');
  if (popup) popup.classList.remove('show');
  document.removeEventListener('mousedown', closeLoginPopupOutside);
}
function closeLoginPopupOutside(event) {
  const popup = document.getElementById('loginPopup');
  const loginMainBtn = document.getElementById('loginMainBtn');
  if (popup && !popup.contains(event.target) && (!loginMainBtn || !loginMainBtn.contains(event.target))) {
    closeLoginPopup();
  }
}

// 프로필 드롭다운
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
function closeProfileDropdownOutside(event) {
  const drop = document.getElementById('profileDropdown');
  const avatar = document.getElementById('userAvatar');
  if (drop && !drop.contains(event.target) && (!avatar || !avatar.contains(event.target))) {
    drop.classList.remove('show');
    document.removeEventListener('mousedown', closeProfileDropdownOutside);
  }
}


// 거래 추가
function handleAddEntry(event) {
  event.preventDefault();
  const date = document.getElementById('date').value;
  const type = document.getElementById('type').value;
  const amount = Number(document.getElementById('amount').value);
  const category = document.getElementById('category').value.trim();
  const memo = document.getElementById('memo').value.trim();
  if (!date || !amount) return alert("날짜와 금액은 필수 입력 항목입니다.");

  entries.push({ id: Date.now(), date, type, amount, category, memo });
  saveEntries();
  renderInputTabList(); // 입력 폼 아래 목록 즉시 업데이트
  if (document.getElementById('dashboardTab')?.classList.contains('active')) {
    renderDashboard(); // 대시보드가 활성화 상태면 업데이트
  }
  event.target.reset();
}

// 거래 상세내역 조회
function handleFilterTransByPeriod(event) {
  event.preventDefault();
  renderDetailTrans();
}

// CSV 데이터 생성 및 다운로드 공통 함수
function exportToCsv(filename, headers, dataRows) {
    if (dataRows.length === 0) {
        alert("내보낼 데이터가 없습니다.");
        return;
    }
    const csvContent = [
        headers.join(','),
        ...dataRows.map(row => row.map(field => `"${String(field === null || field === undefined ? '' : field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // BOM 추가
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

// 거래상세내역 내보내기
function handleExportDetailTrans() {
    const fromDate = document.getElementById('transFromDate')?.value;
    const toDate = document.getElementById('transToDate')?.value;
    const filtered = entries.filter(e => 
        (!fromDate || e.date >= fromDate) && (!toDate || e.date <= toDate)
    );
    const headers = ["일자", "구분", "항목", "금액", "메모"];
    const dataRows = filtered.map(e => [
        e.date, (e.type === "income" ? "수입" : "지출"), e.category, e.amount, e.memo
    ]);
    exportToCsv(`거래상세내역_${fromDate || '전체'}-${toDate || '전체'}.csv`, headers, dataRows);
}

// 세금계산서 추가
function handleAddTaxEntry(event) {
  event.preventDefault();
  const date = document.getElementById('taxDate').value;
  const company = document.getElementById('taxCompany').value.trim();
  const supply = Number(document.getElementById('supplyAmount').value);
  const tax = Number(document.getElementById('taxAmount').value);
  const memo = document.getElementById('taxMemo').value.trim();
  if (!date || !company || isNaN(supply) || isNaN(tax)) {
    return alert("날짜, 거래처명, 공급가액, 세액은 필수이며, 금액은 숫자로 입력해야 합니다.");
  }
  taxEntriesData.push({ id: Date.now(), date, company, supply, tax, memo });
  saveTaxEntries();
  renderTaxList();
  if (document.getElementById('taxDetailTab')?.classList.contains('active')) {
      renderTaxDetail();
  }
  event.target.reset();
}

// 세금계산서 상세 조회
function handleFilterTaxByPeriod(event) {
  event.preventDefault();
  renderTaxDetail();
}

// 세금계산서 상세 내보내기
function handleExportTaxDetail() {
    const fromDate = document.getElementById('taxFromDate')?.value;
    const toDate = document.getElementById('taxToDate')?.value;
    const filtered = taxEntriesData.filter(e => 
        (!fromDate || e.date >= fromDate) && (!toDate || e.date <= toDate)
    );
    const headers = ["일자", "거래처명", "공급가액", "세액", "메모"];
    const dataRows = filtered.map(e => [e.date, e.company, e.supply, e.tax, e.memo]);
    exportToCsv(`세금계산서상세_${fromDate || '전체'}-${toDate || '전체'}.csv`, headers, dataRows);
}


// 종합소득세 자료 다운로드
const taxReportFormats = { /* ... 이전과 동일 ... */ }; // 이 객체는 이전 코드에서 가져오세요.
function handleDownloadTaxReport(event) {
  event.preventDefault();
  const bizName = document.getElementById('bizName').value.trim();
  const ownerName = document.getElementById('ownerName').value.trim();
  const bizNum = document.getElementById('bizNum').value.trim();
  const bizTypeSel = document.getElementById('bizType');
  let bizTypeVal = bizTypeSel.value;
  let bizTypeName = bizTypeSel.options[bizTypeSel.selectedIndex].text;

  if (bizTypeVal === 'other') {
    bizTypeName = document.getElementById('bizTypeInput').value.trim() || '기타업종';
  }
  const from = document.getElementById('reportFrom').value;
  const to = document.getElementById('reportTo').value;

  if (!bizName || !ownerName || !bizNum || !bizTypeVal || !from || !to) return alert("모든 필수 정보를 입력해주세요!");
  if (bizTypeVal === 'other' && (!document.getElementById('bizTypeInput').value.trim())) return alert("직접입력 업종명을 입력해주세요!");

  const format = taxReportFormats[bizTypeVal] || taxReportFormats['other'];
  const filteredEntries = entries.filter(e => e.date >= from && e.date <= to);
  if (filteredEntries.length === 0) return alert("선택된 기간에 해당하는 거래 내역이 없습니다.");

  const dataRows = filteredEntries.map(e => {
    const rowData = { ...e, typeKor: (e.type === "income" ? "수입" : "지출"), bizName, ownerName, bizNum };
    return format.fields.map(field => rowData[field] !== undefined ? rowData[field] : "");
  });
  exportToCsv(`종합소득세_${bizTypeName}_${from}_${to}.csv`, format.header, dataRows);
}

// QnA 추가
function handleAddQna(event) {
  event.preventDefault();
  const title = document.getElementById('qnaTitle').value.trim();
  const content = document.getElementById('qnaContent').value.trim();
  let userDisplayName = document.getElementById('qnaUser').value.trim();
  
  if (!userDisplayName && auth.currentUser) {
      userDisplayName = auth.currentUser.displayName || auth.currentUser.email;
  } else if (!userDisplayName) {
      userDisplayName = "익명";
  }

  if (!title || !content) return alert("제목과 내용은 필수 항목입니다.");
  qnaEntries.push({ id: Date.now(), title, content, user: userDisplayName, date: new Date().toISOString().slice(0,16).replace('T',' ') });
  saveQnaEntries();
  renderQnaList();
  event.target.reset();
}

// 업종 직접 입력 토글
function handleToggleBizTypeInput(selectElement) {
  const input = document.getElementById('bizTypeInput');
  if(input) {
    input.style.display = (selectElement.value === 'other') ? 'inline-block' : 'none';
    if (selectElement.value !== 'other') input.value = '';
  }
}

// 대시보드 기간 필터 버튼
function handleQuickPeriodFilter(event) {
    if (event.target.tagName === 'BUTTON') {
        const period = event.target.dataset.period;
        const today = new Date();
        let startDate, endDate = today.toISOString().slice(0, 10);

        switch (period) {
            case 'week':
                startDate = new Date(today.setDate(today.getDate() - 6)).toISOString().slice(0, 10);
                break;
            case 'month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
                break;
            case 'year':
                startDate = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
                break;
            default: return;
        }
        document.getElementById('fromDate').value = startDate;
        document.getElementById('toDate').value = endDate;
        
        // 활성 버튼 스타일 업데이트
        document.querySelectorAll('.quick-btn-row button').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        renderDashboard(); // 필터 변경 후 대시보드 다시 렌더링
    }
}


// ======================= DOMContentLoaded - 초기화 및 이벤트 리스너 =======================
document.addEventListener('DOMContentLoaded', function() {
  // Firebase 인증 상태 변경 감지
  auth.onAuthStateChanged(user => {
    updateLoginUI(user);
    // 로그인 상태에 따라 초기 데이터 로드 또는 UI 변경 가능
    if (user) {
        // 예: 사용자 관련 데이터 로드
        console.log("사용자 로그인:", user.uid);
    } else {
        console.log("사용자 로그아웃");
    }
    // 인증 상태 변경 후 현재 활성화된 탭의 내용을 다시 렌더링 할 수 있음
    const activeTabLink = document.querySelector('.sidebar a.active');
    if (activeTabLink) {
        const activeTabId = activeTabLink.getAttribute('onclick').match(/showTab\('([^']+)'\)/)[1];
        if (window.renderFunctionForTab) window.renderFunctionForTab(activeTabId);
    }
  });

  // 프로필 아바타 클릭 시 드롭다운 토글
  const userAvatar = document.getElementById('userAvatar');
  if (userAvatar) {
    userAvatar.onclick = toggleProfileDropdown;
  }
  
  // 로그인 버튼 (팝업 내 아님)
  const loginMainBtn = document.getElementById('loginMainBtn');
  if (loginMainBtn) loginMainBtn.onclick = openLoginPopup;

  // 소셜 로그인 버튼
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  if (googleLoginBtn) {
    googleLoginBtn.onclick = function() {
      const provider = new firebase.auth.GoogleAuthProvider();
      auth.signInWithPopup(provider)
        .then(result => closeLoginPopup())
        .catch(err => { 
            console.error("Google 로그인 오류:", err);
            alert(`Google 로그인 실패: ${err.message}`);
        });
    };
  }
  // TODO: Kakao, Naver 로그인 리스너 추가

  // 로그아웃 버튼
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = () => auth.signOut();
  }

  // 폼 제출 이벤트 리스너
  const addEntryForm = document.getElementById('addEntryForm');
  if (addEntryForm) addEntryForm.onsubmit = handleAddEntry;

  const transPeriodForm = document.getElementById('transPeriodForm');
  if (transPeriodForm) transPeriodForm.onsubmit = handleFilterTransByPeriod;
  
  const exportDetailTransBtn = document.getElementById('exportDetailTransBtn');
  if (exportDetailTransBtn) exportDetailTransBtn.onclick = handleExportDetailTrans;

  const addTaxEntryForm = document.getElementById('addTaxEntryForm');
  if (addTaxEntryForm) addTaxEntryForm.onsubmit = handleAddTaxEntry;

  const taxPeriodForm = document.getElementById('taxPeriodForm');
  if (taxPeriodForm) taxPeriodForm.onsubmit = handleFilterTaxByPeriod;
  
  const exportTaxDetailBtn = document.getElementById('exportTaxDetailBtn');
  if (exportTaxDetailBtn) exportTaxDetailBtn.onclick = handleExportTaxDetail;

  const taxReportForm = document.getElementById('taxReportForm');
  if (taxReportForm) taxReportForm.onsubmit = handleDownloadTaxReport;
  
  const bizTypeSelect = document.getElementById('bizType');
  if (bizTypeSelect) bizTypeSelect.onchange = () => handleToggleBizTypeInput(bizTypeSelect);

  const addQnaForm = document.getElementById('addQnaForm');
  if (addQnaForm) addQnaForm.onsubmit = handleAddQna;

  // 대시보드 기간 필터 버튼 이벤트 리스너
  const quickBtnRow = document.querySelector('.quick-btn-row');
  if (quickBtnRow) quickBtnRow.onclick = handleQuickPeriodFilter;
  
  const fromDateInput = document.getElementById('fromDate');
  const toDateInput = document.getElementById('toDate');
  if(fromDateInput) fromDateInput.onchange = renderDashboard;
  if(toDateInput) toDateInput.onchange = renderDashboard;


  // 초기 탭 로드는 index.html의 인라인 스크립트에서 showTab('dashboard')로 처리됨.
  // 해당 showTab 함수 내에서 window.renderFunctionForTab('dashboard')가 호출되어 renderDashboard() 실행.
});
