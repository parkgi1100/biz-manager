// BizDash - script.js

// ======================= Firebase 설정 =======================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // ★★★ 실제 API 키로 변경하세요! ★★★
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID" // Optional
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
// const db = firebase.firestore(); // Firestore 사용 시 주석 해제

// ======================= 전역 변수 및 상태 =======================
let entries = JSON.parse(localStorage.getItem('bizdash_entries') || "[]");
let taxEntriesData = JSON.parse(localStorage.getItem('bizdash_taxEntries') || "[]");
let qnaEntries = JSON.parse(localStorage.getItem('bizdash_qnaEntries') || "[]");
let fixedAssets = JSON.parse(localStorage.getItem('bizdash_fixedAssets') || "[]"); // 고정자산 데이터
let currentChartInstance = null;

// ======================= 유틸리티 함수 =======================
function formatDate(dateInput, format = 'yyyy-mm-dd') {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    if (format === 'yyyy-mm-dd') return `${year}-${month}-${day}`;
    return date.toLocaleDateString('ko-KR'); // 기본값
}

function formatCurrency(amount) {
    if (isNaN(amount) || amount === null) return '₩0';
    return `₩${Number(amount).toLocaleString()}`;
}

function getPeriodDates(periodType) {
    const today = new Date();
    let startDate, endDate = new Date(today); // endDate는 오늘로 설정하고 toISOString

    switch (periodType) {
        case 'week':
            startDate = new Date(today.setDate(today.getDate() - 6));
            break;
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            break;
        case 'year':
            startDate = new Date(today.getFullYear(), 0, 1);
            break;
        default: // 기본은 이번 달
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            break;
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
    if (userAvatar) userAvatar.src = 'img/default-avatar.png'; // 로그아웃 시 기본 이미지
    if (mobileLoginLink) {
        mobileLoginLink.textContent = '로그인';
        mobileLoginLink.onclick = openLoginPopup;
    }
    const drop = document.getElementById('profileDropdown');
    if (drop) drop.classList.remove('show');
  }
}

