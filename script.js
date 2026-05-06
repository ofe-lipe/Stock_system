import { db } from './firebase.js';
import { collection, addDoc, getDocs, doc, setDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const PRODUCTS = ['Beer', 'Coca-Cola', 'Vodka', 'Water', 'Wine', 'Tequila', 'Energy Drink', 'Tea', 'Coffee', 'Gin'];

const STAFF_MEMBERS = ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Ferreira'];

const STORAGE_KEY = 'pubStock_records';

document.addEventListener('DOMContentLoaded', async () => {
    initialiseProductButtons();
    initialiseStaffSelect();
    createStockInputs();
    initialiseDestinationButtons();
    initialiseTypeButtons();
    initialiseFormSubmission();
    initialiseTabs();
    initialiseExport();
    initialiseClear();

    document.getElementById('saveStockBtn').onclick = salvarContagemEstoque;

    await loadHistory();
});

/* ===== DATE FORMAT ===== */

function formatDate(date = new Date()) {
    return date.toLocaleString('en-IE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function createTimestamp() {
    return formatDate(new Date());
}

function createDateOrder() {
    return Date.now();
}

/* ===== FIREBASE FUNCTIONS ===== */

async function salvarMovimentacaoFirebase(dado) {
    try {
        await addDoc(collection(db, "movements"), dado);
        console.log("Saved to Firebase!");
    } catch (e) {
        console.error("Error saving to Firebase:", e);
    }
}

async function buscarMovimentacoesFirebase() {
    const querySnapshot = await getDocs(collection(db, "movements"));
    const lista = [];

    querySnapshot.forEach((doc) => {
        lista.push(doc.data());
    });

    return lista;
}

async function salvarEstoqueFirebase(estoque) {
    try {
        await setDoc(doc(db, "stock", "current"), {
            items: estoque,
            updatedAt: createDateOrder()
        });

        console.log("Stock saved to Firebase!");
    } catch (e) {
        console.error("Error saving stock to Firebase:", e);
    }
}

async function buscarEstoqueFirebase() {
    try {
        const docSnap = await getDoc(doc(db, "stock", "current"));

        if (docSnap.exists()) {
            return docSnap.data().items || {};
        }

        return {};
    } catch (e) {
        console.error("Error fetching stock from Firebase:", e);
        return JSON.parse(localStorage.getItem('realStock')) || {};
    }
}

async function limparHistoricoFirebase() {
    try {
        const querySnapshot = await getDocs(collection(db, "movements"));

        const promessas = [];

        querySnapshot.forEach(documento => {
            promessas.push(deleteDoc(documento.ref));
        });

        await Promise.all(promessas);

        console.log("History cleared from Firebase!");
    } catch (e) {
        console.error("Error clearing history from Firebase:", e);
    }
}

/* ===== STOCK COUNT ===== */

async function salvarContagemEstoque() {
    const inputs = document.querySelectorAll('.stock-input');
    const estoque = {};

    inputs.forEach(input => {
        const produto = input.dataset.product;
        const valor = parseInt(input.value) || 0;

        estoque[produto] = valor;
    });

    await salvarEstoqueFirebase(estoque);

    localStorage.setItem('realStock', JSON.stringify(estoque));

    const stockUpdate = {
        type: 'stock-update',
        timestamp: createTimestamp(),
        createdAt: createDateOrder()
    };

    await salvarMovimentacaoFirebase(stockUpdate);

    const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    data.push(stockUpdate);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    await loadHistory();

    show('stockSuccessMessage');
}

/* ===== PRODUCT BUTTONS ===== */

function initialiseProductButtons() {
    const container = document.getElementById('productButtons');
    container.innerHTML = '';

    PRODUCTS.forEach(p => {
        const btn = document.createElement('button');
        btn.textContent = p;
        btn.type = 'button';

        btn.onclick = () => {
            document.querySelectorAll('#productButtons button').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('product').value = p;
        };

        container.appendChild(btn);
    });
}

/* ===== STAFF SELECT ===== */

function initialiseStaffSelect() {
    const select = document.getElementById('employee');

    STAFF_MEMBERS.forEach(s => {
        const option = document.createElement('option');
        option.value = s;
        option.textContent = s;
        select.appendChild(option);
    });
}

/* ===== STOCK INPUTS ===== */

function createStockInputs() {
    const container = document.getElementById('stockInputs');
    container.innerHTML = '';

    PRODUCTS.forEach(product => {
        container.innerHTML += `
            <div class="form-group">
                <label>${product}</label>
                <input type="number" min="0" data-product="${product}" class="stock-input">
            </div>
        `;
    });
}

/* ===== DESTINATION BUTTONS ===== */

function initialiseDestinationButtons() {
    document.querySelectorAll('[data-destination]').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('[data-destination]').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('destination').value = btn.dataset.destination;
        };
    });
}

