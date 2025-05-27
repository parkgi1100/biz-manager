// BizDash - script.js (최종 종합 코드)

// ======================= Firebase 설정 =======================
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY", // ★★★ 실제 API 키로 변경하세요! ★★★
  authDomain: "YOUR_ACTUAL_AUTH_DOMAIN",
  projectId: "YOUR_ACTUAL_PROJECT_ID",
  storageBucket: "YOUR_ACTUAL_STORAGE_BUCKET",
  messagingSenderId: "YOUR_ACTUAL_MESSAGING_SENDER_ID",
  appId: "YOUR_ACTUAL_APP_ID",
  measurementId: "YOUR_ACTUAL_MEASUREMENT_ID" // Optional
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// ======================= 전역 변수 및 상태 =======================
let entries = JSON.parse(localStorage.getItem('bizdash_entries') || "[]");
let taxEntriesData = JSON.parse(localStorage.getItem('bizdash_taxEntries') || "[]");
let qnaEntries = JSON.parse(localStorage.getItem('bizdash_qnaEntries') || "[]");
let fixedAssets = JSON.parse(localStorage.getItem('bizdash_fixedAssets') || "[]");
let currentChartInstance = null;
let naverLoginInstance;

// ======================= 유틸리티 함수 =======================
function formatDate(dateInput, format = 'yyyy-mm-dd') {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return ''; // 유효하지 않은 날짜 입력 처리
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
    console.log("Rendering Dashboard...");
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
        const monthlyData = {};
        filteredEntries.forEach(e => {
            const monthKey = e.date.substring(0, 7);
            if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expense: 0 };
            if (String(e.type).toLowerCase() === 'income') monthlyData[monthKey].income += e.amount;
            else if (String(e.type).toLowerCase() === 'expense') monthlyData[monthKey].expense += e.amount;
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
    }

    // 전년 동기 대비는 제거되었으므로 관련 DOM 업데이트 코드도 제거
    // document.getElementById('prevPeriodIncome').textContent = formatCurrency(0); 
    // ...

    // 주요 수익 항목 (Top 3)
    const topIncomeItemsListUl = document.getElementById('topIncomeItemsList');
    if (topIncomeItemsListUl) {
        topIncomeItemsListUl.innerHTML = '';
        const incomeCategories = {};
        filteredEntries.filter(e => String(e.type).toLowerCase() === 'income').forEach(e => {
            const category = e.category || '기타 수입';
            incomeCategories[category] = (incomeCategories[category] || 0) + e.amount;
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
    
    // 주요 지출 항목 (Top 3)
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

function renderInputTabList() { /* ... 이전과 동일 ... */ }
function summarizeTransactions(transactionArray) { /* ... 이전과 동일 ... */ }
function renderDetailTrans() { /* ... 이전과 동일 ... */ }
function renderTaxList() { /* ... 이전과 동일 ... */ }
function summarizeTaxEntries(taxArray) { /* ... 이전과 동일 ... */ }
function renderTaxDetail() { /* ... 이전과 동일 ... */ }
function renderAssetsTab() { /* ... 이전과 동일 ... */ }
function renderQnaList() { /* ... 이전과 동일 ... */ }
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
  // document.addEventListener('mousedown', closeLoginPopupOutside); // 팝업 자체에 닫기 버튼 있으므로 외부 클릭은 일단 보류
}
function closeLoginPopup() {
  const popup = document.getElementById('loginPopup');
  if (popup) popup.classList.remove('show');
  // document.removeEventListener('mousedown', closeLoginPopupOutside);
}
// function closeLoginPopupOutside(event) { ... } // 일단 보류

function toggleProfileDropdown() {
  const drop = document.getElementById('profileDropdown');
  if (!drop) return;
  const isShown = drop.classList.toggle('show');
  if (isShown) document.addEventListener('click', closeProfileDropdownOutside, true); // 캡처링 단계에서 처리
  else document.removeEventListener('click', closeProfileDropdownOutside, true);
}

function closeProfileDropdownOutside(event) {
  const profileMenuDiv = document.getElementById('profileMenu');
  const drop = document.getElementById('profileDropdown');
  if (drop && drop.classList.contains('show') && !profileMenuDiv.contains(event.target)) {
    drop.classList.remove('show');
    document.removeEventListener('click', closeProfileDropdownOutside, true);
  }
}

const closeLoginPopupBtn = document.getElementById('closeLoginPopupBtn');
if (closeLoginPopupBtn) closeLoginPopupBtn.onclick = closeLoginPopup;

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
function handleFilterTaxByPeriod(event) { event.preventDefault(); renderTaxDetail(); }

function handleExportTaxDetail() {
    const fromDate = document.getElementById('taxFromDate')?.value;
    const toDate = document.getElementById('taxToDate')?.value;
    const filtered = taxEntriesData.filter(e => (!fromDate || e.date >= fromDate) && (!toDate || e.date <= toDate));
    const headers = ["일자", "거래처명", "공급가액", "세액", "메모"];
    const dataRows = filtered.map(e => [e.date, e.company, e.supplyAmount, e.taxAmount, e.taxMemo]);
    exportToCsv(`세금계산서상세_${fromDate || '전체'}_${toDate || '전체'}.csv`, headers, dataRows);
}

const NTS_EXPENSE_CATEGORIES = { /* ... 이전과 동일 ... */ };
function mapToNtsExpenseCategory(userCategory) { /* ... 이전과 동일 ... */ }
function handleDownloadTaxReport(event) { /* ... 이전 답변의 수정된 '간편장부 소득금액계산서' 양식에 맞춘 CSV 생성 로직 ... */ }

function handleAddQna(event) { /* ... 이전과 동일 ... */ }
function handleToggleBizTypeInput(selectElement) { /* ... 이전과 동일 ... */ }
function handleQuickPeriodFilter(event) { /* ... 이전과 동일 ... */ }

// ======================= Firebase Social Login Functions =======================
function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then((result) => { console.log("Google 로그인 성공:", result.user); closeLoginPopup(); })
    .catch((error) => { console.error("Google 로그인 오류:", error); alert(`Google 로그인 실패: ${error.message}. Firebase 콘솔에서 Google 로그인을 활성화했는지 확인하세요.`); });
}

// 카카오 로그인 함수 제거

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

// script.js (수정된 initializeNaverLogin 함수)

let naverLoginInstance; // naverLoginInstance를 함수 외부에서도 접근 가능하도록 선언 (이미 되어 있다면 유지)

function initializeNaverLogin() {
    try {
        if (typeof naver !== "undefined" && typeof naver.LoginWithNaverId !== "undefined") {
            naverLoginInstance = new naver.LoginWithNaverId({
                clientId: "hyIyx5ajznMculp0VBZO", // 사용자님 Client ID
                callbackUrl: "https://parkgi1100.github.io/biz-manager/", // 사용자님 콜백 URL
                isPopup: false, 
            });
            naverLoginInstance.init();
            console.log("Naver Login SDK Initialized with Client ID:", "hyIyx5ajznMculp0VBZO", "and Callback URL:", "https://parkgi1100.github.io/biz-manager/");

            naverLoginInstance.getLoginStatus(function (status) {
                if (status) {
                    console.log("Naver user is logged in (from getLoginStatus).");
                    // const naverUser = naverLoginInstance.user;
                    // const userEmail = naverUser.getEmail(); // 필요시 사용
                    
                    if (naverLoginInstance.accessToken && naverLoginInstance.accessToken.accessToken) {
                        const naverAccessToken = naverLoginInstance.accessToken.accessToken;
                        console.log("Naver Access Token (from instance):", naverAccessToken);
                        
                        // ▼▼▼ 여기에 백엔드(Cloud Function) 호출 코드를 붙여넣습니다! ▼▼▼
                        console.log("Sending Naver Access Token to backend for Firebase custom token...");
                        
                        // 중요: 'YOUR_CLOUD_FUNCTION_URL'은 다음 단계에서 만들 Cloud Function의 실제 URL로 바꿔야 합니다.
                        // (Firebase SDK의 functions().httpsCallable()을 사용하는 것이 더 권장되지만, 우선 fetch로 설명드립니다.)
                        fetch('YOUR_CLOUD_FUNCTION_URL_HERE/createFirebaseTokenWithNaver', { 
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ token: naverAccessToken }), // 네이버 액세스 토큰 전송
                        })
                        .then(response => {
                            if (!response.ok) { // HTTP 상태 코드가 200-299 범위가 아닐 때
                                return response.json().then(errData => {
                                    // 서버에서 JSON 형태의 에러 메시지를 보냈을 경우
                                    throw new Error(errData.error || `서버 응답 오류: ${response.status}`);
                                });
                            }
                            return response.json();
                        })
                        .then(data => {
                            if (data.firebaseToken) {
                                console.log("Received Firebase Custom Token:", data.firebaseToken);
                                // 백엔드로부터 Firebase Custom Token을 받음
                                auth.signInWithCustomToken(data.firebaseToken)
                                    .then((userCredential) => {
                                        // Firebase에 최종 로그인 성공!
                                        console.log("Firebase Naver Custom Login 성공:", userCredential.user);
                                        closeLoginPopup(); // 로그인 팝업 닫기
                                        // auth.onAuthStateChanged 리스너가 UI를 업데이트할 것입니다.
                                    })
                                    .catch((error) => {
                                        console.error("Firebase Custom Login Error (signInWithCustomToken):", error);
                                        alert(`Firebase 로그인에 실패했습니다: ${error.message}`);
                                    });
                            } else {
                                console.error("Firebase Custom Token was not received:", data.error || '알 수 없는 응답 오류');
                                alert(`Firebase 토큰 발급에 실패했습니다: ${data.error || '알 수 없는 응답 오류'}`);
                            }
                        })
                        .catch((error) => {
                            console.error("Error calling Cloud Function or processing response:", error);
                            alert(`서버 통신 중 오류가 발생했습니다: ${error.message}`);
                        });
                        // ▲▲▲ 여기까지 백엔드(Cloud Function) 호출 코드입니다. ▲▲▲

                    } else {
                        console.warn("Naver Access Token not found in instance. Check callback handling or if this is the callback redirect.");
                    }
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

// ... (파일 하단 다른 코드들은 그대로) ...
// ======================= DOMContentLoaded - 초기화 및 이벤트 리스너 =======================
document.addEventListener('DOMContentLoaded', function() {
  // 사이드바 토글 로직 (인라인 스크립트에서 이전)
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const toggleBtn = document.getElementById('toggleBtn');

  if (toggleBtn) {
    toggleBtn.onclick = () => {
      sidebar.classList.toggle('show');
      overlay.classList.toggle('show');
      // 데스크탑 화면에서 body에 클래스를 토글하여 콘텐츠 이동 제어
      if (window.innerWidth >= 600) { // CSS 미디어쿼리 조건과 일치
          document.body.classList.toggle('sidebar-open');
      }
    };
  }
  if (overlay) {
    overlay.onclick = () => {
      sidebar.classList.remove('show');
      overlay.classList.remove('show');
      if (window.innerWidth >= 600) {
          document.body.classList.remove('sidebar-open');
      }
    };
  }
  
  // 탭 전환 로직 (인라인 스크립트에서 이전)
  window.showTab = function(tabId) { // 전역 함수로 만들어 HTML onclick에서 호출 가능하게 함
      document.querySelectorAll('.tab').forEach(tabElement => tabElement.classList.remove('active'));
      document.querySelectorAll('.sidebar a').forEach(linkElement => linkElement.classList.remove('active'));

      const activeTab = document.getElementById(tabId + 'Tab');
      if (activeTab) activeTab.classList.add('active');

      const activeLink = document.querySelector(`.sidebar a[href="#${tabId}"]`);
      if (activeLink) activeLink.classList.add('active');
      
      if (sidebar && sidebar.classList.contains('show') && window.innerWidth < 768) {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
        document.body.classList.remove('sidebar-open'); // 모바일에서는 항상 제거
      }

      if (typeof window.renderFunctionForTab === 'function') {
        window.renderFunctionForTab(tabId);
      }
      const mainContentArea = document.getElementById('mainContentArea');
      if(mainContentArea) mainContentArea.scrollTop = 0;
      // window.scrollTo(0,0); // 페이지 전체 스크롤은 불필요할 수 있음
  }
  
  // 초기 탭 설정 및 해시 변경 리스너 (인라인 스크립트에서 이전)
  const initialTab = window.location.hash ? window.location.hash.substring(1) : 'dashboard';
  const validTabs = ['dashboard', 'input', 'detailTrans', 'tax', 'taxDetail', 'assets', 'taxReport', 'qna', 'settings'];
  if (validTabs.includes(initialTab)) {
      showTab(initialTab);
  } else {
      showTab('dashboard');
  }
  document.querySelectorAll('.sidebar a').forEach(link => {
      link.addEventListener('click', function(e) {
           const tabName = this.getAttribute('href').substring(1);
           // showTab은 onclick에서 이미 호출되므로, 해시만 변경 (중복 호출 방지)
           if (tabName && window.location.hash !== `#${tabName}`) {
              window.location.hash = tabName;
           }
      });
  });
  window.addEventListener('hashchange', () => {
      const hashTab = window.location.hash.substring(1);
      const currentActiveLink = document.querySelector('.sidebar a.active');
      const currentActiveTabId = currentActiveLink ? currentActiveLink.getAttribute('href').substring(1) : null;
      if (validTabs.includes(hashTab) && hashTab !== currentActiveTabId) {
          showTab(hashTab);
      } else if (window.location.hash === '' || window.location.hash === '#') {
          if (currentActiveTabId !== 'dashboard') showTab('dashboard');
      }
  }, false);


  // --- 나머지 기존 DOMContentLoaded 내용 ---
  auth.onAuthStateChanged(user => {
    updateLoginUI(user);
    const activeTabLinkAfterAuth = document.querySelector('.sidebar a.active');
    let activeTabIdAfterAuth = 'dashboard'; 
    if (activeTabLinkAfterAuth) {
        const href = activeTabLinkAfterAuth.getAttribute('href');
        if(href) activeTabIdAfterAuth = href.substring(1);
    }
    const hashTabAfterAuth = window.location.hash ? window.location.hash.substring(1) : null;
    if (hashTabAfterAuth && validTabs.includes(hashTabAfterAuth)) {
        activeTabIdAfterAuth = hashTabAfterAuth;
    }
    if (window.renderFunctionForTab) {
        window.renderFunctionForTab(activeTabIdAfterAuth);
    }
  });

  const todayStr = formatDate(new Date(), 'yyyy-mm-dd');
  const initialPeriod = getPeriodDates('month');
  const fromDateEl = document.getElementById('fromDate');
  if (fromDateEl) fromDateEl.value = initialPeriod.start;
  const toDateEl = document.getElementById('toDate');
  if (toDateEl) toDateEl.value = initialPeriod.end;
  
  const inputDateHtmlEl = document.getElementById('inputDateHtml');
  if (inputDateHtmlEl) inputDateHtmlEl.value = todayStr;

  document.querySelectorAll('.quick-btn-row button').forEach(btn => {
      if (btn.dataset.period === 'month') btn.classList.add('active');
      else btn.classList.remove('active');
  });
    
  initializeNaverLogin(); // 네이버 로그인 초기화

  document.getElementById('userAvatar')?.addEventListener('click', toggleProfileDropdown);
  document.getElementById('loginMainBtn')?.addEventListener('click', openLoginPopup);
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
});
