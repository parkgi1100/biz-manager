// BizDash - script.js (네이버 콜백 URL 및 날짜 ID 수정)

// ======================= Firebase 설정 =======================
const firebaseConfig = {
  apiKey: "AIzaSyDIW89Y0Z5JPG4dBjoIDAofgy4XlAmQ7Jw", // 실제 키 (보안 유의)
  authDomain: "bizdash-7c6fd.firebaseapp.com",
  projectId: "bizdash-7c6fd",
  storageBucket: "bizdash-7c6fd.firebasestorage.app",
  messagingSenderId: "765405833459",
  appId: "1:765405833459:web:750f2189c77ac0353c2f86",
  measurementId: "G-W31FKJJSSG"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

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
    if (userAvatar) { userAvatar.src = photoURL; userAvatar.style.display = 'block';}
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
    console.log("Rendering Dashboard (at-a-glance focus)...");
    const fromDateVal = document.getElementById('fromDate').value;
    const toDateVal = document.getElementById('toDate').value;

    const filteredEntries = entries.filter(e => 
        (!fromDateVal || e.date >= fromDateVal) && (!toDateVal || e.date <= toDateVal)
    );

    const summary = summarizeTransactions(filteredEntries);
    document.getElementById('incomeSum').textContent = formatCurrency(summary.income);
    document.getElementById('expenseSum').textContent = formatCurrency(summary.expense);
    document.getElementById('profitSum').textContent = formatCurrency(summary.profit);

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
    if (chartCanvas) {
        if (currentChartInstance) currentChartInstance.destroy();
        const chartLabels = filteredEntries.length > 0 ? filteredEntries.map(e => formatDate(e.date, 'mm.dd')).slice(-15) : ['데이터 없음'];
        const profitData = []; // TODO: 실제 순이익 데이터 계산 로직
        currentChartInstance = new Chart(chartCanvas.getContext('2d'), {
            type: 'line',
            data: { labels: chartLabels, datasets: [{ label: '순이익 추이', data: profitData.length > 0 ? profitData : [0], borderColor: 'var(--profit-color)', backgroundColor: 'rgba(0,122,255,0.1)', tension: 0.2, fill: true }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false } }, plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } } }
        });
    }

    document.getElementById('prevPeriodIncome').textContent = formatCurrency(0); // TODO
    document.getElementById('compareChangePercentage').textContent = '0%'; // TODO
    document.getElementById('compareChangeAmount').textContent = formatCurrency(0); // TODO
    document.getElementById('compareArrow').textContent = ''; // TODO

    const bestExpenseItemsListUl = document.getElementById('bestExpenseItemsList');
    if (bestExpenseItemsListUl) {
        bestExpenseItemsListUl.innerHTML = '';
        const expenseCategories = {};
        filteredEntries.filter(e => String(e.type).toLowerCase() === 'expense').forEach(e => {
            const category = e.category || '기타 비용';
            expenseCategories[category] = (expenseCategories[category] || 0) + e.amount;
        });
        const sortedExpenses = Object.entries(expenseCategories).sort(([,a],[,b]) => b-a).slice(0,3);
        if (sortedExpenses.length === 0) {
             bestExpenseItemsListUl.innerHTML = '<li class="empty-list-message">주요 지출 항목이 없습니다.</li>';
        } else {
            sortedExpenses.forEach(([category, amount], index) => {
                const rankIcons = ['🥇', '🥈', '🥉'];
                bestExpenseItemsListUl.innerHTML += `
                    <li class="best-item">
                        <span class="rank-icon">${rankIcons[index] || (index+1)+'위'}</span>
                        <span class="category-name" title="${category}">${category}</span>
                        <span class="amount">${formatCurrency(amount)}</span>
                    </li>`;
            });
        }
    }
}

function renderInputTabList() {
  const ul = document.getElementById('inputRecordList');
  if (!ul) return;
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
  transactionArray.forEach(e => {
    if (String(e.type).toLowerCase() === "income") income += Number(e.amount);
    else if (String(e.type).toLowerCase() === "expense") expense += Number(e.amount);
  });
  return { income, expense, profit: income - expense, count: transactionArray.length };
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
  if (!ul) return;
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
  if (!ul) return;
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
    taxArray.forEach(e => {
        supply += Number(e.supplyAmount) || 0;
        tax += Number(e.taxAmount) || 0;
    });
    return { supply, tax, count: taxArray.length };
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
  if (!ul) return;
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
            assetsContent.innerHTML = `<p>총 ${fixedAssets.length}개의 고정자산이 있습니다. (목록 UI 개발 필요)</p>`;
        }
    }
}

