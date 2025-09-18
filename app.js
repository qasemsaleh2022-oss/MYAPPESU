
    // ===== البيانات الافتراضية =====
    const DEFAULT_ITEMS = [
      {id: 1, name: "دقيق السنابل 50 كيلو", unit: "كيس", purchasePrice: 2500, price: 2700, profit: 200, stock: 30},
      {id: 2, name: "دقيق السنابل 25 كيلو", unit: "قطمه", purchasePrice: 1300, price: 1400, profit: 100, stock: 50},
      {id: 3, name: "بر السعيد مطحون 50 كيلو", unit: "كيس", purchasePrice: 2200, price: 2450, profit: 250, stock: 20},
      {id: 4, name: "بر السعيد 25 كيلو", unit: "قطمه", purchasePrice: 1150, price: 1250, profit: 100, stock: 40},
      {id: 5, name: "زيت", unit: "لتر", purchasePrice: 600, price: 800, profit: 200, stock: 20},
      {id: 6, name: "سكر", unit: "كيس", purchasePrice: 300, price: 400, profit: 100, stock: 40},
      {id: 7, name: "تونه", unit: "علبة", purchasePrice: 120, price: 180, profit: 60, stock: 50},
      {id: 8, name: "صاردين", unit: "علبة", purchasePrice: 80, price: 120, profit: 40, stock: 60},
      {id: 9, name: "شوكولاته بريك", unit: "حبة", purchasePrice: 25, price: 40, profit: 15, stock: 100},
      {id: 10, name: "ملح", unit: "كيس", purchasePrice: 50, price: 80, profit: 30, stock: 80},
      {id: 11, name: "أرز", unit: "كغم", purchasePrice: 400, price: 500, profit: 100, stock: 50},
      {id: 12, name: "معكرونة", unit: "علبة", purchasePrice: 150, price: 250, profit: 100, stock: 60},
    ];
