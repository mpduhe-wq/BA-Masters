export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    try {
      const r = await fetch(
        "https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga"
      );
      const data = await r.json();
      res.status(200).json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }