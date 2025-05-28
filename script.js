// BizDash - script.js (모든 함수 내용 포함된 최종 종합 코드)

// ======================= Firebase 설정 =======================
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY", // ★★★ 실제 API 키로 반드시 변경하세요! ★★★
  authDomain: "YOUR_ACTUAL_AUTH_DOMAIN", // ★★★ 실제 값으로 변경 ★★★
  projectId: "YOUR_ACTUAL_PROJECT_ID",   // ★★★ 실제 값으로 변경 ★★★
  storageBucket: "YOUR_ACTUAL_STORAGE_BUCKET", // ★★★ 실제 값으로 변경 ★★★
  messagingSenderId: "YOUR_ACTUAL_MESSAGING_SENDER_ID", // ★★★ 실제 값으로 변경 ★★★
  appId: "YOUR_ACTUAL_APP_ID", // ★★★ 실제 값으로 변경 ★★★
  measurementId: "YOUR_ACTUAL_MEASUREMENT_ID" // Optional
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
// Firebase Cloud Functions 초기화 (리전은 Cloud Function 배포 리전에 맞게 수정)
const functions = firebase.app().functions('asia-northeast3'); // 예: 서울 리전
// Firestore 사용 시 초기화 (주석 해제 및 SDK 추가 필요)
// const db = firebase.firestore();


// ======================= 전역 변수 및 상태 =======================
let entries = JSON.parse(localStorage.getItem('bizdash_entries') || "[]");
let taxEntriesData = JSON.parse(localStorage.getItem('bizdash_taxEntries') || "[]");
let qnaEntries = JSON.parse(localStorage.getItem('bizdash_qnaEntries') || "[]");
let fixedAssets = JSON.parse(localStorage.getItem('bizdash_fixedAssets') || "[]");
let currentChartInstance = null;
let naverLoginInstance; // 네이버 로그인 인스턴스

// ======================= 유틸리티 함수 =======================
function formatDate(dateInput, format = 'yyyy-mm-dd') {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return ''; 
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    if (format === 'yyyy-mm-dd') return `${year}-${month}-${day}`;
    if (format === 'mm.dd') return `${month}.${day}`;
    if (format === 'full') return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
    return date.toLocaleDateString('ko-KR');
}

function formatCurrency(amount) {
    if (isNaN(amount) || amount === null) return '₩0';
    return `₩${Number(amount).toLocaleString()}`;
}

function getPeriodDates(periodType) {
    const today = new Date();
    let startDate = new Date(today);
    let endDate = new Date(today);

    switch (periodType) {
        case 'week': startDate.setDate(today.getDate() - 6); break;
        case 'month': startDate = new Date(today.getFullYear(), today.getMonth(), 1); break;
        case 'year': startDate = new Date(today.getFullYear(), 0, 1); break;
        default: startDate = new Date(today.getFullYear(), today.getMonth(), 1); break;
    }
    return {
        start: formatDate(startDate, 'yyyy-mm-dd'),
        end: formatDate(endDate, 'yyyy-mm-dd')
    };
}

// ======================= UI 업데이트 및 렌더링 함수 =======================
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
    if (profileMenu) profileMenu.style.display = 'flex';
    const photoURL = user.photoURL || 'img/default-avatar.png';
    if (userAvatar) { userAvatar.src = photoURL; userAvatar.style.display = 'block'; }
    if (userAvatarBig) userAvatarBig.src = photoURL;
    if (profileEmailDiv) profileEmailDiv.textContent = user.email || '';
    if (profileNameDiv) profileNameDiv.textContent = user.displayName || '사용자';
    if (mobileLoginLink) {
        mobileLoginLink.textContent = '로그아웃';
        mobileLoginLink.onclick = () => auth.signOut().catch(err => console.error("로그아웃 오류:", err));
    }
  } else {
    if (loginBox) loginBox.style.display = 'flex';
    if (profileMenu) profileMenu.style.display = 'none';
    if (userAvatar) userAvatar.src = 'img/default-avatar.png';
    if (mobileLoginLink) {
        mobileLoginLink.textContent = '로그인';
        mobileLoginLink.onclick = openLoginPopup;
    }
    const drop = document.getElementById('profileDropdown');
    if (drop) drop.classList.remove('show');
  }
}

