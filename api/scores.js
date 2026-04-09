export async function GET() {
    try {
      const r = await fetch(
        "https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga",
        {
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json",
          },
          cache: "no-store",
        }
      );
  
      if (!r.ok) {
        return new Response(
          JSON.stringify({ error: `ESPN request failed: ${r.status}` }),
          {
            status: r.status,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }
  
      const data = await r.json();
  
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message || "Unknown server error" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  }