const STORE = 'kaiwei_revised_ui_data_v5';
const CONN = 'kaiwei_revised_ui_conn_v5';

let db = {
  revenue: [],
  gas: [],
  costs: [],
  fixed: []
};

let sb = null;

const $ = (id) => document.getElementById(id);
const todayStr = () => new Date().toISOString().slice(0, 10);
const monthStr = () => new Date().toISOString().slice(0, 7);
const uid = () => 'id_' + Math.random().toString(36).slice(2, 10);
const money = (n) => new Intl.NumberFormat('zh-TW').format(Math.round(Number(n || 0)));
const safe = (v) => (v === null || v === undefined ? '' : String(v));

function loadDb() {
  const raw = localStorage.getItem(STORE);
  if (raw) {
    db = JSON.parse(raw);
  } else {
    db.fixed = [
      { id: uid(), item_key: 'rent', item_name: '房租', monthly_amount: 25000, note: '' },
      { id: uid(), item_key: 'electricity_avg', item_name: '電費平均', monthly_amount: 15000, note: '三月起平均抓15000' },
      { id: uid(), item_key: 'amortization', item_name: '攤提', monthly_amount: 10000, note: '' },
      { id: uid(), item_key: 'salary_jian', item_name: '簡蕙雯薪資', monthly_amount: 40000, note: '' },
      { id: uid(), item_key: 'salary_wu', item_name: '吳昱民薪資', monthly_amount: 40000, note: '' },
      { id: uid(), item_key: 'part_time', item_name: '兼職人力', monthly_amount: 25000, note: '' },
      { id: uid(), item_key: 'internet', item_name: '網路', monthly_amount: 1299, note: '' }
    ];
    saveDb();
  }
}

function saveDb() {
  localStorage.setItem(STORE, JSON.stringify(db));
}

function loadConn() {
  const raw = localStorage.getItem(CONN);
  if (!raw) return;
  const c = JSON.parse(raw);
  if ($('supabaseUrl')) $('supabaseUrl').value = c.url || '';
  if ($('supabaseKey')) $('supabaseKey').value = c.key || '';
  initSb();
}

function saveConnection() {
  localStorage.setItem(
    CONN,
    JSON.stringify({
      url: $('supabaseUrl') ? $('supabaseUrl').value.trim() : '',
      key: $('supabaseKey') ? $('supabaseKey').value.trim() : ''
    })
  );
  initSb();
  if ($('connMsg')) $('connMsg').textContent = '已儲存設定';
}

function initSb() {
  const raw = localStorage.getItem(CONN);
  if (!raw) return;
  const c = JSON.parse(raw);
  if (c.url && c.key) {
    try {
      sb = window.supabase.createClient(c.url, c.key);
      if ($('connMsg')) $('connMsg').textContent = 'Supabase 已連線';
    } catch (e) {
      sb = null;
      if ($('connMsg')) $('connMsg').textContent = 'Supabase 設定失敗';
      console.error(e);
    }
  }
}

function bind() {
  document.querySelectorAll('.tabs button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.add('hidden'));
      const target = $(btn.dataset.tab);
      if (target) target.classList.remove('hidden');
    });
  });

  $('saveConnBtn')?.addEventListener('click', saveConnection);
  $('syncBtn')?.addEventListener('click', manualSyncAll);

  $('saveRevenueBtn')?.addEventListener('click', saveRevenue);
  $('clearRevenueBtn')?.addEventListener('click', clearRevenue);

  $('saveGasBtn')?.addEventListener('click', saveGas);
  $('clearGasBtn')?.addEventListener('click', clearGas);

  $('saveCostBtn')?.addEventListener('click', saveCost);
  $('clearCostBtn')?.addEventListener('click', clearCost);

  $('saveFixedBtn')?.addEventListener('click', saveFixed);
  $('clearFixedBtn')?.addEventListener('click', clearFixed);

  $('refreshBtn')?.addEventListener('click', renderAll);
  $('demoBtn')?.addEventListener('click', loadDemo);
  $('exportBtn')?.addEventListener('click', exportJson);

  ['revCash', 'revOnline', 'revUber', 'revOther'].forEach((id) => {
    $(id)?.addEventListener('input', updateRevenueTotalDisplay);
  });
}

