// เก็บข้อมูลไว้ใน LocalStorage
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let expenseChartInstance = null;

// อ้างอิง DOM Elements
const form = document.getElementById('transaction-form');
const list = document.getElementById('transaction-list');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const netBalanceEl = document.getElementById('net-balance');
const resetBtn = document.getElementById('reset-btn'); // เพิ่มตัวแปรปุ่มรีเซ็ต

// ฟังก์ชันเพิ่มรายการใหม่
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

// สร้าง ID แบบสุ่ม
function generateID() {
    return Math.floor(Math.random() * 100000000);
}

// ลบรายการเดี่ยว
function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    updateLocalStorage();
    initApp();
}

// --- ฟังก์ชันล้างข้อมูลทั้งหมด (Reset) ที่เพิ่มใหม่ ---
resetBtn.addEventListener('click', function() {
    // เช็คก่อนว่ามีข้อมูลให้ลบไหม
    if (transactions.length === 0) {
        alert('ตอนนี้ยังไม่มีข้อมูลให้ลบทิ้งค่ะ');
        return;
    }
    
    // แจ้งเตือนยืนยันก่อนลบ (Confirmation Dialog) ป้องกันการกดผิด
    const confirmReset = confirm('ชินอิจิแน่ใจนะคะ ว่าต้องการล้างข้อมูลรายรับ-รายจ่ายทั้งหมด? \n\n*คำเตือน: ข้อมูลที่ลบแล้วจะไม่สามารถกู้คืนได้ค่ะ');
    
    if (confirmReset) {
        transactions = []; // ล้างข้อมูลใน Array
        localStorage.removeItem('transactions'); // ลบออกจาก LocalStorage ในเบราว์เซอร์
        initApp(); // รีเฟรชหน้าจอใหม่
        alert('ล้างข้อมูลเรียบร้อยแล้วค่ะ เริ่มต้นรอบใหม่กันนะคะ!');
    }
});
// ---------------------------------------------

// อัปเดตข้อมูลลง LocalStorage
function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// อัปเดต UI หน้าจอ
function updateUI() {
    list.innerHTML = '';
    
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
        if(t.type === 'income') totalIncome += t.amount;
        else totalExpense += t.amount;

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

// อัปเดตกราฟ (Pie Chart)
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

// เริ่มต้นการทำงาน
function initApp() {
    document.getElementById('date').valueAsDate = new Date();
    updateUI();
}

initApp();
