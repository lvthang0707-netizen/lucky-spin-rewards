type Json = Record<string, any>;
const nativeFetch = window.fetch.bind(window);

async function call(action: string, method = "GET", body?: Json) {
  const apiPath = location.pathname.includes("/admin/") ? "../api.php" : "./api.php";
  return nativeFetch(`${apiPath}?action=${encodeURIComponent(action)}`, {
    method,
    credentials: "same-origin",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
}
async function data() {
  const r = await call("admin_data");
  return { response: r, value: await r.json() };
}
function response(value: any, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}
function gameConfig(raw: Json = {}) {
  return Object.fromEntries(Object.entries(raw).map(([id, value]: [string, any]) => [id, value.prizes || value]));
}
function depositConfig(raw: Json = {}) {
  return Object.fromEntries(Object.entries(raw).map(([id, value]: [string, any]) => [id, value.prizes || value]));
}
function wrapFreeConfig(raw: Json) {
  return Object.fromEntries(Object.entries(raw).map(([id, prizes]: [string, any]) => [id, { name: id.toUpperCase(), colors: prizes.map((p: any) => p.color), prizes }]));
}
function wrapDepositConfig(raw: Json) {
  return Object.fromEntries(Object.entries(raw).map(([id, prizes]: [string, any]) => [id, { name: id.toUpperCase(), colors: prizes.map((p: any) => p.color), prizes }]));
}
function parse(input: RequestInfo | URL) {
  return new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.origin);
}

export function installApiBridge() {
  window.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = parse(input), path = url.pathname, method = (init.method || "GET").toUpperCase();
    if (!path.startsWith("/api/")) return nativeFetch(input, init);
    const body = init.body ? JSON.parse(String(init.body)) : {};

    if (path === "/api/winners") {
      const r = await call("bootstrap"), d = await r.json();
      return response({ recent: d.recent || [], top: d.top || [] }, r.status);
    }
    if (path === "/api/offers") {
      const r = await call("bootstrap"), d = await r.json(); return response(d.offers || {}, r.status);
    }
    if (path === "/api/daily-spins" && method === "GET") {
      const r = await call("bootstrap"), d = await r.json();
      return response({ games: Object.keys(d.games || {}).map(id => ({ id, name: (d.games[id].name || id).toUpperCase() })) }, r.status);
    }
    if (path === "/api/daily-spins" && method === "POST") {
      const action = body.action === "spin" ? "free_spin" : "free_status";
      const r = await call(action, "POST", { name: body.facebookName, game: body.game }), d = await r.json();
      const out = { ...d, facebookName: d.name || body.facebookName, game: d.game || body.game, config: d.config?.prizes || d.config || [], spins: [], used: d.used || 0, remaining: d.remaining ?? 0 };
      return response(out, r.status);
    }
    if (path === "/api/spins" && method === "GET") {
      const token = url.searchParams.get("token") || "";
      const r = await call("access", "POST", { value: token }), d = await r.json();
      if (!r.ok || d.mode !== "deposit") return response({ error: d.error || "Code not found" }, r.ok ? 404 : r.status);
      const x = d.deposit; return response({ customerId: x.customer_name, status: x.status, result: x.result, code: x.claim_code, expiresAt: x.expires_at, prizes: x.prizes }, 200);
    }
    if (path === "/api/spins" && method === "POST") {
      const r = await call("deposit_spin", "POST", body), d = await r.json(); return response(d, r.status);
    }

    if (path === "/api/admin/offers") {
      if (method === "GET") { const x = await data(); return response(x.value.offers || {}, x.response.status); }
      const r = await call("admin_save", "POST", { key: "offers", value: body }); return response(await r.json(), r.status);
    }
    if (path === "/api/admin/spins" && method === "GET") {
      const x = await data(), d = x.value;
      const wheels = depositConfig(d.depositWheels || {}), first = Object.values(wheels)[0] as any[] | undefined;
      return response({ rows: (d.depositHistory || []).map((r: any) => ({ id:r.id,customerId:r.customer_name,token:r.token,status:r.status,result:r.result,code:r.claim_code,createdAt:r.created_at,expiresAt:r.expires_at,weights:(JSON.parse(r.prizes || "[]")).map((p:any)=>p.weight),url:`?token=${encodeURIComponent(r.token)}` })), defaults:(first || []).map(p=>p.weight), depositWheels:wheels }, x.response.status);
    }
    if (path === "/api/admin/spins" && method === "POST") {
      const r = await call("admin_create_code", "POST", { name:body.customerId,hours:body.hours,wheel:body.wheelId }), d = await r.json();
      return response(r.ok ? { row:{ token:d.token } } : d, r.status);
    }
    if (path === "/api/admin/spins" && method === "PATCH") {
      let r;
      if (body.action === "save-deposit-wheels") r = await call("admin_save", "POST", { key:"deposit_wheels", value:wrapDepositConfig(body.depositWheels) });
      else if (body.action === "save-defaults") r = await call("admin_update", "POST", body);
      else r = await call("admin_update", "POST", body);
      return response(await r.json(), r.status);
    }
    if (path === "/api/admin/spins" && method === "DELETE") {
      const r = body.id ? await call("admin_delete", "POST", { type:"deposit",id:body.id }) : await call("admin_delete_all", "POST", { type:"deposit" }); return response(await r.json(), r.status);
    }
    if (path === "/api/admin/daily-spins" && method === "GET") {
      const x = await data(), d = x.value;
      return response({ rows:(d.freeHistory || []).map((r:any)=>({id:r.id,player_id:r.player_id||0,facebook_name:r.name,game:r.game_id,result:r.prize,confirmation_code:r.claim_code,created_at:r.created_at,date_key:(r.created_at||"").slice(0,10),spin_number:0})), players:(d.players || []).map((p:any)=>({...p,last_seen_at:p.created_at,os2_used:Number(p.spins_today),moolah_used:Number(p.spins_today)})), config:gameConfig(d.games || {}) }, x.response.status);
    }
    if (path === "/api/admin/daily-spins" && method === "POST") {
      const r = await call("admin_player_add", "POST", { name:body.facebookName }); return response(await r.json(), r.status);
    }
    if (path === "/api/admin/daily-spins" && method === "PATCH") {
      let r;
      if (body.action === "reset-all") r = await call("admin_reset_free", "POST");
      else r = await call("admin_save", "POST", { key:"freeplay_games", value:wrapFreeConfig(body.config) });
      return response(await r.json(), r.status);
    }
    if (path === "/api/admin/daily-spins" && method === "DELETE") {
      let r;
      if (body.action === "delete-all") r = await call("admin_delete_all", "POST", { type:"players" });
      else if (body.action === "delete-history-all") r = await call("admin_delete_all", "POST", { type:"free" });
      else if (body.action === "delete-history-one") r = await call("admin_delete", "POST", { type:"free",id:body.spinId });
      else r = await call("admin_delete", "POST", { type:"player",id:body.playerId });
      return response(await r.json(), r.status);
    }
    if (path === "/api/admin/winners" && method === "GET") {
      const x = await data(), live = x.value.live || [];
      const map = (r:any)=>({id:r.id,customerId:r.winner_name,prize:r.prize,createdAt:r.created_at,featuredRank:r.top_rank,winnerType:r.prize.includes("DEPOSIT")?"deposit":"freeplay",frequency:r.frequency});
      return response({ manualRows:live.filter((r:any)=>r.source==="manual").map(map), realRows:live.filter((r:any)=>r.source==="real").map(map) }, x.response.status);
    }
    if (path === "/api/admin/winners" && method === "POST") {
      const r = await call("admin_live_add", "POST", { name:body.customerId,prize:body.prize,frequency:body.frequency,rank:body.featuredRank??"",winnerType:body.winnerType }); return response(await r.json(), r.status);
    }
    if (path === "/api/admin/winners" && method === "PATCH") {
      const r = await call("admin_update", "POST", { action:"top",id:body.id,rank:body.featuredRank }); return response(await r.json(), r.status);
    }
    if (path === "/api/admin/winners" && method === "DELETE") {
      const id = Number(url.searchParams.get("id") || url.searchParams.get("sourceKey"));
      const r = await call("admin_delete", "POST", { type:"live",id }); return response(await r.json(), r.status);
    }
    return response({ error:"Unsupported API route" }, 404);
  }) as typeof window.fetch;
}
