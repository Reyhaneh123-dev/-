function toPersianDigits(s) {
  return String(s).replace(/[0-9]/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

// مجموعه‌های پایه
const baseSets = {
  N: (limit = 50) => Array.from({ length: limit }, (_, i) => i + 1),
  W: (limit = 51) => Array.from({ length: limit }, (_, i) => i),
  Z: (limit = 20) => {
    const a = [];
    for (let i = -limit; i <= limit; i++) a.push(i);
    return a;
  },
  Q: (limit = 10) => {
    const s = new Set();
    for (let b = 1; b <= 6; b++) {
      for (let a = -limit; a <= limit; a++) s.add(a / b);
    }
    return Array.from(s).sort((x, y) => x - y);
  },
  R: (limit = 20) => {
    const a = [];
    for (let i = -limit; i <= limit; i++) {
      a.push(i);
      a.push(i + 0.5);
    }
    return Array.from(new Set(a)).sort((x, y) => x - y);
  }
};

const sets = {}; // نام مجموعه‌ها و مقادیرشان

// --- پردازش ورودی ---
function parseExplicitList(text) {
  const s = text.replace(/[{}\\s]/g, '');
  if (!s) return [];
  const parts = s.split(',');
  const out = new Set();
  parts.forEach(p => {
    if (/^(-?\\d+)-(-?\\d+)$/.test(p)) {
      const m = p.match(/^(-?\\d+)-(-?\\d+)$/);
      const a = parseInt(m[1]), b = parseInt(m[2]);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.add(i);
    } else if (/^-?\\d+(\\.\\d+)?$/.test(p)) {
      out.add(Number(p));
    }
  });
  return Array.from(out).sort((a, b) => a - b);
}

function tryParseSetBuilder(text) {
  const t = text.replace(/[{}]/g, '').trim();
  const m = t.match(/x\\s*(?:∈|in)\\s*([NZWQRnzwqr])\\s*[|]?(.*)/i);
  if (!m) return null;
  const base = m[1].toUpperCase();
  const cond = (m[2] || '').trim();
  const sample = baseSets ;
  if (!cond) return sample;
  try {
    const f = new Function('x', `return (${cond});`);
    return sample.filter(x => !!f(x));
  } catch (e) { return null; }
}

function parseSetInput(text) {
  if (!text || !text.trim()) return [];
  const p = parseExplicitList(text);
  if (p.length) return p;
  const b = tryParseSetBuilder(text);
  return b || [];
}

// --- عملیات مجموعه‌ای ---
const toSet = arr => new Set(arr);
const setIntersection = (a, b) => Array.from(new Set(a.filter(x => b.has(x)))).sort((x, y) => x - y);
const setUnion = (a, b) => Array.from(new Set([...a, ...b])).sort((x, y) => x - y);
const setDifference = (a, b) => Array.from(new Set(a.filter(x => !b.has(x)))).sort((x, y) => x - y);
const isSubset = (a, b) => a.every(x => b.has(x));

// --- عناصر صفحه ---
const setNameEl = document.getElementById('setName');
const setContentEl = document.getElementById('setContent');
const saveBtn = document.getElementById('saveSet');
const setsListEl = document.getElementById('setsList');
const leftSel = document.getElementById('leftSet');
const rightSel = document.getElementById('rightSet');
const opSel = document.getElementById('op');
const runBtn = document.getElementById('runOp');
const symbolicEl = document.getElementById('symbolic');
const numericEl = document.getElementById('numeric');
const memberBox = document.getElementById('memberBox');
const memberValue = document.getElementById('memberValue');
const vennSvg = document.getElementById('vennSvg');
const numberlineEl = document.getElementById('numberline');
const legendEl = document.getElementById('legend');
const clearBtn = document.getElementById('clearSets');

// --- نمایش و کنترل ---
function refreshSelectors() {
  const names = Object.keys(sets);
  [leftSel, rightSel].forEach(sel => {
    sel.innerHTML = '';
    names.forEach(n => {
      const o = document.createElement('option');
      o.value = n; o.textContent = n;
      sel.appendChild(o);
    });
  });
}

function renderSets() {
  setsListEl.innerHTML = '';
  const names = Object.keys(sets);
  if (!names.length) {
    setsListEl.textContent = 'هیچ مجموعه‌ای تعریف نشده است.';
    return;
  }
  names.forEach(n => {
    const d = document.createElement('div');
    d.className = 'set-item';
    d.innerHTML = `<strong>${n}</strong><br>${n} = {${sets[n].map(toPersianDigits).join(', ')}}`;
    setsListEl.appendChild(d);
  });
}

saveBtn.onclick = () => {
  const name = setNameEl.value.trim();
  if (!name) return alert('نام مجموعه را وارد کنید');
  const vals = parseSetInput(setContentEl.value);
  sets[name] = vals;
  setContentEl.value = '';
  renderSets();
  refreshSelectors();
  drawVenn();
};

clearBtn.onclick = () => {
  if (confirm('همه مجموعه‌ها حذف شوند؟')) {
    for (let k in sets) delete sets[k];
    renderSets(); refreshSelectors(); drawVenn();
  }
};

opSel.onchange = () => memberBox.style.display = opSel.value === 'member' ? 'inline-block' : 'none';

runBtn.onclick = () => {
  const L = sets[leftSel.value] || [];
  const R = sets[rightSel.value] || [];
  const sL = toSet(L), sR = toSet(R);
  let res = null, sym = '';
  switch (opSel.value) {
    case 'intersection':
      res = setIntersection(L, sR);
      sym = `${leftSel.value} ∩ ${rightSel.value}`;
      break;
    case 'union':
      res = setUnion(L, sR);
      sym = `${leftSel.value} ∪ ${rightSel.value}`;
      break;
    case 'difference':
      res = setDifference(L, sR);
      sym = `${leftSel.value} − ${rightSel.value}`;
      break;
    case 'subset':
      res = isSubset(L, sR);
      sym = `${leftSel.value} ⊆ ${rightSel.value} = ${res ? 'درست' : 'نادرست'}`;
      break;
    case 'member':
      const val = Number(memberValue.value);
      res = sR.has(val);
      sym = `${toPersianDigits(val)} ∈ ${rightSel.value} = ${res ? 'درست' : 'نادرست'}`;
      break;
  }
  symbolicEl.textContent = sym;
  numericEl.textContent = Array.isArray(res) ? `{ ${res.map(toPersianDigits).join(', ')} }` : res;
  drawVenn();
  drawNumberLine(res);
};

// --- نمودار ون ---
function drawVenn() {
  vennSvg.innerHTML = '';
  const A = sets[leftSel.value] || [];
  const B = sets[rightSel.value] || [];
  const sA = toSet(A), sB = toSet(B);
  const onlyA = A.filter(x => !sB.has(x));
  const onlyB = B.filter(x => !sA.has(x));
  const both = A.filter(x => sB.has(x));

  const svgNS = 'http://www.w3.org/2000/svg';
  const c1 = document.createElementNS(svgNS, 'circle');
  c1.setAttribute('cx', 120); c1.setAttribute('cy', 110);
  c1.setAttribute('r', 70); c1.setAttribute('fill', 'rgba(0,119,204,0.18)');
  c1.setAttribute('stroke', '#0077cc');

  const c2 = document.createElementNS(svgNS, 'circle');
  c2.setAttribute('cx', 200); c2.setAttribute('cy', 110);
  c2.setAttribute('r', 70); c2.setAttribute('fill', 'rgba(233,30,99,0.18)');
  c2.setAttribute('stroke', '#e91e63');

  vennSvg.appendChild(c1);
  vennSvg.appendChild(c2);

  function put(list, x, y) {
    list.forEach((v, i) => {
      const t = document.createElementNS(svgNS, 'text');
      t.setAttribute('x', x + (i % 4) * 18);
      t.setAttribute('y', y + Math.floor(i / 4) * 16);
      t.setAttribute('font-size', 12);
      t.textContent = toPersianDigits(v);
      vennSvg.appendChild(t);
    });
  }

  put(onlyA, 80, 110);
  put(both, 150, 110);
  put(onlyB, 220, 110);
}

// --- محور عددی ---
function drawNumberLine(res) {
  numberlineEl.innerHTML = '';
  const arr = Array.isArray(res) ? res : [];
  if (!arr.length) { numberlineEl.textContent = 'نمایشی ندارد'; return; }
  const min = Math.min(...arr) - 2;
  const max = Math.max(...arr) + 2;
  const div = document.createElement('div');
  div.style.position = 'relative';
  div.style.height = '70px';
  div.style.borderTop = '1px solid #333';
  for (let i = min; i <= max; i++) {
    const dot = document.createElement('div');
    dot.style.position = 'absolute';
    dot.style.left = ((i - min) / (max - min)) * 100 + '%';
    dot.style.top = '10px';
    const circle = document.createElement('div');
    circle.style.width = '8px'; circle.style.height = '8px';
    circle.style.borderRadius = '50%';
    circle.style.margin = '6px auto';
    circle.style.background = arr.includes(i) ? 'var(--pink)' : '#999';
    const label = document.createElement('div');
    label.style.fontSize = '12px';
    label.textContent = toPersianDigits(i);
    dot.appendChild(circle); dot.appendChild(label);
    div.appendChild(dot);
  }
  numberlineEl.appendChild(div);
  legendEl.innerHTML = `<div class="small">نقاط رنگی اعضای مجموعهٔ نتیجه هستند.</div>`;
}

// مقدار پیش‌فرض
sets['A'] = [1, 2, 3, 4, 5];
sets['B'] = [4, 5, 6, 7];
renderSets();
refreshSelectors();
draw
