// BizDash - script.js (카카오 제거, 날짜 ID 수정 반영)

// ======================= Firebase 설정 =======================
const firebaseConfig = {
  apiKey: "AIzaSyDIW89Y0Z5JPG4dBjoIDAofgy4XlAmQ7Jw", // 실제 키로 사용 중이신 것으로 보입니다. 보안에 유의하세요.
  authDomain: "bizdash-7c6fd.firebaseapp.com",
  projectId: "bizdash-7c6fd",
  storageBucket: "bizdash-7c6fd.firebasestorage.app",
  messagingSenderId: "765405833459",
  appId: "1:765405833459:web:750f2189c77ac0353c2f86",
  measurementId: "G-W31FKJJSSG"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const functions = firebase.app().functions('asia-northeast3'); // Firebase Functions 초기화

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
    // (이전 답변의 최종 제안 코드와 동일하게 유지 - 너무 길어서 생략)
    // 주요 변경점: 월별 수입/지출 차트, 주요 수익/지출 Top3 표시, 전년 동기 대비 제거
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
    if (topIncomeItemsListUl) { /* ... (주요 수익 항목 로직) ... */ }
    const bestExpenseItemsListUl = document.getElementById('bestExpenseItemsList');
    if (bestExpenseItemsListUl) { /* ... (주요 지출 항목 로직) ... */ }
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
        case 'taxReport': break; // 폼 위주
        case 'qna': renderQnaList(); break;
        case 'settings': renderSettings(); break;
        default: console.warn("No render function for tab:", tabId);
    }
};