function renderDashboard() {
    console.log("Rendering Dashboard (Full logic)...");
    const fromDateVal = document.getElementById('fromDate').value;
    const toDateVal = document.getElementById('toDate').value;

    const filteredEntries = entries.filter(e => 
        (!fromDateVal || e.date >= fromDateVal) && (!toDateVal || e.date <= toDateVal)
    );

    const summary = summarizeTransactions(filteredEntries);

    if (summary && typeof summary.income !== 'undefined' && typeof summary.expense !== 'undefined' && typeof summary.profit !== 'undefined') {
        document.getElementById('incomeSum').textContent = formatCurrency(summary.income);
        document.getElementById('expenseSum').textContent = formatCurrency(summary.expense);
        document.getElementById('profitSum').textContent = formatCurrency(summary.profit);
    } else {
        console.error("renderDashboard: summary object is invalid or missing properties.", summary);
        document.getElementById('incomeSum').textContent = formatCurrency(0);
        document.getElementById('expenseSum').textContent = formatCurrency(0);
        document.getElementById('profitSum').textContent = formatCurrency(0);
    }

    const recentListUl = document.getElementById('recentList');
    if (recentListUl) {
        recentListUl.innerHTML = '';
        if (filteredEntries.length === 0) {
            recentListUl.innerHTML = '<li class="empty-list-message">거래 내역이 없습니다.</li>';
        } else {
            filteredEntries.slice(-4).reverse().forEach(e => {
                recentListUl.innerHTML += `
                    <li class="dashboard-recent-item">
                        <span class="item-date">${formatDate(e.date, 'mm.dd')}</span>
                        <span class="item-category" title="${e.category || ''}">${e.category || '미분류'}</span>
                        <span class="item-amount ${String(e.type).toLowerCase()}">${e.type === 'income' ? '+' : '-'}${formatCurrency(e.amount).replace('₩','')}</span>
                    </li>`;
            });
        }
    }

    const chartCanvas = document.getElementById('trendChart');
    if (chartCanvas && typeof Chart !== 'undefined') {
        if (currentChartInstance) currentChartInstance.destroy();
        const monthlyData = {};
        filteredEntries.forEach(e => {
            const monthKey = e.date.substring(0, 7);
            if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expense: 0 };
            if (String(e.type).toLowerCase() === 'income') monthlyData[monthKey].income += Number(e.amount);
            else if (String(e.type).toLowerCase() === 'expense') monthlyData[monthKey].expense += Number(e.amount);
        });
        const sortedMonthKeys = Object.keys(monthlyData).sort();
        const chartLabels = sortedMonthKeys.map(monthKey => `${monthKey.slice(2,4)}년 ${monthKey.slice(5,7)}월`);
        const incomeDataset = sortedMonthKeys.map(monthKey => monthlyData[monthKey].income);
        const expenseDataset = sortedMonthKeys.map(monthKey => monthlyData[monthKey].expense);

        currentChartInstance = new Chart(chartCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: chartLabels.length > 0 ? chartLabels : ['데이터 없음'],
                datasets: [
                    { label: '월별 총수입', data: incomeDataset.length > 0 ? incomeDataset : [0], backgroundColor: 'rgba(31, 136, 61, 0.6)', borderColor: 'var(--income-color)', borderWidth: 1 },
                    { label: '월별 총지출', data: expenseDataset.length > 0 ? expenseDataset : [0], backgroundColor: 'rgba(207, 34, 46, 0.6)', borderColor: 'var(--expense-color)', borderWidth: 1 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: value => formatCurrency(value).replace('₩','')+'원' } }, x: { grid: { display: false } } }, plugins: { legend: { position: 'bottom' }, tooltip: { mode: 'index', intersect: false, callbacks: { label: context => `${context.dataset.label}: ${formatCurrency(context.raw)}` } } } }
        });
    } else if (!chartCanvas) {
        console.warn("trendChart canvas not found.");
    } else if (typeof Chart === 'undefined') {
        console.warn("Chart.js library not loaded.");
    }
    
    const topIncomeItemsListUl = document.getElementById('topIncomeItemsList');
    if (topIncomeItemsListUl) {
        topIncomeItemsListUl.innerHTML = '';
        const incomeCategories = {};
        filteredEntries.filter(e => String(e.type).toLowerCase() === 'income').forEach(e => {
            const category = e.category || '기타 수입';
            incomeCategories[category] = (incomeCategories[category] || 0) + Number(e.amount);
        });
        const sortedIncome = Object.entries(incomeCategories).sort(([,a],[,b]) => b-a).slice(0,3);
        if (sortedIncome.length === 0) {
             topIncomeItemsListUl.innerHTML = '<li class="empty-list-message">주요 수익 항목이 없습니다.</li>';
        } else {
            sortedIncome.forEach(([category, amount], index) => {
                topIncomeItemsListUl.innerHTML += `
                    <li class="best-item">
                        <span class="rank-icon">${index + 1}.</span>
                        <span class="category-name" title="${category}">${category}</span>
                        <span class="amount">${formatCurrency(amount)}</span>
                    </li>`;
            });
        }
    }
    
    const bestExpenseItemsListUl = document.getElementById('bestExpenseItemsList');
    if (bestExpenseItemsListUl) {
        bestExpenseItemsListUl.innerHTML = '';
        const expenseCategories = {};
        filteredEntries.filter(e => String(e.type).toLowerCase() === 'expense').forEach(e => {
            const category = e.category || '기타 비용';
            expenseCategories[category] = (expenseCategories[category] || 0) + Number(e.amount);
        });
        const sortedExpenses = Object.entries(expenseCategories).sort(([,a],[,b]) => b-a).slice(0,3);
        if (sortedExpenses.length === 0) {
             bestExpenseItemsListUl.innerHTML = '<li class="empty-list-message">주요 지출 항목이 없습니다.</li>';
        } else {
            sortedExpenses.forEach(([category, amount], index) => {
                bestExpenseItemsListUl.innerHTML += `
                    <li class="best-item">
                        <span class="rank-icon">${index + 1}.</span>
                        <span class="category-name" title="${category}">${category}</span>
                        <span class="amount">${formatCurrency(amount)}</span>
                    </li>`;
            });
        }
    }
}

