// Substitui pelo seu Token da API Football-Data.org
const API_TOKEN = "SUA_CHAVE_AQUI"; // Exemplo: "1a2b3c4d5e6f7g8h"

// Endpoint: jogos do dia
const API_URL = "https://api.football-data.org/v4/matches";

async function carregarJogos() {
  const container = document.getElementById("lista-jogos");
  container.innerHTML = "<p>Carregando dados reais...</p>";

  try {
    const response = await fetch(API_URL, {
      headers: { "X-Auth-Token": API_TOKEN }
    });

    if (!response.ok) throw new Error("Erro ao buscar dados");

    const data = await response.json();
    const matches = data.matches;

    if (matches.length === 0) {
      container.innerHTML = "<p>Nenhuma partida encontrada hoje.</p>";
      return;
    }

    container.innerHTML = "";
    matches.slice(0, 10).forEach(match => {
      const item = document.createElement("div");
      item.classList.add("jogo");

      const home = match.homeTeam.name;
      const away = match.awayTeam.name;
      const status = match.status;
      const competition = match.competition.name;

      item.innerHTML = `
        <h3>${home} 🆚 ${away}</h3>
        <p><strong>Competição:</strong> ${competition}</p>
        <p><strong>Status:</strong> ${status}</p>
      `;
      container.appendChild(item);
    });
  } catch (error) {
    console.error(error);
    container.innerHTML = "<p>Erro ao carregar jogos reais. Tente novamente mais tarde.</p>";
  }
}

carregarJogos();
function filterFixtures(scope) {
  return state.fixtures.filter((m) => {
    if (scope === "today" && !isToday(m.kickoff)) return false;
    if (scope === "upcoming" && !isFuture(m.kickoff)) return false;
    if (scope === "live" && m.status !== "LIVE") return false;
    if (scope === "results" && m.status !== "FT" && !isYesterday(m.kickoff)) return false;
    if (state.filters.country !== "Todos" && m.country !== state.filters.country) return false;
    if (state.filters.league !== "Todas" && m.league !== state.filters.league) return false;
    if (state.filters.vipOnly && !m.vip) return false;
    return true;
  });
}

function marketPills(m) {
  const picks = state.savedPreds.find((p) => p.id === m.id)?.pick || {};
  return `
    <div class="markets">
      <span class="tag ${m.probs["1"]>m.probs["2"]?'good':''}">1 ${m.odds["1"]}</span>
      <span class="tag">${"X "+m.odds["X"]}</span>
      <span class="tag ${m.probs["2"]>m.probs["1"]?'good':''}">2 ${m.odds["2"]}</span>
      <span class="tag">${"O2.5 "+m.odds.O25}</span>
      <span class="tag">${"U2.5 "+m.odds.U25}</span>
      <span class="tag">${"BTTS "+m.odds.BTTS}</span>
      ${picks["1X2"] ? `<span class="tag good">Sua: ${picks["1X2"]}</span>` : ""}
    </div>
  `;
}

function renderRows(list, withActions=true) {
  if (!list.length) return `<div class="empty">Sem partidas nesta secção.</div>`;
  return list.map((m) => `
    <div class="row">
      <div>
        <div style="font-weight:700">${m.home} vs ${m.away}</div>
        <div class="meta">${m.country} • ${m.league} • ${m.status === "NS" ? formatKick(m.kickoff) : m.status === "LIVE" ? "AO VIVO "+m.minute+"’" : `FT ${m.score.h}-${m.score.a}`}</div>
        ${marketPills(m)}
      </div>
      <div>
        <div class="kpi">
          <span>Gol. Méd.</span>
          <span class="value">${m.goalsAvg}</span>
        </div>
        <div class="kpi" style="margin-top:8px">
          <span>Fav.</span>
          <span class="value">${m.probs["1"]>m.probs["2"]?"Casa":"Fora"}</span>
        </div>
      </div>
      <div style="display:flex; flex-direction: column; gap:8px; align-items:flex-end;">
        ${m.vip ? `<span class="pill">VIP</span>` : `<span class="pill">Grátis</span>`}
        ${withActions ? `<button class="btn primary" data-act="analisar" data-id="${m.id}">Analisar</button>` : ""}
      </div>
    </div>
  `).join("");
}