// ===== متغيرات التطبيق =====
    let items = [];
    let customers = [];
    let invoices = [];
    let plan = {type: 'free', price: 0};
    let store = {name: 'QASEM FOR SUPERMARKET SYSTEMS', phone: '733239920'};
    let users = {admin: {password: 'admin123', name: 'مدير النظام'}};
    let nextInvoiceNumber = 1;
    let nextItemId = DEFAULT_ITEMS.length + 1;
    
    // ===== نظام التخزين =====
    const DB = {
      set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
      get: (key, defaultValue) => {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
      }
    };
    
    // ===== متغيرات الفاتورة الحالية =====
    let editingIndex = null;
    let currentCustomerLedger = null;
    let currentInvoiceItems = [];
    let currentPaymentMethod = 'نقدي';
    let currentInvoiceStatus = 'suspended';
    let editingInvoiceId = null;
    let currentLedgerCurrency = 'ALL';
    let editingTransactionId = null;

    const CURRENCY = {
      YER: {symbol:'﷼', code:'YER'},
      SAR: {symbol:'﷼', code:'SAR'},
      USD: {symbol:'$', code:'USD'}
    };

    // ===== Helpers =====
    const $ = sel => document.querySelector(sel);
    const $$ = sel => Array.from(document.querySelectorAll(sel));
    document.getElementById('year').textContent = new Date().getFullYear();

    function formatMoney(v, cur='YER'){
      const symbol = CURRENCY[cur]?.symbol || '';
      return `${symbol} <span class="ltr-number">${Number(v||0).toLocaleString('en-US')}</span>`;
    }
    
    function parseNumber(value) {
      return parseFloat(value || 0);
    }
    
    function formatPhoneNumber(countryCode, phone) {
      const cleanedPhone = phone.replace(/\D/g, '');
      if (countryCode === '+967') {
        if (cleanedPhone.length === 9) {
          return cleanedPhone.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
        } else if (cleanedPhone.length === 7) {
          return cleanedPhone.replace(/(\d{3})(\d{2})(\d{2})/, '$1 $2 $3');
        }
      }
      return countryCode + ' ' + cleanedPhone;
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function showAlert(message, type = 'info') {
      alert(message);
    }

    // ===== Navigation =====
    $$('.tab').forEach(btn => {
      btn.addEventListener('click', ()=>{
        $$('.tab').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        $$('.view').forEach(v=>v.classList.remove('active'));
        document.querySelector(btn.dataset.target).classList.add('active');
        
        if (btn.dataset.target === '#unpostInvoices') {
          renderFinalInvoices();
        }
        
        if (btn.dataset.target === '#invoices') {
          populateCustomerFilter();
        }
      });
    });

    function showLedgerTab(tabName) {
      $('#ledgerTab').style.display = 'none';
      $('#receiptTab').style.display = 'none';
      $('#paymentTab').style.display = 'none';
      
      $$('.ledger-btn').forEach(btn => btn.classList.remove('active'));
      
      $(`#${tabName}Tab`).style.display = 'block';
      $(`.ledger-btn.${tabName === 'ledger' ? 'statement' : tabName}`).classList.add('active');
      
      if (tabName === 'ledger') {
        $('#balanceDisplay').style.display = 'block';
        updateBalanceDisplay();
      } else {
        $('#balanceDisplay').style.display = 'none';
      }
    }

    function selectPaymentMethod(method) {
      $$('.payment-method').forEach(m => m.classList.remove('active'));
      $(`.payment-method[data-method="${method}"]`).classList.add('active');
      currentPaymentMethod = method;
      
      if (method === 'آجل') {
        $('#paidAmountContainer').style.display = 'grid';
      } else {
        $('#paidAmountContainer').style.display = 'none';
        $('#paidAmount').value = '';
      }
      
      recalcCurrentInvoice();
    }
    
    function selectInvoiceStatus(status) {
      $$('.invoice-status-btn').forEach(b => b.classList.remove('active'));
      $(`.invoice-status-btn[data-status="${status}"]`).classList.add('active');
      currentInvoiceStatus = status;
    }

    function hidePrintArea() {
      $('#printArea').style.display = 'none';
    }

    // ===== Renderers =====
    function renderStats(){
      $('#statItems').textContent = items.length;
      $('#statCustomers').textContent = customers.length;
      $('#statInvoices').textContent = invoices.length;
      
      let totalSales = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      let quickStatsHTML = `
        <div>إجمالي المبيعات: <b>${formatMoney(totalSales)}</b></div>
        <div>عدد العملاء النشطين: <b class="ltr-number">${customers.filter(c => c.ledger && c.ledger.length > 0).length}</b></div>
        <div>أعلى صنف مبيعاً: <b>${getTopSellingItem()}</b></div>
      `;
      $('#quickStats').innerHTML = quickStatsHTML;
      
      let recentActivitiesHTML = '';
      const recentInvoices = [...invoices].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
      
      recentInvoices.forEach(inv => {
        recentActivitiesHTML += `
          <div style="padding:8px;border-bottom:1px solid #eee">
            <div>فاتورة ${inv.customer} - ${formatMoney(inv.totalAmount, inv.currency)}</div>
            <div class="muted">${new Date(inv.date).toLocaleString('ar-EG')}</div>
          </div>
        `;
      });
      
      $('#recentActivities').innerHTML = recentActivitiesHTML || '<div class="muted">لا توجد حركات حديثة</div>';
    }
    
    function getTopSellingItem() {
      if (invoices.length === 0) return 'لا يوجد';
      
      const itemCount = {};
      invoices.forEach(inv => {
        inv.items.forEach(item => {
          itemCount[item.name] = (itemCount[item.name] || 0) + item.qty;
        });
      });
      
      const topItem = Object.keys(itemCount).reduce((a, b) => 
        itemCount[a] > itemCount[b] ? a : b, Object.keys(itemCount)[0]);
      
      return topItem || 'لا يوجد';
    }

    function renderItems(){
      const tbody = document.querySelector('#itemsTableBody');
      tbody.innerHTML = '';
      
      if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center">لا توجد أصناف</td></tr>';
        return;
      }
      
      items.forEach((item, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="ltr-number">${i+1}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.unit)}</td>
          <td class="ltr-number">${item.purchasePrice.toLocaleString('en-US')}</td>
          <td class="ltr-number">${item.price.toLocaleString('en-US')}</td>
          <td class="ltr-number">${item.profit.toLocaleString('en-US')}</td>
          <td class="ltr-number ${item.stock === 0 ? 'negative' : ''}">${item.stock}</td>
          <td>
            <button class="small" onclick="editItem(${i})"><i class="fas fa-edit"></i> تعديل</button>
            <button class="small danger" onclick="deleteItem(${i})"><i class="fas fa-trash"></i> حذف</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
    
    function calculateProfit() {
      const purchasePrice = parseNumber($('#purchasePrice').value);
      const salePrice = parseNumber($('#itemPrice').value);
      const profit = salePrice - purchasePrice;
      $('#profit').value = profit;
    }
    
    function renderCustomers(){
      const tbody = document.querySelector('#customersTableBody');
      tbody.innerHTML = '';
      
      if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">لا توجد عملاء</td></tr>';
        return;
      }
      
      customers.forEach((c, i) => {
        const balance = calculateCustomerBalance(c);
        const balanceClass = balance >= 0 ? 'positive' : 'negative';
        const balanceText = balance >= 0 ? 
          `له: ${formatMoney(Math.abs(balance), c.currency)}` : 
          `عليه: ${formatMoney(Math.abs(balance), c.currency)}`;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="ltr-number">${i+1}</td>
          <td>${escapeHtml(c.name)}</td>
          <td class="ltr-number">${formatPhoneNumber(c.countryCode, c.phone)}</td>
          <td>${escapeHtml(c.currency)}</td>
          <td class="${balanceClass}">${balanceText}</td>
          <td>
            <div class="customer-actions">
              <button class="small" onclick="showCustomerLedger(${i})"><i class="fas fa-file-invoice"></i> كشف حساب</button>
              <button class="small" onclick="editCustomer(${i})"><i class="fas fa-edit"></i></button>
              <button class="small danger" onclick="deleteCustomer(${i})"><i class="fas fa-trash"></i></button>
              <button class="action-btn whatsapp" onclick="sendWhatsApp('${c.countryCode}${c.phone}', '${c.name}')" title="إرسال فاتورة عبر واتساب"><i class="fab fa-whatsapp"></i></button>
              <button class="action-btn sms" onclick="sendSMS('${c.countryCode}${c.phone}', '${c.name}')" title="إرسال فاتورة عبر SMS"><i class="fas fa-sms"></i></button>
              <button class="action-btn call" onclick="callCustomer('${c.countryCode}${c.phone}')" title="اتصال بالعميل"><i class="fas fa-phone"></i></button>
            </div>
          </td>`;
        tbody.appendChild(tr);
      });

      const sel = $('#invoiceCustomer');
      sel.innerHTML = '<option value="">-- اختر العميل --</option>' + 
        customers.map(c => `<option value="${c.id}" data-currency="${c.currency}">${escapeHtml(c.name)} (${escapeHtml(c.currency)})</option>`).join('');
      
      populateCustomerFilter();
    }
    
    function populateCustomerFilter() {
      const sel = $('#invoiceCustomerFilter');
      sel.innerHTML = '<option value="">جميع العملاء</option>' + 
        customers.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    }
    
    function calculateCustomerBalance(customer) {
      if (!customer.ledger || customer.ledger.length === 0) return 0;
      
      return customer.ledger.reduce((balance, entry) => {
        if (entry.type === 'فاتورة' || entry.type === 'سند صرف') {
          return balance - entry.amount;
        } else if (entry.type === 'سند قبض') {
          return balance + entry.amount;
        }
        return balance;
      }, 0);
    }
    
    function showCustomerLedger(index) {
      const customer = customers[index];
      currentCustomerLedger = customer;
      
      $('#customerLedgerSection').style.display = 'block';
      $('#ledgerCustomerName').textContent = customer.name;
      
      renderCustomerLedger(customer);
      
      document.getElementById('customerLedgerSection').scrollIntoView({behavior: 'smooth'});
    }
    
    function renderCustomerLedger(customer) {
      const tbody = document.querySelector('#ledgerTableBody');
      tbody.innerHTML = '';
      
      if (!customer.ledger || customer.ledger.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center">لا توجد حركات</td></tr>';
        return;
      }
      
      const sortedLedger = [...customer.ledger].sort((a, b) => new Date(b.date) - new Date(a.date));
      
      let runningBalance = 0;
      const ledgerWithBalance = sortedLedger.map(entry => {
        if (entry.type === 'فاتورة' || entry.type === 'سند صرف') {
          runningBalance -= entry.amount;
        } else if (entry.type === 'سند قبض') {
          runningBalance += entry.amount;
        }
        return {...entry, balance: runningBalance};
      }).reverse();
      
      ledgerWithBalance.forEach(entry => {
        if (currentLedgerCurrency !== 'ALL' && entry.currency !== currentLedgerCurrency) {
          return;
        }
        
        const tr = document.createElement('tr');
        const isPositive = entry.type === 'سند قبض';
        
        tr.innerHTML = `
          <td>${new Date(entry.date).toLocaleString('ar-EG')}</td>
          <td>${entry.type}</td>
          <td>${entry.description || '-'}</td>
          <td>${entry.currency || customer.currency}</td>
          <td class="ltr-number">${(entry.type === 'فاتورة' || entry.type === 'سند صرف') ? entry.amount.toLocaleString('en-US') : '-'}</td>
          <td class="ltr-number">${entry.type === 'سند قبض' ? entry.amount.toLocaleString('en-US') : '-'}</td>
          <td class="ltr-number">${entry.balance.toLocaleString('en-US')}</td>
          <td class="ltr-number">${entry.refInvoiceId ? entry.refInvoiceId : '-'}</td>
          <td>
            ${entry.type !== 'فاتورة' ? `
              <button class="small" onclick="editTransaction('${customer.id}', '${entry.id}')"><i class="fas fa-edit"></i></button>
              <button class="small danger" onclick="deleteTransaction('${customer.id}', '${entry.id}')"><i class="fas fa-trash"></i></button>
            ` : ''}
          </td>
        `;
        tbody.appendChild(tr);
      });
      
      updateBalanceDisplay();
    }
    
    function updateBalanceDisplay() {
      if (!currentCustomerLedger) return;
      
      const balance = calculateCustomerBalance(currentCustomerLedger);
      const balanceDisplay = $('#balanceDisplay');
      
      if (balance === 0) {
        balanceDisplay.className = 'balance-display';
        balanceDisplay.innerHTML = 'الرصيد متوازن (صفر)';
      } else if (balance > 0) {
        balanceDisplay.className = 'balance-display balance-positive';
        balanceDisplay.innerHTML = `العميل ${currentCustomerLedger.name} له رصيد: ${formatMoney(balance, currentCustomerLedger.currency)}`;
      } else {
        balanceDisplay.className = 'balance-display balance-negative';
        balanceDisplay.innerHTML = `العميل ${currentCustomerLedger.name} عليه دين: ${formatMoney(Math.abs(balance), currentCustomerLedger.currency)}`;
      }
    }

    function renderInvoices(){
      const tbody = document.querySelector('#invoicesTableBody');
      tbody.innerHTML = '';
      
      if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center">لا توجد فواتير</td></tr>';
        return;
      }
      
      invoices.forEach((inv, i) => {
        const customer = customers.find(c => c.id === inv.customerId);
        const customerName = customer ? customer.name : 'عميل نقدي';
        const statusText = getInvoiceStatusText(inv.status);
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="ltr-number">${i+1}</td>
          <td class="ltr-number">${inv.invoiceNumber}</td>
          <td>${new Date(inv.date).toLocaleString('ar-EG')}</td>
          <td>${escapeHtml(customerName)}</td>
          <td>${inv.paymentMethod || 'نقدي'}</td>
          <td>${statusText}</td>
          <td>${inv.currency}</td>
          <td class="ltr-number">${inv.totalAmount.toLocaleString('en-US')}</td>
          <td>
            <div class="customer-actions">
              <button class="small" onclick="previewInvoice(${i})"><i class="fas fa-eye"></i> عرض</button>
              ${inv.status !== 'final' ? `<button class="small" onclick="editExistingInvoice(${i})"><i class="fas fa-edit"></i> تعديل</button>` : ''}
              <button class="small danger" onclick="deleteInvoice(${i})"><i class="fas fa-trash"></i></button>
              <button class="action-btn whatsapp" onclick="sendInvoiceWhatsApp(${i})" title="إرسال الفاتورة عبر واتساب"><i class="fab fa-whatsapp"></i></button>
              <button class="action-btn sms" onclick="sendInvoiceSMS(${i})" title="إرسال الفاتورة عبر SMS"><i class="fas fa-sms"></i></button>
            </div>
          </td>`;
        tbody.appendChild(tr);
      });
    }
    
    function renderFinalInvoices() {
      const tbody = document.querySelector('#finalInvoicesTableBody');
      tbody.innerHTML = '';
      
      const finalInvoices = invoices.filter(inv => inv.status === 'final');
      
      if (finalInvoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center">لا توجد فواتير نهائية</td></tr>';
        return;
      }
      
      finalInvoices.forEach((inv, i) => {
        const customer = customers.find(c => c.id === inv.customerId);
        const customerName = customer ? customer.name : 'عميل نقدي';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="ltr-number">${i+1}</td>
          <td class="ltr-number">${inv.invoiceNumber}</td>
          <td>${new Date(inv.date).toLocaleString('ar-EG')}</td>
          <td>${escapeHtml(customerName)}</td>
          <td>${inv.paymentMethod || 'نقدي'}</td>
          <td>${getInvoiceStatusText(inv.status)}</td>
          <td class="ltr-number">${inv.totalAmount.toLocaleString('en-US')}</td>
          <td>
            <button class="small" onclick="unpostInvoice(${i})"><i class="fas fa-undo"></i> إلغاء الترحيل</button>
          </td>`;
        tbody.appendChild(tr);
      });
    }
    
    function getInvoiceStatusText(status) {
      switch(status) {
        case 'suspended': return 'معلق';
        case 'non-final': return 'غير نهائي';
        case 'final': return 'نهائي';
        default: return 'غير محدد';
      }
    }
    
    function filterItems() {
      const searchTerm = $('#itemSearch').value.toLowerCase();
      const resultsContainer = $('#itemSearchResults');
      
      if (searchTerm.length < 2) {
        resultsContainer.style.display = 'none';
        return;
      }
      
      const filteredItems = items.filter(item => 
        item.name.toLowerCase().includes(searchTerm) && item.stock > 0
      );
      
      if (filteredItems.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item">لا توجد نتائج</div>';
        resultsContainer.style.display = 'block';
        return;
      }
      
      resultsContainer.innerHTML = filteredItems.map(item => `
        <div class="search-result-item" data-id="${item.id}" data-name="${item.name}" data-unit="${item.unit||''}" data-price="${item.price || 0}" data-stock="${item.stock || 0}">
          ${item.name} - ${item.unit} ${item.price ? `(<span class="ltr-number">${item.price.toLocaleString('en-US')}</span>)` : ''}
          <span class="muted">المخزن: ${item.stock}</span>
        </div>
      `).join('');
      
      resultsContainer.style.display = 'block';
      
      $$('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const itemId = item.dataset.id;
          const itemName = item.dataset.name;
          const itemUnit = item.dataset.unit;
          const itemPrice = item.dataset.price;
          const itemStock = item.dataset.stock;
          
          $('#itemSearch').value = itemName;
          $('#invoiceUnit').value = itemUnit;
          $('#invoiceUnitPrice').value = itemPrice;
          
          if (itemStock == 0) {
            showAlert('الكمية نفذت من هذا الصنف');
            return;
          }
          
          resultsContainer.style.display = 'none';
          recalcCurrentInvoice();
        });
      });
    }
    
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        $('#itemSearchResults').style.display = 'none';
      }
    });

    // ===== CRUD & Actions =====
    
    function handleSaveItem(){
      const name = $('#itemName').value.trim();
      const unit = $('#itemUnit').value;
      const purchasePrice = parseNumber($('#purchasePrice').value);
      const price = parseNumber($('#itemPrice').value);
      const profit = parseNumber($('#profit').value);
      const stock = parseNumber($('#stockQuantity').value);

      if(!name) return showAlert('أدخل اسم الصنف');
      if(!unit) return showAlert('أدخل الوحدة');
      if(purchasePrice <= 0) return showAlert('أدخل سعر الشراء');
      if(price <= 0) return showAlert('أدخل سعر البيع');
      if(profit < 0) return showAlert('الربح غير صحيح');
      if(stock < 0) return showAlert('الكمية غير صحيحة');

      if (editingIndex !== null && items[editingIndex]) {
        // تحديث الصنف الموجود
        items[editingIndex] = {
          ...items[editingIndex],
          name,
          unit,
          purchasePrice,
          price,
          profit,
          stock
        };
        showAlert('تم تحديث الصنف بنجاح');
      } else {
        // إضافة صنف جديد
        const newItem = {
          id: nextItemId++,
          name,
          unit,
          purchasePrice,
          price,
          profit,
          stock
        };
        items.push(newItem);
        showAlert('تم إضافة الصنف بنجاح');
      }

      DB.set('items', items);
      DB.set('nextItemId', nextItemId);

      // إعادة تهيئة الحقول
      $('#itemName').value = '';
      $('#purchasePrice').value = '';
      $('#itemPrice').value = '';
      $('#profit').value = '';
      $('#stockQuantity').value = '';

      // إعادة الحالة
      editingIndex = null;

      renderItems(); 
      renderStats();
    }
    function editItem(i){
      const it = items[i];
      $('#itemName').value = it.name;
      $('#itemUnit').value = it.unit;
      $('#purchasePrice').value = it.purchasePrice;
      $('#itemPrice').value = it.price;
      $('#profit').value = it.profit;
      $('#stockQuantity').value = it.stock;
      
      editingIndex = i;
      
      document.getElementById('items').scrollIntoView({behavior: 'smooth'});
    }

    function deleteItem(i){
      if(!confirm('هل تريد حذف الصنف؟')) return;
      items.splice(i,1);
      DB.set('items', items);
      renderItems(); 
      renderStats();
      showAlert('تم حذف الصنف بنجاح');
    }

    function handleAddCustomer(){
      if(customers.length >= 100 && plan.type === 'free'){
        openSubscribe();
        return;
      }
      
      const name = $('#customerName').value.trim();
      const countryCode = $('#customerCountryCode').value;
      const phone = $('#customerPhone').value.replace(/\D/g, '');
      const currency = $('#customerCurrency').value;
      
      if(!name) return showAlert('أدخل اسم العميل');
      if(!phone) return showAlert('أدخل رقم الهاتف');
      
      const newCustomer = {
        id: Date.now().toString(),
        name, 
        countryCode, 
        phone, 
        currency, 
        ledger: []
      };
      
      customers.push(newCustomer);
      DB.set('customers', customers);
      
      $('#customerName').value = ''; 
      $('#customerPhone').value = '';
      
      renderCustomers(); 
      renderStats();
      showAlert('تم إضافة العميل بنجاح');
    }

    function editCustomer(i){
      const c = customers[i];
      $('#customerName').value = c.name;
      $('#customerCountryCode').value = c.countryCode;
      $('#customerPhone').value = c.phone;
      $('#customerCurrency').value = c.currency;
      
      editingIndex = i;
      
      document.getElementById('customers').scrollIntoView({behavior: 'smooth'});
    }

    function deleteCustomer(i){
      if(!confirm('هل تريد حذف العميل؟')) return;
      customers.splice(i,1);
      DB.set('customers', customers);
      renderCustomers(); 
      renderStats();
      showAlert('تم حذف العميل بنجاح');
    }

    function handleAddInvoiceItem(){
      const customerId = $('#invoiceCustomer').value;
      const searchTerm = $('#itemSearch').value;
      const qty = parseNumber($('#invoiceQty').value);
      const price = parseNumber($('#invoiceUnitPrice').value);
      const unit = $('#invoiceUnit').value;
      
      if(!customerId) return showAlert('اختر العميل');
      if(!searchTerm) return showAlert('اختر الصنف');
      if(qty <= 0) return showAlert('ادخل كمية صحيحة');
      if(price <= 0) return showAlert('ادخل سعر الوحدة');
      
      const item = items.find(i => i.name === searchTerm);
      if (!item) return showAlert('الصنف غير موجود');
      
      if (item.stock < qty) {
        showAlert(`الكمية غير متوفرة. المتاح: ${item.stock}`);
        return;
      }
      
      const total = qty * price;
      
      const existingItemIndex = currentInvoiceItems.findIndex(i => i.itemId === item.id);
      
      if (existingItemIndex !== -1) {
        currentInvoiceItems[existingItemIndex].qty += qty;
        currentInvoiceItems[existingItemIndex].total = currentInvoiceItems[existingItemIndex].qty * currentInvoiceItems[existingItemIndex].price;
      } else {
        currentInvoiceItems.push({
          itemId: item.id,
          item: item.name,
          qty,
          unit,
          price,
          total
        });
      }
      
      renderCurrentInvoiceItems();
      
      $('#itemSearch').value = '';
      $('#invoiceQty').value = 1;
      $('#invoiceUnitPrice').value = '';
      $('#invoiceUnit').value = '';
      
      recalcCurrentInvoice();
    }
    
    function renderCurrentInvoiceItems() {
      const tbody = document.querySelector('#invoiceItemsTableBody');
      tbody.innerHTML = '';
      
      if (currentInvoiceItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center">لا توجد أصناف في الفاتورة</td></tr>';
        $('#invoiceSummary').style.display = 'none';
        return;
      }
      
      currentInvoiceItems.forEach((item, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="ltr-number">${i+1}</td>
          <td colspan="2">${escapeHtml(item.item)}</td>
          <td class="ltr-number">${item.qty}</td>
          <td>${item.unit}</td>
          <td class="ltr-number">${item.price.toLocaleString('en-US')}</td>
          <td class="ltr-number">${item.total.toLocaleString('en-US')}</td>
          <td colspan="2">
            <button class="small" onclick="editInvoiceItem(${i})"><i class="fas fa-edit"></i> تعديل</button>
            <button class="small danger" onclick="removeInvoiceItem(${i})"><i class="fas fa-trash"></i> حذف</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      
      $('#invoiceSummary').style.display = 'block';
    }
    
    function removeInvoiceItem(index) {
      currentInvoiceItems.splice(index, 1);
      renderCurrentInvoiceItems();
      recalcCurrentInvoice();
    }
    
    function editInvoiceItem(index) {
      const item = currentInvoiceItems[index];
      const newQty = prompt(`الكمية الحالية: ${item.qty}. أدخل الكمية الجديدة:`, item.qty);
      
      if (newQty !== null && !isNaN(newQty) && parseInt(newQty) > 0) {
        const originalItem = items.find(i => i.id === item.itemId);
        if (originalItem && originalItem.stock < parseInt(newQty)) {
          showAlert(`الكمية غير متوفرة. المتاح: ${originalItem.stock}`);
          return;
        }
        
        currentInvoiceItems[index].qty = parseInt(newQty);
        currentInvoiceItems[index].total = currentInvoiceItems[index].qty * currentInvoiceItems[index].price;
        renderCurrentInvoiceItems();
        recalcCurrentInvoice();
      }
    }
    
    function recalcCurrentInvoice() {
      const totalAmount = currentInvoiceItems.reduce((sum, item) => sum + item.total, 0);
      const paidAmount = parseNumber($('#paidAmount').value) || 0;
      const remainingAmount = totalAmount - paidAmount;
      
      $('#invoiceTotalAmount').textContent = totalAmount.toLocaleString('en-US');
      $('#invoicePaidAmount').textContent = paidAmount.toLocaleString('en-US');
      $('#invoiceRemainingAmount').textContent = remainingAmount.toLocaleString('en-US');
      
      const customerId = $('#invoiceCustomer').value;
      if (customerId) {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
          const customerBalance = calculateCustomerBalance(customer);
          $('#invoiceCustomerBalance').textContent = customerBalance.toLocaleString('en-US');
          $('#invoiceCurrency').textContent = customer.currency;
          $('#invoiceCurrency2').textContent = customer.currency;
          $('#invoiceCurrency3').textContent = customer.currency;
          $('#invoiceCurrency4').textContent = customer.currency;
        }
      }
    }
    
    function updateCustomerBalance() {
      recalcCurrentInvoice();
    }

    function saveInvoice(){
      const customerId = $('#invoiceCustomer').value;
      const paymentMethod = currentPaymentMethod;
      const status = currentInvoiceStatus;
      const paidAmount = parseNumber($('#paidAmount').value) || 0;
      const totalAmount = currentInvoiceItems.reduce((sum, item) => sum + item.total, 0);
      const remainingAmount = totalAmount - paidAmount;
      
      if(!customerId) return showAlert('اختر العميل');
      if(currentInvoiceItems.length === 0) return showAlert('أضف أصنافاً للفاتورة');
      if(paidAmount > totalAmount) return showAlert('المبلغ المدفوع أكبر من الإجمالي');
      
      const customer = customers.find(c => c.id === customerId);
      if(!customer) return showAlert('العميل غير موجود');
      
      const invoiceNumber = nextInvoiceNumber++;
      
      const invoice = {
        id: editingInvoiceId || Date.now().toString(),
        invoiceNumber: invoiceNumber,
        date: new Date().toISOString(),
        customerId: customerId,
        currency: customer.currency,
        paymentMethod,
        status,
        items: [...currentInvoiceItems],
        totalAmount,
        paidAmount,
        remainingAmount
      };
      
      if(editingInvoiceId){
        const index = invoices.findIndex(inv => inv.id === editingInvoiceId);
        if(index !== -1) invoices[index] = invoice;
      } else {
        invoices.push(invoice);
      }
      
      // خصم الكمية من المخزن
      currentInvoiceItems.forEach(invoiceItem => {
        const itemIndex = items.findIndex(item => item.id === invoiceItem.itemId);
        if (itemIndex !== -1) {
          items[itemIndex].stock -= invoiceItem.qty;
          if (items[itemIndex].stock < 0) items[itemIndex].stock = 0;
        }
      });
      
      // إضافة حركة لكشف الحساب إذا كانت الفاتورة آجلة
      if (paymentMethod === 'آجل') {
        const invoiceEntry = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          type: 'فاتورة',
          amount: totalAmount,
          currency: customer.currency,
          description: `فاتورة مبيعات #${invoiceNumber}`,
          refInvoiceId: invoiceNumber
        };
        
        customer.ledger.push(invoiceEntry);
        
        if (paidAmount > 0) {
          const receiptEntry = {
            id: Date.now().toString() + '-receipt',
            date: new Date().toISOString(),
            type: 'سند قبض',
            amount: paidAmount,
            currency: customer.currency,
            description: `دفع ${paidAmount === totalAmount ? 'كامل' : 'جزئي'} للفاتورة #${invoiceNumber}`,
            refInvoiceId: invoiceNumber
          };
          
          customer.ledger.push(receiptEntry);
        }
      }
      
      DB.set('invoices', invoices);
      DB.set('items', items);
      DB.set('customers', customers);
      DB.set('nextInvoiceNumber', nextInvoiceNumber);
      
      currentInvoiceItems = [];
      editingInvoiceId = null;
      $('#invoiceCustomer').value = '';
      $('#paidAmount').value = '';
      $('#invoiceSummary').style.display = 'none';
      
      renderInvoices(); 
      renderCustomers(); 
      renderItems();
      renderStats();
      showAlert(`تم حفظ الفاتورة رقم ${invoiceNumber}`);
    }
    
    function editExistingInvoice(index) {
      const invoice = invoices[index];
      editingInvoiceId = invoice.id;
      
      $('#invoiceCustomer').value = invoice.customerId;
      currentInvoiceItems = [...invoice.items];
      currentPaymentMethod = invoice.paymentMethod;
      currentInvoiceStatus = invoice.status;
      
      $$('.payment-method').forEach(m => m.classList.remove('active'));
      $(`.payment-method[data-method="${currentPaymentMethod}"]`).classList.add('active');
      
      $$('.invoice-status-btn').forEach(b => b.classList.remove('active'));
      $(`.invoice-status-btn[data-status="${currentInvoiceStatus}"]`).classList.add('active');
      
      if (currentPaymentMethod === 'آجل') {
        $('#paidAmountContainer').style.display = 'grid';
        $('#paidAmount').value = invoice.paidAmount;
      } else {
        $('#paidAmountContainer').style.display = 'none';
      }
      
      renderCurrentInvoiceItems();
      recalcCurrentInvoice();
      
      document.getElementById('invoices').scrollIntoView({behavior: 'smooth'});
    }
    
    function deleteInvoice(i){
      if(!confirm('هل تريد حذف الفاتورة؟')) return;
      
      const invoice = invoices[i];
      
      // إعادة الكمية إلى المخزن
      invoice.items.forEach(invoiceItem => {
        const itemIndex = items.findIndex(item => item.name === invoiceItem.item);
        if (itemIndex !== -1) {
          items[itemIndex].stock += invoiceItem.qty;
        }
      });
      
      invoices.splice(i,1);
      DB.set('invoices', invoices);
      DB.set('items', items);
      
      renderInvoices(); 
      renderItems();
      renderStats();
      showAlert('تم حذف الفاتورة بنجاح');
    }
    
    // ===== كشف الحساب =====
    function addReceipt() {
      const amount = parseNumber($('#receiptAmount').value);
      const notes = $('#receiptNotes').value;
      
      if (!amount || amount <= 0) {
        showAlert('يرجى إدخال مبلغ صحيح');
        return;
      }
      
      if (!currentCustomerLedger) {
        showAlert('يرجى اختيار عميل أولاً');
        return;
      }
      
      const receiptEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        type: 'سند قبض',
        amount: amount,
        currency: currentCustomerLedger.currency,
        description: notes || 'سند قبض',
        refInvoiceId: null
      };
      
      currentCustomerLedger.ledger.push(receiptEntry);
      DB.set('customers', customers);
      
      $('#receiptAmount').value = '';
      $('#receiptNotes').value = '';
      
      renderCustomerLedger(currentCustomerLedger);
      showAlert('تم إضافة سند القبض بنجاح');
    }
    
    function addPayment() {
      const amount = parseNumber($('#paymentAmount').value);
      const notes = $('#paymentNotes').value;
      
      if (!amount || amount <= 0) {
        showAlert('يرجى إدخال مبلغ صحيح');
        return;
      }
      
      if (!currentCustomerLedger) {
        showAlert('يرجى اختيار عميل أولاً');
        return;
      }
      
      const paymentEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        type: 'سند صرف',
        amount: amount,
        currency: currentCustomerLedger.currency,
        description: notes || 'سند صرف',
        refInvoiceId: null
      };
      
      currentCustomerLedger.ledger.push(paymentEntry);
      DB.set('customers', customers);
      
      $('#paymentAmount').value = '';
      $('#paymentNotes').value = '';
      
      renderCustomerLedger(currentCustomerLedger);
      showAlert('تم إضافة سند الصرف بنجاح');
    }
    
    function editTransaction(customerId, transactionId) {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return;
      
      const transaction = customer.ledger.find(t => t.id === transactionId);
      if (!transaction) return;
      
      const newAmount = prompt('المبلغ الحالي: ' + transaction.amount + '\nأدخل المبلغ الجديد:', transaction.amount);
      if (newAmount === null || isNaN(newAmount) || newAmount <= 0) return;
      
      const newNotes = prompt('الوصف الحالي: ' + (transaction.description || '') + '\nأدخل الوصف الجديد:', transaction.description || '');
      
      transaction.amount = parseFloat(newAmount);
      if (newNotes !== null) transaction.description = newNotes;
      
      DB.set('customers', customers);
      renderCustomerLedger(currentCustomerLedger);
      showAlert('تم تعديل الحركة بنجاح');
    }
    
    function deleteTransaction(customerId, transactionId) {
      if (!confirm('هل تريد حذف هذه الحركة؟')) return;
      
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return;
      
      customer.ledger = customer.ledger.filter(t => t.id !== transactionId);
      DB.set('customers', customers);
      renderCustomerLedger(currentCustomerLedger);
      showAlert('تم حذف الحركة بنجاح');
    }
    
    function filterLedgerByCurrency(currency) {
      currentLedgerCurrency = currency;
      $$('.currency-tab').forEach(tab => tab.classList.remove('active'));
      $(`.currency-tab[data-currency="${currency}"]`).classList.add('active');
      renderCustomerLedger(currentCustomerLedger);
    }
    
    function filterLedger() {
      renderCustomerLedger(currentCustomerLedger);
    }
    
    // ===== إلغاء ترحيل الفاتورة =====
    function unpostInvoice(index) {
      const invoice = invoices[index];
      
      if (!confirm(`هل تريد إلغاء ترحيل الفاتورة رقم ${invoice.invoiceNumber}؟ هذا الإجراء لا يمكن التراجع عنه.`)) {
        return;
      }
      
      const customer = customers.find(c => c.id === invoice.customerId);
      if (!customer) {
        showAlert('العميل غير موجود');
        return;
      }
      
      // إعادة الكمية إلى المخزن
      invoice.items.forEach(invoiceItem => {
        const itemIndex = items.findIndex(item => item.name === invoiceItem.item);
        if (itemIndex !== -1) {
          items[itemIndex].stock += invoiceItem.qty;
        }
      });
      
      // إلغاء قيود الفاتورة من كشف حساب العميل
      if (invoice.paymentMethod === 'آجل') {
        customer.ledger = customer.ledger.filter(entry => 
          !(entry.refInvoiceId === invoice.invoiceNumber)
        );
      }
      
      // تغيير حالة الفاتورة إلى معلقة
      invoice.status = 'suspended';
      
      DB.set('invoices', invoices);
      DB.set('customers', customers);
      DB.set('items', items);
      
      renderFinalInvoices();
      renderCustomers();
      renderItems();
      showAlert('تم إلغاء ترحيل الفاتورة بنجاح');
    }
    
    // ===== معاينة وطباعة الفاتورة =====
    function previewInvoice(index) {
      const invoice = invoices[index];
      const customer = customers.find(c => c.id === invoice.customerId);
      
      if (!customer) {
        showAlert('العميل غير موجود');
        return;
      }
      
      $('#paperInvoiceNumber').textContent = invoice.invoiceNumber;
      $('#paperMeta').innerHTML = `
        <div>التاريخ: ${new Date(invoice.date).toLocaleString('ar-EG')}</div>
        <div>العميل: ${customer.name}</div>
        <div>طريقة الدفع: ${invoice.paymentMethod}</div>
      `;
      
      const paperLines = document.querySelector('#paperLines');
      paperLines.innerHTML = '';
      invoice.items.forEach((item, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="ltr-number">${i+1}</td>
          <td>${escapeHtml(item.item)}</td>
          <td class="ltr-number">${item.qty}</td>
          <td>${item.unit}</td>
          <td class="ltr-number">${item.price.toLocaleString('en-US')}</td>
          <td class="ltr-number">${item.total.toLocaleString('en-US')}</td>
        `;
        paperLines.appendChild(tr);
      });
      
      $('#paperTotal').innerHTML = formatMoney(invoice.totalAmount, invoice.currency);
      $('#paperPaid').innerHTML = formatMoney(invoice.paidAmount, invoice.currency);
      $('#paperRemaining').innerHTML = formatMoney(invoice.remainingAmount, invoice.currency);
      
      const customerBalance = calculateCustomerBalance(customer);
      $('#paperCustomerBalance').innerHTML = formatMoney(customerBalance, customer.currency);
      
      $('#paperStoreName').textContent = store.name;
      $('#paperStorePhone').textContent = `تواصل: ${store.phone}`;
      
      $('#printArea').style.display = 'block';
      document.getElementById('printArea').scrollIntoView({behavior: 'smooth'});
    }
    
    function printOrExport() {
      const paperSize = $('#paperSize').value;
      const paper = document.querySelector('#invoicePaper');
      
      if (paperSize === '80mm') {
        paper.className = 'paper paper-80mm';
      } else {
        paper.className = 'paper paper-a4';
      }
      
      const opt = {
        margin: 1,
        filename: `invoice-${$('#paperInvoiceNumber').textContent}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: paperSize === '80mm' ? [58, 200] : 'a4', orientation: 'portrait' }
      };
      
      html2pdf().set(opt).from(paper).save();
    }
    
    // ===== التصدير =====
    function exportLedgerCSV() {
      if (!currentCustomerLedger || !currentCustomerLedger.ledger || currentCustomerLedger.ledger.length === 0) {
        showAlert('لا توجد بيانات للتصدير');
        return;
      }
      
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "التاريخ,النوع,الوصف,العملة,مدين,دائن,الرصيد,رقم الفاتورة\n";
      
      let runningBalance = 0;
      const sortedLedger = [...currentCustomerLedger.ledger].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      sortedLedger.forEach(entry => {
        if (currentLedgerCurrency !== 'ALL' && entry.currency !== currentLedgerCurrency) {
          return;
        }
        
        if (entry.type === 'فاتورة' || entry.type === 'سند صرف') {
          runningBalance -= entry.amount;
        } else if (entry.type === 'سند قبض') {
          runningBalance += entry.amount;
        }
        
        const row = [
          new Date(entry.date).toLocaleString('ar-EG'),
          entry.type,
          entry.description || '-',
          entry.currency || currentCustomerLedger.currency,
          (entry.type === 'فاتورة' || entry.type === 'سند صرف') ? entry.amount : '',
          entry.type === 'سند قبض' ? entry.amount : '',
          runningBalance,
          entry.refInvoiceId || '-'
        ].join(',');
        
        csvContent += row + "\n";
      });
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `كشف-حساب-${currentCustomerLedger.name}-${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
    }
    
    function exportInvoicesCSV() {
      if (invoices.length === 0) {
        showAlert('لا توجد فواتير للتصدير');
        return;
      }
      
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "رقم الفاتورة,التاريخ,العميل,طريقة الدفع,الحالة,العملة,الإجمالي,المدفوع,المتبقي\n";
      
      invoices.forEach(inv => {
        const customer = customers.find(c => c.id === inv.customerId) || { name: 'عميل نقدي' };
        const row = [
          inv.invoiceNumber,
          new Date(inv.date).toLocaleString('ar-EG'),
          customer.name,
          inv.paymentMethod,
          getInvoiceStatusText(inv.status),
          inv.currency,
          inv.totalAmount,
          inv.paidAmount,
          inv.remainingAmount
        ].join(',');
        
        csvContent += row + "\n";
      });
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `الفواتير-${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
    }
    
    function exportInvoicesPDF() {
      if (invoices.length === 0) {
        showAlert('لا توجد فواتير للتصدير');
        return;
      }
      
      let content = `
        <div style="padding: 20px; direction: rtl;">
          <h2 style="text-align: center;">تقرير الفواتير</h2>
          <p style="text-align: center;">تاريخ التصدير: ${new Date().toLocaleString('ar-EG')}</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background: #4a6491; color: white;">
                <th style="padding: 10px; border: 1px solid #ddd;">رقم الفاتورة</th>
                <th style="padding: 10px; border: 1px solid #ddd;">التاريخ</th>
                <th style="padding: 10px; border: 1px solid #ddd;">العميل</th>
                <th style="padding: 10px; border: 1px solid #ddd;">طريقة الدفع</th>
                <th style="padding: 10px; border: 1px solid #ddd;">الحالة</th>
                <th style="padding: 10px; border: 1px solid #ddd;">العملة</th>
                <th style="padding: 10px; border: 1px solid #ddd;">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      invoices.forEach(inv => {
        const customer = customers.find(c => c.id === inv.customerId) || { name: 'عميل نقدي' };
        content += `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">${inv.invoiceNumber}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${new Date(inv.date).toLocaleString('ar-EG')}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${customer.name}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${inv.paymentMethod}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${getInvoiceStatusText(inv.status)}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${inv.currency}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${inv.totalAmount.toFixed(2)}</td>
          </tr>
        `;
      });
      
      content += `
            </tbody>
          </table>
        </div>
      `;
      
      const opt = {
        margin: 1,
        filename: `تقرير-الفواتير-${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      const element = document.createElement('div');
      element.innerHTML = content;
      html2pdf().set(opt).from(element).save();
    }
    
    function exportLedgerPDF() {
      if (!currentCustomerLedger || !currentCustomerLedger.ledger || currentCustomerLedger.ledger.length === 0) {
        showAlert('لا توجد بيانات للتصدير');
        return;
      }
      
      let content = `
        <div style="padding: 20px; direction: rtl;">
          <h2 style="text-align: center;">كشف حساب ${currentCustomerLedger.name}</h2>
          <p style="text-align: center;">تاريخ التصدير: ${new Date().toLocaleString('ar-EG')}</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background: #4a6491; color: white;">
                <th style="padding: 10px; border: 1px solid #ddd;">التاريخ</th>
                <th style="padding: 10px; border: 1px solid #ddd;">النوع</th>
                <th style="padding: 10px; border: 1px solid #ddd;">الوصف</th>
                <th style="padding: 10px; border: 1px solid #ddd;">العملة</th>
                <th style="padding: 10px; border: 1px solid #ddd;">مدين</th>
                <th style="padding: 10px; border: 1px solid #ddd;">دائن</th>
                <th style="padding: 10px; border: 1px solid #ddd;">الرصيد</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      let runningBalance = 0;
      const sortedLedger = [...currentCustomerLedger.ledger].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      sortedLedger.forEach(entry => {
        if (currentLedgerCurrency !== 'ALL' && entry.currency !== currentLedgerCurrency) {
          return;
        }
        
        if (entry.type === 'فاتورة' || entry.type === 'سند صرف') {
          runningBalance -= entry.amount;
        } else if (entry.type === 'سند قبض') {
          runningBalance += entry.amount;
        }
        
        content += `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">${new Date(entry.date).toLocaleString('ar-EG')}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${entry.type}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${entry.description || '-'}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${entry.currency || currentCustomerLedger.currency}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${(entry.type === 'فاتورة' || entry.type === 'سند صرف') ? entry.amount.toFixed(2) : ''}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${entry.type === 'سند قبض' ? entry.amount.toFixed(2) : ''}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${runningBalance.toFixed(2)}</td>
          </tr>
        `;
      });
      
      content += `
            </tbody>
          </table>
        </div>
      `;
      
      const opt = {
        margin: 1,
        filename: `كشف-حساب-${currentCustomerLedger.name}-${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      const element = document.createElement('div');
      element.innerHTML = content;
      html2pdf().set(opt).from(element).save();
    }
    
    // ===== التواصل =====
    function sendWhatsApp(phone, name) {
      const message = `مرحباً ${name}، نأمل أن تكون بخير.`;
      const url = `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }
    
    function sendSMS(phone, name) {
      const message = `مرحباً ${name}، نأمل أن تكون بخير.`;
      const url = `sms:${phone}?body=${encodeURIComponent(message)}`;
      window.location.href = url;
    }
    
    function callCustomer(phone) {
      window.location.href = `tel:${phone}`;
    }
    
    function sendInvoiceWhatsApp(index) {
      const invoice = invoices[index];
      const customer = customers.find(c => c.id === invoice.customerId);
      
      if (!customer) {
        showAlert('العميل غير موجود');
        return;
      }
      
      const message = `مرحباً ${customer.name}،
      نرفق لكم فاتورتكم رقم ${invoice.invoiceNumber}
      التاريخ: ${new Date(invoice.date).toLocaleString('ar-EG')}
      الإجمالي: ${invoice.totalAmount} ${invoice.currency}
      المدفوع: ${invoice.paidAmount} ${invoice.currency}
      المتبقي: ${invoice.remainingAmount} ${invoice.currency}
      
      شكراً لتعاملكم معنا`;
      
      const url = `https://wa.me/${customer.countryCode}${customer.phone.replace('+', '')}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }
    
    function sendInvoiceSMS(index) {
      const invoice = invoices[index];
      const customer = customers.find(c => c.id === invoice.customerId);
      
      if (!customer) {
        showAlert('العميل غير موجود');
        return;
      }
      
      const message = `فاتورتكم رقم ${invoice.invoiceNumber} - الإجمالي: ${invoice.totalAmount} ${invoice.currency}`;
      const url = `sms:${customer.countryCode}${customer.phone}?body=${encodeURIComponent(message)}`;
      window.location.href = url;
    }
    
    // ===== إعدادات المتجر =====
    function saveStore() {
      const name = $('#storeName').value.trim();
      const phone = $('#storePhone').value;
      
      if (!name) {
        showAlert('يرجى إدخال اسم المتجر');
        return;
      }
      
      store = { name, phone };
      DB.set('store', store);
      showAlert('تم حفظ بيانات المتجر بنجاح');
    }
    
    // ===== إعدادات الخطة =====
    function savePlan() {
      const type = $('#planType').value;
      const price = parseNumber($('#planPrice').value);
      
      plan = { type, price };
      DB.set('plan', plan);
      showAlert('تم حفظ إعدادات الخطة بنجاح');
    }
    
    // ===== تغيير كلمة المرور =====
    function changePassword() {
      const current = $('#currentPassword').value;
      const newPass = $('#newPassword').value;
      const confirm = $('#confirmPassword').value;
      
      if (!current || !newPass || !confirm) {
        showAlert('يرجى ملء جميع الحقول');
        return;
      }
      
      if (newPass !== confirm) {
        showAlert('كلمة المرور الجديدة غير متطابقة');
        return;
      }
      
      if (users.admin.password !== current) {
        showAlert('كلمة المرور الحالية غير صحيحة');
        return;
      }
      
      users.admin.password = newPass;
      DB.set('users', users);
      
      $('#currentPassword').value = '';
      $('#newPassword').value = '';
      $('#confirmPassword').value = '';
      
      showAlert('تم تغيير كلمة المرور بنجاح');
    }
    
    // ===== النسخ الاحتياطي =====
    function exportData() {
      const data = {
        items,
        customers,
        invoices,
        plan,
        store,
        users,
        nextInvoiceNumber,
        nextItemId
      };
      
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], {type: 'application/json'});
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `qasem-backup-${new Date().toISOString().slice(0,10)}.json`;
      link.click();
    }
    
    function importData() {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json';
      
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            
            if (confirm('هل تريد استيراد البيانات؟ هذا سيحذف جميع البيانات الحالية.')) {
              items = data.items || [];
              customers = data.customers || [];
              invoices = data.invoices || [];
              plan = data.plan || {type: 'free', price: 0};
              store = data.store || {name: '', phone: ''};
              users = data.users || {admin: {password: 'admin123', name: 'مدير النظام'}};
              nextInvoiceNumber = data.nextInvoiceNumber || 1;
              nextItemId = data.nextItemId || 6;
              
              DB.set('items', items);
              DB.set('customers', customers);
              DB.set('invoices', invoices);
              DB.set('plan', plan);
              DB.set('store', store);
              DB.set('users', users);
              DB.set('nextInvoiceNumber', nextInvoiceNumber);
              DB.set('nextItemId', nextItemId);
              
              renderItems();
              renderCustomers();
              renderInvoices();
              renderStats();
              
              showAlert('تم استيراد البيانات بنجاح');
            }
          } catch (error) {
            showAlert('خطأ في استيراد البيانات: ' + error.message);
          }
        };
        
        reader.readAsText(file);
      };
      
      fileInput.click();
    }
    
    // ===== الاشتراك =====
    function openSubscribe() {
      $('#subscribeDialog').classList.add('open');
    }
    
    function closeSubscribe() {
      $('#subscribeDialog').classList.remove('open');
    }
    
    // ===== تسجيل الدخول والخروج =====
    function login() {
      const username = $('#username').value;
      const password = $('#password').value;
      
      if (!username || !password) {
        showAlert('يرجى إدخال اسم المستخدم وكلمة المرور');
        return;
      }
      
      if (users[username] && users[username].password === password) {
        $('#loginScreen').style.display = 'none';
        $('#app').style.display = 'block';
        $('#currentUser').textContent = users[username].name;
        init();
      } else {
        showAlert('اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    }
    
    function logout() {
      $('#loginScreen').style.display = 'flex';
      $('#app').style.display = 'none';
      $('#username').value = '';
      $('#password').value = '';
    }
    
    // ===== التصفية =====
    function filterInvoices() {
      const customerId = $('#invoiceCustomerFilter').value;
      const fromDate = $('#invoiceFromDate').value;
      const toDate = $('#invoiceToDate').value;
      const status = $('#invoiceStatusFilter').value;
      const paymentMethod = $('#invoicePaymentFilter').value;
      const currency = $('#invoiceCurrencyFilter').value;
      
      const tbody = document.querySelector('#invoicesTableBody');
      tbody.innerHTML = '';
      
      const filteredInvoices = invoices.filter(inv => {
        if (customerId && inv.customerId !== customerId) return false;
        if (fromDate && new Date(inv.date) < new Date(fromDate)) return false;
        if (toDate && new Date(inv.date) > new Date(toDate + 'T23:59:59')) return false;
        if (status && inv.status !== status) return false;
        if (paymentMethod && inv.paymentMethod !== paymentMethod) return false;
        if (currency && inv.currency !== currency) return false;
        return true;
      });
      
      if (filteredInvoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center">لا توجد فواتير مطابقة</td></tr>';
        return;
      }
      
      filteredInvoices.forEach((inv, i) => {
        const customer = customers.find(c => c.id === inv.customerId) || { name: 'عميل نقدي' };
        const statusText = getInvoiceStatusText(inv.status);
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="ltr-number">${i+1}</td>
          <td class="ltr-number">${inv.invoiceNumber}</td>
          <td>${new Date(inv.date).toLocaleString('ar-EG')}</td>
          <td>${escapeHtml(customer.name)}</td>
          <td>${inv.paymentMethod || 'نقدي'}</td>
          <td>${statusText}</td>
          <td>${inv.currency}</td>
          <td class="ltr-number">${inv.totalAmount.toLocaleString('en-US')}</td>
          <td>
            <div class="customer-actions">
              <button class="small" onclick="previewInvoice(${invoices.findIndex(i => i.id === inv.id)})"><i class="fas fa-eye"></i> عرض</button>
              ${inv.status !== 'final' ? `<button class="small" onclick="editExistingInvoice(${invoices.findIndex(i => i.id === inv.id)})"><i class="fas fa-edit"></i> تعديل</button>` : ''}
              <button class="small danger" onclick="deleteInvoice(${invoices.findIndex(i => i.id === inv.id)})"><i class="fas fa-trash"></i></button>
              <button class="action-btn whatsapp" onclick="sendInvoiceWhatsApp(${invoices.findIndex(i => i.id === inv.id)})" title="إرسال الفاتورة عبر واتساب"><i class="fab fa-whatsapp"></i></button>
              <button class="action-btn sms" onclick="sendInvoiceSMS(${invoices.findIndex(i => i.id === inv.id)})" title="إرسال الفاتورة عبر SMS"><i class="fas fa-sms"></i></button>
            </div>
          </td>`;
        tbody.appendChild(tr);
      });
    }
    
    // ===== التهيئة =====
    function init() {
      items = DB.get('items', DEFAULT_ITEMS);
      customers = DB.get('customers', []);
      invoices = DB.get('invoices', []);
      plan = DB.get('plan', {type: 'free', price: 0});
      store = DB.get('store', {name: 'QASEM FOR SUPERMARKET SYSTEMS', phone: '733239920'});
      users = DB.get('users', {admin: {password: 'admin123', name: 'مدير النظام'}});
      nextInvoiceNumber = DB.get('nextInvoiceNumber', 1);
      nextItemId = DB.get('nextItemId', 6);
      
      $('#storeName').value = store.name;
      $('#storePhone').value = store.phone;
      $('#planType').value = plan.type;
      $('#planPrice').value = plan.price;
      
      renderItems();
      renderCustomers();
      renderInvoices();
      renderStats();
    }

    // السماح بإدخال البيانات باستخدام زر Enter
    document.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        
        if (activeElement.id === 'username' || activeElement.id === 'password') {
          login();
        } else if (activeElement.id === 'itemName') {
        handleSaveItem();
        } else if (activeElement.id === 'customerName') {
          handleAddCustomer();
        }
      }
    });

    // تهيئة التطبيق عند تحميل الصفحة
    window.addEventListener('load', function() {
      // تحميل الإعدادات أولاً
      const settings = DB.get('settings', {});
      
      // إذا كان هناك مستخدم مسجل دخوله، تحميل التطبيق مباشرة
      const loggedInUser = DB.get('loggedInUser', null);
      if (loggedInUser) {
        $('#loginScreen').style.display = 'none';
        $('#app').style.display = 'block';
        $('#currentUser').textContent = loggedInUser.name;
        init();
      }
    });

    // جعل الدوال متاحة عالمياً
    window.login = login;
    window.logout = logout;
    window.handleSaveItem = handleSaveItem;
    window.handleAddItem = handleSaveItem;
    window.editItem = editItem;
    window.deleteItem = deleteItem;
    window.handleAddCustomer = handleAddCustomer;
    window.editCustomer = editCustomer;
    window.deleteCustomer = deleteCustomer;
    window.showCustomerLedger = showCustomerLedger;
    window.handleAddInvoiceItem = handleAddInvoiceItem;
    window.editInvoiceItem = editInvoiceItem;
    window.removeInvoiceItem = removeInvoiceItem;
    window.saveInvoice = saveInvoice;
    window.editExistingInvoice = editExistingInvoice;
    window.deleteInvoice = deleteInvoice;
    window.previewInvoice = previewInvoice;
    window.printOrExport = printOrExport;
    window.hidePrintArea = hidePrintArea;
    window.addReceipt = addReceipt;
    window.addPayment = addPayment;
    window.editTransaction = editTransaction;
    window.deleteTransaction = deleteTransaction;
    window.filterLedgerByCurrency = filterLedgerByCurrency;
    window.filterLedger = filterLedger;
    window.unpostInvoice = unpostInvoice;
    window.exportLedgerCSV = exportLedgerCSV;
    window.exportLedgerPDF = exportLedgerPDF;
    window.exportInvoicesCSV = exportInvoicesCSV;
    window.exportInvoicesPDF = exportInvoicesPDF;
    window.sendWhatsApp = sendWhatsApp;
    window.sendSMS = sendSMS;
    window.callCustomer = callCustomer;
    window.sendInvoiceWhatsApp = sendInvoiceWhatsApp;
    window.sendInvoiceSMS = sendInvoiceSMS;
    window.saveStore = saveStore;
    window.savePlan = savePlan;
    window.changePassword = changePassword;
    window.exportData = exportData;
    window.importData = importData;
    window.openSubscribe = openSubscribe;
    window.closeSubscribe = closeSubscribe;
    window.selectPaymentMethod = selectPaymentMethod;
    window.selectInvoiceStatus = selectInvoiceStatus;
    window.showLedgerTab = showLedgerTab;
    window.calculateProfit = calculateProfit;
  

// إرسال الفاتورة عبر واتساب PDF
document.getElementById("sendInvoiceWhatsapp")?.addEventListener("click", async () => {
  const pdfBlob = await generateInvoicePDF(); // الدالة الأصلية لإنشاء PDF
  const pdfFile = new File([pdfBlob], "invoice.pdf", { type: "application/pdf" });
  const waUrl = "https://wa.me/?text=" + encodeURIComponent("مرفق الفاتورة بصيغة PDF") ;
  if (navigator.share) {
    navigator.share({
      files: [pdfFile],
      title: "فاتورة",
      text: "تم إنشاء الفاتورة، مرفق PDF.",
    }).catch(console.error);
  } else {
    window.open(waUrl, "_blank");
  }
});

// إرسال كشف الحساب عبر واتساب PDF
document.getElementById("sendStatementWhatsapp")?.addEventListener("click", async () => {
  const pdfBlob = await generateStatementPDF(); // الدالة الأصلية لإنشاء PDF
  const pdfFile = new File([pdfBlob], "statement.pdf", { type: "application/pdf" });
  const waUrl = "https://wa.me/?text=" + encodeURIComponent("مرفق كشف الحساب بصيغة PDF") ;
  if (navigator.share) {
    navigator.share({
      files: [pdfFile],
      title: "كشف حساب",
      text: "تم إنشاء كشف الحساب، مرفق PDF.",
    }).catch(console.error);
  } else {
    window.open(waUrl, "_blank");
  }
});