function renderQnaList() {
  const ul = document.getElementById('qnaList');
  if (!ul) return;
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

function renderSettings() { console.log("Settings tab - TBD"); }

window.renderFunctionForTab = function(tabId) {
    console.log(`Rendering tab specific content for: ${tabId}`);
    switch(tabId) {
        case 'dashboard': renderDashboard(); break;
        case 'input': renderInputTabList(); break;
        case 'detailTrans': renderDetailTrans(); break;
        case 'tax': renderTaxList(); break;
        case 'taxDetail': renderTaxDetail(); break;
        case 'assets': renderAssetsTab(); break;
        case 'taxReport': break;
        case 'qna': renderQnaList(); break;
        case 'settings': renderSettings(); break;
        default: console.warn("No render function for tab:", tabId);
    }
};

function saveData(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

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
  const loginMainBtn = document.getElementById('loginMainBtn'); // 로그인 버튼 자체
  const authArea = document.getElementById('authArea'); // 프로필 메뉴 포함 영역

  if (popup && popup.classList.contains('show') && !popup.contains(event.target) && 
      (!loginMainBtn || !loginMainBtn.contains(event.target)) && // 로그인 버튼 클릭이 아닐 때
      (!authArea || !authArea.contains(event.target)) ) { // 프로필 메뉴 클릭이 아닐 때
    closeLoginPopup();
  }
}

function toggleProfileDropdown() {
  const drop = document.getElementById('profileDropdown');
  if (!drop) return;
  const isShown = drop.classList.toggle('show');
  if (isShown) {
    document.addEventListener('mousedown', closeProfileDropdownOutside);
  } else {
    document.removeEventListener('mousedown', closeProfileDropdownOutside);
  }
}

function closeProfileDropdownOutside(event) {
  const profileMenuDiv = document.getElementById('profileMenu'); // .profile-menu div
  if (profileMenuDiv && !profileMenuDiv.contains(event.target)) {
    // 클릭된 곳이 프로필 메뉴 영역 외부라면 드롭다운을 닫음
    const drop = document.getElementById('profileDropdown');
    if (drop && drop.classList.contains('show')) {
        drop.classList.remove('show');
        document.removeEventListener('mousedown', closeProfileDropdownOutside);
    }
  }
}


const closeLoginPopupBtn = document.getElementById('closeLoginPopupBtn');
if (closeLoginPopupBtn) closeLoginPopupBtn.onclick = closeLoginPopup;

function handleAddEntry(event) {
  event.preventDefault();
  const entryData = {
    id: Date.now(),
    date: document.getElementById('inputDateHtml').value, // ★★★ HTML ID 'inputDateHtml' 사용 ★★★
    type: document.getElementById('inputType').value,
    amount: Number(document.getElementById('inputAmount').value),
    category: document.getElementById('inputCategory').value.trim(),
    counterparty: document.getElementById('inputCounterparty').value.trim(),
    proofType: document.getElementById('inputProofType').value,
    memo: document.getElementById('inputMemo').value.trim()
  };
  if (!entryData.date || !entryData.amount) return alert("거래일자와 금액은 필수 항목입니다.");
  if (isNaN(entryData.amount)) return alert("금액은 숫자로 입력해야 합니다.");

  entries.push(entryData);
  saveData('bizdash_entries', entries);
  renderInputTabList();
  if (document.getElementById('dashboardTab')?.classList.contains('active')) renderDashboard();
  event.target.reset();
  // 새 거래 입력 후 날짜 필드를 오늘 날짜로 다시 설정
  const inputDateElem = document.getElementById('inputDateHtml');
  if(inputDateElem) inputDateElem.value = formatDate(new Date(), 'yyyy-mm-dd');
}

function handleFilterTransByPeriod(event) { event.preventDefault(); renderDetailTrans(); }
function exportToCsv(filename, headers, dataRows) {
    if (dataRows.length === 0) { alert("내보낼 데이터가 없습니다."); return; }
    const csvContent = [
        headers.join(','),
        ...dataRows.map(row => row.map(field => `"${String(field === null || field === undefined ? '' : field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link); link.click();
    document.body.removeChild(link); URL.revokeObjectURL(link.href);
}
function handleExportDetailTrans() {
    const fromDate = document.getElementById('transFromDate')?.value;
    const toDate = document.getElementById('transToDate')?.value;
    const filtered = entries.filter(e => (!fromDate || e.date >= fromDate) && (!toDate || e.date <= toDate));
    const headers = ["일자", "구분", "항목", "거래처", "증빙", "금액", "메모"];
    const dataRows = filtered.map(e => [e.date, (e.type === "income" ? "수입" : "지출"), e.category, e.counterparty, e.proofType, e.amount, e.memo]);
    exportToCsv(`거래상세내역_${fromDate || '전체'}_${toDate || '전체'}.csv`, headers, dataRows);
}
function handleAddTaxEntry(event) { /* ... 이전과 동일 ... */ }
function handleFilterTaxByPeriod(event) { event.preventDefault(); renderTaxDetail(); }
function handleExportTaxDetail() { /* ... 이전과 동일 ... */ }
const taxReportFormats = { /* ... 이전과 동일 ... */ };
function handleDownloadTaxReport(event) { /* ... 이전과 동일 ... */ }
function handleAddQna(event) { /* ... 이전과 동일 ... */ }
function handleToggleBizTypeInput(selectElement) { /* ... 이전과 동일 ... */ }
function handleQuickPeriodFilter(event) {
    if (event.target.tagName === 'BUTTON') {
        const period = event.target.dataset.period;
        const dates = getPeriodDates(period);
        document.getElementById('fromDate').value = dates.start;
        document.getElementById('toDate').value = dates.end;
        document.querySelectorAll('.quick-btn-row button').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        renderDashboard();
    }
}

// ======================= Firebase Social Login Functions =======================
function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then((result) => { console.log("Google 로그인 성공:", result.user); closeLoginPopup(); })
    .catch((error) => { console.error("Google 로그인 오류:", error); alert(`Google 로그인 실패: ${error.message}`); });
}

// Kakao 로그인 관련 함수는 제거됨

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
                clientId: "hyIyx5ajznMculp0VBZO", // 사용자 제공 Client ID 적용
                callbackUrl: "https://parkgi1100.github.io/biz-manager/", // ★★★ 사용자 제공 콜백 URL 적용 ★★★
                isPopup: false, 
                // loginButton: {color: "green", type: 3, height: 40} // 직접 만든 버튼 사용하므로 제거
            });
            naverLoginInstance.init();
            console.log("Naver Login SDK Initialized with Client ID:", "hyIyx5ajznMculp0VBZO", "and Callback URL:", "https://parkgi1100.github.io/biz-manager/");

            naverLoginInstance.getLoginStatus(function (status) {
                if (status) {
                    console.log("Naver user is logged in.");
                    const naverAccessToken = naverLoginInstance.getAccessToken();
                    const naverUserEmail = naverLoginInstance.user.getEmail();
                    const naverUserNickname = naverLoginInstance.user.getNickName();
                    
                    console.log("Naver Access Token:", naverAccessToken);
                    console.log("Naver User Email:", naverUserEmail);
                    console.log("Naver User Nickname:", naverUserNickname);
                    // !!! 중요: 여기서부터 Firebase Custom Authentication 흐름 시작 (백엔드 필요) !!!
                    alert("네이버 로그인 성공 (클라이언트 측)! Firebase 연동을 위해서는 백엔드에서 Custom Token 발급이 필요합니다.");
                    // 실제 앱에서는 여기서 closeLoginPopup(); 호출 전에 Firebase 로그인까지 완료해야 함
                } else {
                    console.log("Naver user is not logged in (or getLoginStatus call failed).");
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
  auth.onAuthStateChanged(user => {
    updateLoginUI(user);
    const activeTabLink = document.querySelector('.sidebar a.active');
    let activeTabId = 'dashboard'; // 기본값
    if (activeTabLink) {
        const href = activeTabLink.getAttribute('href');
        if(href) activeTabId = href.substring(1);
    }
    // 현재 URL 해시를 우선적으로 사용
    const hashTab = window.location.hash ? window.location.hash.substring(1) : null;
    if (hashTab && ['dashboard', 'input', 'detailTrans', 'tax', 'taxDetail', 'assets', 'taxReport', 'qna', 'settings'].includes(hashTab)) {
        activeTabId = hashTab;
    }
    
    if (window.renderFunctionForTab) {
        window.renderFunctionForTab(activeTabId);
    }
  });

  const todayStr = formatDate(new Date(), 'yyyy-mm-dd');
  const initialPeriod = getPeriodDates('month');
  const fromDateEl = document.getElementById('fromDate');
  if (fromDateEl) fromDateEl.value = initialPeriod.start;
  const toDateEl = document.getElementById('toDate');
  if (toDateEl) toDateEl.value = initialPeriod.end;
  
  const inputDateHtmlEl = document.getElementById('inputDateHtml'); // ★★★ HTML ID 'inputDateHtml' 사용 ★★★
  if (inputDateHtmlEl) inputDateHtmlEl.value = todayStr;

  document.querySelectorAll('.quick-btn-row button').forEach(btn => {
      if (btn.dataset.period === 'month') btn.classList.add('active');
      else btn.classList.remove('active');
  });
  
  // Kakao SDK 초기화 제거
  
  initializeNaverLogin(); // 네이버 로그인 초기화

  document.getElementById('userAvatar')?.addEventListener('click', toggleProfileDropdown);
  document.getElementById('loginMainBtn')?.addEventListener('click', openLoginPopup);
  document.getElementById('googleLoginBtn')?.addEventListener('click', signInWithGoogle);
  // Kakao 로그인 버튼 리스너 제거
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
});
