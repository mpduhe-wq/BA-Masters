import React, { useState, useEffect } from "react";

const PLAYERS = [
  { name: "bum4ever", golfers: ["Scheffler", "Hovland"] },
  { name: "Woody1180", golfers: ["DeChambeau", "Spieth"] },
  { name: "mbgreg", golfers: ["McIlroy", "Koepka"] },
  { name: "sblickem", golfers: ["Rahm", "Reed"] },
  { name: "BigBarleywine", golfers: ["Aberg", "Bhatia"] },
  { name: "johnyb", golfers: ["Schauffele", "MacIntyre"] },
  { name: "Dannyfayy", golfers: ["Young", "Gotterup"] },
  { name: "whodatmatt", golfers: ["Fleetwood", "Rose"] },
  { name: "VaTechPhilly", golfers: ["Fitzpatrick", "Matsuyama"] },
  { name: "eziel", golfers: ["Morikawa", "Lee"] },
];

const GOLFER_FIRST = {
  Scheffler: "Scottie", Hovland: "Viktor", DeChambeau: "Bryson", Spieth: "Jordan",
  McIlroy: "Rory", Koepka: "Brooks", Rahm: "Jon", Reed: "Patrick",
  Aberg: "Ludvig", Bhatia: "Akshay", Schauffele: "Xander", MacIntyre: "Robert",
  Young: "Cameron", Gotterup: "Chris", Fleetwood: "Tommy", Rose: "Justin",
  Fitzpatrick: "Matt", Matsuyama: "Hideki", Morikawa: "Collin", Lee: "Min Woo",
};

const GREEN = "#1a4a1f";
const GOLD = "#c9a84c";
const CREAM = "#faf7f0";
const DARK_GREEN = "#0f2d12";
const LIGHT_GOLD = "#f0e4c0";
const MED_GREEN = "#2e6b35";