function renderFilters() {
  const countries = ["Todos", ...CountriesAndLeagues.map((x) => x.c)];
  const selLeagues = state.filters.country === "Todos"
    ? ["Todas", ...CountriesAndLeagues.flatMap((x)=>x.leagues)]
    : ["Todas", ...CountriesAndLeagues.find((x)=>x.c===state.filters.country).leagues];

  return `
    <div class="inline" style="margin-bottom:10px">
      <select class="select" id="countrySel">${countries.map((c)=>`<option ${c===state.filters.country?"selected":""}>${c}</option>`).join("")}</select>
      <select class="select" id="leagueSel">${selLeagues.map((l)=>`<option ${l===state.filters.league?"selected":""}>${l}</option>`).join("")}</select>
      <label class="inline"><input type="checkbox" id="vipOnly" ${state.filters.vipOnly?"checked":""}/> VIP</label>
    </div>
  `;
}

function renderDashboard() {
  const today = filterFixtures("today");
  const live = filterFixtures("live");
  const upcoming = filterFixtures("upcoming").slice(0, 6);
  const res = filterFixtures("results").slice(0, 6);

  return `
    <div class="grid">
      <section class="card span-6">
        <h3>Centro de Acerto</h3>
        <div class="kpi">
          <span>Taxa de Acerto</span>
          <span class="value">${state.accuracy.pct}%</span>
        </div>
        <div class="inline" style="margin-top:10px">
          <span class="pill">Acertos: ${state.accuracy.hits}</span>
          <span class="pill">Total: ${state.accuracy.total}</span>
        </div>
        <canvas id="accChart" height="120" style="margin-top:12px"></canvas>
      </section>

      <section class="card span-6">
        <h3>Hoje</h3>
        ${renderFilters()}
        ${renderRows(today)}
      </section>

      <section class="card span-6">
        <h3>Ao Vivo</h3>
        ${renderRows(live)}
      </section>

      <section class="card span-6">
        <h3>Próximos</h3>
        ${renderRows(upcoming)}
      </section>

      <section class="card">
        <h3>Resultados Recentes</h3>
        ${renderRows(res, false)}
      </section>
    </div>
  `;
}

function renderToday() {
  const list = filterFixtures("today");
  return `
    <section class="card">
      <h3>Jogos de Hoje</h3>
      ${renderFilters()}
      ${renderRows(list)}
    </section>
  `;
}
function renderUpcoming() {
  const list = filterFixtures("upcoming");
  return `
    <section class="card">
      <h3>Próximos Dias</h3>
      ${renderFilters()}
      ${renderRows(list)}
    </section>
  `;
}
function renderLive() {
  const list = filterFixtures("live");
  return `
    <section class="card">
      <h3>Ao Vivo</h3>
      ${renderRows(list)}
    </section>
  `;
}
function renderResults() {
  const list = filterFixtures("results");
  return `
    <section class="card">
      <h3>Resultados e Verificação de Previsões</h3>
      ${renderRows(list, false)}
    </section>
  `;
}
function renderLeagues() {
  return `
    <section class="card">
      <h3>Ligas Mundiais</h3>
      <div class="grid">
        ${CountriesAndLeagues.map(({c, leagues}) => `
          <div class="card span-4">
            <strong>${c}</strong>
            <div class="divider"></div>
            <ul>${leagues.map(l=>`<li>${l}</li>`).join("")}</ul>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}
function renderVIP() {
  return `
    <section class="card">
      <h3>VIP — Previsões Premium</h3>
      <p>Desbloqueie picks exclusivos com maior confiança (Under/Over, 12, Both Teams To Score, Cantos e mais).</p>
      <div class="kpi" style="margin-top:10px">
        <span>Status</span>
        <span class="value">${state.vip.active ? "Ativo" : "Inativo"}</span>
      </div>
      <div class="inline" style="margin-top:10px">
        ${state.vip.active ? `<button class="btn" id="desativarVip">Desativar</button>` : `<button class="btn primary" id="ativarVip">Assinar VIP</button>`}
        <button class="btn" id="comoPagar">Como pagar</button>
      </div>
      <div class="divider"></div>
      <h3>Jogos VIP de Hoje</h3>
      ${renderRows(filterFixtures("today").filter(m=>m.vip))}
    </section>
  `;
}
function renderPagamentos() {
  return `
    <section class="card">
      <h3>Pagamentos</h3>
      <p>Métodos disponíveis:</p>
      <ul>
        <li>M-Pesa e eMola</li>
      </ul>
      <div class="card" style="background:#fff">
        <strong>Detalhes de Pagamento</strong>
        <div class="divider"></div>
        <p>M-Pesa / eMola:</p>
        <p><strong>865821848</strong> / <strong>847528681</strong></p>
        <p>Nome: <strong>Edilson Cuna</strong></p>
        <div class="inline" style="margin-top:10px">
          <button class="btn primary" id="abrirComprovativo">Enviar Comprovativo</button>
        </div>
      </div>
    </section>
  `;
}

