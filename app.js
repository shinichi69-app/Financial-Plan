// โหลดข้อมูลเดิมจาก LocalStorage (ถ้ามี) หรือกำหนดเป็น อาเรย์ว่าง
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let expenseChartInstance = null;

// อ้างอิงElement ต่างๆ ใน DOM
const form = document.getElementById('transaction-form');
const list = document.getElementById('transaction-list');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const netBalanceEl = document.getElementById('net-balance');

// ฟังก์ชันเพิ่มรายการใหม่ผ่านฟอร์ม
form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const transaction = {
        id: generateID(),
        date: document.getElementById('date').value,
        type: document.getElementById('type').value,
        category: document.getElementById('category').value,
        amount: parseFloat(document.getElementById('amount').value),
        note: document.getElementById('note').value
    };

    transactions.push(transaction);
    updateLocalStorage();
    initApp();
    form.reset();
});

// สร้าง ID สุ่มเพื่อใช้ระบุแต่ละรายการ
function generateID() {
    return Math.floor(Math.random() * 100000000);
}

// ฟังก์ชันลบรายการเฉพาะเจาะจง
function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    updateLocalStorage();
    initApp();
}

// ฟังก์ชันล้างข้อมูลทั้งหมด (Reset Data) พร้อมกล่องข้อความยืนยัน
function resetAllData() {
    if (transactions.length === 0) {
        alert('ตอนนี้ยังไม่มีข้อมูลให้ลบทิ้งค่ะ');
        return;
    }
    
    const confirmReset = confirm('แน่ใจหรือไม่ว่าต้องการล้างข้อมูลรายรับ-รายจ่ายทั้งหมด? \n\n*คำเตือน: ข้อมูลที่ลบแล้วจะไม่สามารถกู้คืนได้');
    
    if (confirmReset) {
        transactions = [];
        localStorage.removeItem('transactions');
        initApp();
        alert('ล้างข้อมูลเรียบร้อยแล้ว');
    }
}

// อัปเดตข้อมูลลง LocalStorage ของเบราว์เซอร์
function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// ฟังก์ชันอัปเดตหน้าจอ UI (คำนวณเงินรวม และแสดงตาราง)
function updateUI() {
    list.innerHTML = '';
    
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
        if(t.type === 'income') {
            totalIncome += t.amount;
        } else {
            totalExpense += t.amount;
        }

        const sign = t.type === 'income' ? '+' : '-';
        const colorClass = t.type === 'income' ? 'text-green-600' : 'text-red-600';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${t.date}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm ${colorClass}">${t.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${t.category}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${t.note}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${colorClass}">${sign}฿${t.amount.toLocaleString()}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <button onclick="deleteTransaction(${t.id})" class="text-red-500 hover:text-red-700">ลบ</button>
            </td>
        `;
        list.appendChild(tr);
    });

    totalIncomeEl.innerText = `฿${totalIncome.toLocaleString()}`;
    totalExpenseEl.innerText = `฿${totalExpense.toLocaleString()}`;
    netBalanceEl.innerText = `฿${(totalIncome - totalExpense).toLocaleString()}`;

    updateChart();
}

// ฟังก์ชันอัปเดตกราฟโดนัท (Doughnut Chart) แสดงสัดส่วนหมวดหมู่รายจ่าย
function updateChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const expenses = transactions.filter(t => t.type === 'expense');
    const categoryTotals = {};
    
    expenses.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    if (expenseChartInstance) {
        expenseChartInstance.destroy();
    }

    expenseChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.length > 0 ? labels : ['ไม่มีข้อมูลรายจ่าย'],
            datasets: [{
                data: data.length > 0 ? data : [1],
                backgroundColor: data.length > 0 ? ['#F87171', '#60A5FA', '#FBBF24', '#34D399', '#A78BFA', '#E5E7EB'] : ['#E5E7EB'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// ตั้งค่าเริ่มต้นเมื่อเปิดโปรแกรม
function initApp() {
    document.getElementById('date').valueAsDate = new Date();
    updateUI();
}

initApp();
