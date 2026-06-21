export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const token = process.env.DHAN_TOKEN;
  const clientId = process.env.DHAN_CLIENT_ID || "1112229714";

  if (!token) return res.status(200).json({ error: "DHAN_TOKEN_NOT_SET" });

  const BASE = "https://api.dhan.co/v2";
  const { endpoint } = req.query;

  try {
    let url, options, response, data;

    if (endpoint === "candles") {
      const { secId, from, to } = req.query;
      url = `${BASE}/charts/historical`;
      options = {
        method: "POST",
        headers: {
          "access-token": token,
          "client-id": clientId,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          securityId: secId,
          exchangeSegment: "NSE_EQ",
          instrument: "EQUITY",
          expiryCode: 0,
          oi: false,
          fromDate: from,
          toDate: to,
          interval: "1"
        })
      };
      response = await fetch(url, options);
      data = await response.json();
      return res.status(200).json(data);

    } else if (endpoint === "ltp") {
      url = `${BASE}/marketfeed/ltp`;
      options = {
        method: "POST",
        headers: {
          "access-token": token,
          "client-id": clientId,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      };
      response = await fetch(url, options);
      data = await response.json();
      return res.status(200).json(data);

    } else {
      return res.status(400).json({ error: "Invalid endpoint" });
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
