/* Resume / CV maker: live preview, draft saved in this browser, PDF download for Pro or per-download purchase */
(function () {
  const $ = id => document.getElementById(id);
  const escH = s => String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const FIELDS = ["fn", "role", "em", "ph", "loc", "lnk", "sum", "skills", "langs"];
  const draft = FY.store.get("fy_cv", null);
  const state = draft || {
    exp: [
      { t: "Data Analyst", c: "Flipkart", d: "Jun 2023 – Present", b: "Built Power BI dashboards used by 40+ category managers\nCut weekly reporting time from 6 hours to 30 minutes with SQL automation\nFound a pricing gap that lifted margin on 1,200 SKUs by 3%" },
      { t: "Business Analyst Intern", c: "Swiggy", d: "Jan 2023 – May 2023", b: "Analysed delivery-time data for 3 cities and presented findings to ops leads" }
    ],
    edu: [{ t: "B.Tech, Computer Science", c: "NIT Calicut", d: "2019 – 2023", b: "CGPA 8.4 / 10" }],
    tpl: "modern", accent: "#6d3fe0", f: {}
  };
  if (draft) FIELDS.forEach(k => { if (draft.f && draft.f[k] !== undefined) $(k).value = draft.f[k]; });
  const seg = FY.segs((n, v) => { state[n] = v; update(); });
  if (draft) { seg.set("tpl", state.tpl); seg.set("accent", state.accent); }

  function entryEditor(arr, host, kind) {
    host.innerHTML = "";
    arr.forEach((e, i) => {
      const box = document.createElement("div");
      box.style.cssText = "display:grid;gap:8px;padding:10px;border-radius:12px;background:var(--muted)";
      box.innerHTML = '<div class="two"><input type="text" data-k="t" aria-label="' + (kind === "exp" ? "Job title" : "Degree") + '" placeholder="' + (kind === "exp" ? "Job title" : "Degree") + '">' +
        '<input type="text" data-k="c" aria-label="' + (kind === "exp" ? "Company" : "College") + '" placeholder="' + (kind === "exp" ? "Company" : "College / school") + '"></div>' +
        '<div class="two"><input type="text" data-k="d" aria-label="Dates" placeholder="Dates, e.g. 2021 – 2023"><button type="button" class="btn btn-sm" data-rm>Remove</button></div>' +
        '<textarea data-k="b" aria-label="Details" placeholder="' + (kind === "exp" ? "One achievement per line" : "Grade, honours") + '" style="min-height:60px"></textarea>';
      box.querySelectorAll("[data-k]").forEach(inp => { inp.value = e[inp.dataset.k] || ""; inp.addEventListener("input", () => { e[inp.dataset.k] = inp.value; update(); }); });
      box.querySelector("[data-rm]").addEventListener("click", () => { arr.splice(i, 1); entryEditor(arr, host, kind); update(); });
      host.appendChild(box);
    });
  }

  function update() {
    state.f = {}; FIELDS.forEach(k => state.f[k] = $(k).value);
    FY.store.set("fy_cv", state);
    const f = state.f, a = state.accent, tpl = state.tpl;
    const contact = [f.em, f.ph, f.loc, f.lnk].filter(Boolean).map(escH).join(" · ");
    const sec = (t, body) => body ? `<div style="margin-top:14px"><div style="font-weight:800;font-size:.78rem;letter-spacing:.1em;text-transform:uppercase;color:${a};border-bottom:1.5px solid ${a}33;padding-bottom:3px;margin-bottom:6px">${t}</div>${body}</div>` : "";
    const entries = arr => arr.filter(e => e.t || e.c).map(e => `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b>${escH(e.t)}${e.c ? ", " + escH(e.c) : ""}</b><span style="color:#6b6385">${escH(e.d)}</span></div>${
      (e.b || "").split("\n").filter(Boolean).map(l => `<div style="padding-left:12px;position:relative"><span style="position:absolute;left:0;color:${a}">•</span>${escH(l)}</div>`).join("")}</div>`).join("");
    const skills = f.skills.split(",").map(s => s.trim()).filter(Boolean).map(s => `<span style="display:inline-block;border:1px solid ${a}55;background:${a}12;border-radius:999px;padding:1px 9px;margin:0 4px 4px 0">${escH(s)}</span>`).join("");
    const headerModern = `<div style="background:${a};color:#fff;padding:22px 26px"><div style="font-family:var(--font-display);font-size:1.7rem;font-weight:800;line-height:1.1">${escH(f.fn)}</div><div style="opacity:.9;font-weight:600">${escH(f.role)}</div><div style="opacity:.85;font-size:.78rem;margin-top:6px">${contact}</div></div>`;
    const headerClassic = `<div style="padding:24px 26px 0;text-align:${tpl === "classic" ? "center" : "left"}"><div style="font-family:var(--font-display);font-size:1.7rem;font-weight:800;line-height:1.1;color:${a}">${escH(f.fn)}</div><div style="font-weight:600">${escH(f.role)}</div><div style="color:#6b6385;font-size:.78rem;margin-top:4px">${contact}</div></div>`;
    $("sheet").innerHTML = (tpl === "modern" ? headerModern : headerClassic) +
      `<div style="padding:${tpl === "compact" ? "6px 26px 22px" : "8px 26px 26px"};line-height:1.45">` +
      sec("Summary", f.sum ? `<div>${escH(f.sum)}</div>` : "") + sec("Experience", entries(state.exp)) + sec("Education", entries(state.edu)) +
      sec("Skills", skills) + sec("Languages", f.langs ? escH(f.langs) : "") + "</div>";
  }

  function pdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const f = state.f, W = 595, M = 48;
    const hex = state.accent.replace("#", ""), rgb = [0, 2, 4].map(i => parseInt(hex.substr(i, 2), 16));
    let y = 60;
    const need = h => { if (y + h > 800) { doc.addPage(); y = 56; } };
    const contact = [f.em, f.ph, f.loc, f.lnk].filter(Boolean).join("  |  ");
    if (state.tpl === "modern") {
      doc.setFillColor(...rgb); doc.rect(0, 0, W, 104, "F"); doc.setTextColor(255);
      doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.text(f.fn, M, 48);
      doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text(f.role, M, 68);
      doc.setFontSize(9); doc.text(contact, M, 88); y = 134;
    } else {
      const cx = state.tpl === "classic" ? W / 2 : M, al = state.tpl === "classic" ? "center" : "left";
      doc.setTextColor(...rgb); doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.text(f.fn, cx, y, { align: al });
      doc.setTextColor(29, 21, 51); doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text(f.role, cx, y += 18, { align: al });
      doc.setFontSize(9); doc.setTextColor(107, 99, 133); doc.text(contact, cx, y += 15, { align: al }); y += 26;
    }
    doc.setTextColor(29, 21, 51);
    const gap = state.tpl === "compact" ? 10 : 16;
    const heading = t => { need(40); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...rgb); doc.text(t.toUpperCase(), M, y); doc.setDrawColor(...rgb); doc.setLineWidth(.6); doc.line(M, y + 4, W - M, y + 4); doc.setTextColor(29, 21, 51); y += 18; };
    const para = (t, size) => { doc.setFont("helvetica", "normal"); doc.setFontSize(size || 10); doc.splitTextToSize(t, W - 2 * M).forEach(l => { need(14); doc.text(l, M, y); y += 13; }); };
    const entries = arr => arr.filter(e => e.t || e.c).forEach(e => {
      need(30); doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.text(e.t + (e.c ? ", " + e.c : ""), M, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(107, 99, 133); doc.text(e.d || "", W - M, y, { align: "right" }); doc.setTextColor(29, 21, 51); y += 14;
      (e.b || "").split("\n").filter(Boolean).forEach(l => doc.splitTextToSize(l, W - 2 * M - 14).forEach((s, k) => { need(13); if (!k) doc.text("•", M + 2, y); doc.text(s, M + 14, y); y += 13; }));
      y += 6;
    });
    if (f.sum) { heading("Summary"); para(f.sum); y += gap; }
    if (state.exp.length) { heading("Experience"); entries(state.exp); y += gap - 6; }
    if (state.edu.length) { heading("Education"); entries(state.edu); y += gap - 6; }
    if (f.skills) { heading("Skills"); para(f.skills.split(",").map(s => s.trim()).filter(Boolean).join("  •  ")); y += gap; }
    if (f.langs) { heading("Languages"); para(f.langs); }
    FY.download(doc.output("blob"), (f.fn || "Resume").replace(/\s+/g, "_") + "_Resume.pdf");
    FY.confetti();
  }

  $("cvf").addEventListener("input", update);
  $("cvf").addEventListener("submit", e => e.preventDefault());
  $("addExp").addEventListener("click", () => { state.exp.push({ t: "", c: "", d: "", b: "" }); entryEditor(state.exp, $("exp"), "exp"); update(); });
  $("addEdu").addEventListener("click", () => { state.edu.push({ t: "", c: "", d: "", b: "" }); entryEditor(state.edu, $("edu"), "edu"); update(); });
  $("go").addEventListener("click", () => {
    if (FY.isPro()) return pdf();
    const credits = FY.store.get("fy_cv_credit", 0) || 0;
    if (credits > 0) { FY.store.set("fy_cv_credit", credits - 1); return pdf(); }
    FY.upgrade("Your resume is ready. Download it for " + FY.PRICES[FY.currency].cv + " once, or get unlimited downloads with Pro.", { cv: true });
  });
  entryEditor(state.exp, $("exp"), "exp"); entryEditor(state.edu, $("edu"), "edu");
  update();
})();
