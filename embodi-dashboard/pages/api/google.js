export default async function handler(req, res) {
  const DEV_TOKEN = process.env.GOOGLE_ADS_DEV_TOKEN;
  const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID;

  // Basic check to ensure Vercel sees the variables
  if (!DEV_TOKEN || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !CUSTOMER_ID) {
    return res.status(500).json({ error: "Missing Google Ads Environment Variables in Vercel." });
  }

  try {
    // 1. Trade our Refresh Token for a fresh Access Token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
        grant_type: 'refresh_token',
      })
    });
    
    const tokenData = await tokenRes.json();
    
    if (!tokenData.access_token) {
        return res.status(500).json({ error: "Failed to get Google Access Token", details: tokenData });
    }

    // 2. The Google Ads Query Language (GAQL) request for the last 30 days
    const query = `
      SELECT metrics.clicks, metrics.cost_micros, metrics.conversions 
      FROM campaign 
      WHERE segments.date DURING LAST_30_DAYS
    `;

    // 3. Ask Google Ads for the data
    const adsRes = await fetch(`https://googleads.googleapis.com/v15/customers/${CUSTOMER_ID}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'developer-token': DEV_TOKEN,
        'login-customer-id': CUSTOMER_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });

    const adsData = await adsRes.json();

    // 4. Dump the raw data so we can see what we caught
    return res.status(200).json({ success: true, rawData: adsData });
    
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
}