function revenueTotal(r) {
  return (
    Number(r.cash_amount || 0) +
    Number(r.online_amount || 0) +
    Number(r.uber_amount || 0) +
    Number(r.other_platform_amount || 0)
  );
}

function updateRevenueTotalDisplay() {
  const total =
    Number($('revCash')?.value || 0) +
    Number($('revOnline')?.value || 0) +
    Number($('revUber')?.value || 0) +
    Number($('revOther')?.value || 0);

  if ($('revTotalDisplay')) $('revTotalDisplay').textContent = money(total);
}

function prevGas(logDate, id) {
  const rows = [...db.gas]
    .filter((x) => x.id !== id)
    .sort((a, b) => a.log_date.localeCompare(b.log_date));
  const prev = rows.filter((x) => x.log_date < logDate);
  return prev.length ? prev[prev.length - 1] : null;
}

function gasCalc(g) {
  if (g.is_start_meter) return { usage: 0, cost: 0, prev: null };
  const prev = prevGas(g.log_date, g.id);
  if (!prev) return { usage: 0, cost: 0, prev: null };

  const usage = Math.max(0, Number(g.meter_reading || 0) - Number(prev.meter_reading || 0));
  return {
    usage,
    cost: usage * Number(g.cost_per_unit || 128),
    prev: prev.meter_reading
  };
}

function upsert(key, row) {
  const i = db[key].findIndex((x) => x.id === row.id);
  if (i >= 0) db[key][i] = row;
  else db[key].push(row);
  saveDb();
}

function clearRevenue() {
  if ($('revId')) $('revId').value = '';
  if ($('revDate')) $('revDate').value = todayStr();
  if ($('revCash')) $('revCash').value = 0;
  if ($('revOnline')) $('revOnline').value = 0;
  if ($('revUber')) $('revUber').value = 0;
  if ($('revOther')) $('revOther').value = 0;
  if ($('revOrders')) $('revOrders').value = 0;
  if ($('revNote')) $('revNote').value = '';
  updateRevenueTotalDisplay();
}

function clearGas() {
  if ($('gasId')) $('gasId').value = '';
  if ($('gasDate')) $('gasDate').value = todayStr();
  if ($('gasMeter')) $('gasMeter').value = '';
  if ($('gasUnitCost')) $('gasUnitCost').value = 128;
  if ($('gasIsStart')) $('gasIsStart').checked = false;
  if ($('gasNote')) $('gasNote').value = '';
}

function clearCost() {
  if ($('costId')) $('costId').value = '';
  if ($('costDate')) $('costDate').value = todayStr();
  if ($('costCategory')) $('costCategory').value = '';
  if ($('costItem')) $('costItem').value = '';
  if ($('costQuantity')) $('costQuantity').value = '';
  if ($('costUnit')) $('costUnit').value = '';
  if ($('costAmount')) $('costAmount').value = '';
  if ($('costSupplier')) $('costSupplier').value = '';
  if ($('costQtyNote')) $('costQtyNote').value = '';
  if ($('costUnpaid')) $('costUnpaid').checked = false;
  if ($('costStaffMeal')) $('costStaffMeal').checked = false;
  if ($('costNote')) $('costNote').value = '';
}

function clearFixed() {
  if ($('fixedId')) $('fixedId').value = '';
  if ($('fixedKey')) $('fixedKey').value = '';
  if ($('fixedName')) $('fixedName').value = '';
  if ($('fixedAmount')) $('fixedAmount').value = '';
  if ($('fixedNote')) $('fixedNote').value = '';
}

