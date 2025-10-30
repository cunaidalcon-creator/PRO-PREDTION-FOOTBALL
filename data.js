import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import tz from "dayjs/plugin/timezone";
import { nanoid } from "nanoid";
dayjs.extend(utc); dayjs.extend(tz);

export const Markets = {
  "1X2": ["1", "X", "2"],
  DC: ["1X", "12", "X2"],
  O_U: ["Over 0.5", "Over 1.5", "Over 2.5", "Under 2.5", "Over 3.5"],
  BTTS: ["BTTS: SIM", "BTTS: NÃO"],
  CORNERS: ["+6", "+8", "+9.5", "+10.5"],
  ASIAN: ["AH -0.5", "AH -1.0", "AH +0.5"],
};

export const CountriesAndLeagues = [
  { c: "Inglaterra", leagues: ["Premier League", "Championship", "League One"] },
  { c: "Espanha", leagues: ["LaLiga", "LaLiga 2"] },
  { c: "Itália", leagues: ["Serie A", "Serie B"] },
  { c: "Alemanha", leagues: ["Bundesliga", "2. Bundesliga"] },
  { c: "França", leagues: ["Ligue 1", "Ligue 2"] },
  { c: "Portugal", leagues: ["Liga Portugal", "Liga 2"] },
  { c: "Holanda", leagues: ["Eredivisie"] },
  { c: "Turquia", leagues: ["Super Lig"] },
  { c: "China", leagues: ["Chinese Super League"] },
  { c: "Egipto", leagues: ["Egyptian Premier League"] },
  { c: "Argélia", leagues: ["Ligue 1 Algeria"] },
  { c: "Marrocos", leagues: ["Botola Pro"] },
  { c: "África do Sul", leagues: ["Premier Division"] },
  { c: "Moçambique", leagues: ["Moçambola"] },
  { c: "Angola", leagues: ["Girabola"] },
  { c: "Brasil", leagues: ["Série A", "Série B"] },
  { c: "Argentina", leagues: ["Liga Profesional"] },
  { c: "EUA", leagues: ["MLS"] },
  { c: "Japão", leagues: ["J1 League"] },
  { c: "Coreia do Sul", leagues: ["K League 1"] }
];

const teamsPool = [
  "United", "City", "Lions", "Tigers", "Wolves", "Stars", "Rangers", "Sharks",
  "Eagles", "Falcons", "Dragons", "Galaxy", "Kings", "Queens", "Titans"
];

function random(seed) {
  let x = Math.sin(seed) * 10000; return x - Math.floor(x);
}
function pick(arr, s) { return arr[Math.floor(random(s) * arr.length)]; }

function synthFixture(date, country, league, s) {
  const home = `${country.split(" ")[0]} ${pick(teamsPool, s)}`
  const away = `${country.split(" ")[0]} ${pick(teamsPool, s + 1)}`
  const kick = dayjs(date).hour(12 + Math.floor(random(s + 2) * 10)).minute([0, 15, 30, 45][Math.floor(random(s+3)*4)]);
  const prob1 = 40 + Math.floor(random(s+4)*30);
  const probx = 20 + Math.floor(random(s+5)*20);
  const prob2 = 100 - prob1 - probx;
  const goalsAvg = (1.2 + random(s+6)*2.2).toFixed(2);
  const odds = {
    "1": (100/prob1*0.92).toFixed(2),
    X: (100/probx*0.92).toFixed(2),
    "2": (100/prob2*0.92).toFixed(2),
    O25: (1.4 + random(s+7)).toFixed(2),
    U25: (1.6 + random(s+8)).toFixed(2),
    BTTS: (1.5 + random(s+9)).toFixed(2),
  };
  const vip = random(s+10) > 0.7;
  return {
    id: nanoid(8),
    country, league, home, away,
    kickoff: kick.toISOString(),
    probs: { "1": prob1, X: probx, "2": prob2 },
    goalsAvg: Number(goalsAvg),
    odds, vip,
    markets: {
      "1X2": ["1","X","2"],
      DC: ["1X","12","X2"],
      O_U: ["Over 2.5","Under 2.5"],
      BTTS: ["BTTS: SIM","BTTS: NÃO"],
      CORNERS: ["+9.5","+10.5"]
    },
    status: "NS", // NS, LIVE, FT
    minute: 0,
    score: { h: 0, a: 0 }
  };
}

export function generateFixtures(rangeDays = 5) {
  const out = [];
  const today = dayjs().startOf("day");
  let seed = 42;
  for (let d = -1; d <= rangeDays; d++) {
    CountriesAndLeagues.forEach(({ c, leagues }) => {
      leagues.forEach((lg) => {
        const matches = 2 + Math.floor(random(seed++) * 3);
        for (let i = 0; i < matches; i++) {
          out.push(synthFixture(today.add(d, "day"), c, lg, seed++));
        }
      });
    });
  }
  return out.sort((a, b) => dayjs(a.kickoff).valueOf() - dayjs(b.kickoff).valueOf());
}

export function simulateLiveTick(fixtures) {
  fixtures.forEach((m) => {
    if (m.status === "LIVE") {
      m.minute = Math.min(95, m.minute + 1 + Math.floor(Math.random()*2));
      if (Math.random() < 0.06) {
        if (Math.random() < 0.5) m.score.h += 1; else m.score.a += 1;
      }
      if (m.minute >= 95) { m.status = "FT"; }
    } else if (m.status === "NS" && dayjs(m.kickoff).isBefore(dayjs())) {
      m.status = "LIVE"; m.minute = 1;
    }
  });
}

export function computeHitRate(preds, finals) {
  // Compare simple 1X2 result accuracy
  let total = 0, hits = 0;
  finals.forEach((ft) => {
    const p = preds.find((x) => x.id === ft.id);
    if (!p) return;
    if (ft.status !== "FT") return;
    const outcome = ft.score.h === ft.score.a ? "X" : ft.score.h > ft.score.a ? "1" : "2";
    const pick = p.pick?.["1X2"];
    if (pick) { total++; if (pick === outcome) hits++; }
  });
  const pct = total ? Math.round((hits/total)*100) : 0;
  return { total, hits, pct };
}