function renderInputTabList() {
  const ul = document.getElementById('inputRecordList');
  if (!ul) { console.warn("inputRecordList element not found"); return; }
  ul.innerHTML = '';
  if (entries.length === 0) {
    ul.innerHTML = '<li class="empty-list-message">최근 입력 내역이 없습니다.</li>';
  } else {
    entries.slice(-10).reverse().forEach(e => {
      ul.innerHTML += `<li class="${String(e.type).toLowerCase()}">
        <span class="date">${formatDate(e.date)}</span>
        <span class="type ${String(e.type).toLowerCase()}">${e.type === 'income' ? '수입' : '지출'}</span>
        <span class="category" title="${e.category || ''}">${e.category || '미분류'}</span>
        <span class="amount">${formatCurrency(e.amount)}</span>
        ${e.memo ? `<span class="memo" title="${e.memo}">(${e.memo})</span>` : ''}
      </li>`;
    });
  }
}

function summarizeTransactions(transactionArray) {
  let income = 0, expense = 0;
  const currentEntries = transactionArray || []; // null 또는 undefined 방지
  currentEntries.forEach(e => {
    if (String(e.type).toLowerCase() === "income") income += Number(e.amount);
    else if (String(e.type).toLowerCase() === "expense") expense += Number(e.amount);
  });
  return { income, expense, profit: income - expense, count: currentEntries.length };
}

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
      <div>총수입: <span class="num income">${formatCurrency(summary.income)}</span></div>
      <div>총지출: <span class="num expense">${formatCurrency(summary.expense)}</span></div>
      <div>합계(순이익): <span class="num profit">${formatCurrency(summary.profit)}</span></div>
      <div>거래건수: <span class="num">${summary.count}건</span></div>
    `;
  }
  const ul = document.getElementById('detailTransList');
  if (!ul) { console.warn("detailTransList element not found"); return;}
  ul.innerHTML = '';
  if (filtered.length === 0) {
    ul.innerHTML = '<li class="empty-list-message">해당 기간의 거래 내역이 없습니다.</li>';
  } else {
    filtered.slice().reverse().forEach(e => {
      ul.innerHTML += `<li class="${String(e.type).toLowerCase()}">
        <span class="date">${formatDate(e.date)}</span>
        <span class="type ${String(e.type).toLowerCase()}">${e.type === 'income' ? '수입' : '지출'}</span>
        <span class="category" title="${e.category || ''}">${e.category || '미분류'}</span>
        <span class="counterparty" title="${e.counterparty || ''}">${e.counterparty || '-'}</span>
        <span class="proof" title="${e.proofType || ''}">${e.proofType || '-'}</span>
        <span class="amount">${formatCurrency(e.amount)}</span>
        <span class="memo" title="${e.memo || ''}">${e.memo || ''}</span>
      </li>`;
    });
  }
}

function renderTaxList() {
  const ul = document.getElementById('taxList');
  if (!ul) { console.warn("taxList element not found"); return; }
  ul.innerHTML = '';
  if (taxEntriesData.length === 0) {
    ul.innerHTML = '<li class="empty-list-message">등록된 세금계산서가 없습니다.</li>';
  } else {
    taxEntriesData.slice(-10).reverse().forEach(e => {
      ul.innerHTML += `<li>
        <span>${formatDate(e.date)}</span>
        <span>${e.company}</span>
        <span>공급가액: ${formatCurrency(e.supplyAmount)}</span>
        <span>세액: ${formatCurrency(e.taxAmount)}</span>
        ${e.taxMemo ? `<span>(${e.taxMemo})</span>` : ''}
      </li>`;
    });
  }
}

function summarizeTaxEntries(taxArray) {
    let supply = 0, tax = 0;
    const currentEntries = taxArray || [];
    currentEntries.forEach(e => {
        supply += Number(e.supplyAmount) || 0;
        tax += Number(e.taxAmount) || 0;
    });
    return { supply, tax, count: currentEntries.length };
}

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
  if (!ul) { console.warn("taxDetailList element not found"); return; }
  ul.innerHTML = '';
  if (filtered.length === 0) {
    ul.innerHTML = '<li class="empty-list-message">해당 기간의 세금계산서 내역이 없습니다.</li>';
  } else {
    filtered.slice().reverse().forEach(e => {
      ul.innerHTML += `<li>
        <span>${formatDate(e.date)}</span>
        <span>${e.company || '-'}</span>
        <span>공급가액: ${formatCurrency(e.supplyAmount)}</span>
        <span>세액: ${formatCurrency(e.taxAmount)}</span>
        <span>${e.taxMemo || ''}</span>
      </li>`;
    });
  }
}

function renderAssetsTab() {
    console.log("Rendering Assets Tab...");
    const assetsContent = document.querySelector("#assetsTab .card");
    if (assetsContent) {
        if (fixedAssets.length === 0) {
            assetsContent.innerHTML = '<p>등록된 고정자산이 없습니다. 새로 추가해주세요.</p> ';
        } else {
            // TODO: fixedAssets 배열을 사용하여 목록 테이블 또는 리스트 생성
            let listHtml = '<ul>';
            fixedAssets.forEach(asset => {
                listHtml += `<li>${asset.name || '이름없음'} - 취득가액: ${formatCurrency(asset.acquisitionCost || 0)} (취득일: ${formatDate(asset.acquisitionDate || '')})</li>`;
            });
            listHtml += '</ul>';
            assetsContent.innerHTML = `<p>총 ${fixedAssets.length}개의 고정자산이 있습니다.</p>${listHtml}`;
        }
    } else {
        console.warn("Assets tab content area (.card) not found.");
    }
}

function renderQnaList() {
  const ul = document.getElementById('qnaList');
  if (!ul) { console.warn("qnaList element not found"); return; }
  ul.innerHTML = '';
  if (qnaEntries.length === 0) {
    ul.innerHTML = '<li class="empty-list-message">문의 내역이 없습니다.</li>';
  } else {
    qnaEntries.slice().reverse().forEach(e => {
      ul.innerHTML += `<li class="qna-item">
        <div class="qna-title"><b>${e.title}</b> <span class="date">(${formatDate(e.date, 'full')})</span></div>
        <div class="qna-content">${e.content.replace(/\n/g, "<br/>")}</div>
        ${e.user ? `<div class="qna-user">작성자: ${e.user}</div>` : ''}
      </li>`;
    });
  }
}

function renderSettings() { 
    console.log("Settings tab rendered - Displaying current settings if any.");
    // 예: localStorage에서 설정을 불러와 UI에 반영
    // const exportFormatSelect = document.getElementById('exportFormat');
    // if (exportFormatSelect) {
    //     const savedFormat = localStorage.getItem('bizdash_exportFormat');
    //     if (savedFormat) exportFormatSelect.value = savedFormat;
    // }
}

window.renderFunctionForTab = function(tabId) {
    console.log(`Rendering tab specific content for: ${tabId}`);
    switch(tabId) {
        case 'dashboard': renderDashboard(); break;
        case 'input': renderInputTabList(); break;
        case 'detailTrans': renderDetailTrans(); break;
        case 'tax': renderTaxList(); break;
        case 'taxDetail': renderTaxDetail(); break;
        case 'assets': renderAssetsTab(); break;
        case 'taxReport': /* 폼 위주, 현재 별도 렌더링 로직 없음 */ break;
        case 'qna': renderQnaList(); break;
        case 'settings': renderSettings(); break;
        default: console.warn("No render function for tab:", tabId);
    }
};

function saveData(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

// 로그인 팝업 관련 함수
function openLoginPopup() {
  const popup = document.getElementById('loginPopup');
  if (popup) popup.classList.add('show');
}
function closeLoginPopup() {
  const popup = document.getElementById('loginPopup');
  if (popup) popup.classList.remove('show');
}

// 프로필 드롭다운 관련 함수
function toggleProfileDropdown() {
  const drop = document.getElementById('profileDropdown');
  if (!drop) return;
  const isShown = drop.classList.toggle('show');
  // 이벤트 리스너는 한 번만 추가/제거되도록 개선
  if (isShown) {
    document.addEventListener('click', closeProfileDropdownOutside, true);
  } else {
    document.removeEventListener('click', closeProfileDropdownOutside, true);
  }
}

function closeProfileDropdownOutside(event) {
  const profileMenuDiv = document.getElementById('profileMenu'); // profileMenu 전체 영역
  const drop = document.getElementById('profileDropdown'); // 실제 드롭다운 박스

  // 드롭다운이 열려있고, 클릭된 곳이 프로필 메뉴 영역(.profile-menu) 외부일 때만 닫음
  if (drop && drop.classList.contains('show') && profileMenuDiv && !profileMenuDiv.contains(event.target)) {
    drop.classList.remove('show');
    document.removeEventListener('click', closeProfileDropdownOutside, true);
  }
}

// 거래 추가
function handleAddEntry(event) {
  event.preventDefault();
  const entryData = {
    id: Date.now(),
    date: document.getElementById('inputDateHtml').value,
    type: document.getElementById('inputType').value,
    amount: Number(document.getElementById('inputAmount').value),
    category: document.getElementById('inputCategory').value.trim(),
    counterparty: document.getElementById('inputCounterparty').value.trim(),
    proofType: document.getElementById('inputProofType').value,
    memo: document.getElementById('inputMemo').value.trim()
  };
  if (!entryData.date || !entryData.amount) return alert("거래일자와 금액은 필수 항목입니다.");
  if (isNaN(entryData.amount) || entryData.amount <= 0) return alert("금액은 0보다 큰 숫자로 입력해야 합니다.");

  entries.push(entryData);
  saveData('bizdash_entries', entries);
  renderInputTabList();
  if (document.getElementById('dashboardTab')?.classList.contains('active')) renderDashboard();
  event.target.reset();
  const inputDateElem = document.getElementById('inputDateHtml');
  if(inputDateElem) inputDateElem.value = formatDate(new Date(), 'yyyy-mm-dd');
}

// 거래 상세내역 기간별 조회
function handleFilterTransByPeriod(event) { event.preventDefault(); renderDetailTrans(); }

// CSV 내보내기 공통 함수
function exportToCsv(filename, headers, dataRows) {
    if (!dataRows || dataRows.length === 0) { alert("내보낼 데이터가 없습니다."); return; }
    const csvContent = [
        headers.join(','),
        ...dataRows.map(row => row.map(field => `"${String(field === null || field === undefined ? '' : field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // BOM 추가 (Excel 한글 깨짐 방지)
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link); link.click();
    document.body.removeChild(link); URL.revokeObjectURL(link.href);
}