async function saveRevenue() {
  const row = {
    id: $('revId')?.value || uid(),
    business_date: $('revDate')?.value || '',
    cash_amount: Number($('revCash')?.value || 0),
    online_amount: Number($('revOnline')?.value || 0),
    uber_amount: Number($('revUber')?.value || 0),
    other_platform_amount: Number($('revOther')?.value || 0),
    order_count: Number($('revOrders')?.value || 0),
    note: $('revNote')?.value || ''
  };

  if (!row.business_date) {
    alert('請填日期');
    return;
  }

  upsert('revenue', row);

  if (sb) {
    try {
      await sb.from('daily_revenue').upsert(
        {
          business_date: row.business_date,
          cash_amount: row.cash_amount,
          online_amount: row.online_amount,
          uber_amount: row.uber_amount,
          other_platform_amount: row.other_platform_amount,
          order_count: row.order_count,
          note: row.note || ''
        },
        { onConflict: 'business_date' }
      );
    } catch (e) {
      console.error('營業額同步失敗', e);
    }
  }

  clearRevenue();

  if (sb) {
    await fetchAllFromSupabase();
  }

  renderAll();
}

async function saveGas() {
  const row = {
    id: $('gasId')?.value || uid(),
    log_date: $('gasDate')?.value || '',
    meter_reading: Number($('gasMeter')?.value || 0),
    cost_per_unit: Number($('gasUnitCost')?.value || 128),
    is_start_meter: !!$('gasIsStart')?.checked,
    note: $('gasNote')?.value || ''
  };

  if (!row.log_date) {
    alert('請填日期');
    return;
  }

  upsert('gas', row);

  if (sb) {
    try {
      await sb.from('gas_logs').upsert(
        {
          log_date: row.log_date,
          meter_reading: row.meter_reading,
          cost_per_unit: row.cost_per_unit,
          note: (row.is_start_meter ? '[起始度數] ' : '') + (row.note || '')
        },
        { onConflict: 'log_date' }
      );
    } catch (e) {
      console.error('瓦斯同步失敗', e);
    }
  }

  clearGas();

  if (sb) {
    await fetchAllFromSupabase();
  }

  renderAll();
}

async function saveCost() {
  const row = {
    id: $('costId')?.value || uid(),
    expense_date: $('costDate')?.value || '',
    category: $('costCategory')?.value || '',
    item_name: $('costItem')?.value || '',
    quantity: $('costQuantity')?.value ? Number($('costQuantity').value) : null,
    unit: $('costUnit')?.value || '',
    amount: Number($('costAmount')?.value || 0),
    supplier: $('costSupplier')?.value || '',
    qty_note: $('costQtyNote')?.value || '',
    is_unpaid: !!$('costUnpaid')?.checked,
    is_staff_meal: !!$('costStaffMeal')?.checked,
    note: $('costNote')?.value || ''
  };

  if (!row.expense_date || !row.category || !row.item_name) {
    alert('日期、類別、品項必填');
    return;
  }

  upsert('costs', row);

  if (sb) {
    try {
      let detail = '';
      if (row.quantity !== null && row.quantity !== '') detail += `數量：${row.quantity} ${row.unit || ''} `;
      if (row.qty_note) detail += `額外說明：${row.qty_note} `;
      if (row.note) detail += row.note;

      await sb.from('expense_records').insert({
        expense_date: row.expense_date,
        category: row.category,
        item_name: row.item_name,
        quantity: row.quantity,
        unit: row.unit || '',
        amount: row.amount,
        supplier: row.supplier || '',
        is_unpaid: !!row.is_unpaid,
        is_staff_meal: !!row.is_staff_meal,
        note: detail.trim(),
        photo_name: ''
      });
    } catch (e) {
      console.error('成本同步失敗', e);
    }
  }

  clearCost();

  if (sb) {
    await fetchAllFromSupabase();
  }

  renderAll();
}