function renderDashboard() {
    console.log("Rendering Dashboard...");
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;

    const filteredEntries = entries.filter(e => {
        if (fromDate && e.date < fromDate) return false;
        if (toDate && e.date > toDate) return false;
        return true;
    });

    const summary = summarizeTransactions(filteredEntries);
    document.getElementById('incomeSum').textContent = formatCurrency(summary.income);
    document.getElementById('expenseSum').textContent = formatCurrency(summary.expense);
    document.getElementById('profitSum').textContent = formatCurrency(summary.profit);

    // 최근 거래 내역 (대시보드용)
    const recentListUl = document.getElementById('recentList');
    if (recentListUl) {
        recentListUl.innerHTML = '';
        if (filteredEntries.length === 0) {
            recentListUl.innerHTML = '<li class="empty-list-message">표시할 거래 내역이 없습니다.</li>';
        } else {
            filteredEntries.slice(-5).reverse().forEach(e => {
                recentListUl.innerHTML += `
                    <li>
                        <span class="date">${formatDate(e.date)}</span>
                        <span class="type ${e.type.toLowerCase()}">${e.type === 'income' ? '수입' : '지출'}</span>
                        <span class="category" title="${e.category || ''}">${e.category || '미분류'}</span>
                        <span class="amount">${formatCurrency(e.amount)}</span>
                    </li>`;
            });
        }
    }

    // 추세 차트 업데이트
    const chartCanvas = document.getElementById('trendChart');
    if (chartCanvas) {
        if (currentChartInstance) currentChartInstance.destroy();
        
        // TODO: 실제 차트 데이터 구성 로직 (예: 월별 또는 일별 집계)
        const chartLabels = filteredEntries.length > 0 ? filteredEntries.map(e => formatDate(e.date)).slice(-30) : ['데이터 없음']; // 최근 30개
        const incomeData = filteredEntries.length > 0 ? filteredEntries.filter(e=>e.type === 'income').map(e => e.amount).slice(-30) : [0];
        const expenseData = filteredEntries.length > 0 ? filteredEntries.filter(e=>e.type === 'expense').map(e => e.amount).slice(-30) : [0];

        currentChartInstance = new Chart(chartCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [
                    { label: '수입', data: incomeData, borderColor: 'var(--income-color)', tension: 0.1, fill: false },
                    { label: '지출', data: expenseData, borderColor: 'var(--expense-color)', tension: 0.1, fill: false }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }

    // TODO: 전년 동기 대비 로직 (데이터 구조 및 계산 필요)
    document.getElementById('prevPeriodIncome').textContent = formatCurrency(0); // 예시
    document.getElementById('compareChangePercentage').textContent = '0%';
    document.getElementById('compareChangeAmount').textContent = formatCurrency(0);
    document.getElementById('compareArrow').textContent = '';


    // TODO: 주요 비용 항목 (Top 5)
    const bestExpenseItemsListUl = document.getElementById('bestExpenseItemsList');
    if (bestExpenseItemsListUl) {
        bestExpenseItemsListUl.innerHTML = '';
        const expenseCategories = {};
        filteredEntries.filter(e => e.type === 'expense').forEach(e => {
            const category = e.category || '기타 비용';
            expenseCategories[category] = (expenseCategories[category] || 0) + e.amount;
        });
        const sortedExpenses = Object.entries(expenseCategories).sort(([,a],[,b]) => b-a).slice(0,5);
        
        if (sortedExpenses.length === 0) {
             bestExpenseItemsListUl.innerHTML = '<li class="empty-list-message">표시할 비용 항목이 없습니다.</li>';
        } else {
            sortedExpenses.forEach(([category, amount], index) => {
                const rankIcons = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']; // 간단한 아이콘
                bestExpenseItemsListUl.innerHTML += `
                    <li>
                        <span class="rank-icon">${rankIcons[index] || (index+1)+'위'}</span>
                        <span class="category-name" title="${category}">${category}</span>
                        <span class="amount">${formatCurrency(amount)}</span>
                    </li>`;
            });
        }
    }
}
// window.renderAll = renderDashboard; // 이전 버전 호환성. renderFunctionForTab 권장.

function renderInputTabList() {
  const ul = document.getElementById('inputRecordList');
  if (!ul) return;
  ul.innerHTML = '';
  if (entries.length === 0) {
    ul.innerHTML = '<li class="empty-list-message">최근 입력 내역이 없습니다.</li>';
  } else {
    entries.slice(-10).reverse().forEach(e => {
      ul.innerHTML += `<li class="${e.type.toLowerCase()}">
        <span class="date">${formatDate(e.date)}</span>
        <span class="type ${e.type.toLowerCase()}">${e.type === 'income' ? '수입' : '지출'}</span>
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
      ul.innerHTML += `<li class="${e.type.toLowerCase()}">
        <span class="date">${formatDate(e.date)}</span>
        <span class="type ${e.type.toLowerCase()}">${e.type === 'income' ? '수입' : '지출'}</span>
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

// 고정자산 탭 렌더링 (TODO)
function renderAssetsTab() {
    console.log("Rendering Assets Tab (Not yet implemented)");
    // TODO: 고정자산 목록 표시 및 입력 폼 관련 로직
    // 예: document.getElementById('fixedAssetsList').innerHTML = '...';
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
        case 'taxReport': /* 폼 위주, 별도 렌더링 적음 */ break;
        case 'qna': renderQnaList(); break;
        case 'settings': renderSettings(); break;
        default: console.warn("No render function for tab:", tabId);
    }
}

// ======================= 데이터 저장 함수 =======================
function saveData(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function saveAllData() {
    saveData('bizdash_entries', entries);
    saveData('bizdash_taxEntries', taxEntriesData);
    saveData('bizdash_qnaEntries', qnaEntries);
    saveData('bizdash_fixedAssets', fixedAssets);
}

// ======================= 이벤트 핸들러 및 로직 =======================
function openLoginPopup() { /* 이전과 동일 */ }
function closeLoginPopup() { /* 이전과 동일 */ }
function closeLoginPopupOutside(event) { /* 이전과 동일 */ }
function toggleProfileDropdown() { /* 이전과 동일 */ }
function closeProfileDropdownOutside(event) { /* 이전과 동일 */ }

// 로그인 버튼 (팝업 닫기 버튼)
const closeLoginPopupBtn = document.getElementById('closeLoginPopupBtn');
if (closeLoginPopupBtn) closeLoginPopupBtn.onclick = closeLoginPopup;


function handleAddEntry(event) {
  event.preventDefault();
  const entryData = {
    id: Date.now(),
    date: document.getElementById('inputDate').value,
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
  document.getElementById('inputDate').value = formatDate(new Date(), 'yyyy-mm-dd'); // 날짜 오늘로 초기화
}

function handleFilterTransByPeriod(event) { event.preventDefault(); renderDetailTrans(); }

function exportToCsv(filename, headers, dataRows) { /* 이전과 동일, 개선된 버전 사용 */ }

function handleExportDetailTrans() {
    const fromDate = document.getElementById('transFromDate')?.value;
    const toDate = document.getElementById('transToDate')?.value;
    const filtered = entries.filter(e => 
        (!fromDate || e.date >= fromDate) && (!toDate || e.date <= toDate)
    );
    const headers = ["일자", "구분", "항목", "거래처", "증빙", "금액", "메모"];
    const dataRows = filtered.map(e => [
        e.date, (e.type === "income" ? "수입" : "지출"), e.category, e.counterparty, e.proofType, e.amount, e.memo
    ]);
    exportToCsv(`거래상세내역_${fromDate || '전체'}_${toDate || '전체'}.csv`, headers, dataRows);
}

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
    return alert("날짜, 거래처명, 공급가액, 세액은 필수이며, 금액은 숫자로 입력해야 합니다.");
  }
  taxEntriesData.push(taxEntry);
  saveData('bizdash_taxEntries', taxEntriesData);
  renderTaxList();
  if (document.getElementById('taxDetailTab')?.classList.contains('active')) renderTaxDetail();
  event.target.reset();
}

function handleFilterTaxByPeriod(event) { event.preventDefault(); renderTaxDetail(); }

function handleExportTaxDetail() {
    // ... (이전과 유사하게 구현)
}

const taxReportFormats = { /* ... 이전과 동일 ... */ };
function handleDownloadTaxReport(event) { /* ... 이전과 동일, 개선된 CSV export 사용 ... */ }

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
  qnaEntries.push({ id: Date.now(), title, content, user: userDisplayName, date: new Date().toISOString() });
  saveData('bizdash_qnaEntries', qnaEntries);
  renderQnaList();
  event.target.reset();
}

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
// Google 로그인
function signInWithGoogle() { /* ... 이전과 동일 ... */ }

// Kakao 로그인 (백엔드 연동 필요 설명 포함)
function signInWithKakao() {
  if (!Kakao.isInitialized()) {
    try {
        Kakao.init('YOUR_KAKAO_JAVASCRIPT_KEY'); // ★★★ 실제 카카오 JS 키로 변경 ★★★
        if (!Kakao.isInitialized()) {
            alert("카카오 SDK 초기화에 실패했습니다. API 키를 확인해주세요.");
            return;
        }
    } catch (e) {
        console.error("Kakao SDK init error:", e);
        alert("카카오 SDK 로드 중 오류가 발생했습니다.");
        return;
    }
  }
  Kakao.Auth.login({ /* ... 이전과 동일 (백엔드 연동 부분 명시)... */ });
}

// Naver 로그인 (백엔드 연동 필요 설명 포함)
let naverLoginInstance; // 네이버 로그인 인스턴스 (초기화 후 사용)
function signInWithNaver() {
    if (!naverLoginInstance) {
        alert("네이버 로그인이 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.");
        // 또는 여기서 초기화 시도
        // initializeNaverLogin(); 
        // if (!naverLoginInstance) return;
        return;
    }
    // 네이버 로그인 버튼이 자동으로 생성되므로, 그 버튼을 클릭하게 하거나,
    // naverLoginInstance.authorize() 등을 직접 호출할 수 있는지 네이버 SDK 문서 확인 필요.
    // 보통은 <div id="naverIdLogin_loginButton"></div> 같은 곳에 버튼이 렌더링됨.
    // 이 버튼을 사용자가 직접 클릭하거나, 우리가 만든 커스텀 버튼에서 저 네이버 버튼을 trigger.
    const naverGeneratedButton = document.getElementById("naverIdLogin_loginButton");
    if (naverGeneratedButton) {
        naverGeneratedButton.firstChild.click(); // 네이버 생성 버튼의 실제 링크 클릭
    } else {
        alert("네이버 로그인 버튼을 찾을 수 없습니다. HTML 구조를 확인하거나 SDK 가이드를 참고하세요.");
    }
    // 아래는 네이버 로그인 팝업을 직접 띄우는 방법 (팝업 차단 주의)
    // window.open(naverLoginInstance.generateAuthorizeUrl(), "네이버 로그인", "width=400,height=600");

    // 로그인 성공 후 콜백 URL에서 토큰 처리 및 Firebase Custom Auth 연동 필요
    // (이 부분은 signInWithKakao와 유사한 백엔드 처리 필요)
}

function initializeNaverLogin() {
    try {
        naverLoginInstance = new naver.LoginWithNaverId({
            clientId: "YOUR_NAVER_CLIENT_ID",       // ★★★ 실제 네이버 클라이언트 ID로 변경 ★★★
            callbackUrl: "YOUR_NAVER_CALLBACK_URL", // ★★★ 실제 네이버 콜백 URL로 변경 ★★★
                                                    // 예: window.location.origin + "/naver_callback.html"
            isPopup: false, // 팝업보다는 페이지 리다이렉션 후 토큰 처리 권장
            loginButton: { color: "green", type: 3, height: 1 } // 버튼 숨김 (우리 버튼 사용)
        });
        naverLoginInstance.init();
        console.log("Naver SDK Initialized");

        // 네이버 로그인 상태 및 토큰 처리 (콜백 페이지에서 주로 수행)
        naverLoginInstance.getLoginStatus(function (status) {
            if (status) {
                console.log("Naver logged in");
                const naverAccessToken = naverLoginInstance.getAccessToken();
                console.log("Naver Access Token:", naverAccessToken);
                // TODO: 이 토큰으로 Firebase Custom Auth 진행 (백엔드 필요)
                // getFirebaseCustomTokenFromServer('naver', naverAccessToken).then(...)
            } else {
                console.log("Naver not logged in.");
            }
        });
    } catch (e) {
        console.error("Naver SDK init error:", e);
    }
}


// ======================= DOMContentLoaded - 초기화 및 이벤트 리스너 =======================
document.addEventListener('DOMContentLoaded', function() {
  auth.onAuthStateChanged(user => {
    updateLoginUI(user);
    // 필요시 로그인 상태 변경에 따른 데이터 재로딩 등
    const activeTabLink = document.querySelector('.sidebar a.active');
    if (activeTabLink) {
        const activeTabId = activeTabLink.getAttribute('onclick').match(/showTab\('([^']+)'\)/)[1];
        if (window.renderFunctionForTab) window.renderFunctionForTab(activeTabId);
    } else { // 활성 탭이 없으면 대시보드 강제 로드
        if (window.renderFunctionForTab) window.renderFunctionForTab('dashboard');
    }
  });

  // 기본 날짜 설정
  const todayStr = formatDate(new Date(), 'yyyy-mm-dd');
  if(document.getElementById('inputDate')) document.getElementById('inputDate').value = todayStr;
  const periodDates = getPeriodDates('month'); // 기본 '이번달'
  if(document.getElementById('fromDate')) document.getElementById('fromDate').value = periodDates.start;
  if(document.getElementById('toDate')) document.getElementById('toDate').value = periodDates.end;
  if(document.querySelector('.quick-btn-row button[data-period="month"]')) {
    document.querySelectorAll('.quick-btn-row button').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.quick-btn-row button[data-period="month"]').classList.add('active');
  }


  // SDK 초기화
  try {
    Kakao.init('YOUR_KAKAO_JAVASCRIPT_KEY'); // ★★★ 실제 카카오 JS 키로 변경 ★★★
    if (!Kakao.isInitialized()) console.warn("Kakao SDK 초기화 실패. API 키를 확인하세요.");
    else console.log("Kakao SDK Initialized from DOMContentLoaded");
  } catch (e) { console.error("Kakao SDK init error in DOMContentLoaded:", e); }
  
  initializeNaverLogin(); // 네이버 로그인 초기화

  // 이벤트 리스너 바인딩
  const userAvatar = document.getElementById('userAvatar');
  if (userAvatar) userAvatar.onclick = toggleProfileDropdown;
  
  const loginMainBtn = document.getElementById('loginMainBtn');
  if (loginMainBtn) loginMainBtn.onclick = openLoginPopup;

  document.getElementById('googleLoginBtn')?.addEventListener('click', signInWithGoogle);
  document.getElementById('kakaoLoginBtn')?.addEventListener('click', signInWithKakao);
  document.getElementById('naverLoginBtn')?.addEventListener('click', signInWithNaver); // signInWithNaver가 직접 팝업을 띄우거나, 네이버 생성 버튼을 클릭하도록 수정 필요
  
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

  // 초기 탭 로드 및 렌더링은 index.html의 인라인 스크립트에서 showTab() 호출로 처리
  // 해당 showTab() 내에서 renderFunctionForTab() 호출
});
