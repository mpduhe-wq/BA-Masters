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
  Scheffler: "Scottie",
  Hovland: "Viktor",
  DeChambeau: "Bryson",
  Spieth: "Jordan",
  McIlroy: "Rory",
  Koepka: "Brooks",
  Rahm: "Jon",
  Reed: "Patrick",
  Aberg: "Ludvig",
  Bhatia: "Akshay",
  Schauffele: "Xander",
  MacIntyre: "Robert",
  Young: "Cameron",
  Gotterup: "Chris",
  Fleetwood: "Tommy",
  Rose: "Justin",
  Fitzpatrick: "Matt",
  Matsuyama: "Hideki",
  Morikawa: "Collin",
  Lee: "Min Woo",
};

const GREEN = "#1a4a1f";
const GOLD = "#c9a84c";
const CREAM = "#faf7f0";
const DARK_GREEN = "#0f2d12";
const LIGHT_GOLD = "#f0e4c0";
const MED_GREEN = "#2e6b35";

/*
  2026 projection inputs requested by user:
  - Total purse: $25,000,000
  - 1st: $5,000,000
  - 2nd: $3,000,000
  - 3rd: $2,000,000
  - Minimum for pros missing the cut: $20,000

  For places 4+, this app builds a projected payout curve by scaling
  the 2025 Masters shape for positions 4-53, then fitting it to the
  remaining purse after accounting for:
  - fixed 1st/2nd/3rd
  - actual number of pros missing the cut at $20k each

  Tie handling:
  - ties split the average of the occupied payout slots
  - amateurs receive $0 and are skipped for payout slot purposes
*/

// Baseline payout shape only, used as weights for projected 2026 slots 4+.
const BASELINE_2025_PAYOUTS = {
  1: 4200000,
  2: 2268000,
  3: 1428000,
  4: 1008000,
  5: 840000,
  6: 756000,
  7: 703500,
  8: 651000,
  9: 609000,
  10: 567000,
  11: 525000,
  12: 483000,
  13: 441000,
  14: 399000,
  15: 378000,
  16: 357000,
  17: 336000,
  18: 315000,
  19: 294000,
  20: 273000,
  21: 252000,
  22: 235200,
  23: 218400,
  24: 201600,
  25: 184800,
  26: 168000,
  27: 161700,
  28: 155400,
  29: 149100,
  30: 142800,
  31: 136500,
  32: 130200,
  33: 123900,
  34: 118650,
  35: 113400,
  36: 108150,
  37: 102900,
  38: 98700,
  39: 94500,
  40: 90300,
  41: 86100,
  42: 81900,
  43: 77700,
  44: 73500,
  45: 69300,
  46: 65100,
  47: 60900,
  48: 57540,
  49: 54600,
  50: 52920,
  51: 51660,
  52: 50400,
  53: 49140,
};

const PROJECTED_2026_TOTAL_PURSE = 25000000;
const FIXED_PAYOUTS_2026 = {
  1: 5000000,
  2: 3000000,
  3: 2000000,
};
const MISSED_CUT_PRO_MONEY_2026 = 20000;

function parsePositionNumber(posText) {
  if (posText === null || posText === undefined) return null;
  const cleaned = String(posText).replace(/^T/i, "").trim();
  const n = parseInt(cleaned, 10);
  return Number.isNaN(n) ? null : n;
}

function parseScoreValue(scoreText) {
  if (
    scoreText === null ||
    scoreText === undefined ||
    scoreText === "" ||
    scoreText === "-" ||
    scoreText === "--"
  ) {
    return null;
  }
  if (scoreText === "E") return 0;
  const n = parseInt(String(scoreText).replace(/[^\d+-]/g, ""), 10);
  return Number.isNaN(n) ? null : n;
}

function parseThruValue(thruText) {
  if (
    thruText === null ||
    thruText === undefined ||
    thruText === "" ||
    thruText === "-"
  ) {
    return 0;
  }
  if (thruText === "F" || thruText === "F*" || thruText === 18) return 18;
  const n = parseInt(String(thruText), 10);
  return Number.isNaN(n) ? 0 : n;
}

