export default async function handler(req, res) {
  const ACCESS_TOKEN  = process.env.META_ACCESS_TOKEN;
  const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;

  if (!ACCESS_TOKEN || !AD_ACCOUNT_ID) {
    return res.status(500).json({ error: 'Missing META_ACCESS_TOKEN or META_AD_ACCOUNT_ID' });
  }

  try {
    const fields = 'spend,clicks,impressions,actions,cost_per_action_type,ctr,cpc,cpp';
    const url = `https://graph.facebook.com/v21.0/${AD_ACCOUNT_ID}/insights?fields=${fields}&date_preset=last_30_days&level=account&access_token=${ACCESS_TOKEN}`;

    const metaRes  = await fetch(url);
    const metaText = await metaRes.text();

    let metaData;
    try { metaData = JSON.parse(metaText); }
    catch(e) { throw new Error(`Meta API returned unexpected response: ${metaText.substring(0, 200)}`); }

    if (metaData.error) {
      throw new Error(`Meta API error: ${metaData.error.message}`);
    }

    const d = metaData.data?.[0] || {};

    const getAction = (actions, type) => {
      const match = (actions || []).find(a => a.action_type === type);
      return match ? parseFloat(match.value) : 0;
    };

    const spend       = parseFloat(d.spend || 0);
    const clicks      = parseInt(d.clicks || 0);
    const impressions = parseInt(d.impressions || 0);
    const ctr         = parseFloat(d.ctr || 0);
    const cpc         = parseFloat(d.cpc || 0);
    const leads       = getAction(d.actions, 'lead')
                      + getAction(d.actions, 'offsite_conversion.fb_pixel_lead');
    const cpl         = leads > 0 ? +(spend / leads).toFixed(2) : null;

    return res.status(200).json({
      lastUpdated: new Date().toISOString(),
      last30Days: {
        spend,
        clicks,
        impressions,
        leads,
        ctr:  +ctr.toFixed(2),
        cpc:  +cpc.toFixed(2),
        cpl,
      },
    });

  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
}