/* ===== TYPE BUTTONS ===== */

function initialiseTypeButtons() {
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('type').value = btn.dataset.type;
        };
    });
}

/* ===== FORM SUBMISSION ===== */

async function getCurrentStockByProduct(product) {
    let data = [];
    let realStock = {};

    try {
        data = await buscarMovimentacoesFirebase();
        realStock = await buscarEstoqueFirebase();
    } catch (error) {
        console.error("Error checking current stock:", error);
        data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        realStock = JSON.parse(localStorage.getItem('realStock')) || {};
    }

    let currentQuantity = realStock[product] || 0;

    data.forEach(record => {
        if (record.product !== product) return;

        if (record.type === 'in') {
            currentQuantity += record.quantity;
        }

        if (record.type === 'out') {
            currentQuantity -= record.quantity;
        }
    });

    return currentQuantity;
}

async function getPendingReturnByProductAndDestination(product, destination) {
    let data = [];

    try {
        data = await buscarMovimentacoesFirebase();
    } catch (error) {
        console.error("Error checking pending return:", error);
        data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    }

    let totalOut = 0;
    let totalIn = 0;

    data.forEach(record => {
        if (record.product !== product) return;
        if (record.destination !== destination) return;

        if (record.type === 'out') {
            totalOut += record.quantity;
        }

        if (record.type === 'in') {
            totalIn += record.quantity;
        }
    });

    return totalOut - totalIn;
}


function initialiseFormSubmission() {
    document.getElementById('outputForm').onsubmit = async e => {
        e.preventDefault();

        const record = {
            type: document.getElementById('type').value,
            product: document.getElementById('product').value,
            quantity: +document.getElementById('quantity').value,
            destination: document.getElementById('destination').value,
            staff: document.getElementById('employee').value,
            timestamp: createTimestamp(),
            createdAt: createDateOrder()
        };

        if (!record.product || !record.destination || !record.staff || !record.type || record.quantity <= 0) {
            show('errorMessage');
            return;
        }

        if (record.type === 'out') {
            const availableStock = await getCurrentStockByProduct(record.product);

            if (record.quantity > availableStock) {
                alert(`Not enough stock available. Current stock for ${record.product}: ${availableStock}`);
                return;
            }
        }

        if (record.type === 'in') {
            const pendingReturn = await getPendingReturnByProductAndDestination(
                record.product,
                record.destination
            );

            if (record.quantity > pendingReturn) {
                alert(`Invalid stock return. Only ${pendingReturn} ${record.product} can be returned from ${record.destination}.`);
                return;
            }
        }

        await salvarMovimentacaoFirebase(record);

        const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        data.push(record);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

        show('successMessage');
        resetForm();
        await loadHistory();
    };
}

        await salvarMovimentacaoFirebase(record);

        const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        data.push(record);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

        show('successMessage');
        resetForm();
        await loadHistory();
    ;


/* ===== RESET FORM ===== */

function resetForm() {
    document.getElementById('outputForm').reset();

    document.getElementById('quantity').value = 1;
    document.getElementById('product').value = '';
    document.getElementById('destination').value = '';
    document.getElementById('type').value = 'in';

    document.querySelectorAll('.selected').forEach(el => {
        el.classList.remove('selected');
    });

    const defaultType = document.querySelector('.type-btn[data-type="in"]');

    if (defaultType) {
        defaultType.classList.add('selected');
    }
}

/* ===== HISTORY ===== */