async function saveFixed() {
  const row = {
    id: $('fixedId')?.value || uid(),
    item_key: $('fixedKey')?.value || '',
    item_name: $('fixedName')?.value || '',
    monthly_amount: Number($('fixedAmount')?.value || 0),
    note: $('fixedNote')?.value || ''
  };

  if (!row.item_key || !row.item_name) {
    alert('鍵值與名稱必填');
    return;
  }

  upsert('fixed', row);

  if (sb) {
    try {
      await sb.from('fixed_costs').upsert(
        {
          item_key: row.item_key,
          item_name: row.item_name,
          monthly_amount: row.monthly_amount,
          note: row.note || ''
        },
        { onConflict: 'item_key' }
      );
    } catch (e) {
      console.error('固定成本同步失敗', e);
    }
  }

  clearFixed();

  if (sb) {
    await fetchAllFromSupabase();
  }

  renderAll();
}

async function del(key, id) {
  if (!confirm('確定刪除？')) return;

  const item = db[key].find(x => x.id === id);

  if (sb && item) {
    try {
      if (key === 'revenue') {
        await sb.from('daily_revenue')
          .delete()
          .eq('business_date', item.business_date);
      }

      if (key === 'gas') {
        await sb.from('gas_logs')
          .delete()
          .eq('log_date', item.log_date);
      }

      if (key === 'costs') {
        await sb.from('expense_records')
          .delete()
          .eq('expense_date', item.expense_date)
          .eq('item_name', item.item_name)
          .eq('amount', item.amount);
      }

      if (key === 'fixed') {
        await sb.from('fixed_costs')
          .delete()
          .eq('item_key', item.item_key);
      }

    } catch (e) {
      console.log('刪除同步失敗', e);
    }
  }

  db[key] = db[key].filter((x) => x.id !== id);
  saveDb();
  renderAll();
}

function editRevenue(id) {
  const r = db.revenue.find((x) => x.id === id);
  if (!r) return;
  document.querySelector('[data-tab="revenue"]')?.click();
  if ($('revId')) $('revId').value = r.id;
  if ($('revDate')) $('revDate').value = r.business_date;
  if ($('revCash')) $('revCash').value = r.cash_amount;
  if ($('revOnline')) $('revOnline').value = r.online_amount;
  if ($('revUber')) $('revUber').value = r.uber_amount;
  if ($('revOther')) $('revOther').value = r.other_platform_amount;
  if ($('revOrders')) $('revOrders').value = r.order_count;
  if ($('revNote')) $('revNote').value = r.note || '';
  updateRevenueTotalDisplay();
}

function editGas(id) {
  const g = db.gas.find((x) => x.id === id);
  if (!g) return;
  document.querySelector('[data-tab="gas"]')?.click();
  if ($('gasId')) $('gasId').value = g.id;
  if ($('gasDate')) $('gasDate').value = g.log_date;
  if ($('gasMeter')) $('gasMeter').value = g.meter_reading;
  if ($('gasUnitCost')) $('gasUnitCost').value = g.cost_per_unit;
  if ($('gasIsStart')) $('gasIsStart').checked = !!g.is_start_meter;
  if ($('gasNote')) $('gasNote').value = g.note || '';
}

function editCost(id) {
  const c = db.costs.find((x) => x.id === id);
  if (!c) return;
  document.querySelector('[data-tab="cost"]')?.click();
  if ($('costId')) $('costId').value = c.id;
  if ($('costDate')) $('costDate').value = c.expense_date;
  if ($('costCategory')) $('costCategory').value = c.category;
  if ($('costItem')) $('costItem').value = c.item_name;
  if ($('costQuantity')) $('costQuantity').value = c.quantity ?? '';
  if ($('costUnit')) $('costUnit').value = c.unit || '';
  if ($('costAmount')) $('costAmount').value = c.amount;
  if ($('costSupplier')) $('costSupplier').value = c.supplier || '';
  if ($('costQtyNote')) $('costQtyNote').value = c.qty_note || '';
  if ($('costUnpaid')) $('costUnpaid').checked = !!c.is_unpaid;
  if ($('costStaffMeal')) $('costStaffMeal').checked = !!c.is_staff_meal;
  if ($('costNote')) $('costNote').value = c.note || '';
}