// 거래상세내역 내보내기
function handleExportDetailTrans() {
    const fromDate = document.getElementById('transFromDate')?.value;
    const toDate = document.getElementById('transToDate')?.value;
    const filtered = entries.filter(e => (!fromDate || e.date >= fromDate) && (!toDate || e.date <= toDate));
    const headers = ["일자", "구분", "항목", "거래처", "증빙", "금액", "메모"];
    const dataRows = filtered.map(e => [e.date, (e.type === "income" ? "수입" : "지출"), e.category, e.counterparty, e.proofType, e.amount, e.memo]);
    exportToCsv(`거래상세내역_${fromDate || '전체'}_${toDate || '전체'}.csv`, headers, dataRows);
}

// 세금계산서 추가
function handleAddTaxEntry(event) {
  event.preventDefault();
  const taxEntry = {
    id: Date.now(),
    date: document.getElementById('taxDate').value,
    company: document.getElementById('taxCompany').value.trim(),
    supplyAmount: Number(document.getElementById('supplyAmount').value),
    taxAmount: Number(document.getElementById('taxAmount').value),
    taxMemo: document.getElementById('taxMemo').value.trim()
  };
  if (!taxEntry.date || !taxEntry.company || isNaN(taxEntry.supplyAmount) || isNaN(taxEntry.taxAmount)) {
    return alert("발행일자, 거래처명, 공급가액, 세액은 필수이며, 금액은 숫자로 입력해야 합니다.");
  }
  taxEntriesData.push(taxEntry);
  saveData('bizdash_taxEntries', taxEntriesData);
  renderTaxList();
  if (document.getElementById('taxDetailTab')?.classList.contains('active')) renderTaxDetail();
  event.target.reset();
  const taxDateEl = document.getElementById('taxDate');
  if(taxDateEl) taxDateEl.value = formatDate(new Date(), 'yyyy-mm-dd');
}

