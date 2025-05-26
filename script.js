// BizDash - script.js (최종 수정 제안)

// ======================= Firebase 설정 =======================
const firebaseConfig = {  
  apiKey: "AIzaSyBYAUvi4e6ZTwjkwTgbBKWmIMXG7mK_Wt8", // ← ★★★ 여기 ★★★
  authDomain: "실제_Auth_도메인으로_교체",
  projectId: "실제_프로젝트_ID로_교체",
  storageBucket: "실제_스토리지_버킷으로_교체",
  messagingSenderId: "실제_메시징_SENDER_ID로_교체",
  appId: "실제_앱_ID로_교체",
  measurementId: "실제_측정_ID로_교체" // Optional};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// ======================= 전역 변수 및 상태 =======================
let entries = JSON.parse(localStorage.getItem('bizdash_entries') || "[]");
let taxEntriesData = JSON.parse(localStorage.getItem('bizdash_taxEntries') || "[]");
let qnaEntries = JSON.parse(localStorage.getItem('bizdash_qnaEntries') || "[]");
let fixedAssets = JSON.parse(localStorage.getItem('bizdash_fixedAssets') || "[]");
let currentChartInstance = null;

// ======================= 유틸리티 함수 =======================
function formatDate(dateInput, format = 'yyyy-mm-dd') { /* 이전과 동일 */ }
function formatCurrency(amount) { /* 이전과 동일 */ }

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
function updateLoginUI(user) { /* ... 이전과 동일 ... */ }

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
            // 대시보드에서는 더 간결하게, 최근 3-4개만 표시
            filteredEntries.slice(-4).reverse().forEach(e => {
                recentListUl.innerHTML += `
                    <li class="dashboard-recent-item">
                        <span class="item-date">${formatDate(e.date, 'mm.dd')}</span>
                        <span class="item-category" title="${e.category || ''}">${e.category || '미분류'}</span>
                        <span class="item-amount ${e.type.toLowerCase()}">${e.type === 'income' ? '+' : '-'}${formatCurrency(e.amount).replace('₩','')}</span>
                    </li>`;
            });
        }
    }

    const chartCanvas = document.getElementById('trendChart');
    if (chartCanvas) {
        if (currentChartInstance) currentChartInstance.destroy();
        // TODO: 차트 데이터는 주별/월별 집계 등으로 가공하여 더 의미있게 표시
        const chartLabels = filteredEntries.length > 0 ? filteredEntries.map(e => formatDate(e.date, 'mm.dd')).slice(-15) : ['데이터 없음'];
        const profitData = []; // 예시: 일별 또는 기간별 순이익 데이터 계산
        // ... (데이터 가공 로직) ...
        currentChartInstance = new Chart(chartCanvas.getContext('2d'), {
            type: 'line', // 또는 bar
            data: {
                labels: chartLabels, // 가공된 라벨
                datasets: [
                    { label: '순이익 추이', data: profitData.length > 0 ? profitData : [0], borderColor: 'var(--profit-color)', backgroundColor: 'rgba(0,122,255,0.1)', tension: 0.2, fill: true }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false } }, legend: { display: false }, tooltips: { mode: 'index', intersect: false } }
        });
    }

    // TODO: 전년 동기 대비 로직 (데이터 필요)
    document.getElementById('prevPeriodIncome').textContent = formatCurrency(0);
    // ... (나머지 비교 패널 업데이트)

    const bestExpenseItemsListUl = document.getElementById('bestExpenseItemsList');
    if (bestExpenseItemsListUl) {
        bestExpenseItemsListUl.innerHTML = '';
        const expenseCategories = {};
        filteredEntries.filter(e => e.type === 'expense').forEach(e => {
            const category = e.category || '기타 비용';
            expenseCategories[category] = (expenseCategories[category] || 0) + e.amount;
        });
        const sortedExpenses = Object.entries(expenseCategories).sort(([,a],[,b]) => b-a).slice(0,3); // Top 3
        
        if (sortedExpenses.length === 0) {
             bestExpenseItemsListUl.innerHTML = '<li class="empty-list-message">주요 지출 항목이 없습니다.</li>';
        } else {
            sortedExpenses.forEach(([category, amount]) => {
                bestExpenseItemsListUl.innerHTML += `
                    <li class="best-item">
                        <span class="category-name" title="${category}">${category}</span>
                        <span class="amount">${formatCurrency(amount)}</span>
                    </li>`;
            });
        }
    }
}

