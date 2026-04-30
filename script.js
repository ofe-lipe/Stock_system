const PRODUCTS = ['Beer','Coca-Cola','Vodka','Water','Wine','Tequila','Energy Drink','Tea','Coffee','Gin'];

const STAFF_MEMBERS = ['João Silva','Maria Santos','Pedro Oliveira','Ana Costa','Carlos Ferreira'];

const STORAGE_KEY = 'pubStock_records';

document.addEventListener('DOMContentLoaded', () => {
    initialiseProductButtons();
    initialiseStaffSelect();
    createStockInputs();
    initialiseDestinationButtons();
    initialiseTypeButtons();
    initialiseFormSubmission();
    initialiseTabs();
    initialiseExport();
    initialiseClear();
    loadHistory();
    document.getElementById('saveStockBtn').onclick = salvarContagemEstoque;
});

function salvarContagemEstoque() {
    const inputs = document.querySelectorAll('.stock-input');
    const estoque = {};

    inputs.forEach(input => {
        const produto = input.dataset.product;
        const valor = parseInt(input.value) || 0;

        estoque[produto] = valor;
    });

    localStorage.setItem('realStock', JSON.stringify(estoque));

    const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    data.push({
        type: 'stock-update',
        timestamp: new Date().toLocaleString('pt-BR')
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    renderStock();
    loadHistory();

    show('stockSuccessMessage');
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
    document.getElementById('outputForm').onsubmit = e => {
        e.preventDefault();

        const record = {
            type: document.getElementById('type').value,
            product: document.getElementById('product').value,
            quantity: +document.getElementById('quantity').value,
            destination: document.getElementById('destination').value,
            staff: document.getElementById('employee').value,
            timestamp: new Date().toLocaleString('en-GB').replace(',', '')
        };

        if (!record.product || !record.destination || !record.staff || !record.type || record.quantity <= 0) {
        show('errorMessage');
        return;
                    }

        const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        data.push(record);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

        show('successMessage');
        resetForm();
        loadHistory();
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
function loadHistory() {
    renderStock();

    const list = document.getElementById('historyList');
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    list.innerHTML = '';

    if (!data.length) {
        list.innerHTML = 'No records found';
        return;
    }

    data.slice().reverse().forEach(r => {

        // 🟢 STOCK COUNT (mensagem simples)
        if (r.type === 'stock-update') {
            list.innerHTML += `
                <div class="history-item in">
                    <strong>Estoque atualizado</strong>
                    <br>${r.timestamp}
                </div>
            `;
            return;
        }

        // ❌ ignora dados quebrados
        if (!r.product || !r.type) return;

        // 🔴🟢 IN / OUT normal
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
    function renderStock(){
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        const realStock = JSON.parse(localStorage.getItem('realStock')) || {};
        const current = {};

        // começa com estoque real
        Object.keys(realStock).forEach(p => {
            current[p] = realStock[p];  
        });

        // aplica movimentações
    data.forEach(r => {
        if (!r.product) return; // ignora erro

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
function initialiseExport(){
    document.getElementById('exportBtn').onclick = () => {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

        let table = `
            <table border="1">
                <tr>
                    <th>Type</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Destination</th>
                    <th>Staff</th>
                    <th>Date</th>
                </tr>
        `;

        data.forEach(r => {
            if (r.type === 'stock-update') {
                table += `
                    <tr>
                        <td>Stock Update</td>
                        <td colspan="4">Estoque atualizado</td>
                        <td>${r.timestamp}</td>
                    </tr>
                `;
                return;
            }

            table += `
                <tr>
                    <td>${r.type}</td>
                    <td>${r.product}</td>
                    <td>${r.quantity}</td>
                    <td>${r.destination}</td>
                    <td>${r.staff}</td>
                    <td>${r.timestamp}</td>
                </tr>
            `;
        });

        table += `</table>`;

        const blob = new Blob([table], {
            type: 'application/vnd.ms-excel'
        });

        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'stock-history.xls';
        a.click();

        URL.revokeObjectURL(url);
    };
}

// CLEAR
function initialiseClear(){
    document.getElementById('clearHistoryBtn').onclick=()=>{
        if(confirm('Clear all history?')){
            localStorage.removeItem(STORAGE_KEY);
            loadHistory();
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