// 세금계산서 상세 기간별 조회
function handleFilterTaxByPeriod(event) { event.preventDefault(); renderTaxDetail(); }

// 세금계산서 상세 내보내기
function handleExportTaxDetail() {
    const fromDate = document.getElementById('taxFromDate')?.value;
    const toDate = document.getElementById('taxToDate')?.value;
    const filtered = taxEntriesData.filter(e => (!fromDate || e.date >= fromDate) && (!toDate || e.date <= toDate));
    const headers = ["일자", "거래처명", "공급가액", "세액", "메모"];
    const dataRows = filtered.map(e => [e.date, e.company, e.supplyAmount, e.taxAmount, e.taxMemo]);
    exportToCsv(`세금계산서상세_${fromDate || '전체'}_${toDate || '전체'}.csv`, headers, dataRows);
}

// 간편장부 소득금액계산서용 표준 경비 항목
const NTS_EXPENSE_CATEGORIES = {
    매입비용: ['상품매입', '원재료', '재료비', '매입', '구입'],
    급료임금: ['급여', '인건비', '직원급여', '알바비'],
    제세공과금: ['세금', '공과금', '국민연금', '건강보험', '고용보험', '산재보험', '부가세납부'],
    임차료: ['월세', '임대료', '사무실월세', '가게월세'],
    지급이자: ['대출이자', '이자비용'],
    접대비: ['거래처식사', '선물', '경조사비'],
    감가상각비: ['감가상각비', '자산상각'],
    차량유지비: ['주유비', '차량수리', '자동차보험', '톨게이트비'],
    운반비: ['택배비', '퀵서비스', '운송료'],
    광고선전비: ['광고비', '홍보비', '마케팅'],
    소모품비: ['사무용품', '문구', '비품'],
    여비교통비: ['출장비', '교통비', '숙박비'],
    통신비: ['전화요금', '인터넷요금', '핸드폰요금'],
    수도광열비: ['전기요금', '수도요금', '가스요금', '난방비'],
    수선비: ['수리비', '유지보수'],
    보험료: ['사업장보험', '화재보험'],
    교육훈련비: ['교육비', '훈련비', '세미나참가비'],
    도서인쇄비: ['도서구입', '인쇄비', '명함제작'],
    지급수수료: ['카드수수료', '플랫폼수수료', '중개수수료', '세무수수료'],
    기타경비: [] // 위에 해당하지 않는 모든 경비
};

function mapToNtsExpenseCategory(userCategory) {
    if (!userCategory) return '기타경비';
    const lcUserCategory = userCategory.toLowerCase();
    for (const ntsCat in NTS_EXPENSE_CATEGORIES) {
        if (NTS_EXPENSE_CATEGORIES[ntsCat].some(keyword => lcUserCategory.includes(keyword.toLowerCase()))) {
            return ntsCat;
        }
    }
    if (NTS_EXPENSE_CATEGORIES[userCategory]) return userCategory; // 직접 일치
    return '기타경비';
}