function renderInputTabList() { /* ... 이전과 동일하게 최근 10건 표시 ... */ }
function summarizeTransactions(transactionArray) { /* ... 이전과 동일 ... */ }
function renderDetailTrans() { /* ... 이전과 동일, HTML 클래스명에 맞게 li 내부 span 클래스 조정 ... */ }
function renderTaxList() { /* ... 이전과 동일 ... */ }
function summarizeTaxEntries(taxArray) { /* ... 이전과 동일 ... */ }
function renderTaxDetail() { /* ... 이전과 동일, HTML 클래스명에 맞게 li 내부 span 클래스 조정 ... */ }

function renderAssetsTab() {
    console.log("Rendering Assets Tab...");
    // TODO: 고정자산 목록(fixedAssets)을 #assetsList 같은 곳에 표시
    // TODO: 고정자산 추가/수정 폼 로직
    const assetsContent = document.querySelector("#assetsTab .card"); // 예시 선택자
    if (assetsContent) {
        if (fixedAssets.length === 0) {
            assetsContent.innerHTML = '<p>등록된 고정자산이 없습니다. 새로 추가해주세요.</p> ';
        } else {
            // fixedAssets 배열을 사용하여 목록 테이블 또는 리스트 생성
            assetsContent.innerHTML = `<p>총 ${fixedAssets.length}개의 고정자산이 있습니다. (목록 UI 개발 필요)</p>`;
        }
    }
}

function renderQnaList() { /* ... 이전과 동일 ... */ }
function renderSettings() {
    console.log("Rendering Settings Tab...");
    // 현재는 HTML에 정적으로 내용이 있지만, JS로 동적 업데이트가 필요하면 여기서 처리
    // 예: 사용자 설정값 불러오기 등
}

window.renderFunctionForTab = function(tabId) { /* ... 'assets': renderAssetsTab 추가 ... */
    console.log(`Rendering tab specific content for: ${tabId}`);
    switch(tabId) {
        case 'dashboard': renderDashboard(); break;
        case 'input': renderInputTabList(); break;
        case 'detailTrans': renderDetailTrans(); break;
        case 'tax': renderTaxList(); break;
        case 'taxDetail': renderTaxDetail(); break;
        case 'assets': renderAssetsTab(); break; // 추가
        case 'taxReport': break;
        case 'qna': renderQnaList(); break;
        case 'settings': renderSettings(); break;
        default: console.warn("No render function for tab:", tabId);
    }
};