function render() {
  const views = {
    dashboard: renderDashboard,
    today: renderToday,
    upcoming: renderUpcoming,
    live: renderLive,
    results: renderResults,
    leagues: renderLeagues,
    vip: renderVIP,
    pagamentos: renderPagamentos,
  };
  viewEl.innerHTML = (views[state.view] || renderDashboard)();

  // Bind filter elements if present
  const countrySel = document.getElementById("countrySel");
  const leagueSel = document.getElementById("leagueSel");
  const vipOnly = document.getElementById("vipOnly");
  if (countrySel) countrySel.onchange = (e)=>{ state.filters.country = e.target.value; state.filters.league = "Todas"; render(); };
  if (leagueSel) leagueSel.onchange = (e)=>{ state.filters.league = e.target.value; render(); };
  if (vipOnly) vipOnly.onchange = (e)=>{ state.filters.vipOnly = e.target.checked; render(); };

  // Bind row actions
  viewEl.querySelectorAll("[data-act='analisar']").forEach((btn) => {
    btn.addEventListener("click", ()=> openAnalysis(btn.dataset.id));
  });

  // VIP buttons
  const ativarVip = document.getElementById("ativarVip");
  const desativarVip = document.getElementById("desativarVip");
  const comoPagar = document.getElementById("comoPagar");
  if (ativarVip) ativarVip.onclick = () => openPaymentModal();
  if (desativarVip) desativarVip.onclick = () => { state.vip.active = false; persist(); render(); };
  if (comoPagar) comoPagar.onclick = () => openPaymentHelp();

  // Comprovativo
  const abrirComprovativo = document.getElementById("abrirComprovativo");
  if (abrirComprovativo) abrirComprovativo.onclick = () => openPaymentModal();

  // Acc chart
  if (document.getElementById("accChart")) drawAccChart();
  vipBadge.classList.toggle("vip", state.vip.active);
  vipBadge.textContent = state.vip.active ? "VIP Ativo" : "VIP";
}

function persist() {
  localStorage.setItem("vip", JSON.stringify(state.vip));
  localStorage.setItem("preds", JSON.stringify(state.savedPreds));
}