// 종합소득세 신고자료(간편장부 요약) 내보내기
function handleDownloadTaxReport(event) {
  event.preventDefault();
  const bizName = document.getElementById('bizName').value.trim();
  const ownerName = document.getElementById('ownerName').value.trim();
  const bizNum = document.getElementById('bizNum').value.trim();
  const bizTypeSel = document.getElementById('bizType');
  let bizTypeName = bizTypeSel.options[bizTypeSel.selectedIndex].text;
  let bizTypeVal = bizTypeSel.value;
  
  if (bizTypeVal === 'other') {
    bizTypeName = document.getElementById('bizTypeInput').value.trim() || '기타업종';
  }
  const fromDate = document.getElementById('reportFrom').value;
  const toDate = document.getElementById('reportTo').value;

  if (!bizName || !ownerName || !bizNum || !bizTypeVal || !from || !to) return alert("모든 필수 정보를 입력해주세요!");
  if (bizTypeVal === 'other' && (!document.getElementById('bizTypeInput').value.trim())) return alert("직접입력 업종명을 입력해주세요!");

  const filteredEntries = entries.filter(e => e.date >= from && e.date <= to);
  if (filteredEntries.length === 0) return alert("선택된 기간에 해당하는 거래 내역이 없습니다.");

  let totalRevenue = 0;
  const expensesByCategory = {};
  for (const cat in NTS_EXPENSE_CATEGORIES) { expensesByCategory[cat] = 0; }
  let totalExpenses = 0;

  filteredEntries.forEach(entry => {
    if (String(entry.type).toLowerCase() === 'income') {
      totalRevenue += Number(entry.amount);
    } else if (String(entry.type).toLowerCase() === 'expense') {
      const ntsCategory = mapToNtsExpenseCategory(entry.category);
      expensesByCategory[ntsCategory] += Number(entry.amount);
      totalExpenses += Number(entry.amount);
    }
  });
  const netBusinessIncome = totalRevenue - totalExpenses;

  const csvRows = [];
  const todayStr = formatDate(new Date(), 'yyyy-mm-dd');
  csvRows.push(["문서 생성일", todayStr]);
  csvRows.push(["보고 기간", `${fromDate} ~ ${toDate}`]);
  csvRows.push([""]);
  csvRows.push(["[기본 인적사항]"]);
  csvRows.push(["항목", "내용"]);
  csvRows.push(["사업장 상호", bizName]);
  csvRows.push(["성명(대표자)", ownerName]);
  csvRows.push(["사업자등록번호", bizNum]);
  csvRows.push(["업태 및 종목", bizTypeName]);
  csvRows.push([""]);
  csvRows.push(["[I. 총수입금액 및 필요경비 명세]"]);
  csvRows.push(["구분", "계정과목", "금액", "비고"]);
  csvRows.push(["총수입금액", "매출액 및 사업상 총수입금액", totalRevenue, ""]); 
  csvRows.push(["", "총수입금액 합계", totalRevenue, "A"]);
  csvRows.push([""]);
  csvRows.push(["필요경비"]);
  for (const ntsCat in NTS_EXPENSE_CATEGORIES) {
      if (expensesByCategory[ntsCat] > 0 || ntsCat === '감가상각비' || ntsCat === '기타경비') {
        csvRows.push(["", `  ${ntsCat}`, expensesByCategory[ntsCat], ""]);
      }
  }
  csvRows.push(["", "필요경비 합계", totalExpenses, "B"]);
  csvRows.push([""]);
  csvRows.push(["[II. 소득금액 계산]"]);
  csvRows.push(["구분", "계정과목", "금액", "산출근거"]);
  csvRows.push(["사업소득금액", "", netBusinessIncome, "A - B"]);
  
  exportToCsv(`종합소득세_간편장부요약_${bizName}_${fromDate}_${toDate}.csv`, [], csvRows); // 헤더는 이미 csvRows에 포함됨
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
  qnaEntries.push({ id: Date.now(), title, content, user: userDisplayName, date: new Date().toISOString() }); // 날짜 형식 일관성 위해 toISOString()
  saveData('bizdash_qnaEntries', qnaEntries);
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

// 대시보드 빠른 기간 선택
function handleQuickPeriodFilter(event) {
    if (event.target.tagName === 'BUTTON') {
        const period = event.target.dataset.period;
        const dates = getPeriodDates(period);
        
        document.getElementById('fromDate').value = dates.start;
        document.getElementById('toDate').value = dates.end;
        
        document.querySelectorAll('.quick-btn-row button').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        renderDashboard(); // 대시보드 다시 렌더링
    }
}

// ======================= Firebase Social Login Functions =======================
function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then((result) => { 
        console.log("Google 로그인 성공:", result.user);
        // Firestore에 사용자 정보 저장/업데이트 (선택적)
        // if (typeof saveUserProfileToFirestore === 'function') saveUserProfileToFirestore(result.user);
        closeLoginPopup(); 
    })
    .catch((error) => { 
        console.error("Google 로그인 오류:", error); 
        alert(`Google 로그인 실패: ${error.message}. Firebase 콘솔에서 Google 로그인을 활성화했는지 확인하세요.`); 
    });
}

// 카카오 로그인 함수는 제거됨

function signInWithNaver() {
    if (!naverLoginInstance) {
        alert("네이버 로그인이 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.\n또는 네이버 개발자센터에 등록된 정보(Client ID, Callback URL)를 확인해주세요.");
        return;
    }
    if (naverLoginInstance && typeof naverLoginInstance.authorize === 'function') {
        naverLoginInstance.authorize(); 
    } else {
        alert("네이버 로그인 기능을 실행할 수 없습니다. SDK 초기화 상태를 확인하세요.");
    }
}