function isAmateurCompetitor(c) {
  return c?.athlete?.amateur === true;
}

function madeCutCompetitor(c) {
  const display = c?.status?.displayValue || "";
  const detail = c?.status?.detail || "";
  return !/cut/i.test(display) && !/cut/i.test(detail);
}

function getDisplayPositionText(c) {
  return (
    c?.status?.position?.displayName ||
    c?.status?.position?.displayValue ||
    c?.linescores?.[0]?.currentPosition ||
    null
  );
}

function getOverallPositionNumber(c) {
  return parsePositionNumber(getDisplayPositionText(c));
}

function buildProjectedPayoutTable(prosWhoMadeCutCount, prosMissedCutCount) {
  const payouts = {
    1: FIXED_PAYOUTS_2026[1],
    2: FIXED_PAYOUTS_2026[2],
    3: FIXED_PAYOUTS_2026[3],
  };

  const remainingPurse =
    PROJECTED_2026_TOTAL_PURSE -
    FIXED_PAYOUTS_2026[1] -
    FIXED_PAYOUTS_2026[2] -
    FIXED_PAYOUTS_2026[3] -
    prosMissedCutCount * MISSED_CUT_PRO_MONEY_2026;

  const projectedPaidPlaces = Math.max(0, prosWhoMadeCutCount - 3);

  if (projectedPaidPlaces <= 0 || remainingPurse <= 0) {
    return payouts;
  }

  let weightSum = 0;
  for (let pos = 4; pos <= prosWhoMadeCutCount; pos += 1) {
    const weight = BASELINE_2025_PAYOUTS[pos] || BASELINE_2025_PAYOUTS[53];
    weightSum += weight;
  }

  if (weightSum <= 0) {
    return payouts;
  }

  for (let pos = 4; pos <= prosWhoMadeCutCount; pos += 1) {
    const weight = BASELINE_2025_PAYOUTS[pos] || BASELINE_2025_PAYOUTS[53];
    payouts[pos] = (remainingPurse * weight) / weightSum;
  }

  return payouts;
}

function averagePayoutSlots(payoutTable, startSlot, slotCount) {
  let total = 0;
  let count = 0;

  for (let slot = startSlot; slot < startSlot + slotCount; slot += 1) {
    if (payoutTable[slot] !== undefined) {
      total += payoutTable[slot];
      count += 1;
    }
  }

  return count ? total / count : 0;
}

function buildProLeaderboardGroups(competitors) {
  const proMadeCut = competitors
    .filter((c) => !isAmateurCompetitor(c))
    .filter((c) => madeCutCompetitor(c))
    .map((c) => ({
      competitor: c,
      overallPos: getOverallPositionNumber(c),
      posText: getDisplayPositionText(c),
      scoreToPar:
        parseScoreValue(
          c?.statistics?.find((s) => s.name === "scoreToPar")?.displayValue ??
            c?.score?.displayValue ??
            c?.score ??
            null
        ) ?? 999,
      rawName: c?.athlete?.displayName || "",
    }))
    .filter((x) => x.overallPos !== null)
    .sort((a, b) => {
      if (a.overallPos !== b.overallPos) return a.overallPos - b.overallPos;
      if (a.scoreToPar !== b.scoreToPar) return a.scoreToPar - b.scoreToPar;
      return a.rawName.localeCompare(b.rawName);
    });

  const groups = [];
  for (const item of proMadeCut) {
    const last = groups[groups.length - 1];
    if (!last || last.overallPos !== item.overallPos) {
      groups.push({
        overallPos: item.overallPos,
        competitors: [item.competitor],
      });
    } else {
      last.competitors.push(item.competitor);
    }
  }

  return groups;
}