export default function MastersPool() {
  const [scores, setScores] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState("standings");

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const POOL_GOLFERS = {
    "Scottie Scheffler": "Scheffler",
    "Viktor Hovland": "Hovland",
    "Bryson DeChambeau": "DeChambeau",
    "Jordan Spieth": "Spieth",
    "Rory McIlroy": "McIlroy",
    "Brooks Koepka": "Koepka",
    "Jon Rahm": "Rahm",
    "Patrick Reed": "Reed",
    "Ludvig Åberg": "Aberg",
    "Ludvig Aberg": "Aberg",
    "Akshay Bhatia": "Bhatia",
    "Xander Schauffele": "Schauffele",
    "Robert MacIntyre": "MacIntyre",
    "Cameron Young": "Young",
    "Chris Gotterup": "Gotterup",
    "Tommy Fleetwood": "Fleetwood",
    "Justin Rose": "Rose",
    "Matt Fitzpatrick": "Fitzpatrick",
    "Matthew Fitzpatrick": "Fitzpatrick",
    "Hideki Matsuyama": "Matsuyama",
    "Collin Morikawa": "Morikawa",
    "Min Woo Lee": "Lee",
  };

  const fetchScores = async () => {
    setLoading(true);
    setError(null);

    const ENDPOINTS = [
      "/api/scores",
      "https://corsproxy.io/?https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga",
      "https://api.allorigins.win/raw?url=https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga",
    ];

    let data = null;
    let lastErr = null;
    const errors = [];

    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
        if (data?.events) break;
        throw new Error("No events in response");
      } catch (e) {
        errors.push(`${url.slice(0, 40)}... → ${e.message}`);
        lastErr = e;
        data = null;
      }
    }

    if (!data?.events) {
      setError(`All sources failed:\n${errors.join("\n")}`);
      setLoading(false);
      return;
    }

    try {
      const events = data.events || [];
      const masters = events.find(e =>
        e.name?.toLowerCase().includes("masters") ||
        e.shortName?.toLowerCase().includes("masters")
      ) || events[0];

      if (!masters) throw new Error("Masters not found in feed");

      const competition = masters.competitions?.[0];
      const statusDesc = competition?.status?.type?.description || "In Progress";
      const roundNum = competition?.status?.period || 1;
      const competitors = competition?.competitors || [];

      const madeCount = competitors.filter(c =>
        !c.status?.toLowerCase().includes("cut")
      ).length;

      const golfers = {};
      competitors.forEach(c => {
        const fullName = c.athlete?.displayName || "";
        const key = POOL_GOLFERS[fullName];
        if (!key) return;

        const madeCut = !c.status?.toLowerCase().includes("cut");

        const scoreRaw = c.statistics?.find(s =>
          s.name === "scoreToPar" || s.abbreviation === "TOT"
        )?.displayValue ?? c.score ?? "E";

        const thruRaw = c.statistics?.find(s =>
          s.name === "holesPlayed" || s.abbreviation === "THRU"
        )?.displayValue ?? 0;

        const parseScore = (s) => {
          if (!s || s === "E" || s === "--" || s === "0") return 0;
          const n = parseInt(s, 10);
          return isNaN(n) ? 0 : n;
        };

        const parseThru = (s) => {
          if (!s || s === "F" || s === "F*") return 18;
          const n = parseInt(s, 10);
          return isNaN(n) ? 0 : n;
        };

        golfers[key] = {
          position: madeCut ? (c.sortOrder || null) : null,
          score: parseScore(scoreRaw),
          thru: parseThru(thruRaw),
          earnings: 0,
          made_cut: madeCut,
        };
      });

      setScores({
        tournament_status: statusDesc.includes("Final") ? "Complete" : "In Progress",
        current_round: roundNum,
        cut_line: madeCount,
        golfers,
      });
      setLastUpdated(new Date());
    } catch (err) {
      setError(`Parsing error: ${err.message}`);
    }
    setLoading(false);
  };

  const getStandings = () => {
    if (!scores?.golfers) return { prize: [], placement: [] };
    const cutLine = scores.cut_line || 50;
    const results = PLAYERS.map(player => {
      const g1 = scores.golfers[player.golfers[0]] || {};
      const g2 = scores.golfers[player.golfers[1]] || {};
      const g1Prize = g1.earnings || 0;
      const g2Prize = g2.earnings || 0;
      const g1Pos = g1.made_cut === false ? cutLine + 1 : (g1.position || 999);
      const g2Pos = g2.made_cut === false ? cutLine + 1 : (g2.position || 999);
      return {
        ...player,
        g1, g2, g1Pos, g2Pos,
        totalPrize: g1Prize + g2Prize,
        totalPlacement: g1Pos + g2Pos,
      };
    });
    return {
      prize: [...results].sort((a, b) => b.totalPrize - a.totalPrize),
      placement: [...results].sort((a, b) => a.totalPlacement - b.totalPlacement),
    };
  };

  const { prize: prizeStandings, placement: placementStandings } = getStandings();

  const fmt$ = (n) => {
    if (!n) return "$0";
    if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
    if (n >= 1000) return `$${Math.round(n / 1000)}K`;
    return `$${n}`;
  };

  const fmtScore = (s) => {
    if (s === undefined || s === null) return "-";
    if (s === 0) return "E";
    return s > 0 ? `+${s}` : `${s}`;
  };

  const ordinal = (n) => {
    if (!n || n === 999) return "MC";
    const s = ["th","st","nd","rd"];
    const v = n % 100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
  };

  const medalColor = (i) => {
    if (i === 0) return GOLD;
    if (i === 1) return "#b0b8c1";
    if (i === 2) return "#cd7f32";
    if (i === 3) return "#7a9e7e";
    return "transparent";
  };

  const style = {
    wrap: {
      fontFamily: "'EB Garamond', Georgia, serif",
      background: CREAM,
      minHeight: "100vh",
      color: DARK_GREEN,
    },
    header: {
      background: `linear-gradient(180deg, ${DARK_GREEN} 0%, ${GREEN} 100%)`,
      padding: "2.5rem 2rem 2rem",
      textAlign: "center",
      borderBottom: `4px solid ${GOLD}`,
      position: "relative",
    },
    flag: {
      display: "flex",
      justifyContent: "center",
      gap: "6px",
      marginBottom: "1.2rem",
      alignItems: "center",
    },
    flagBar: {
      width: "40px",
      height: "3px",
      background: GOLD,
    },
    diamond: {
      width: "8px",
      height: "8px",
      background: GOLD,
      transform: "rotate(45deg)",
      display: "inline-block",
    },
    title: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontSize: "2.8rem",
      fontWeight: 700,
      color: CREAM,
      letterSpacing: "0.06em",
      margin: 0,
      lineHeight: 1.1,
    },
    subtitle: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontSize: "1.1rem",
      fontWeight: 400,
      fontStyle: "italic",
      color: LIGHT_GOLD,
      margin: "0.4rem 0 0",
      letterSpacing: "0.04em",
    },
    goldLine: {
      width: "80px",
      height: "1px",
      background: GOLD,
      margin: "1rem auto",
    },
    nav: {
      display: "flex",
      justifyContent: "center",
      gap: "0",
      background: GREEN,
      borderBottom: `2px solid ${GOLD}`,
    },
    tab: (active) => ({
      fontFamily: "'Playfair Display', Georgia, serif",
      fontWeight: active ? 600 : 400,
      fontSize: "0.95rem",
      letterSpacing: "0.08em",
      padding: "0.85rem 1.8rem",
      border: "none",
      background: active ? DARK_GREEN : "transparent",
      color: active ? GOLD : LIGHT_GOLD,
      cursor: "pointer",
      borderBottom: active ? `3px solid ${GOLD}` : "3px solid transparent",
      textTransform: "uppercase",
      transition: "all 0.2s",
    }),
    body: {
      maxWidth: "900px",
      margin: "0 auto",
      padding: "2rem 1.5rem",
    },
    fetchBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "1.5rem",
      flexWrap: "wrap",
      gap: "1rem",
    },
    fetchBtn: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontWeight: 600,
      fontSize: "0.85rem",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      padding: "0.65rem 1.8rem",
      background: loading ? MED_GREEN : GREEN,
      color: CREAM,
      border: `1px solid ${GOLD}`,
      cursor: loading ? "not-allowed" : "pointer",
      borderRadius: "2px",
    },
    statusChip: {
      display: "inline-block",
      fontSize: "0.8rem",
      fontStyle: "italic",
      color: MED_GREEN,
      letterSpacing: "0.02em",
    },
    sectionHead: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontSize: "1.4rem",
      fontWeight: 600,
      color: GREEN,
      borderBottom: `2px solid ${GOLD}`,
      paddingBottom: "0.5rem",
      marginBottom: "1.2rem",
      display: "flex",
      alignItems: "center",
      gap: "0.6rem",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "0.98rem",
    },
    th: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontWeight: 600,
      fontSize: "0.78rem",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: CREAM,
      background: GREEN,
      padding: "0.7rem 1rem",
      textAlign: "left",
      whiteSpace: "nowrap",
    },
    thRight: {
      textAlign: "right",
    },
    tr: (i) => ({
      background: i % 2 === 0 ? "#fff" : "#f5f2ea",
      borderBottom: `1px solid #e8e0cc`,
    }),
    td: {
      padding: "0.75rem 1rem",
      verticalAlign: "middle",
    },
    tdRight: {
      textAlign: "right",
    },
    medal: (i) => ({
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "26px",
      height: "26px",
      borderRadius: "50%",
      background: i < 4 ? medalColor(i) : "#e8e0cc",
      color: i < 4 ? (i === 0 ? DARK_GREEN : "#fff") : "#888",
      fontWeight: 700,
      fontSize: "0.78rem",
      flexShrink: 0,
    }),
    golferCell: {
      display: "flex",
      gap: "8px",
      flexWrap: "wrap",
      alignItems: "center",
    },
    gTag: (cut) => ({
      fontSize: "0.82rem",
      padding: "2px 8px",
      borderRadius: "2px",
      background: cut === false ? "#e8d5d5" : LIGHT_GOLD,
      color: cut === false ? "#8b3333" : DARK_GREEN,
      fontStyle: "italic",
      whiteSpace: "nowrap",
    }),
    playerName: {
      fontWeight: 500,
      color: DARK_GREEN,
      fontSize: "1rem",
    },
    noData: {
      textAlign: "center",
      padding: "3rem",
      color: MED_GREEN,
      fontStyle: "italic",
      fontSize: "1.05rem",
    },
    rosterGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
      gap: "1rem",
    },
    rosterCard: {
      background: "#fff",
      border: `1px solid #ddd4b8`,
      borderTop: `3px solid ${GREEN}`,
      padding: "1rem 1.2rem",
      borderRadius: "2px",
    },
    rosterName: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontSize: "1.05rem",
      fontWeight: 600,
      color: GREEN,
      marginBottom: "0.5rem",
      borderBottom: `1px solid ${LIGHT_GOLD}`,
      paddingBottom: "0.4rem",
    },
    rosterGolfer: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "0.3rem 0",
      fontSize: "0.92rem",
    },
    dot: {
      width: "6px",
      height: "6px",
      borderRadius: "50%",
      background: GOLD,
      flexShrink: 0,
    },
    prizeRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    infoBox: {
      background: `linear-gradient(135deg, ${GREEN}15, ${GOLD}08)`,
      border: `1px solid ${GOLD}60`,
      borderLeft: `4px solid ${GOLD}`,
      padding: "1rem 1.2rem",
      marginBottom: "1.5rem",
      fontSize: "0.9rem",
      lineHeight: 1.7,
      color: DARK_GREEN,
      borderRadius: "0 2px 2px 0",
    },
  };

  const renderStandingsTable = (standings, type) => {
    if (!scores) return (
      <div style={style.noData}>
        <p>Click "Fetch Live Scores" to load the Masters leaderboard.</p>
      </div>
    );
    if (scores.tournament_status === "Not Started") return (
      <div style={style.noData}>
        <p>⛳ The 2026 Masters has not yet begun.</p>
        <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>Check back once the tournament is underway.</p>
      </div>
    );

    return (
      <div style={{ overflowX: "auto" }}>
        <table style={style.table}>
          <thead>
            <tr>
              <th style={{ ...style.th, width: "44px" }}>#</th>
              <th style={style.th}>Participant</th>
              <th style={style.th}>Golfer 1</th>
              <th style={style.th}>Golfer 2</th>
              <th style={{ ...style.th, ...style.thRight }}>
                {type === "prize" ? "Total Prize $" : "Combined Pos."}
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.map((p, i) => {
              const g1 = p.g1 || {};
              const g2 = p.g2 || {};
              const cutLine = scores.cut_line || 50;
              return (
                <tr key={p.name} style={style.tr(i)}>
                  <td style={style.td}>
                    <span style={style.medal(i)}>{i + 1}</span>
                  </td>
                  <td style={style.td}>
                    <span style={style.playerName}>{p.name}</span>
                  </td>
                  <td style={style.td}>
                    <div style={style.golferCell}>
                      <span style={style.gTag(g1.made_cut)}>
                        {GOLFER_FIRST[p.golfers[0]]} {p.golfers[0]}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: "#888" }}>
                        {type === "prize"
                          ? fmt$(g1.earnings)
                          : g1.made_cut === false
                          ? `MC (${cutLine + 1})`
                          : g1.position ? ordinal(g1.position) : "—"}
                        {g1.score != null ? ` · ${fmtScore(g1.score)}` : ""}
                        {g1.thru > 0 && g1.thru < 18 ? ` (thru ${g1.thru})` : g1.thru === 0 ? " · not started" : ""}
                      </span>
                    </div>
                  </td>
                  <td style={style.td}>
                    <div style={style.golferCell}>
                      <span style={style.gTag(g2.made_cut)}>
                        {GOLFER_FIRST[p.golfers[1]]} {p.golfers[1]}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: "#888" }}>
                        {type === "prize"
                          ? fmt$(g2.earnings)
                          : g2.made_cut === false
                          ? `MC (${cutLine + 1})`
                          : g2.position ? ordinal(g2.position) : "—"}
                        {g2.score != null ? ` · ${fmtScore(g2.score)}` : ""}
                        {g2.thru > 0 && g2.thru < 18 ? ` (thru ${g2.thru})` : g2.thru === 0 ? " · not started" : ""}
                      </span>
                    </div>
                  </td>
                  <td style={{ ...style.td, ...style.tdRight }}>
                    <strong style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: "1.05rem",
                      color: i < 2 ? GREEN : DARK_GREEN,
                    }}>
                      {type === "prize"
                        ? fmt$(p.totalPrize)
                        : p.totalPlacement >= 1998 ? "-" : p.totalPlacement}
                    </strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={style.wrap}>
      <div style={style.header}>
        <div style={style.flag}>
          <div style={style.flagBar} />
          <div style={style.diamond} />
          <div style={{ ...style.flagBar, width: "60px" }} />
          <div style={style.diamond} />
          <div style={style.flagBar} />
        </div>
        <h1 style={style.title}>The Masters</h1>
        <p style={style.subtitle}>Beer Invitational Fantasy — 2026</p>
        <div style={style.goldLine} />
        <p style={{
          fontFamily: "'EB Garamond', Georgia, serif",
          fontSize: "0.85rem",
          color: LIGHT_GOLD,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          margin: 0,
        }}>
          Augusta National · April 2026
        </p>
      </div>

      <div style={style.nav}>
        {["standings", "roster", "rules"].map(tab => (
          <button
            key={tab}
            style={style.tab(activeTab === tab)}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "standings" ? "Standings" : tab === "roster" ? "Roster" : "Rules"}
          </button>
        ))}
      </div>

      <div style={style.body}>
        {activeTab === "standings" && (
          <>
            <div style={style.fetchBar}>
              <div>
                <h2 style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "1.1rem",
                  fontWeight: 400,
                  fontStyle: "italic",
                  color: MED_GREEN,
                  margin: 0,
                }}>
                  {scores
                    ? `Tournament: ${scores.tournament_status}${scores.current_round ? ` · Round ${scores.current_round}` : ""}`
                    : "Load live scores to view standings"}
                </h2>
                {lastUpdated && (
                  <span style={style.statusChip}>
                    Updated {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <button style={style.fetchBtn} onClick={fetchScores} disabled={loading}>
                {loading ? "Fetching…" : "⟳ Fetch Live Scores"}
              </button>
            </div>

            {error && (
              <div style={{ ...style.infoBox, borderLeftColor: "#c0392b", background: "#fdf0ef" }}>
                {error}
              </div>
            )}

            <div style={style.sectionHead}>
              <span style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                background: GOLD,
                transform: "rotate(45deg)",
              }} />
              Side A — Combined Prize Money
            </div>
            <p style={{ fontSize: "0.88rem", color: "#777", fontStyle: "italic", marginTop: "-0.8rem", marginBottom: "1rem" }}>
              Highest combined earnings wins · 1st & 2nd place pay out
            </p>
            {renderStandingsTable(prizeStandings, "prize")}

            <div style={{ height: "2.5rem" }} />

            <div style={style.sectionHead}>
              <span style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                background: GOLD,
                transform: "rotate(45deg)",
              }} />
              Side B — Combined Placement Score
            </div>
            <p style={{ fontSize: "0.88rem", color: "#777", fontStyle: "italic", marginTop: "-0.8rem", marginBottom: "1rem" }}>
              Lowest combined finishing position wins · Missed cut = cut line + 1 · 1st & 2nd place pay out
            </p>
            {renderStandingsTable(placementStandings, "placement")}
          </>
        )}

        {activeTab === "roster" && (
          <>
            <div style={style.sectionHead}>
              <span style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                background: GOLD,
                transform: "rotate(45deg)",
              }} />
              Participant Roster
            </div>
            <div style={style.rosterGrid}>
              {PLAYERS.map((p) => {
                const g1 = scores?.golfers?.[p.golfers[0]] || {};
                const g2 = scores?.golfers?.[p.golfers[1]] || {};
                return (
                  <div key={p.name} style={style.rosterCard}>
                    <div style={style.rosterName}>{p.name}</div>
                    {[
                      [p.golfers[0], g1],
                      [p.golfers[1], g2],
                    ].map(([last, g]) => (
                      <div key={last} style={style.rosterGolfer}>
                        <div style={style.dot} />
                        <span style={{ flex: 1 }}>
                          {GOLFER_FIRST[last]} <strong>{last}</strong>
                        </span>
                        {scores && (
                          <span style={{
                            fontSize: "0.8rem",
                            color: g.made_cut === false ? "#c0392b" : MED_GREEN,
                            fontWeight: 500,
                          }}>
                            {g.made_cut === false ? "MC" : g.score !== undefined ? fmtScore(g.score) : "—"}
                          </span>
                        )}
                      </div>
                    ))}
                    {scores && (
                      <div style={{
                        marginTop: "0.6rem",
                        paddingTop: "0.6rem",
                        borderTop: `1px solid ${LIGHT_GOLD}`,
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.8rem",
                        color: "#666",
                      }}>
                        <span>💰 {fmt$((g1.earnings || 0) + (g2.earnings || 0))}</span>
                        <span>
                          Pos: {(() => {
                            const cl = scores.cut_line || 50;
                            const p1 = g1.made_cut === false ? cl + 1 : g1.position || 999;
                            const p2 = g2.made_cut === false ? cl + 1 : g2.position || 999;
                            return p1 + p2 >= 1998 ? "—" : p1 + p2;
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === "rules" && (
          <>
            <div style={style.sectionHead}>
              <span style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                background: GOLD,
                transform: "rotate(45deg)",
              }} />
              Pool Rules — BIF 2026
            </div>
            <div style={style.infoBox}>
              <strong style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Format:</strong> Each of the 10 participants drafted two golfers in a snake-style format. Once selected, a golfer is unavailable to others.
            </div>
            <div style={style.infoBox}>
              <strong style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Payouts:</strong> 4 winners total — 1st & 2nd on each side. If you win both sides, you only receive the better prize. Winners receive 3 bottle picks; runner-ups receive 2 bottle picks. 10 participants total.
            </div>
            <div style={style.infoBox}>
              <strong style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Side A — Prize Money:</strong> The total official prize money earned by your two golfers combined. Higher total wins.
            </div>
            <div style={style.infoBox}>
              <strong style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Side B — Placement Score:</strong> The combined finishing positions of your two golfers. <em>Lowest score wins.</em> If a golfer misses the cut, their score is: (number of players who made the cut) + 1.
            </div>
            <div style={style.infoBox}>
              <strong style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Bottle Draft:</strong> Winners may draft their own bottle if available when their turn comes in the bottle draft. All bottles are shipped unless the winner elects to draft locally.
            </div>
          </>
        )}

        <div style={{
          textAlign: "center",
          marginTop: "3rem",
          paddingTop: "1.5rem",
          borderTop: `1px solid ${LIGHT_GOLD}`,
          fontSize: "0.78rem",
          color: "#aaa",
          fontStyle: "italic",
          letterSpacing: "0.05em",
        }}>
          A tradition unlike any other · BIF Masters Pool 2026
        </div>
      </div>
    </div>
  );
}