function initializeNaverLogin() {
    try {
        if (typeof naver !== "undefined" && typeof naver.LoginWithNaverId !== "undefined") {
            naverLoginInstance = new naver.LoginWithNaverId({
                clientId: "hyIyx5ajznMculp0VBZO", // 사용자 제공 Client ID
                callbackUrl: "https://parkgi1100.github.io/biz-manager/", // 사용자 제공 콜백 URL
                isPopup: false, 
            });
            naverLoginInstance.init();
            console.log("Naver Login SDK Initialized.");

            naverLoginInstance.getLoginStatus(function (status) {
                if (status) {
                    console.log("Naver user is logged in (from getLoginStatus).");
                    if (naverLoginInstance.accessToken && naverLoginInstance.accessToken.accessToken) {
                        const naverAccessToken = naverLoginInstance.accessToken.accessToken;
                        console.log("Naver Access Token (from instance):", naverAccessToken.substring(0,10)+"...");
                        
                        console.log("Calling Cloud Function 'createFirebaseTokenWithNaver' using httpsCallable...");
                        // Firebase Functions SDK가 로드되었는지 확인 후 사용
                        if (typeof functions !== 'undefined' && typeof functions.httpsCallable === 'function') {
                            const createTokenFunction = functions.httpsCallable('createFirebaseTokenWithNaver'); 
                            createTokenFunction({ token: naverAccessToken })
                                .then((result) => {
                                    const firebaseToken = result.data.firebaseToken;
                                    if (firebaseToken) {
                                        console.log("Received Firebase Custom Token:", firebaseToken.substring(0,20)+"...");
                                        return auth.signInWithCustomToken(firebaseToken);
                                    } else {
                                        console.error("Firebase Custom Token was not received from function:", result.data.error || 'Unknown error from function response');
                                        throw new Error(result.data.error || 'Firebase 토큰 발급에 실패했습니다 (함수 응답 오류)');
                                    }
                                })
                                .then((userCredential) => {
                                    console.log("Firebase Naver Custom Login 성공:", userCredential.user);
                                    // Firestore에 사용자 정보 저장/업데이트 (선택적)
                                    // if (typeof saveUserProfileToFirestore === 'function') saveUserProfileToFirestore(userCredential.user, 'naver');
                                    closeLoginPopup();
                                })
                                .catch((error) => {
                                    console.error("Error calling Cloud Function or signing in with custom token:", error);
                                    alert(`네이버를 통한 Firebase 로그인 중 오류 발생: ${error.message}`);
                                });
                        } else {
                            console.error("Firebase Functions SDK (httpsCallable) not available. Check SDK script import and initialization.");
                            alert("Firebase Functions SDK가 로드되지 않았습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.");
                        }
                    } else {
                        console.warn("Naver Access Token not found in instance. Check callback handling.");
                    }
                } else {
                    console.log("Naver user is not logged in (getLoginStatus call failed).");
                }
            });
        } else {
          console.warn("Naver SDK not loaded, or 'naver' object is not available.");
        }
    } catch (e) {
        console.error("Naver Login SDK 초기화 중 오류 발생:", e);
    }
}

