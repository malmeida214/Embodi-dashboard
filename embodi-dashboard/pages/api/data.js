export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const CLIENT_ID     = process.env.QB_CLIENT_ID;
  const CLIENT_SECRET = process.env.QB_CLIENT_SECRET;
  const REFRESH_TOKEN = process.env.QB_REFRESH_TOKEN;
  const REALM_ID      = process.env.QB_REALM_ID;

  // Check env vars exist
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !REALM_ID) {
    return res.status(500).json({
      error: true,
      message: `Missing environment variables: ${[
        !CLIENT_ID && 'QB_CLIENT_ID',
        !CLIENT_SECRET && 'QB_CLIENT_SECRET',
        !REFRESH_TOKEN && 'QB_REFRESH_TOKEN',
        !REALM_ID && 'QB_REALM_ID',
      ].filter(Boolean).join(', ')}`,
      lastUpdated: new Date().toISOString(),
    });
  }

  try {
    // 1. Get access token
    const tokenRes = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(REFRESH_TOKEN)}`,
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.status(500).json({
        error: true,
        message: `QuickBooks auth failed: ${JSON.stringify(tokenData)}`,
        lastUpdated: new Date().toISOString(),
      });
    }
    const token = tokenData.access_token;

    // 2. Fetch reports
    const QB = `https://quickbooks.api.intuit.com/v3/company/${REALM_ID}`;
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
    const curYear = new Date().getFullYear();
    const prevYear = curYear - 1;

    const [plThis, plPrev, plMonthly, balance] = await Promise.all([
      fetch(`${QB}/reports/ProfitAndLoss?minorversion=70&date_macro=This+Year&summarize_column_by=Total`, { headers }).then(r => r.json()),
      fetch(`${QB}/reports/ProfitAndLoss?minorversion=70&start_date=${prevYear}-01-01&end_date=${prevYear}-12-31&summarize_column_by=Total`, { headers }).then(r => r.json()),
      fetch(`${QB}/reports/ProfitAndLoss?minorversion=70&date_macro=This+Year&summarize_column_by=Month`, { headers }).then(r => r.json()),
      fetch(`${QB}/reports/BalanceSheet?minorversion=70&date_macro=Today`, { headers }).then(r => r.json()),
    ]);

    // 3. Parse helpers
    const lastNum = row => {
      const cols = row?.ColData || [];
      return parseFloat(cols[cols.length - 1]?.value || '0') || 0;
    };

    const parsePL = report => {
      let revenue = 0, expenses = 0, netIncome = 0;
      (report?.Rows?.Row || []).forEach(row => {
        const h = (row?.Header?.ColData?.[0]?.value || '').toLowerCase();
        if (row.type === 'Section') {
          if ((h.includes('income') || h.includes('revenue')) && row.Summary) revenue = lastNum(row.Summary) || revenue;
          if (h.includes('expense') && row.Summary) expenses = lastNum(row.Summary);
          if ((h.includes('net income') || h.includes('net earnings')) && row.Summary) netIncome = lastNum(row.Summary);
        }
      });
      return { revenue, expenses, netIncome: netIncome || revenue - expenses };
    };

    const parseMonthly = report => {
      const cols = report?.Columns?.Column || [];
      const labels = cols.filter(c => c.ColType === 'Money').map(c => c.ColTitle || '');
      const monthly = labels.map(m => ({ month: m, revenue: 0, expenses: 0, net: 0 }));
      const walk = rows => {
        (rows || []).forEach(row => {
          const h = (row?.Header?.ColData?.[0]?.value || '').toLowerCase();
          const isInc = h.includes('income') || h.includes('revenue');
          const isExp = h.includes('expense');
          if (row.Summary?.ColData && (isInc || isExp)) {
            row.Summary.ColData.slice(1).forEach((col, i) => {
              const v = parseFloat(col.value || '0') || 0;
              if (monthly[i]) {
                if (isInc) monthly[i].revenue += v;
                if (isExp) monthly[i].expenses += v;
              }
            });
          }
          if (row.Rows?.Row) walk(row.Rows.Row);
        });
      };
      walk(report?.Rows?.Row);
      monthly.forEach(m => { m.net = m.revenue - m.expenses; });
      return monthly.filter(m => m.revenue > 0 || m.expenses > 0);
    };

    const parseExpCats = report => {
      const cats = { Rent: 0, Labor: 0, Marketing: 0, Processing: 0, 'Dues/Subs': 0, Other: 0 };
      const classify = name => {
        const n = (name || '').toLowerCase();
        if (['rent','lease'].some(k => n.includes(k))) return 'Rent';
        if (['outside service','contractor','labor','payroll','wage','salary'].some(k => n.includes(k))) return 'Labor';
        if (['marketing','advertis','ads','google','meta'].some(k => n.includes(k))) return 'Marketing';
        if (['merchant','processing','stripe','square','payment fee'].some(k => n.includes(k))) return 'Processing';
        if (['dues','subscription','software','license'].some(k => n.includes(k))) return 'Dues/Subs';
        return 'Other';
      };
      const walk = rows => {
        (rows || []).forEach(row => {
          if (row.type === 'DataRow') cats[classify(row.ColData?.[0]?.value)] += lastNum(row);
          if (row.Rows?.Row) walk(row.Rows.Row);
        });
      };
      walk(report?.Rows?.Row);
      return cats;
    };

    const parseBalance = report => {
      let currentAssets = 0, currentLiabilities = 0, cash = 0;
      const walk = (rows, ctx) => {
        (rows || []).forEach(row => {
          const h = (row?.Header?.ColData?.[0]?.value || '').toLowerCase();
          const name = (row?.ColData?.[0]?.value || '').toLowerCase();
          const newCtx = ctx + ' ' + h;
          if (newCtx.includes('current asset') && row.Summary) currentAssets = lastNum(row.Summary);
          if (newCtx.includes('current liabilit') && row.Summary) currentLiabilities = lastNum(row.Summary);
          if ((name.includes('checking') || name.includes('cash') || name.includes('bank')) && row.type === 'DataRow') cash += lastNum(row);
          if (row.Rows?.Row) walk(row.Rows.Row, newCtx);
        });
      };
      walk(report?.Rows?.Row, '');
      return { currentAssets, currentLiabilities, currentRatio: currentLiabilities > 0 ? +(currentAssets / currentLiabilities).toFixed(2) : null, cash };
    };

    // 4. Compute
    const cur  = parsePL(plThis);
    const prev = parsePL(plPrev);
    const mo   = parseMonthly(plMonthly);
    const bal  = parseBalance(balance);
    const cats = parseExpCats(plThis);

    const monthsElapsed = new Date().getMonth() + 1;
    const mrr = mo.length > 0
      ? Math.round(mo.reduce((s, m) => s + m.revenue, 0) / mo.length)
      : Math.round(cur.revenue / monthsElapsed);

    const netMargin      = cur.revenue > 0 ? +(cur.netIncome / cur.revenue * 100).toFixed(1) : 0;
    const yoy            = prev.revenue > 0 ? +(((cur.revenue - prev.revenue) / prev.revenue) * 100).toFixed(1) : null;
    const processingRate = cur.revenue > 0 && cats.Processing > 0 ? +(cats.Processing / cur.revenue * 100).toFixed(1) : null;
    const laborRate      = cur.revenue > 0 && cats.Labor > 0      ? +(cats.Labor / cur.revenue * 100).toFixed(1)      : null;

    return res.status(200).json({
      lastUpdated: new Date().toISOString(),
      currentYear: curYear,
      thisYear: {
        revenue:       Math.round(cur.revenue),
        expenses:      Math.round(cur.expenses),
        netIncome:     Math.round(cur.netIncome),
        netMargin,
        ebitda:        Math.round(cur.netIncome),
        ebitdaMargin:  netMargin,
        mrr,
        arr:           mrr * 12,
      },
      prevYear: {
        revenue:   Math.round(prev.revenue),
        expenses:  Math.round(prev.expenses),
        netIncome: Math.round(prev.netIncome),
        netMargin: prev.revenue > 0 ? +(prev.netIncome / prev.revenue * 100).toFixed(1) : 0,
      },
      yoyRevGrowth: yoy,
      monthly:          mo,
      expenseCategories: cats,
      balance:           bal,
      kpis: {
        processingRate,
        laborRate,
        ltvCac:        19.7,
        blendedCac:    154,
        ltv:           3027,
        churnRate:     85,
        breakEven:     9921,
        activeMembers: 48,
        unconvLeads:   322,
        winBackPool:   168,
      },
    });

  } catch (err) {
    console.error('QB Error:', err.message);
    return res.status(500).json({
      error: true,
      message: err.message,
      lastUpdated: new Date().toISOString(),
    });
  }
}