function saveData(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

function openLoginPopup() {
  const popup = document.getElementById('loginPopup');
  if (popup) popup.classList.add('show');
}
function closeLoginPopup() {
  const popup = document.getElementById('loginPopup');
  if (popup) popup.classList.remove('show');
}

function toggleProfileDropdown() {
  const drop = document.getElementById('profileDropdown');
  if (!drop) return;
  const isShown = drop.classList.toggle('show');
  if (isShown) document.addEventListener('click', closeProfileDropdownOutside, true);
  else document.removeEventListener('click', closeProfileDropdownOutside, true);
}

function closeProfileDropdownOutside(event) {
  const profileMenuDiv = document.getElementById('profileMenu');
  const drop = document.getElementById('profileDropdown');
  // 클릭된 요소가 프로필 메뉴 자신이거나 그 자식 요소가 아니고, 현재 드롭다운이 열려있다면 닫음
  if (drop && drop.classList.contains('show') && profileMenuDiv && !profileMenuDiv.contains(event.target)) {
    drop.classList.remove('show');
    document.removeEventListener('click', closeProfileDropdownOutside, true);
  }
}

function handleAddEntry(event) {
  event.preventDefault();
  const entryData = {
    id: Date.now(),
    date: document.getElementById('inputDateHtml').value, // ★★★ ID 수정 ★★★
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
  const inputDateElem = document.getElementById('inputDateHtml'); // ★★★ ID 수정 ★★★
  if(inputDateElem) inputDateElem.value = formatDate(new Date(), 'yyyy-mm-dd');
}

function handleFilterTransByPeriod(event) { event.preventDefault(); renderDetailTrans(); }
function exportToCsv(filename, headers, dataRows) { /* ... 이전과 동일 ... */ }
function handleExportDetailTrans() { /* ... 이전과 동일 ... */ }
function handleAddTaxEntry(event) { /* ... 이전과 동일 (taxDate ID 사용) ... */ }
function handleFilterTaxByPeriod(event) { event.preventDefault(); renderTaxDetail(); }
function handleExportTaxDetail() { /* ... 이전과 동일 ... */ }

const NTS_EXPENSE_CATEGORIES = { /* ... 이전과 동일 ... */ };
function mapToNtsExpenseCategory(userCategory) { /* ... 이전과 동일 ... */ }
function handleDownloadTaxReport(event) { /* ... 이전과 동일 ('간편장부 소득금액계산서' CSV 생성) ... */ }

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

// 카카오 로그인 함수 및 관련 호출은 모두 제거됨

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
                // loginButton: {color: "green", type: 3, height: 40} // 직접 만든 버튼 사용하므로 제거
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
                                closeLoginPopup();
                            })
                            .catch((error) => {
                                console.error("Error calling Cloud Function or signing in with custom token:", error);
                                alert(`네이버를 통한 Firebase 로그인 중 오류 발생: ${error.message}`);
                            });
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

  if (toggleBtn) {
    toggleBtn.onclick = () => {
      sidebar.classList.toggle('show');
      overlay.classList.toggle('show');
      if (window.innerWidth >= 600) {
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
  
  // 탭 전환 함수 (전역으로 노출)
  window.showTab = function(tabId) {
      const mainContentArea = document.getElementById('mainContentArea');
      document.querySelectorAll('.tab').forEach(tabElement => tabElement.classList.remove('active'));
      document.querySelectorAll('.sidebar a').forEach(linkElement => linkElement.classList.remove('active'));

      const activeTab = document.getElementById(tabId + 'Tab');
      if (activeTab) activeTab.classList.add('active');

      const activeLink = document.querySelector(`.sidebar a[href="#${tabId}"]`);
      if (activeLink) activeLink.classList.add('active');
      
      if (sidebar && sidebar.classList.contains('show') && window.innerWidth < 768) {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
        document.body.classList.remove('sidebar-open');
      }

      if (typeof window.renderFunctionForTab === 'function') {
        window.renderFunctionForTab(tabId);
      }
      if(mainContentArea) mainContentArea.scrollTop = 0;
  }
  
  const validTabs = ['dashboard', 'input', 'detailTrans', 'tax', 'taxDetail', 'assets', 'taxReport', 'qna', 'settings'];
  
  function handleInitialTabAndHash() {
    const currentHash = window.location.hash;
    if (currentHash.includes("access_token=") && (currentHash.includes("token_type=bearer") || currentHash.includes("state="))) {
        console.log("script.js (DOMContentLoaded): Naver login callback hash detected. Allowing Naver SDK to process.");
        // Naver SDK가 처리하도록 여기서 탭 변경 안 함
    } else {
        const initialTab = currentHash ? currentHash.substring(1) : 'dashboard';
        if (validTabs.includes(initialTab)) {
            window.showTab(initialTab);
        } else {
            window.showTab('dashboard');
            if(window.location.hash && window.location.hash !== '#dashboard' && !currentHash.includes("access_token=")) {
               // window.location.hash = '#dashboard'; // 직접 변경보다는 showTab 내부에서 처리
            }
        }
    }
  }

  window.addEventListener('hashchange', () => {
    const newHash = window.location.hash;
    if (newHash.includes("access_token=") && (newHash.includes("token_type=bearer") || newHash.includes("state="))) {
        console.log("script.js (hashchange): Hash changed to Naver callback, SDK should handle.");
        return; 
    }
    const hashTab = newHash ? newHash.substring(1) : 'dashboard';
    const currentActiveLink = document.querySelector('.sidebar a.active');
    const currentActiveTabId = currentActiveLink ? currentActiveLink.getAttribute('href').substring(1) : null;

    if (validTabs.includes(hashTab)) {
        if (hashTab !== currentActiveTabId) window.showTab(hashTab);
    } else if (newHash === '' || newHash === '#') {
        if (currentActiveTabId !== 'dashboard') window.showTab('dashboard');
    }
  }, false);

  // --- 나머지 DOMContentLoaded 내용 ---
  auth.onAuthStateChanged(user => {
    updateLoginUI(user);
    // 로그인 상태 변경 시, 현재 해시 또는 기본 탭으로 콘텐츠 다시 로드
    handleInitialTabAndHash(); // 현재 해시 기반으로 탭 콘텐츠를 다시 로드/렌더링
  });

  const todayStr = formatDate(new Date(), 'yyyy-mm-dd');
  const initialPeriod = getPeriodDates('month');
  const fromDateEl = document.getElementById('fromDate');
  if (fromDateEl) fromDateEl.value = initialPeriod.start;
  const toDateEl = document.getElementById('toDate');
  if (toDateEl) toDateEl.value = initialPeriod.end;
  
  const inputDateHtmlEl = document.getElementById('inputDateHtml'); // ★★★ ID 수정됨 ★★★
  if (inputDateHtmlEl) inputDateHtmlEl.value = todayStr;

  document.querySelectorAll('.quick-btn-row button').forEach(btn => {
      if (btn.dataset.period === 'month') btn.classList.add('active');
      else btn.classList.remove('active');
  });
    
  initializeNaverLogin(); // 네이버 로그인 초기화

  // 이벤트 리스너들
  document.getElementById('userAvatar')?.addEventListener('click', toggleProfileDropdown);
  document.getElementById('loginMainBtn')?.addEventListener('click', openLoginPopup);
  const closePopupBtn = document.getElementById('closeLoginPopupBtn'); // 이미 위에서 const로 선언했으면 여기서 재선언 불필요
  if (closePopupBtn) closePopupBtn.onclick = closeLoginPopup; // onclick 중복될 수 있으니 addEventListener 권장
  
  document.getElementById('googleLoginBtn')?.addEventListener('click', signInWithGoogle);
  document.getElementById('naverLoginBtn')?.addEventListener('click', signInWithNaver);
  // 카카오 로그인 버튼 리스너는 제거됨
  
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

  // 마지막으로 초기 탭 로드
  handleInitialTabAndHash();
});