// ======================= DOMContentLoaded - 초기화 및 이벤트 리스너 =======================
document.addEventListener('DOMContentLoaded', function() {
  // 사이드바 토글 로직
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const toggleBtn = document.getElementById('toggleBtn');
  const mainContentArea = document.getElementById('mainContentArea'); // mainContentArea 정의

  if (toggleBtn) {
    toggleBtn.onclick = () => {
      sidebar.classList.toggle('show');
      overlay.classList.toggle('show');
      if (window.innerWidth >= 600) { // 데스크탑 화면에서만 body 클래스 토글
          document.body.classList.toggle('sidebar-open');
      }
    };
  }
  if (overlay) {
    overlay.onclick = () => {
      sidebar.classList.remove('show');
      overlay.classList.remove('show');
      if (window.innerWidth >= 600) { // 데스크탑 화면에서만 body 클래스 제거
          document.body.classList.remove('sidebar-open');
      }
    };
  }
  
  // 탭 전환 함수 (전역으로 노출)
  window.showTab = function(tabId) {
      // const mainContentArea = document.getElementById('mainContentArea'); // 이미 위에서 선언됨
      document.querySelectorAll('.tab').forEach(tabElement => tabElement.classList.remove('active'));
      document.querySelectorAll('.sidebar a').forEach(linkElement => linkElement.classList.remove('active'));

      const activeTab = document.getElementById(tabId + 'Tab');
      if (activeTab) activeTab.classList.add('active');

      const activeLink = document.querySelector(`.sidebar a[href="#${tabId}"]`);
      if (activeLink) activeLink.classList.add('active');
      
      if (sidebar && sidebar.classList.contains('show') && window.innerWidth < 768) { // 모바일에서 탭 선택 시 사이드바 닫기
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
        document.body.classList.remove('sidebar-open'); // 모바일에서는 body 클래스 항상 제거
      }

      if (typeof window.renderFunctionForTab === 'function') {
        window.renderFunctionForTab(tabId);
      }
      if(mainContentArea) mainContentArea.scrollTop = 0; // 현재 탭의 스크롤을 위로
  }
  
  const validTabs = ['dashboard', 'input', 'detailTrans', 'tax', 'taxDetail', 'assets', 'taxReport', 'qna', 'settings'];
  
  function handleInitialTabAndHash() {
    const currentHash = window.location.hash;
    // 네이버 콜백인지 먼저 확인
    if (currentHash.includes("access_token=") && (currentHash.includes("token_type=bearer") || currentHash.includes("state="))) {
        console.log("script.js (DOMContentLoaded): Naver login callback hash detected. Naver SDK will process.");
        // 네이버 SDK가 처리하도록 여기서 탭 변경 안 함. initializeNaverLogin() 내의 getLoginStatus에서 처리 후 로그인 되면 onAuthStateChanged가 UI 업데이트.
    } else {
        const initialTab = currentHash ? currentHash.substring(1) : 'dashboard';
        if (validTabs.includes(initialTab)) {
            window.showTab(initialTab);
        } else {
            window.showTab('dashboard');
            if(window.location.hash && window.location.hash !== '#dashboard') { // 잘못된 해시면 #dashboard로
               window.location.hash = 'dashboard';
            }
        }
    }
  }

  window.addEventListener('hashchange', () => {
    const newHash = window.location.hash;
    if (newHash.includes("access_token=") && (newHash.includes("token_type=bearer") || newHash.includes("state="))) {
        console.log("script.js (hashchange): Hash looks like Naver callback. Ignoring for tab navigation.");
        return; 
    }
    const hashTab = newHash ? newHash.substring(1) : 'dashboard';
    const currentActiveLink = document.querySelector('.sidebar a.active');
    const currentActiveTabId = currentActiveLink ? currentActiveLink.getAttribute('href').substring(1) : null;

    if (validTabs.includes(hashTab)) {
        if (hashTab !== currentActiveTabId) window.showTab(hashTab);
    } else if (newHash === '' || newHash === '#') { // 해시가 없으면
        if (currentActiveTabId !== 'dashboard') window.showTab('dashboard');
    }
  }, false);

  // Firebase Auth 상태 변경 리스너
  auth.onAuthStateChanged(user => {
    updateLoginUI(user);
    // 로그인/로그아웃 상태 변경 후, 현재 해시 또는 기본 탭으로 콘텐츠 다시 로드/렌더링
    // (주의: 네이버 로그인 콜백 직후에는 이 onAuthStateChanged가 바로 로그인 상태를 반영하지 않을 수 있음.
    // signInWithCustomToken 성공 후에 반영됨)
    if (user) {
        console.log("Firebase Auth State Changed: User logged in", user.uid);
        // if (typeof saveUserProfileToFirestore === 'function') saveUserProfileToFirestore(user); // 사용자 정보 저장/업데이트
    } else {
        console.log("Firebase Auth State Changed: User logged out");
    }
    handleInitialTabAndHash(); // 현재 URL 해시 기반으로 UI/탭 다시 설정
  });

  // 기본 날짜 설정
  const todayStr = formatDate(new Date(), 'yyyy-mm-dd');
  const initialPeriod = getPeriodDates('month'); // 초기 '이번달'
  const fromDateEl = document.getElementById('fromDate');
  if (fromDateEl) fromDateEl.value = initialPeriod.start;
  const toDateEl = document.getElementById('toDate');
  if (toDateEl) toDateEl.value = initialPeriod.end;
  
  const inputDateHtmlEl = document.getElementById('inputDateHtml'); // ID 수정 반영
  if (inputDateHtmlEl) inputDateHtmlEl.value = todayStr;

  document.querySelectorAll('.quick-btn-row button').forEach(btn => {
      if (btn.dataset.period === 'month') btn.classList.add('active');
      else btn.classList.remove('active');
  });
    
  initializeNaverLogin(); // 네이버 로그인 SDK 초기화

  // 이벤트 리스너 바인딩
  document.getElementById('userAvatar')?.addEventListener('click', toggleProfileDropdown);
  document.getElementById('loginMainBtn')?.addEventListener('click', openLoginPopup);
  const closePopupBtn = document.getElementById('closeLoginPopupBtn');
  if (closePopupBtn) closePopupBtn.onclick = closeLoginPopup; 
  
  document.getElementById('googleLoginBtn')?.addEventListener('click', signInWithGoogle);
  document.getElementById('naverLoginBtn')?.addEventListener('click', signInWithNaver);
  
  document.getElementById('logoutBtn')?.addEventListener('click', () => auth.signOut());
  document.getElementById('addEntryForm')?.addEventListener('submit', handleAddEntry);
  document.getElementById('transPeriodForm')?.addEventListener('submit', handleFilterTransByPeriod);
  document.getElementById('exportDetailTransBtn')?.addEventListener('click', handleExportDetailTrans);
  document.getElementById('addTaxEntryForm')?.addEventListener('submit', handleAddTaxEntry);
  document.getElementById('taxPeriodForm')?.addEventListener('submit', handleFilterTaxByPeriod);
  document.getElementById('exportTaxDetailBtn')?.addEventListener('click', handleExportTaxDetail);
  document.getElementById('taxReportForm')?.addEventListener('submit', handleDownloadTaxReport);
  document.getElementById('bizType')?.addEventListener('change', (e) => handleToggleBizTypeInput(e.target));
  document.getElementById('addQnaForm')?.addEventListener('submit', handleAddQna);
  document.querySelector('.quick-btn-row')?.addEventListener('click', handleQuickPeriodFilter);
  document.getElementById('fromDate')?.addEventListener('change', renderDashboard);
  document.getElementById('toDate')?.addEventListener('change', renderDashboard);

  // 초기 페이지 로드 시 탭 설정 (auth.onAuthStateChanged 내에서도 호출하여 로그인 상태 반영)
  handleInitialTabAndHash(); 
});
