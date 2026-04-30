const PRODUCTS = ['Beer','Coca-Cola','Vodka','Water','Wine','Tequila','Energy Drink','Tea','Coffee','Gin'];

const STAFF_MEMBERS = ['João Silva','Maria Santos','Pedro Oliveira','Ana Costa','Carlos Ferreira'];

const STORAGE_KEY = 'pubStock_records';

document.addEventListener('DOMContentLoaded', () => {
    initialiseProductButtons();
    initialiseStaffSelect();
    initialiseQuantityControl();
    initialiseDestinationButtons();
    initialiseTypeButtons();
    initialiseFormSubmission();
    initialiseTabs();
    initialiseExport();
    initialiseClear();
    loadHistory();
});

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

// QUANTITY
function initialiseQuantityControl() {
    const q = document.getElementById('quantity');
    document.getElementById('increaseBtn').onclick=()=>q.value++;
    document.getElementById('decreaseBtn').onclick=()=>{ if(q.value>1) q.value--; };
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

        if (!record.product || !record.destination || !record.staff || !record.type || !record.quantity) {
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
function loadHistory(){
    renderStock();
    const list = document.getElementById('historyList');
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    list.innerHTML='';

    if(!data.length){
        list.innerHTML='No records found';
        return;
    }

    data.slice().reverse().forEach(r=>{
        list.innerHTML+=`
        <div class="history-item">
            <strong>${r.product}</strong> (${r.quantity}) - ${r.type.toUpperCase()}
            <br>${r.destination} | ${r.staff}
            <br>${r.timestamp}
        </div>`;
    });
}

// STOCK
function renderStock(){
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const stock = {};
    data.forEach(r=>{
        if(!stock[r.product]) stock[r.product]=0;
        stock[r.product]+= r.type==='in'? r.quantity : -r.quantity;
    });

    const div = document.getElementById('stockSummary');
    div.innerHTML='<h3>Current Stock</h3>';
    Object.keys(stock).forEach(p=>{
        div.innerHTML+=`${p}: <strong>${stock[p]}</strong><br>`;
    });
}

// EXPORT
function initialiseExport(){
    document.getElementById('exportBtn').onclick=()=>{
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

        let csv = 'Type,Product,Quantity,Destination,Staff,Date\n';

        data.forEach(r => {
            csv += `"${r.type}","${r.product}","${r.quantity}","${r.destination}","${r.staff}","${r.timestamp}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'stock.csv';
        a.click();
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