function editFixed(id) {
  const f = db.fixed.find((x) => x.id === id);
  if (!f) return;
  document.querySelector('[data-tab="fixed"]')?.click();
  if ($('fixedId')) $('fixedId').value = f.id;
  if ($('fixedKey')) $('fixedKey').value = f.item_key;
  if ($('fixedName')) $('fixedName').value = f.item_name;
  if ($('fixedAmount')) $('fixedAmount').value = f.monthly_amount;
  if ($('fixedNote')) $('fixedNote').value = f.note || '';
}

function renderAll() {
  if ($('revDate') && !$('revDate').value) clearRevenue();
  if ($('gasDate') && !$('gasDate').value) clearGas();
  if ($('costDate') && !$('costDate').value) clearCost();
  if ($('reportMonth') && !$('reportMonth').value) $('reportMonth').value = monthStr();

  const today = todayStr();
  const month = $('reportMonth')?.value || monthStr();

  const tr = db.revenue.find((x) => x.business_date === today);
  const tg = db.gas.find((x) => x.log_date === today);
  const tc = db.costs
    .filter((x) => x.expense_date === today && !x.is_unpaid)
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  const todayRevenueValue = tr ? revenueTotal(tr) : 0;
  const todayGasValue = tg ? gasCalc(tg).cost : 0;
  const todayProfitValue = todayRevenueValue - tc - todayGasValue;

  const monthRevenueRows = db.revenue.filter((x) => x.business_date.startsWith(month));
  const monthGasRows = db.gas.filter((x) => x.log_date.startsWith(month));
  const monthCostRows = db.costs.filter((x) => x.expense_date.startsWith(month) && !x.is_unpaid);

  const monthRevenueValue = monthRevenueRows.reduce((s, x) => s + revenueTotal(x), 0);
  const monthGasValue = monthGasRows.reduce((s, x) => s + gasCalc(x).cost, 0);
  const monthVariableValue = monthCostRows.reduce((s, x) => s + Number(x.amount || 0), 0) + monthGasValue;
  const monthFixedValue = db.fixed.reduce((s, x) => s + Number(x.monthly_amount || 0), 0);
  const monthProfitValue = monthRevenueValue - monthVariableValue - monthFixedValue;

  if ($('todayRevenue')) $('todayRevenue').textContent = money(todayRevenueValue);
  if ($('todayGas')) $('todayGas').textContent = money(todayGasValue);
  if ($('todayCost')) $('todayCost').textContent = money(tc);
  if ($('todayProfit')) $('todayProfit').textContent = money(todayProfitValue);
  if ($('monthRevenue')) $('monthRevenue').textContent = money(monthRevenueValue);
  if ($('monthVariable')) $('monthVariable').textContent = money(monthVariableValue);
  if ($('monthFixed')) $('monthFixed').textContent = money(monthFixedValue);
  if ($('monthProfit')) $('monthProfit').textContent = money(monthProfitValue);

  if ($('revenueList')) {
    $('revenueList').innerHTML =
      db.revenue
        .sort((a, b) => b.business_date.localeCompare(a.business_date))
        .map(
          (r) => `
      <div class="item">
        <strong>${r.business_date}</strong><br>
        總營業額：${money(revenueTotal(r))}<br>
        現金：${money(r.cash_amount)}｜線上：${money(r.online_amount)}｜Uber：${money(r.uber_amount)}｜其他：${money(r.other_platform_amount)}<br>
        訂單數：${r.order_count}｜客單價：${r.order_count ? money(revenueTotal(r) / r.order_count) : 0}<br>
        ${r.note ? `備註：${safe(r.note)}<br>` : ''}
        <div class="row"><button onclick="editRevenue('${r.id}')">編輯</button><button class="secondary" onclick="del('revenue','${r.id}')">刪除</button></div>
      </div>`
        )
        .join('') || '<div class="item">尚無紀錄</div>';
  }

  if ($('gasList')) {
    $('gasList').innerHTML =
      db.gas
        .sort((a, b) => b.log_date.localeCompare(a.log_date))
        .map((g) => {
          const c = gasCalc(g);
          return `<div class="item">
        <strong>${g.log_date}</strong>${g.is_start_meter ? '<span class="badge start">起始度數</span>' : ''}<br>
        表數：${g.meter_reading}<br>
        前一筆：${c.prev ?? '-'}<br>
        使用量：${c.usage.toFixed(3)} 度<br>
        成本：${money(c.cost)}<br>
        ${g.note ? `備註：${safe(g.note)}<br>` : ''}
        <div class="row"><button onclick="editGas('${g.id}')">編輯</button><button class="secondary" onclick="del('gas','${g.id}')">刪除</button></div>
      </div>`;
        })
        .join('') || '<div class="item">尚無紀錄</div>';
  }

  if ($('costList')) {
    $('costList').innerHTML =
      db.costs
        .sort((a, b) => b.expense_date.localeCompare(a.expense_date))
        .map(
          (c) => `
      <div class="item">
        <strong>${c.expense_date}</strong>
        ${c.is_unpaid ? '<span class="badge unpaid">未結帳</span>' : ''}
        ${c.is_staff_meal ? '<span class="badge staff">員工餐</span>' : ''}<br>
        類別：${safe(c.category)}｜品項：${safe(c.item_name)}<br>
        ${c.quantity !== null && c.quantity !== '' ? `數量：${safe(c.quantity)} ${safe(c.unit)}<br>` : ''}
        金額：${money(c.amount)}<br>
        ${c.qty_note ? `額外說明：${safe(c.qty_note)}<br>` : ''}
        ${c.supplier ? `廠商：${safe(c.supplier)}<br>` : ''}
        ${c.note ? `備註：${safe(c.note)}<br>` : ''}
        <div class="row"><button onclick="editCost('${c.id}')">編輯</button><button class="secondary" onclick="del('costs','${c.id}')">刪除</button></div>
      </div>`
        )
        .join('') || '<div class="item">尚無紀錄</div>';
  }

  if ($('fixedList')) {
    $('fixedList').innerHTML =
      db.fixed
        .map(
          (f) => `
      <div class="item">
        <strong>${safe(f.item_name)}</strong><br>
        鍵值：${safe(f.item_key)}<br>
        每月金額：${money(f.monthly_amount)}<br>
        ${f.note ? `備註：${safe(f.note)}<br>` : ''}
        <div class="row"><button onclick="editFixed('${f.id}')">編輯</button><button class="secondary" onclick="del('fixed','${f.id}')">刪除</button></div>
      </div>`
        )
        .join('') || '<div class="item">尚無紀錄</div>';
  }

  if ($('reportSummary')) {
    const categoryMap = {};
    monthCostRows.forEach((c) => (categoryMap[c.category] = (categoryMap[c.category] || 0) + Number(c.amount || 0)));
    categoryMap['瓦斯'] = monthGasValue;

    $('reportSummary').innerHTML = `
      <div class="item">
        <strong>${month} 月報表</strong><br><br>
        本月營業額：${money(monthRevenueValue)}<br>
        本月變動成本：${money(monthVariableValue)}<br>
        本月固定成本：${money(monthFixedValue)}<br>
        本月預估淨利：${money(monthProfitValue)}<br><br>
        <strong>成本分類：</strong><br>
        ${
          Object.entries(categoryMap)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `${safe(k)}：${money(v)}`)
            .join('<br>') || '尚無資料'
        }
      </div>`;
  }
}

