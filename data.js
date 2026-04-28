const https = require('https');

const CLIENT_ID     = process.env.QB_CLIENT_ID;
const CLIENT_SECRET = process.env.QB_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.QB_REFRESH_TOKEN;
const REALM_ID      = process.env.QB_REALM_ID;

async function getAccessToken() {
  return new Promise((resolve, reject) => {
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(REFRESH_TOKEN)}`;
    const options = {
      hostname: 'oauth.platform.intuit.com',
      path: '/oauth2/v1/tokens/bearer',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try {
          const p = JSON.parse(data);
          if (p.access_token) resolve(p.access_token);
          else reject(new Error(`Token error: ${data}`));
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function fetchReport(token, report, params) {
  return new Promise((resolve, reject) => {
    const path = `/v3/company/${REALM_ID}/reports/${report}?minorversion=70${params||''}`;
    const req = https.request({
      hostname: 'quickbooks.api.intuit.com',
      path, method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.end();
  });
}

function getLastNum(row) {
  const cols = row && row.ColData ? row.ColData : [];
  return parseFloat((cols[cols.length - 1] || {}).value || '0') || 0;
}

function parsePL(report) {
  let revenue = 0, expenses = 0, netIncome = 0;
  const rows = (report && report.Rows && report.Rows.Row) ? report.Rows.Row : [];
  rows.forEach(function(row) {
    const header = (row.Header && row.Header.ColData && row.Header.ColData[0]) ? row.Header.ColData[0].value || '' : '';
    const hl = header.toLowerCase();
    if (row.type === 'Section') {
      if (hl.includes('income') || hl.includes('revenue')) {
        if (row.Summary) revenue = getLastNum(row.Summary) || revenue;
      }
      if (hl.includes('expense')) {
        if (row.Summary) expenses = getLastNum(row.Summary);
      }
      if (hl.includes('net income') || hl.includes('net earnings')) {
        if (row.Summary) netIncome = getLastNum(row.Summary);
      }
    }
  });
  return { revenue, expenses, netIncome: netIncome || (revenue - expenses) };
}

function parseMonthly(report) {
  const cols = (report && report.Columns && report.Columns.Column) ? report.Columns.Column : [];
  const labels = cols.filter(function(c) { return c.ColType === 'Money'; }).map(function(c) { return c.ColTitle || ''; });
  const monthly = labels.map(function(m) { return { month: m, revenue: 0, expenses: 0, net: 0 }; });

  function walk(rows) {
    if (!rows) return;
    rows.forEach(function(row) {
      const h = (row.Header && row.Header.ColData && row.Header.ColData[0]) ? (row.Header.ColData[0].value || '').toLowerCase() : '';
      const isInc = h.includes('income') || h.includes('revenue');
      const isExp = h.includes('expense');
      if (row.Summary && row.Summary.ColData && (isInc || isExp)) {
        row.Summary.ColData.slice(1).forEach(function(col, i) {
          const v = parseFloat(col.value || '0') || 0;
          if (monthly[i]) {
            if (isInc) monthly[i].revenue += v;
            if (isExp) monthly[i].expenses += v;
          }
        });
      }
      if (row.Rows && row.Rows.Row) walk(row.Rows.Row);
    });
  }
  walk((report && report.Rows && report.Rows.Row) ? report.Rows.Row : []);
  monthly.forEach(function(m) { m.net = m.revenue - m.expenses; });
  return monthly.filter(function(m) { return m.revenue > 0 || m.expenses > 0; });
}

function parseExpCats(report) {
  const cats = { Rent: 0, Labor: 0, Marketing: 0, Processing: 0, 'Dues/Subs': 0, Other: 0 };
  function classify(name) {
    const n = (name || '').toLowerCase();
    if (['rent','lease'].some(function(k){return n.includes(k);})) return 'Rent';
    if (['outside service','contractor','labor','payroll','wage','salary'].some(function(k){return n.includes(k);})) return 'Labor';
    if (['marketing','advertis','ads','google','meta'].some(function(k){return n.includes(k);})) return 'Marketing';
    if (['merchant','processing','stripe','square','payment fee'].some(function(k){return n.includes(k);})) return 'Processing';
    if (['dues','subscription','software','license'].some(function(k){return n.includes(k);})) return 'Dues/Subs';
    return 'Other';
  }
  function walk(rows) {
    if (!rows) return;
    rows.forEach(function(row) {
      if (row.type === 'DataRow') {
        const name = row.ColData && row.ColData[0] ? row.ColData[0].value || '' : '';
        const val = getLastNum(row);
        cats[classify(name)] += val;
      }
      if (row.Rows && row.Rows.Row) walk(row.Rows.Row);
    });
  }
  walk((report && report.Rows && report.Rows.Row) ? report.Rows.Row : []);
  return cats;
}

function parseBalance(report) {
  let currentAssets = 0, currentLiabilities = 0, cash = 0;
  function walk(rows, ctx) {
    if (!rows) return;
    rows.forEach(function(row) {
      const h = ((row.Header && row.Header.ColData && row.Header.ColData[0]) ? row.Header.ColData[0].value || '' : '').toLowerCase();
      const name = (row.ColData && row.ColData[0] ? row.ColData[0].value || '' : '').toLowerCase();
      const newCtx = ctx + ' ' + h;
      if (newCtx.includes('current asset') && row.Summary) currentAssets = getLastNum(row.Summary);
      if (newCtx.includes('current liabilit') && row.Summary) currentLiabilities = getLastNum(row.Summary);
      if ((name.includes('checking') || name.includes('cash') || name.includes('bank')) && row.type === 'DataRow') cash += getLastNum(row);
      if (row.Rows && row.Rows.Row) walk(row.Rows.Row, newCtx);
    });
  }
  walk((report && report.Rows && report.Rows.Row) ? report.Rows.Row : [], '');
  return { currentAssets, currentLiabilities, currentRatio: currentLiabilities > 0 ? +(currentAssets/currentLiabilities).toFixed(2) : null, cash };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const token = await getAccessToken();
    const yr    = new Date().getFullYear();
    const prevYr = yr - 1;

    const [plThis, plPrev, plMonthly, balance] = await Promise.all([
      fetchReport(token, 'ProfitAndLoss', '&date_macro=This+Year&summarize_column_by=Total'),
      fetchReport(token, 'ProfitAndLoss', '&start_date=' + prevYr + '-01-01&end_date=' + prevYr + '-12-31&summarize_column_by=Total'),
      fetchReport(token, 'ProfitAndLoss', '&date_macro=This+Year&summarize_column_by=Month'),
      fetchReport(token, 'BalanceSheet',  '&date_macro=Today'),
    ]);

    const cur  = parsePL(plThis);
    const prev = parsePL(plPrev);
    const mo   = parseMonthly(plMonthly);
    const bal  = parseBalance(balance);
    const cats = parseExpCats(plThis);

    const mrr = mo.length > 0
      ? Math.round(mo.reduce(function(s,m){return s+m.revenue;},0) / mo.length)
      : Math.round(cur.revenue / (new Date().getMonth() + 1));

    const netMargin = cur.revenue > 0 ? +(cur.netIncome / cur.revenue * 100).toFixed(1) : 0;
    const yoy = prev.revenue > 0 ? +(((cur.revenue - prev.revenue) / prev.revenue) * 100).toFixed(1) : null;
    const processingRate = cur.revenue > 0 && cats.Processing > 0 ? +(cats.Processing / cur.revenue * 100).toFixed(1) : null;
    const laborRate      = cur.revenue > 0 && cats.Labor > 0      ? +(cats.Labor      / cur.revenue * 100).toFixed(1) : null;

    return res.status(200).json({
      lastUpdated: new Date().toISOString(),
      currentYear: yr,
      thisYear: { revenue: Math.round(cur.revenue), expenses: Math.round(cur.expenses), netIncome: Math.round(cur.netIncome), netMargin, ebitda: Math.round(cur.netIncome), ebitdaMargin: netMargin, mrr, arr: mrr * 12 },
      prevYear:  { revenue: Math.round(prev.revenue), expenses: Math.round(prev.expenses), netIncome: Math.round(prev.netIncome), netMargin: prev.revenue > 0 ? +(prev.netIncome/prev.revenue*100).toFixed(1) : 0 },
      yoyRevGrowth: yoy,
      monthly: mo,
      expenseCategories: cats,
      balance: bal,
      kpis: { processingRate, laborRate, ltvCac: 19.7, blendedCac: 154, ltv: 3027, churnRate: 85, breakEven: 9921, activeMembers: 48, unconvLeads: 322, winBackPool: 168 },
    });
  } catch(err) {
    console.error('QB Error:', err.message);
    return res.status(500).json({ error: true, message: err.message, lastUpdated: new Date().toISOString() });
  }
};