function saveData(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
// function saveAllData() { ... } // 필요시 모든 데이터 저장 함수

// 이벤트 핸들러들 (handleAddEntry는 HTML의 새 필드명 반영)
function handleAddEntry(event) {
  event.preventDefault();
  const entryData = {
    id: Date.now(),
    date: document.getElementById('inputDate').value, // HTML id와 일치
    type: document.getElementById('inputType').value,
    amount: Number(document.getElementById('inputAmount').value),
    category: document.getElementById('inputCategory').value.trim(),
    counterparty: document.getElementById('inputCounterparty').value.trim(),
    proofType: document.getElementById('inputProofType').value,
    memo: document.getElementById('inputMemo').value.trim()
  };
  // ... (유효성 검사 및 저장 로직 이전과 동일) ...
  if (!entryData.date || !entryData.amount) return alert("거래일자와 금액은 필수 항목입니다.");
  if (isNaN(entryData.amount)) return alert("금액은 숫자로 입력해야 합니다.");

  entries.push(entryData);
  saveData('bizdash_entries', entries);
  renderInputTabList();
  if (document.getElementById('dashboardTab')?.classList.contains('active')) renderDashboard();
  event.target.reset();
  document.getElementById('inputDate').value = formatDate(new Date(), 'yyyy-mm-dd');
}
// ... (다른 핸들러 함수들 이전과 유사하게 유지 또는 필요시 수정) ...
function handleFilterTransByPeriod(event) { event.preventDefault(); renderDetailTrans(); }
function exportToCsv(filename, headers, dataRows) { /* ... 이전과 동일 ... */ }
function handleExportDetailTrans() { /* ... 이전과 동일 ... */ }
function handleAddTaxEntry(event) { /* ... 이전과 동일 ... */ }
function handleFilterTaxByPeriod(event) { event.preventDefault(); renderTaxDetail(); }
function handleExportTaxDetail() { /* ... 이전과 동일 ... */ }
const taxReportFormats = { /* ... 이전과 동일 ... */ };
function handleDownloadTaxReport(event) { /* ... 이전과 동일 ... */ }
function handleAddQna(event) { /* ... 이전과 동일 ... */ }
function handleToggleBizTypeInput(selectElement) { /* ... 이전과 동일 ... */ }
function handleQuickPeriodFilter(event) { /* ... 이전과 동일 ... */ }


// Firebase Social Login Functions (Google, Kakao, Naver - 이전 설명과 주의사항 동일)
function signInWithGoogle() { /* ... 이전과 동일 ... */ }
function signInWithKakao() { /* ... 이전과 동일 (API 키 및 백엔드 연동 TODO 명시) ... */ }
let naverLoginInstance;
function signInWithNaver() { /* ... 이전과 동일 (API 키, 콜백 URL 및 백엔드 연동 TODO 명시) ... */ }
function initializeNaverLogin() { /* ... 이전과 동일 (API 키, 콜백 URL TODO 명시) ... */ }


// DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
  auth.onAuthStateChanged(user => { /* ... 이전과 동일 ... */ });

  // 기본 날짜 설정 (대시보드 및 입력폼)
  const todayStr = formatDate(new Date(), 'yyyy-mm-dd');
  const initialPeriod = getPeriodDates('month'); // 초기 '이번달'

  const fromDateEl = document.getElementById('fromDate');
  if (fromDateEl) fromDateEl.value = initialPeriod.start;
  const toDateEl = document.getElementById('toDate');
  if (toDateEl) toDateEl.value = initialPeriod.end;
  
  const inputDateEl = document.getElementById('inputDate'); // 거래입력 탭의 날짜 필드 ID 확인
  if (inputDateEl) inputDateEl.value = todayStr;

  document.querySelectorAll('.quick-btn-row button').forEach(btn => {
      if (btn.dataset.period === 'month') btn.classList.add('active');
      else btn.classList.remove('active');
  });
  
  // SDK 초기화 (API 키 입력 필수!)
  try {
    // Kakao.init('YOUR_KAKAO_JAVASCRIPT_KEY'); // ★★★ 실제 카카오 JS 키로 변경 ★★★
    // if (!Kakao.isInitialized()) console.warn("Kakao SDK 초기화 실패.");
    // else console.log("Kakao SDK Initialized.");
  } catch (e) { console.error("Kakao SDK init error:", e); }
  // initializeNaverLogin(); // 네이버 로그인은 필요시 호출 또는 특정 페이지에서만 초기화

  // 이벤트 리스너 (이전과 동일, ID 변경된 것 확인)
  // ... (모든 addEventListener 호출 확인 및 필요한 경우 ID 업데이트) ...
  document.getElementById('userAvatar')?.addEventListener('click', toggleProfileDropdown);
  document.getElementById('loginMainBtn')?.addEventListener('click', openLoginPopup);
  document.getElementById('googleLoginBtn')?.addEventListener('click', signInWithGoogle);
  document.getElementById('kakaoLoginBtn')?.addEventListener('click', signInWithKakao);
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

  // 초기 탭 로드 (index.html의 인라인 스크립트에서 처리)
});
