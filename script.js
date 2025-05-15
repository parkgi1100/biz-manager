// script.js
const dateInput = document.getElementById("date");
const categoryInput = document.getElementById("category");
const amountInput = document.getElementById("amount");
const typeSelect = document.getElementById("type");
const memoInput = document.getElementById("memo");
const recordList = document.getElementById("recordList");

let records = JSON.parse(localStorage.getItem("records")) || [];

function saveRecords() {
localStorage.setItem("records", JSON.stringify(records));
}

function addEntry() {
const date = dateInput.value;
const category = categoryInput.value;
const amount = parseInt(amountInput.value);
const type = typeSelect.value;
const memo = memoInput.value;

if (!date || !category || !amount || isNaN(amount)) {
alert("모든 항목을 입력해주세요");
return;
}

const entry = { date, category, amount, type, memo };
records.push(entry);
saveRecords();
renderList();
renderChart();

dateInput.value = "";
categoryInput.value = "";
amountInput.value = "";
memoInput.value = "";
}

function renderList() {
recordList.innerHTML = "";
records.slice().reverse().forEach((record) => {
const li = document.createElement("li");
li.innerHTML =       `<span>${record.date} - ${record.category} (${record.type === 'income' ? '+' : '-'}${record.amount.toLocaleString()}원)</span>       <span style="color:#999">${record.memo || ""}</span>`    ;
recordList.appendChild(li);
});
}

function renderChart() {
const ctx = document.getElementById("summaryChart").getContext("2d");
const monthlyIncome = records
.filter(r => r.type === "income")
.reduce((acc, cur) => acc + cur.amount, 0);
const monthlyExpense = records
.filter(r => r.type === "expense")
.reduce((acc, cur) => acc + cur.amount, 0);

if (window.myChart) window.myChart.destroy();
window.myChart = new Chart(ctx, {
type: "bar",
data: {
labels: ["수입", "지출"],
datasets: [
{
label: "금액",
data: [monthlyIncome, monthlyExpense],
backgroundColor: ["#3b82f6", "#f87171"],
},
],
},
options: {
responsive: true,
plugins: {
legend: { display: false },
},
scales: {
y: {
beginAtZero: true,
ticks: {
callback: function(value) {
return value.toLocaleString() + "원";
},
},
},
},
},
});
}

renderList();
renderChart();
