/* Visual CV maker: designed layouts with photo, skill bars, timeline.
   Exports a designed PDF (html2canvas + jsPDF) and a standalone one-page website. */
(function () {
  const $ = id => document.getElementById(id);
  const sheet = $("vsheet");
  const escH = s => String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const THEMES = {
    violet: { d: "#4a24a8", a: "#6d3fe0", b: "#ff8ad0", soft: "#f1ecff", paper: "#ffffff", ink: "#1d1533" },
    sunset: { d: "#b0263f", a: "#e8445f", b: "#ffb547", soft: "#fff0ea", paper: "#ffffff", ink: "#2a1620" },
    ocean: { d: "#0a4a96", a: "#0f6fde", b: "#2ec4a6", soft: "#e8f3ff", paper: "#ffffff", ink: "#0f1f33" },
    forest: { d: "#0d5034", a: "#16794f", b: "#b5e655", soft: "#ebf6ee", paper: "#ffffff", ink: "#132a1e" },
    night: { d: "#5b3fb8", a: "#a78bfa", b: "#f472b6", soft: "#2a2342", paper: "#17122a", ink: "#f3f0ff" }
  };
  const FIELDS = ["v_fn", "v_role", "v_em", "v_ph", "v_loc", "v_web", "v_sum", "v_skills", "v_tools", "v_langs"];
  const draft = FY.store.get("fy_vcv", null);
  const state = draft || {
    layout: "sidebar", theme: "violet", photo: "", f: {},
    exp: [
      { t: "Senior Product Designer", c: "CRED", d: "2023 – Present", b: "Led the redesign of bill payments, lifting completion by 18%\nBuilt a design system of 120+ components used by 6 teams" },
      { t: "UI/UX Designer", c: "Unacademy", d: "2021 – 2023", b: "Designed the live-class experience for 1M+ learners\nRan 40+ user interviews to shape the mobile app" }
    ],
    prj: [{ t: "Kirana POS app", c: "Side project", d: "2024", b: "Billing app for small shops, 5,000+ downloads" }],
    edu: [{ t: "B.Des, Interaction Design", c: "MIT Institute of Design, Pune", d: "2017 – 2021", b: "" }]
  };
  if (draft) FIELDS.forEach(k => { if (draft.f && draft.f[k] !== undefined) $(k).value = draft.f[k]; });
  const seg = FY.segs((n, v) => { state[n] = v; update(); });
  if (draft) { seg.set("layout", state.layout); seg.set("theme", state.theme); }

  const CSS = `
.vcv{--a:#6d3fe0;--b:#ff8ad0;--soft:#f1ecff;--paper:#fff;--ink:#1d1533;width:794px;min-height:1123px;background:var(--paper);color:var(--ink);font-family:"Figtree","Segoe UI",system-ui,sans-serif;font-size:13px;line-height:1.5;box-sizing:border-box;position:relative;overflow:hidden}
.vcv *{box-sizing:border-box}
.vcv h1,.vcv .vname,.vcv h2,.vcv h3{font-family:"Bricolage Grotesque","Trebuchet MS",sans-serif;margin:0;letter-spacing:-.01em}
.vcv h1,.vcv .vname{font-size:34px;line-height:1.05;font-weight:800}
.vcv .head{font-size:15px;font-weight:600;opacity:.85;margin-top:4px}
.vcv h2{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--a);margin:0 0 10px;display:flex;align-items:center;gap:8px}
.vcv h2::after{content:"";flex:1;height:2px;background:linear-gradient(90deg,var(--a),transparent);opacity:.35}
.vcv section{margin:0 0 20px;padding:0}
.vcv .photo{width:132px;height:132px;border-radius:50%;object-fit:cover;border:5px solid var(--paper);box-shadow:0 0 0 3px var(--b)}
.vcv .initials{width:132px;height:132px;border-radius:50%;display:grid;place-items:center;font:800 44px "Bricolage Grotesque",sans-serif;background:var(--b);color:#1d1533;border:5px solid var(--paper)}
.vcv .job{margin-bottom:12px}
.vcv .job .top{display:flex;justify-content:space-between;gap:10px;align-items:baseline}
.vcv .job b{font-size:14px}
.vcv .job .when{font-size:11.5px;font-weight:700;color:var(--a);white-space:nowrap}
.vcv .job .org{font-weight:600;opacity:.75}
.vcv .job ul{margin:4px 0 0;padding-left:16px}
.vcv .job li::marker{color:var(--b)}
.vcv .bar{margin-bottom:8px}
.vcv .bar .lbl{display:flex;justify-content:space-between;font-weight:600;font-size:12px}
.vcv .bar .track{height:8px;border-radius:99px;background:rgba(127,127,127,.2);overflow:hidden;margin-top:3px}
.vcv .bar .fill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--a),var(--b))}
.vcv .tags{display:flex;flex-wrap:wrap;gap:6px}
.vcv .tag{padding:3px 10px;border-radius:99px;font-size:11.5px;font-weight:600;background:var(--soft);color:var(--ink);border:1px solid rgba(127,127,127,.25)}
.vcv .contact{display:grid;gap:7px;font-size:12px;word-break:break-word}
.vcv .contact span{display:flex;gap:8px;align-items:center}
.vcv .contact i{width:20px;height:20px;border-radius:6px;display:inline-grid;place-items:center;font-style:normal;font-size:11px;font-weight:800;background:rgba(255,255,255,.25);flex:none}
/* sidebar */
.vcv.sidebar{display:grid;grid-template-columns:270px 1fr}
.vcv.sidebar .side{background:linear-gradient(170deg,var(--a),var(--d));color:#fff;padding:36px 26px;display:flex;flex-direction:column;gap:22px}
.vcv.sidebar .side h2{color:#fff}.vcv.sidebar .side h2::after{background:linear-gradient(90deg,#fff,transparent)}
.vcv.sidebar .side .track{background:rgba(255,255,255,.25)}.vcv.sidebar .side .fill{background:linear-gradient(90deg,var(--b),#fff)}
.vcv.sidebar .side .tag{background:rgba(255,255,255,.16);color:#fff;border-color:rgba(255,255,255,.3)}
.vcv.sidebar .main{padding:40px 34px}
.vcv.sidebar .main .vname{color:var(--a)}
/* hero */
.vcv.hero .band{background:linear-gradient(120deg,var(--a),var(--b));color:#fff;padding:40px 44px;display:flex;gap:28px;align-items:center;position:relative}
.vcv.hero .band::after{content:"";position:absolute;right:-60px;top:-60px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.14)}
.vcv.hero .band .contact{grid-template-columns:1fr 1fr;margin-top:12px;gap:4px 18px}
.vcv.hero .cols{display:grid;grid-template-columns:1fr 250px;gap:30px;padding:30px 44px}
.vcv.hero .aside{background:var(--soft);border-radius:18px;padding:20px;align-self:start}
/* timeline */
.vcv.timeline{padding:40px 46px}
.vcv.timeline .vhead{display:flex;gap:24px;align-items:center;padding-bottom:22px;margin-bottom:22px;border-bottom:3px solid var(--soft)}
.vcv.timeline .vhead .vname{color:var(--a)}
.vcv.timeline .vhead .contact{grid-template-columns:1fr 1fr;gap:4px 18px;margin-top:8px}
.vcv.timeline .vhead .contact i{background:var(--soft);color:var(--a)}
.vcv.timeline .tl{position:relative;padding-left:26px}
.vcv.timeline .tl::before{content:"";position:absolute;left:7px;top:4px;bottom:4px;width:3px;border-radius:3px;background:linear-gradient(var(--a),var(--b))}
.vcv.timeline .tl .job::before{content:"";position:absolute;left:0;width:17px;height:17px;border-radius:50%;background:var(--paper);border:4px solid var(--a);margin-top:1px}
.vcv.timeline .grid2{display:grid;grid-template-columns:1fr 1fr;gap:26px}
.vcv .made{position:absolute;right:16px;bottom:10px;font-size:9.5px;opacity:.5}
.vcv.site{width:auto;max-width:960px;margin:0 auto;min-height:100vh}
@media (max-width:820px){.vcv.site.sidebar .main{order:-1}.vcv.site.sidebar,.vcv.site.hero .cols,.vcv.site.timeline .grid2{grid-template-columns:1fr}.vcv.site.hero .band,.vcv.site.timeline .vhead{flex-direction:column;text-align:center}.vcv.site .contact{grid-template-columns:1fr!important}.vcv.site.timeline,.vcv.site.hero .cols,.vcv.site.sidebar .main{padding:26px 20px}}`;
  const styleEl = document.createElement("style"); styleEl.textContent = CSS; document.head.appendChild(styleEl);

  function entryEditor(arr, host, labels) {
    host.innerHTML = "";
    arr.forEach((e, i) => {
      const box = document.createElement("div");
      box.style.cssText = "display:grid;gap:8px;padding:10px;border-radius:12px;background:var(--muted)";
      box.innerHTML = `<div class="two"><input type="text" data-k="t" aria-label="${labels[0]}" placeholder="${labels[0]}"><input type="text" data-k="c" aria-label="${labels[1]}" placeholder="${labels[1]}"></div>
        <div class="two"><input type="text" data-k="d" aria-label="Dates" placeholder="Dates"><button type="button" class="btn btn-sm" data-rm>Remove</button></div>
        <textarea data-k="b" aria-label="Details" placeholder="One point per line" style="min-height:56px"></textarea>`;
      box.querySelectorAll("[data-k]").forEach(inp => { inp.value = e[inp.dataset.k] || ""; inp.addEventListener("input", () => { e[inp.dataset.k] = inp.value; update(); }); });
      box.querySelector("[data-rm]").addEventListener("click", () => { arr.splice(i, 1); entryEditor(arr, host, labels); update(); });
      host.appendChild(box);
    });
  }

  function markup(site) {
    const f = state.f, th = THEMES[state.theme];
    const vars = `--d:${th.d};--a:${th.a};--b:${th.b};--soft:${th.soft};--paper:${th.paper};--ink:${th.ink}`;
    const initials = (f.v_fn || "?").split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
    const photo = state.photo ? `<img class="photo" src="${state.photo}" alt="${escH(f.v_fn)}">` : `<div class="initials">${escH(initials)}</div>`;
    const contact = [["@", f.v_em], ["☎", f.v_ph], ["⌂", f.v_loc], ["↗", f.v_web]].filter(x => x[1]).map(([i, v]) => `<span><i>${i}</i>${escH(v)}</span>`).join("");
    const jobs = arr => arr.filter(e => e.t || e.c).map(e => `<div class="job"><div class="top"><b>${escH(e.t)}</b><span class="when">${escH(e.d)}</span></div>${e.c ? `<div class="org">${escH(e.c)}</div>` : ""}${(e.b || "").trim() ? "<ul>" + e.b.split("\n").filter(Boolean).map(l => `<li>${escH(l)}</li>`).join("") + "</ul>" : ""}</div>`).join("");
    const skills = (f.v_skills || "").split(",").map(s => s.trim()).filter(Boolean).map(s => { const [n, l] = s.split(":"); const lv = Math.max(5, Math.min(100, parseInt(l, 10) || 70)); return `<div class="bar"><div class="lbl"><span>${escH(n.trim())}</span><span>${lv}%</span></div><div class="track"><div class="fill" style="width:${lv}%"></div></div></div>`; }).join("");
    const tags = (f.v_tools || "").split(",").map(s => s.trim()).filter(Boolean).map(s => `<span class="tag">${escH(s)}</span>`).join("");
    const sec = (t, body, cls) => body ? `<section${cls ? ` class="${cls}"` : ""}><h2>${t}</h2>${body}</section>` : "";
    const about = f.v_sum ? `<p style="margin:0">${escH(f.v_sum)}</p>` : "";
    const langs = f.v_langs ? `<div class="tags">${f.v_langs.split(",").map(s => `<span class="tag">${escH(s.trim())}</span>`).join("")}</div>` : "";
    const made = site ? "" : FY.isPro() ? "" : `<div class="made">Made with ${escH(FY.site)}</div>`;
    const H = site ? "h1" : "div";
    const cls = "vcv " + state.layout + (site ? " site" : "");
    if (state.layout === "sidebar") return `<div class="${cls}" style="${vars}"><aside class="side">${photo}${sec("Contact", `<div class="contact">${contact}</div>`)}${sec("Skills", skills)}${sec("Tools & interests", tags ? `<div class="tags">${tags}</div>` : "")}${sec("Languages", langs)}</aside>
      <div class="main"><${H} class="vname">${escH(f.v_fn)}</${H}><div class="head">${escH(f.v_role)}</div><div style="height:22px"></div>${sec("About me", about)}${sec("Experience", jobs(state.exp))}${sec("Projects", jobs(state.prj))}${sec("Education", jobs(state.edu))}</div>${made}</div>`;
    if (state.layout === "hero") return `<div class="${cls}" style="${vars}"><div class="band">${photo}<div><${H} class="vname">${escH(f.v_fn)}</${H}><div class="head">${escH(f.v_role)}</div><div class="contact">${contact}</div></div></div>
      <div class="cols"><div>${sec("About me", about)}${sec("Experience", jobs(state.exp))}${sec("Projects", jobs(state.prj))}</div><div class="aside">${sec("Skills", skills)}${sec("Education", jobs(state.edu))}${sec("Tools & interests", tags ? `<div class="tags">${tags}</div>` : "")}${sec("Languages", langs)}</div></div>${made}</div>`;
    return `<div class="${cls}" style="${vars}"><div class="vhead">${photo}<div><${H} class="vname">${escH(f.v_fn)}</${H}><div class="head">${escH(f.v_role)}</div><div class="contact">${contact}</div></div></div>
      ${sec("About me", about)}<div class="grid2"><div>${sec("Experience", `<div class="tl">${jobs(state.exp)}</div>`)}${sec("Projects", `<div class="tl">${jobs(state.prj)}</div>`)}</div><div>${sec("Skills", skills)}${sec("Education", jobs(state.edu))}${sec("Tools & interests", tags ? `<div class="tags">${tags}</div>` : "")}${sec("Languages", langs)}</div></div>${made}</div>`;
  }

  function fit() { const w = sheet.parentElement.clientWidth; const s = Math.min(1, w / 794); sheet.style.transform = `scale(${s})`; sheet.parentElement.style.height = (sheet.firstElementChild ? sheet.firstElementChild.offsetHeight : 1123) * s + "px"; }
  function update() {
    state.f = {}; FIELDS.forEach(k => state.f[k] = $(k).value);
    FY.store.set("fy_vcv", state);
    sheet.innerHTML = markup(false);
    fit();
  }
  window.addEventListener("resize", fit);

  $("photo").addEventListener("change", async e => {
    const file = e.target.files[0]; e.target.value = "";
    if (!file) return;
    try {
      const img = await FY.loadImage(file);
      const c = document.createElement("canvas"), s = 360, k = Math.max(s / img.naturalWidth, s / img.naturalHeight);
      c.width = c.height = s;
      c.getContext("2d").drawImage(img, (s - img.naturalWidth * k) / 2, (s - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
      state.photo = c.toDataURL("image/jpeg", .85); update();
    } catch (err) { FY.toast(err.message, true); }
  });
  $("noPhoto").addEventListener("click", () => { state.photo = ""; update(); });

  function unlocked() {
    if (FY.isPro() || FY.store.get("fy_vcv_paid", false)) return true;
    const credits = FY.store.get("fy_cv_credit", 0) || 0;
    if (credits > 0) { FY.store.set("fy_cv_credit", credits - 1); FY.store.set("fy_vcv_paid", true); return true; }
    FY.upgrade("Your visual CV is ready. Unlock the designed PDF and personal website for " + FY.PRICES[FY.currency].cv + " once, or get unlimited downloads with Pro.", { cv: true });
    return false;
  }
  const fileBase = () => (state.f.v_fn || "Resume").replace(/\s+/g, "_");

  async function pdf() {
    if (!unlocked()) return;
    const btn = $("v_pdf"); btn.disabled = true;
    const holder = document.createElement("div");
    holder.style.cssText = "position:fixed;left:-10000px;top:0;width:794px";
    holder.innerHTML = markup(false);
    document.body.appendChild(holder);
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const el = holder.firstElementChild;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: THEMES[state.theme].paper });
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const W = 595.28, H = 841.89, pageH = canvas.width * H / W;
      for (let y = 0, page = 0; y < canvas.height - 2; y += pageH, page++) {
        const slice = document.createElement("canvas");
        slice.width = canvas.width; slice.height = Math.min(pageH, canvas.height - y);
        const sctx = slice.getContext("2d");
        sctx.fillStyle = THEMES[state.theme].paper; sctx.fillRect(0, 0, slice.width, slice.height);
        sctx.drawImage(canvas, 0, -y);
        if (page) doc.addPage();
        doc.addImage(slice.toDataURL("image/jpeg", .93), "JPEG", 0, 0, W, slice.height * W / canvas.width);
      }
      FY.download(doc.output("blob"), fileBase() + "_Visual_CV.pdf");
      FY.confetti();
    } catch (e) { FY.toast("Could not create the PDF: " + e.message, true); }
    finally { holder.remove(); btn.disabled = false; }
  }

  function site() {
    if (!unlocked()) return;
    const f = state.f, th = THEMES[state.theme];
    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escH(f.v_fn)} – ${escH(f.v_role)}</title>
<meta name="description" content="${escH((f.v_sum || "").slice(0, 155))}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Figtree:wght@400;600;700&display=swap">
<style>body{margin:0;background:${th.paper === "#ffffff" ? th.soft : "#0d0a18"}}${CSS}
.vcv.site{box-shadow:0 20px 60px rgba(0,0,0,.12)}@media (min-width:821px){body{padding:40px 16px}.vcv.site{border-radius:22px}}</style></head>
<body>${markup(true)}</body></html>`;
    FY.download(new Blob([html], { type: "text/html" }), fileBase().toLowerCase() + "-resume.html");
    FY.toast("Website downloaded. Drag it onto app.netlify.com/drop to put it online for free.");
    FY.confetti();
  }

  $("vcvf").addEventListener("input", update);
  $("vcvf").addEventListener("submit", e => e.preventDefault());
  const L = { exp: ["Job title", "Company"], prj: ["Project name", "Type or client"], edu: ["Degree", "College / school"] };
  [["v_addExp", "exp", "v_exp"], ["v_addPrj", "prj", "v_prj"], ["v_addEdu", "edu", "v_edu"]].forEach(([btn, key, host]) => {
    $(btn).addEventListener("click", () => { state[key].push({ t: "", c: "", d: "", b: "" }); entryEditor(state[key], $(host), L[key]); update(); });
    entryEditor(state[key], $(host), L[key]);
  });
  $("v_pdf").addEventListener("click", pdf);
  $("v_site").addEventListener("click", site);
  update();
})();
