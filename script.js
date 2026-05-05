import { db } from './firebase.js';
import { collection, addDoc, getDocs, doc, setDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const PRODUCTS = ['Beer','Coca-Cola','Vodka','Water','Wine','Tequila','Energy Drink','Tea','Coffee','Gin'];

const STAFF_MEMBERS = ['João Silva','Maria Santos','Pedro Oliveira','Ana Costa','Carlos Ferreira'];

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

async function salvarMovimentacaoFirebase(dado) {
    try {
        await addDoc(collection(db, "movements"), dado);
        console.log("Salvo no Firebase!");
    } catch (e) {
        console.error("Erro ao salvar no Firebase:", e);
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
updatedAt: Date.now()
});

    console.log("Estoque salvo no Firebase!");
} catch (e) {
    console.error("Erro ao salvar estoque no Firebase:", e);
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
    console.error("Erro ao buscar estoque no Firebase:", e);
    return JSON.parse(localStorage.getItem('realStock')) || {};
}

}

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
    timestamp: new Date().toLocaleString('pt-BR'),
    createdAt: Date.now()
};

await salvarMovimentacaoFirebase(stockUpdate);

const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
data.push(stockUpdate);
localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

await loadHistory();

show('stockSuccessMessage');

}

async function limparHistoricoFirebase() {
try {
const querySnapshot = await getDocs(collection(db, "movements"));

    const promessas = [];

    querySnapshot.forEach(documento => {
        promessas.push(deleteDoc(documento.ref));
    });

    await Promise.all(promessas);

    console.log("Histórico limpo no Firebase!");
} catch (e) {
    console.error("Erro ao limpar histórico no Firebase:", e);
}

}

// PRODUCT
function initialiseProductButtons() {
    const container = document.getElementById('productButtons');
    PRODUCTS.forEach(p => {
        const btn = document.createElement('button');
        btn.textContent = p;
        btn.type = 'button';
        btn.onclick = () => {
            document.querySelectorAll('#productButtons button').forEach(b=>b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('product').value = p;
        };
        container.appendChild(btn);
    });
}

// STAFF
function initialiseStaffSelect() {
    const select = document.getElementById('employee');
    STAFF_MEMBERS.forEach(s=>{
        const o=document.createElement('option');
        o.value=s; o.textContent=s;
        select.appendChild(o);
    });
}

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

// DESTINATION
function initialiseDestinationButtons() {
    document.querySelectorAll('[data-destination]').forEach(btn=>{
        btn.onclick=()=>{
            document.querySelectorAll('[data-destination]').forEach(b=>b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('destination').value = btn.dataset.destination;
        };
    });
}

// TYPE
function initialiseTypeButtons() {
    document.querySelectorAll('.type-btn').forEach(btn=>{
        btn.onclick=()=>{
            document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('type').value = btn.dataset.type;
        };
    });
}

// FORM
function initialiseFormSubmission() {
   document.getElementById('outputForm').onsubmit = async e => {
        e.preventDefault();

        const record = {
            type: document.getElementById('type').value,
            product: document.getElementById('product').value,
            quantity: +document.getElementById('quantity').value,
            destination: document.getElementById('destination').value,
            staff: document.getElementById('employee').value,
            timestamp: new Date().toLocaleString('en-GB').replace(',', ''),
            createdAt: Date.now()
        };

        if (!record.product || !record.destination || !record.staff || !record.type || record.quantity <= 0) {
        show('errorMessage');
        return;
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

function resetForm(){
    // Reset form
    document.getElementById('outputForm').reset();

    // Reset quantity
    document.getElementById('quantity').value = 1;

    // 🔴 IMPORTANT: clear hidden values
    document.getElementById('product').value = '';
    document.getElementById('destination').value = '';
    document.getElementById('type').value = 'in';

    // Remove ALL selected styles
    document.querySelectorAll('.selected').forEach(el => {
        el.classList.remove('selected');
    });

    // Optional: set default type again visually
    const defaultType = document.querySelector('.type-btn[data-type="in"]');
    if (defaultType) {
        defaultType.classList.add('selected');
    }
}

// HISTORY

async function loadHistory() {
   await renderStock();

    const list = document.getElementById('historyList');
    let data = [];

    try {
        data = await buscarMovimentacoesFirebase();
    } catch (error) {
        console.error("Erro ao buscar histórico no Firebase:", error);
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
                    <strong>Estoque atualizado</strong>
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
                    ${r.type === 'in' ? 'IN' : 'OUT'}
                </span>
                <br>${r.destination} | ${r.staff}
                <br>${r.timestamp}
            </div>
        `;
    });
}

// STOCK
   async function renderStock() {
let data = [];
let realStock = {};

try {
    data = await buscarMovimentacoesFirebase();
    realStock = await buscarEstoqueFirebase();
} catch (error) {
    console.error("Erro ao carregar estoque:", error);
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
        📦 Total em estoque
        <strong>${total}</strong>
        produtos
    </div>

    <div class="stock-grid">
        ${Object.keys(current).map(p => {
            const initial = realStock[p] ?? 0;
            const now = current[p];

            return `
                <div class="stock-card">
                    <div>${p}</div>
                    <strong>${now}</strong>
                    <small>Início: ${initial}</small>
                </div>
            `;
        }).join('')}
    </div>
`;

// 🔥 MOSTRA TOTAL NO TOPO
div.innerHTML += `
    <div style="margin-top:15px; font-size:1.2em;">
        <strong>Total em estoque: ${total}</strong>
    </div>
`;
}
// EXPORT
function initialiseExport() {
document.getElementById('exportBtn').onclick = async () => {
let data = [];

    try {
        data = await buscarMovimentacoesFirebase();
    } catch (error) {
        console.error("Erro ao buscar dados para exportar:", error);
        data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    }

    data.sort((a, b) => {
        return (a.createdAt || 0) - (b.createdAt || 0);
    });

    let csv = '\uFEFFType;Product;Quantity;Destination;Staff;Date\n';

    data.forEach(r => {
        if (r.type === 'stock-update') {
            csv += `"Stock Update";"Estoque atualizado";"";"";"";"${r.timestamp || ''}"\n`;
            return;
        }

        csv += `"${r.type || ''}";"${r.product || ''}";"${r.quantity || ''}";"${r.destination || ''}";"${r.staff || ''}";"${r.timestamp || ''}"\n`;
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

// CLEAR
function initialiseClear() {
document.getElementById('clearHistoryBtn').onclick = async () => {
if (confirm('Clear all history?')) {
await limparHistoricoFirebase();

        localStorage.removeItem(STORAGE_KEY);

        await loadHistory();
    }
};

}

// TABS
function initialiseTabs(){
    document.querySelectorAll('.tab-btn').forEach(btn=>{
        btn.onclick=()=>{
            document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        };
    });
}

// UI
function show(id){
    const el=document.getElementById(id);
    el.style.display='block';
    setTimeout(()=>el.style.display='none',2000);
}

