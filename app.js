/**
 * Expense Tracker Logic & PWA Controller
 * Architecture: Event-Driven State-Based Management
 */

// --- CATEGORY CONFIGURATIONS ---
const CATEGORIES = {
    expense: ['อาหาร', 'เดินทาง', 'ช้อปปิ้ง', 'บิลต่างๆ', 'ความบันเทิง', 'อื่นๆ'],
    income: ['เงินเดือน', 'โบนัส', 'ขายของออนไลน์', 'การลงทุน', 'อื่นๆ']
};

// --- STATE MANAGEMENT ---
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let expenseChart = null;

// --- DOM ELEMENTS ---
const transactionForm = document.getElementById('transaction-form');
const transactionList = document.getElementById('transaction-list');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const netBalanceEl = document.getElementById('net-balance');
const typeSelect = document.getElementById('type');
const categorySelect = document.getElementById('category');
const editTypeSelect = document.getElementById('edit-type');
const editCategorySelect = document.getElementById('edit-category');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // กำหนดวันที่ปัจจุบันในฟอร์ม
    document.getElementById('date').valueToDate = new Date();
    document.getElementById('date').value = new Date().toISOString().split('T')[0];

    // อัปเดตตัวเลือกหมวดหมู่ตามประเภทแรกเริ่ม
    updateCategoryOptions(typeSelect.value, categorySelect);
    
    // โหลด Render ข้อมูลตั้งต้น
    renderApp();

    // เริ่มการทำงานของ Lucide Icons
    if (window.lucide) lucide.createIcons();

    // ลงทะเบียน Service Worker
    registerServiceWorker();
});

// --- EVENT LISTENERS ---
typeSelect.addEventListener('change', (e) => updateCategoryOptions(e.target.value, categorySelect));
editTypeSelect.addEventListener('change', (e) => updateCategoryOptions(e.target.value, editCategorySelect));

transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newTransaction = {
        id: Date.now().toString(),
        date: document.getElementById('date').value,
        type: document.getElementById('type').value,
        category: document.getElementById('category').value,
        amount: parseFloat(document.getElementById('amount').value),
        note: document.getElementById('note').value.trim()
    };

    transactions.unshift(newTransaction);
    saveAndRender();
    transactionForm.reset();
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    updateCategoryOptions(typeSelect.value, categorySelect);
});

// --- CORE FUNCTIONS ---

function updateCategoryOptions(selectedType, targetSelect) {
    targetSelect.innerHTML = '';
    CATEGORIES[selectedType].forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        targetSelect.appendChild(option);
    });
}

function saveAndRender() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    renderApp();
}

function renderApp() {
    renderSummary();
    renderTransactions();
    renderChart();
    if (window.lucide) lucide.createIcons();
}

// 1. คำนวณยอดเงินและ Render Dashboard
function renderSummary() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = income - expense;

    totalIncomeEl.textContent = `฿${income.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
    totalExpenseEl.textContent = `฿${expense.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
    netBalanceEl.textContent = `฿${balance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
}

// 2. Render ตารางประวัติการทำรายการ
function renderTransactions() {
    transactionList.innerHTML = '';

    if (transactions.length === 0) {
        transactionList.innerHTML = `
            <tr>
                <td colspan="6" class="py-8 text-center text-gray-400 text-xs">
                    ยังไม่มีข้อมูลรายการบันทึก
                </td>
            </tr>
        `;
        return;
    }

    transactions.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 transition';

        const isIncome = t.type === 'income';
        const amountClass = isIncome ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold';
        const typeBadge = isIncome 
            ? '<span class="bg-emerald-100 text-emerald-800 text-[10px] font-medium px-2 py-0.5 rounded-full">รายรับ</span>'
            : '<span class="bg-rose-100 text-rose-800 text-[10px] font-medium px-2 py-0.5 rounded-full">รายจ่าย</span>';

        tr.innerHTML = `
            <td class="py-3 px-4 text-gray-600 whitespace-nowrap">${formatDate(t.date)}</td>
            <td class="py-3 px-4 whitespace-nowrap">${typeBadge}</td>
            <td class="py-3 px-4 text-gray-800 font-medium whitespace-nowrap">${t.category}</td>
            <td class="py-3 px-4 text-gray-500 max-w-xs truncate">${t.note || '-'}</td>
            <td class="py-3 px-4 text-right whitespace-nowrap ${amountClass}">
                ${isIncome ? '+' : '-'}฿${t.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </td>
            <td class="py-3 px-4 text-center whitespace-nowrap">
                <div class="flex items-center justify-center gap-2">
                    <button onclick="openEditModal('${t.id}')" class="text-gray-400 hover:text-indigo-600 transition">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteTransaction('${t.id}')" class="text-gray-400 hover:text-rose-600 transition">
                        <i data-lucide="trash" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        `;
        transactionList.appendChild(tr);
    });
}

// 3. Render Chart.js
function renderChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const emptyMsg = document.getElementById('chart-empty-msg');

    // กรองเฉพาะรายการที่เป็นรายจ่าย
    const expenses = transactions.filter(t => t.type === 'expense');

    if (expenses.length === 0) {
        if (expenseChart) expenseChart.destroy();
        emptyMsg.classList.remove('hidden');
        return;
    }

    emptyMsg.classList.add('hidden');

    // รวมยอดค่าใช้จ่ายแยกตามหมวดหมู่
    const categoryTotals = {};
    expenses.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    if (expenseChart) {
        expenseChart.destroy();
    }

    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#64748b'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 11 } }
                }
            },
            cutout: '70%'
        }
    });
}

// --- EDIT & DELETE ACTIONS ---

function deleteTransaction(id) {
    if (confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveAndRender();
    }
}

function openEditModal(id) {
    const target = transactions.find(t => t.id === id);
    if (!target) return;

    document.getElementById('edit-id').value = target.id;
    document.getElementById('edit-date').value = target.date;
    document.getElementById('edit-type').value = target.type;
    
    updateCategoryOptions(target.type, editCategorySelect);
    document.getElementById('edit-category').value = target.category;
    
    document.getElementById('edit-amount').value = target.amount;
    document.getElementById('edit-note').value = target.note || '';

    const modal = document.getElementById('edit-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

document.getElementById('edit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const index = transactions.findIndex(t => t.id === id);

    if (index !== -1) {
        transactions[index] = {
            id: id,
            date: document.getElementById('edit-date').value,
            type: document.getElementById('edit-type').value,
            category: document.getElementById('edit-category').value,
            amount: parseFloat(document.getElementById('edit-amount').value),
            note: document.getElementById('edit-note').value.trim()
        };
        saveAndRender();
        closeEditModal();
    }
});

function resetAllData() {
    if (confirm('คำเตือน: ข้อมูลทั้งหมดจะถูกลบอย่างถาวร คุณแน่ใจหรือไม่?')) {
        transactions = [];
        saveAndRender();
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${parseInt(year) + 543}`;
}

// --- PWA INSTALLATION CONTROLLER ---

let deferredPrompt;
const pwaBanner = document.getElementById('pwa-install-banner');
const installBtn = document.getElementById('pwa-install-btn');
const closeBtn = document.getElementById('pwa-close-btn');

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('SW Registered successfully'))
                .catch(err => console.error('SW Registration failed', err));
        });
    }
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (pwaBanner) {
        pwaBanner.classList.remove('hidden');
    }
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to prompt: ${outcome}`);
            deferredPrompt = null;
            pwaBanner.classList.add('hidden');
        }
    });
}

if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        pwaBanner.classList.add('hidden');
    });
}