async function fetchAllFromSupabase() {
  if (!sb) return;

  try {
    const [revRes, gasRes, costRes, fixedRes] = await Promise.all([
      sb.from('daily_revenue').select('*').order('business_date', { ascending: false }),
      sb.from('gas_logs').select('*').order('log_date', { ascending: false }),
      sb.from('expense_records').select('*').order('expense_date', { ascending: false }),
      sb.from('fixed_costs').select('*').order('item_name', { ascending: true })
    ]);

    if (revRes.data) {
      db.revenue = revRes.data.map((x) => ({
        id: uid(),
        business_date: x.business_date,
        cash_amount: x.cash_amount || 0,
        online_amount: x.online_amount || 0,
        uber_amount: x.uber_amount || 0,
        other_platform_amount: x.other_platform_amount || 0,
        order_count: x.order_count || 0,
        note: x.note || ''
      }));
    }

    if (gasRes.data) {
      db.gas = gasRes.data.map((x) => ({
        id: uid(),
        log_date: x.log_date,
        meter_reading: x.meter_reading,
        cost_per_unit: x.cost_per_unit || 128,
        is_start_meter: (x.note || '').includes('[起始度數]'),
        note: (x.note || '').replace('[起始度數]', '').trim()
      }));
    }

    if (costRes.data) {
      db.costs = costRes.data.map((x) => ({
        id: uid(),
        expense_date: x.expense_date,
        category: x.category,
        item_name: x.item_name,
        quantity: x.quantity,
        unit: x.unit || '',
        amount: x.amount || 0,
        supplier: x.supplier || '',
        qty_note: '',
        is_unpaid: !!x.is_unpaid,
        is_staff_meal: !!x.is_staff_meal,
        note: x.note || ''
      }));
    }

    if (fixedRes.data && fixedRes.data.length) {
      db.fixed = fixedRes.data.map((x) => ({
        id: uid(),
        item_key: x.item_key,
        item_name: x.item_name,
        monthly_amount: x.monthly_amount || 0,
        note: x.note || ''
      }));
    }

    saveDb();
  } catch (e) {
    console.error('自動抓取 Supabase 失敗', e);
  }
}