function openModal(innerHtml) {
  const root = document.getElementById("modalRoot");
  root.innerHTML = `
    <div class="modal" id="modal">
      <div class="modal-card">
        ${innerHtml}
        <div class="inline" style="margin-top:12px; justify-content:flex-end">
          <button class="btn" id="closeModal">Fechar</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById("closeModal").onclick = () => { root.innerHTML = ""; };
}

function openPaymentHelp() {
  openModal(`
    <h3>Como pagar VIP</h3>
    <ol>
      <li>Envie o valor da subscrição via M-Pesa/eMola.</li>
      <li>Números: <strong>865821848</strong> / <strong>847528681</strong> — Nome: <strong>Edilson Cuna</strong></li>
      <li>Clique em "Enviar Comprovativo" e aguarde a confirmação.</li>
    </ol>
  `);
}

function openPaymentModal() {
  openModal(`
    <h3>Pagamento VIP</h3>
    <p>M-Pesa / eMola: <strong>865821848</strong> / <strong>847528681</strong> — Nome: <strong>Edilson Cuna</strong></p>
    <div class="divider"></div>
    <label class="inline">Plano:
      <select class="select" id="planoSel">
        <option value="semana">Semanal</option>
        <option value="mes">Mensal</option>
        <option value="trimestre">Trimestral</option>
      </select>
    </label>
    <div class="inline">
      <input class="input" id="txid" placeholder="Referência/TxID" />
      <input class="input" id="nome" placeholder="Seu nome" />
    </div>
    <div class="inline" style="margin-top:8px">
      <button class="btn primary" id="enviarComp">Enviar Comprovativo</button>
    </div>
    <div class="progress" style="margin-top:10px"><span id="progbar"></span></div>
    <small class="meta">Validação manual em minutos. VIP será ativado localmente.</small>
  `);
  const prog = document.getElementById("progbar");
  document.getElementById("enviarComp").onclick = async () => {
    prog.style.width = "30%";
    await delay(600);
    prog.style.width = "70%";
    await delay(600);
    prog.style.width = "100%";
    await delay(300);
    state.vip.active = true; persist(); render();
    document.getElementById("closeModal").click();
  };
}
function delay(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function openAnalysis(id) {
  const m = state.fixtures.find((x)=>x.id===id);
  if (m.vip && !state.vip.active) {
    openModal(`
      <h3>Conteúdo VIP</h3>
      <p>Este jogo é exclusivo para assinantes VIP.</p>
      <button class="btn primary" id="goVip">Assinar VIP</button>
    `);
    document.getElementById("goVip").onclick = () => { document.getElementById("closeModal").click(); setView("vip"); };
    return;
  }
  openModal(`
    <h3>${m.home} vs ${m.away}</h3>
    <div class="meta">${m.country} • ${m.league} • ${m.status==="NS"?formatKick(m.kickoff): m.status==="LIVE"?("AO VIVO "+m.minute+"’"): `FT ${m.score.h}-${m.score.a}`}</div>
    <div class="divider"></div>
    <div class="inline">
      <span class="pill">1: ${m.probs["1"]}%</span>
      <span class="pill">X: ${m.probs["X"]}%</span>
      <span class="pill">2: ${m.probs["2"]}%</span>
      <span class="pill">Gols méd.: ${m.goalsAvg}</span>
    </div>
    <p id="aiInsight" class="meta">Carregando análise...</p>
    <div class="divider"></div>
    <strong>Escolha seus mercados</strong>
    <div class="inline" style="margin-top:8px">
      <label>1X2:
        <select class="select" id="pick1x2">
          <option value="">—</option>
          <option>1</option><option>X</option><option>2</option>
        </select>
      </label>
      <label>Over/Under:
        <select class="select" id="pickOU">
          <option value="">—</option>
          <option>Over 2.5</option><option>Under 2.5</option>
        </select>
      </label>
      <label>BTTS:
        <select class="select" id="pickBTTS">
          <option value="">—</option>
          <option>BTTS: SIM</option><option>BTTS: NÃO</option>
        </select>
      </label>
      <label>Cantos:
        <select class="select" id="pickC">
          <option value="">—</option>
          <option>+9.5</option><option>+10.5</option>
        </select>
      </label>
    </div>
    <div class="inline" style="margin-top:10px">
      <button class="btn primary" id="savePick">Guardar</button>
      <button class="btn" id="limparPick">Limpar</button>
    </div>
  `);

  // Load existing picks
  const existing = state.savedPreds.find((p)=>p.id===m.id)?.pick || {};
  document.getElementById("pick1x2").value = existing["1X2"] || "";
  document.getElementById("pickOU").value = existing["O_U"] || "";
  document.getElementById("pickBTTS").value = existing["BTTS"] || "";
  document.getElementById("pickC").value = existing["CORNERS"] || "";

  // LLM insight
  getAIInsight(m).then((text)=>{
    const el = document.getElementById("aiInsight");
    if (el) el.textContent = text;
  });

  document.getElementById("savePick").onclick = () => {
    const pick = {
      "1X2": document.getElementById("pick1x2").value || undefined,
      O_U: document.getElementById("pickOU").value || undefined,
      BTTS: document.getElementById("pickBTTS").value || undefined,
      CORNERS: document.getElementById("pickC").value || undefined,
    };
    const idx = state.savedPreds.findIndex((p)=>p.id===m.id);
    if (idx>=0) state.savedPreds[idx].pick = pick; else state.savedPreds.push({id:m.id, pick});
    persist(); render();
    document.getElementById("closeModal").click();
  };
  document.getElementById("limparPick").onclick = () => {
    state.savedPreds = state.savedPreds.filter((p)=>p.id!==m.id);
    persist(); render();
    document.getElementById("closeModal").click();
  };
}

function drawAccChart() {
  const ctx = document.getElementById("accChart");
  if (!ctx) return;
  const last7 = Array.from({length:7},(_,i)=>i).map(i=>({
    d: dayjs().subtract(6-i,"day").format("DD/MM"),
    v: 55 + Math.round(Math.random()*30)
  }));
  new Chart(ctx, {
    type: "line",
    data: {
      labels: last7.map(x=>x.d),
      datasets: [{
        data: last7.map(x=>x.v),
        borderColor: "#111", backgroundColor: "rgba(0,0,0,0.05)", fill: true, tension: .35
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { min: 0, max: 100, ticks: { stepSize: 20 } } }
    }
  });
}

// Live simulation + accuracy recompute
setInterval(()=>{
  simulateLiveTick(state.fixtures);
  const finals = state.fixtures.filter(m=>m.status==="FT" && (isToday(m.kickoff) || isYesterday(m.kickoff)));
  state.accuracy = computeHitRate(state.savedPreds, finals);
  if (state.view === "live" || state.view === "dashboard" || state.view === "results" || state.view === "today") render();
}, 5000);

// Notifications (mock)
document.getElementById("notifyBtn").onclick = async () => {
  if (!("Notification" in window)) return alert("Notificações não suportadas.");
  if (Notification.permission !== "granted") await Notification.requestPermission();
  if (Notification.permission === "granted") new Notification("ProPredictions", { body: "Você receberá alertas de gols e picks VIP." });
};

// Initial render
render();