function buildProjectedEarningsMap(competitors) {
  const prosMissedCut = competitors
    .filter((c) => !isAmateurCompetitor(c))
    .filter((c) => !madeCutCompetitor(c));

  const proGroups = buildProLeaderboardGroups(competitors);
  const prosWhoMadeCutCount = proGroups.reduce(
    (sum, g) => sum + g.competitors.length,
    0
  );

  const payoutTable = buildProjectedPayoutTable(
    prosWhoMadeCutCount,
    prosMissedCut.length
  );

  const projected = new Map();

  let nextPaidSlot = 1;
  for (const group of proGroups) {
    const tieCount = group.competitors.length;
    const avg = averagePayoutSlots(payoutTable, nextPaidSlot, tieCount);

    for (const c of group.competitors) {
      const key = c?.athlete?.displayName || "";
      projected.set(key, avg);
    }

    nextPaidSlot += tieCount;
  }

  for (const c of prosMissedCut) {
    const key = c?.athlete?.displayName || "";
    projected.set(key, MISSED_CUT_PRO_MONEY_2026);
  }

  for (const c of competitors.filter((x) => isAmateurCompetitor(x))) {
    const key = c?.athlete?.displayName || "";
    projected.set(key, 0);
  }

  return projected;
}

export default function MastersPool() {
  const [scores, setScores] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState("standings");

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap";
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

    try {
      const res = await fetch("/api/scores", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const events = data?.events || [];

      const masters =
        events.find(
          (e) =>
            e?.name?.toLowerCase().includes("masters") ||
            e?.shortName?.toLowerCase().includes("masters")
        ) || events[0];

      if (!masters) throw new Error("Masters not found in feed");

      const competition = masters?.competitions?.[0];
      if (!competition) throw new Error("Competition data missing");

      const statusDesc =
        competition?.status?.type?.description ||
        masters?.status?.type?.description ||
        "In Progress";

      const roundNum = competition?.status?.period || 1;
      const competitors = competition?.competitors || [];

      const projectedMap = buildProjectedEarningsMap(competitors);

      const madeCount = competitors.filter((c) => madeCutCompetitor(c)).length;

      const golfers = {};

      competitors.forEach((c) => {
        const fullName = c?.athlete?.displayName || "";
        const key = POOL_GOLFERS[fullName];
        if (!key) return;

        const madeCut = madeCutCompetitor(c);

        const scoreRaw =
          c?.statistics?.find((s) => s.name === "scoreToPar")?.displayValue ??
          c?.score?.displayValue ??
          c?.score ??
          "E";

        const thruRaw = c?.status?.thru ?? c?.status?.displayThru ?? 0;
        const posText = getDisplayPositionText(c);
        const position = madeCut ? parsePositionNumber(posText) : null;

        golfers[key] = {
          position,
          position_text: posText,
          score: parseScoreValue(scoreRaw),
          thru: parseThruValue(thruRaw),
          earnings: c?.earnings ?? 0,
          projected_earnings: projectedMap.get(fullName) ?? 0,
          made_cut: madeCut,
          is_amateur: isAmateurCompetitor(c),
        };
      });

      setScores({
        tournament_status: statusDesc.includes("Final") ? "Complete" : statusDesc,
        current_round: roundNum,
        cut_line: madeCount,
        golfers,
      });

      setLastUpdated(new Date());
    } catch (err) {
      setError(err?.message || "Failed to fetch scores");
    } finally {
      setLoading(false);
    }
  };

  const getStandings = () => {
    if (!scores?.golfers) return { prize: [], placement: [] };

    const cutLine = scores.cut_line || 50;

    const results = PLAYERS.map((player) => {
      const g1 = scores.golfers[player.golfers[0]] || {};
      const g2 = scores.golfers[player.golfers[1]] || {};

      const g1Prize =
        scores.tournament_status === "Complete"
          ? (g1.earnings || 0)
          : (g1.projected_earnings || 0);

      const g2Prize =
        scores.tournament_status === "Complete"
          ? (g2.earnings || 0)
          : (g2.projected_earnings || 0);

      const g1Pos = g1.made_cut === false ? cutLine + 1 : g1.position || 999;
      const g2Pos = g2.made_cut === false ? cutLine + 1 : g2.position || 999;

      return {
        ...player,
        g1,
        g2,
        g1Pos,
        g2Pos,
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
    return `$${Math.round(n).toLocaleString()}`;
  };

  const fmtScore = (s) => {
    if (s === undefined || s === null) return "-";
    if (s === 0) return "E";
    return s > 0 ? `+${s}` : `${s}`;
  };

  const ordinal = (n) => {
    if (!n || n === 999) return "MC";
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
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
    if (!scores) {
      return (
        <div style={style.noData}>
          <p>Click "Fetch Live Scores" to load the Masters leaderboard.</p>
        </div>
      );
    }

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
                {type === "prize" ? "Projected Prize $" : "Combined Pos."}
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
                          ? fmt$(
                              scores.tournament_status === "Complete"
                                ? (g1.earnings || 0)
                                : (g1.projected_earnings || 0)
                            )
                          : g1.made_cut === false
                          ? `MC (${cutLine + 1})`
                          : g1.position_text || "—"}
                        {g1.score != null ? ` · ${fmtScore(g1.score)}` : ""}
                        {g1.thru > 0 && g1.thru < 18 ? ` (thru ${g1.thru})` : ""}
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
                          ? fmt$(
                              scores.tournament_status === "Complete"
                                ? (g2.earnings || 0)
                                : (g2.projected_earnings || 0)
                            )
                          : g2.made_cut === false
                          ? `MC (${cutLine + 1})`
                          : g2.position_text || "—"}
                        {g2.score != null ? ` · ${fmtScore(g2.score)}` : ""}
                        {g2.thru > 0 && g2.thru < 18 ? ` (thru ${g2.thru})` : ""}
                      </span>
                    </div>
                  </td>
                  <td style={{ ...style.td, ...style.tdRight }}>
                    <strong
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: "1.05rem",
                        color: i < 2 ? GREEN : DARK_GREEN,
                      }}
                    >
                      {type === "prize"
                        ? fmt$(p.totalPrize)
                        : p.totalPlacement >= 1998
                        ? "-"
                        : p.totalPlacement}
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
        <p
          style={{
            fontFamily: "'EB Garamond', Georgia, serif",
            fontSize: "0.85rem",
            color: LIGHT_GOLD,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          Augusta National · April 2026
        </p>
      </div>

      <div style={style.nav}>
        {["standings", "roster", "rules"].map((tab) => (
          <button
            key={tab}
            style={style.tab(activeTab === tab)}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "standings"
              ? "Standings"
              : tab === "roster"
              ? "Roster"
              : "Rules"}
          </button>
        ))}
      </div>

      <div style={style.body}>
        {activeTab === "standings" && (
          <>
            <div style={style.fetchBar}>
              <div>
                <h2
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: "1.1rem",
                    fontWeight: 400,
                    fontStyle: "italic",
                    color: MED_GREEN,
                    margin: 0,
                  }}
                >
                  {scores
                    ? `Tournament: ${scores.tournament_status}${
                        scores.current_round ? ` · Round ${scores.current_round}` : ""
                      }`
                    : "Load live scores to view standings"}
                </h2>
                {lastUpdated && (
                  <span style={style.statusChip}>
                    Updated {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>

              <button
                style={style.fetchBtn}
                onClick={fetchScores}
                disabled={loading}
              >
                {loading ? "Fetching…" : "⟳ Fetch Live Scores"}
              </button>
            </div>

            {error && (
              <div
                style={{
                  ...style.infoBox,
                  borderLeftColor: "#c0392b",
                  background: "#fdf0ef",
                  whiteSpace: "pre-wrap",
                }}
              >
                {error}
              </div>
            )}

            <div style={style.sectionHead}>
              <span
                style={{
                  display: "inline-block",
                  width: "10px",
                  height: "10px",
                  background: GOLD,
                  transform: "rotate(45deg)",
                }}
              />
              Side A — Combined Prize Money
            </div>

            <p
              style={{
                fontSize: "0.88rem",
                color: "#777",
                fontStyle: "italic",
                marginTop: "-0.8rem",
                marginBottom: "1rem",
              }}
            >
              {scores?.tournament_status === "Complete"
                ? "Highest combined official earnings wins · 1st & 2nd place pay out"
                : "Highest combined projected 2026 earnings wins · ties split payout slots correctly · pros missing cut projected at $20K"}
            </p>

            {renderStandingsTable(prizeStandings, "prize")}

            <div style={{ height: "2.5rem" }} />

            <div style={style.sectionHead}>
              <span
                style={{
                  display: "inline-block",
                  width: "10px",
                  height: "10px",
                  background: GOLD,
                  transform: "rotate(45deg)",
                }}
              />
              Side B — Combined Placement Score
            </div>

            <p
              style={{
                fontSize: "0.88rem",
                color: "#777",
                fontStyle: "italic",
                marginTop: "-0.8rem",
                marginBottom: "1rem",
              }}
            >
              Lowest combined finishing position wins · Missed cut = cut line + 1
              · 1st & 2nd place pay out
            </p>

            {renderStandingsTable(placementStandings, "placement")}
          </>
        )}

        {activeTab === "roster" && (
          <>
            <div style={style.sectionHead}>
              <span
                style={{
                  display: "inline-block",
                  width: "10px",
                  height: "10px",
                  background: GOLD,
                  transform: "rotate(45deg)",
                }}
              />
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
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: g.made_cut === false ? "#c0392b" : MED_GREEN,
                              fontWeight: 500,
                            }}
                          >
                            {g.made_cut === false
                              ? "MC"
                              : g.score !== undefined && g.score !== null
                              ? fmtScore(g.score)
                              : "—"}
                          </span>
                        )}
                      </div>
                    ))}

                    {scores && (
                      <div
                        style={{
                          marginTop: "0.6rem",
                          paddingTop: "0.6rem",
                          borderTop: `1px solid ${LIGHT_GOLD}`,
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.8rem",
                          color: "#666",
                        }}
                      >
                        <span>
                          💰{" "}
                          {fmt$(
                            (scores.tournament_status === "Complete"
                              ? (g1.earnings || 0) + (g2.earnings || 0)
                              : (g1.projected_earnings || 0) +
                                (g2.projected_earnings || 0))
                          )}
                        </span>
                        <span>
                          Pos:{" "}
                          {(() => {
                            const cl = scores.cut_line || 50;
                            const p1 =
                              g1.made_cut === false ? cl + 1 : g1.position || 999;
                            const p2 =
                              g2.made_cut === false ? cl + 1 : g2.position || 999;
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
              <span
                style={{
                  display: "inline-block",
                  width: "10px",
                  height: "10px",
                  background: GOLD,
                  transform: "rotate(45deg)",
                }}
              />
              Pool Rules — BIF 2026
            </div>

            <div style={style.infoBox}>
              <strong style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Format:
              </strong>{" "}
              Each of the 10 participants drafted two golfers in a snake-style
              format. Once selected, a golfer is unavailable to others.
            </div>

            <div style={style.infoBox}>
              <strong style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Payouts:
              </strong>{" "}
              4 winners total — 1st & 2nd on each side. If you win both sides,
              you only receive the better prize. Winners receive 3 bottle picks;
              runner-ups receive 2 bottle picks. 10 participants total.
            </div>

            <div style={style.infoBox}>
              <strong style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Side A — Prize Money:
              </strong>{" "}
              During the tournament, projected 2026 prize money is used. Once the
              tournament is complete, official earnings are used.
            </div>

            <div style={style.infoBox}>
              <strong style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Side B — Placement Score:
              </strong>{" "}
              The combined finishing positions of your two golfers. <em>Lowest
              score wins.</em> If a golfer misses the cut, their score is:
              (number of players who made the cut) + 1.
            </div>

            <div style={style.infoBox}>
              <strong style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Projection Method:
              </strong>{" "}
              Uses a $25M projected 2026 purse with fixed 1st/2nd/3rd prizes of
              $5M/$3M/$2M, $20K minimum for pros missing the cut, and proper tie
              averaging across payout slots.
            </div>
          </>
        )}

        <div
          style={{
            textAlign: "center",
            marginTop: "3rem",
            paddingTop: "1.5rem",
            borderTop: `1px solid ${LIGHT_GOLD}`,
            fontSize: "0.78rem",
            color: "#aaa",
            fontStyle: "italic",
            letterSpacing: "0.05em",
          }}
        >
          A tradition unlike any other · BIF Masters Pool 2026
        </div>
      </div>
    </div>
  );
}
