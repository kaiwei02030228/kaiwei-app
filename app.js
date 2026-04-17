let supabase = null;

function init() {
  const url = localStorage.getItem("supabase_url");
  const key = localStorage.getItem("supabase_key");
  if (url && key) {
    supabase = window.supabase.createClient(url, key);
  }
}

init();

function calcTotal() {
  const cash = +document.getElementById("cash").value || 0;
  const online = +document.getElementById("online").value || 0;
  const uber = +document.getElementById("uber").value || 0;
  const other = +document.getElementById("other").value || 0;

  const total = cash + online + uber + other;
  document.getElementById("total").innerText = total;
}

["cash","online","uber","other"].forEach(id=>{
  document.getElementById(id).addEventListener("input", calcTotal);
});

async function saveRevenue() {
  calcTotal();

  await supabase.from("daily_revenue").insert([{
    business_date: date.value,
    cash_amount: +cash.value || 0,
    online_amount: +online.value || 0,
    uber_amount: +uber.value || 0,
    other_platform_amount: +other.value || 0
  }]);

  alert("已存營業額");
}

async function saveGas() {
  await supabase.from("gas_logs").insert([{
    date: gas_date.value,
    degree: +gas_degree.value || 0,
    is_start: gas_start.checked
  }]);

  alert("已存瓦斯");
}

async function saveCost() {
  await supabase.from("expense_records").insert([{
    date: cost_date.value,
    category: category.value,
    item: item.value,
    qty: +qty.value || 0,
    unit: unit.value,
    amount: +amount.value || 0,
    note: note.value
  }]);

  alert("已存成本");
}