async function loadHistory() {
    await renderStock();

    const list = document.getElementById('historyList');
    let data = [];

    try {
        data = await buscarMovimentacoesFirebase();
    } catch (error) {
        console.error("Error fetching history from Firebase:", error);
        data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    }

    list.innerHTML = '';

    if (!data.length) {
        list.innerHTML = 'No records found';
        return;
    }

    data.sort((a, b) => {
        return (b.createdAt || 0) - (a.createdAt || 0);
    });

    data.forEach(r => {
        if (r.type === 'stock-update') {
            list.innerHTML += `
                <div class="history-item in">
                    <strong>Current Stock Updated</strong>
                    <br>${r.timestamp}
                </div>
            `;
            return;
        }

        if (!r.product || !r.type) return;

        list.innerHTML += `
            <div class="history-item ${r.type === 'in' ? 'in' : 'out'}">
                <strong>${r.product}</strong> (${r.quantity})
                <span class="type-label">
                    ${r.type === 'in' ? 'RETURN TO STOCK' : 'STOCK OUT'}
                </span>
                <br>${r.destination} | ${r.staff}
                <br>${r.timestamp}
            </div>
        `;
    });
}

/* ===== STOCK SUMMARY ===== */

async function renderStock() {
    let data = [];
    let realStock = {};

    try {
        data = await buscarMovimentacoesFirebase();
        realStock = await buscarEstoqueFirebase();
    } catch (error) {
        console.error("Error loading stock:", error);
        data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        realStock = JSON.parse(localStorage.getItem('realStock')) || {};
    }

    const current = {};

    Object.keys(realStock).forEach(p => {
        current[p] = realStock[p];
    });

    data.forEach(r => {
        if (!r.product) return;

        if (!current[r.product]) current[r.product] = 0;

        if (r.type === 'in') current[r.product] += r.quantity;
        if (r.type === 'out') current[r.product] -= r.quantity;
    });

    const div = document.getElementById('stockSummary');
    let total = 0;

    Object.keys(current).forEach(p => {
        total += current[p];
    });

    div.innerHTML = `
        <div class="stock-total-card">
            📦 Total in Stock
            <strong>${total}</strong>
            items
        </div>

        <div class="stock-grid">
            ${Object.keys(current).map(p => {
                const initial = realStock[p] ?? 0;
                const now = current[p];

                return `
                    <div class="stock-card">
                        <div>${p}</div>
                        <strong>${now}</strong>
                        <small>Initial: ${initial}</small>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

/* ===== EXPORT CSV ===== */

function initialiseExport() {
    document.getElementById('exportBtn').onclick = async () => {
        let data = [];

        try {
            data = await buscarMovimentacoesFirebase();
        } catch (error) {
            console.error("Error fetching data for export:", error);
            data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        }

        data.sort((a, b) => {
            return (a.createdAt || 0) - (b.createdAt || 0);
        });

        let csv = '\uFEFFType;Product;Quantity;Destination;Staff;Date\n';

        data.forEach(r => {
            if (r.type === 'stock-update') {
                csv += `"Stock Update";"Current stock updated";"";"";"";"${r.timestamp || ''}"\n`;
                return;
            }

            csv += `"${r.type === 'in' ? 'Return to Stock' : 'Stock Out'}";"${r.product || ''}";"${r.quantity || ''}";"${r.destination || ''}";"${r.staff || ''}";"${r.timestamp || ''}"\n`;
        });

        const blob = new Blob([csv], {
            type: 'text/csv;charset=utf-8;'
        });

        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'stock-history.csv';
        a.click();

        URL.revokeObjectURL(url);
    };
}

/* ===== CLEAR HISTORY ===== */

function initialiseClear() {
    document.getElementById('clearHistoryBtn').onclick = async () => {
        if (confirm('Are you sure you want to clear the entire history?')) {
            await limparHistoricoFirebase();

            localStorage.removeItem(STORAGE_KEY);

            await loadHistory();
        }
    };
}

/* ===== TABS ===== */

function initialiseTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        };
    });
}

/* ===== UI MESSAGES ===== */

function show(id) {
    const el = document.getElementById(id);

    el.style.display = 'block';

    setTimeout(() => {
        el.style.display = 'none';
    }, 2000);
}