async function manualSyncAll() {
  if (!sb) {
    alert('請先儲存 Supabase 設定');
    return;
  }
  await fetchAllFromSupabase();
  renderAll();
  alert('已從 Supabase 抓取最新資料');
}

function exportJson() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'kaiwei_app_data.json';
  a.click();
}

function loadDemo() {
  db.revenue = [
    {
      id: uid(),
      business_date: todayStr(),
      cash_amount: 100,
      online_amount: 50,
      uber_amount: 0,
      other_platform_amount: 20,
      order_count: 3,
      note: '測試'
    }
  ];

  db.gas = [
    {
      id: uid(),
      log_date: '2026-04-02',
      meter_reading: 4603.01,
      cost_per_unit: 128,
      is_start_meter: true,
      note: '起始度數'
    },
    {
      id: uid(),
      log_date: '2026-04-03',
      meter_reading: 4604.14,
      cost_per_unit: 128,
      is_start_meter: false,
      note: ''
    }
  ];

  db.costs = [
    {
      id: uid(),
      expense_date: todayStr(),
      category: '憶家鄉',
      item_name: '鮭魚碎肉',
      quantity: 2,
      unit: '包',
      amount: 440,
      supplier: '憶家鄉',
      qty_note: '2包',
      is_unpaid: false,
      is_staff_meal: false,
      note: ''
    },
    {
      id: uid(),
      expense_date: todayStr(),
      category: '水費',
      item_name: '店面水費',
      quantity: null,
      unit: '',
      amount: 1200,
      supplier: '',
      qty_note: '',
      is_unpaid: false,
      is_staff_meal: false,
      note: ''
    }
  ];

  saveDb();
  renderAll();
}

document.addEventListener('DOMContentLoaded', async () => {
  bind();
  loadDb();
  loadConn();
  clearRevenue();
  clearGas();
  clearCost();
  if ($('reportMonth')) $('reportMonth').value = monthStr();

  if (sb) {
    await fetchAllFromSupabase();
  }

  renderAll();
});
