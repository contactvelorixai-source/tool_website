/* QR code generator: link, UPI, WhatsApp, Wi-Fi, phone, text. PNG + SVG export. */
(function () {
  const $ = id => document.getElementById(id);
  const canvas = $("qrCanvas"), label = $("qrLabel");
  qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];
  const seg = FY.segs((n, v) => { if (n === "type") show(v); });
  const enc = encodeURIComponent;
  const esc = s => String(s).replace(/([\;,:"])/g, "\\$1");
  function show(t) { document.querySelectorAll("[data-q]").forEach(el => el.hidden = el.dataset.q !== t); draw(); }

  function payload() {
    const v = id => $(id).value.trim();
    switch (seg.type) {
      case "url": { let u = v("q_url"); if (u && !/^[a-z]+:/i.test(u)) u = "https://" + u; return [u, u]; }
      case "upi": {
        if (!v("q_vpa")) return ["", "Enter your UPI ID"];
        if (!/^[\w.\-]+@[\w]+$/.test(v("q_vpa"))) return ["", "UPI ID should look like name@bank"];
        let s = "upi://pay?pa=" + v("q_vpa") + "&pn=" + enc(v("q_pn") || v("q_vpa")) + "&cu=INR";
        if (+v("q_am") > 0) s += "&am=" + (+v("q_am")).toFixed(2);
        if (v("q_tn")) s += "&tn=" + enc(v("q_tn"));
        return [s, "Pay " + (v("q_pn") || v("q_vpa")) + (+v("q_am") > 0 ? " · ₹" + (+v("q_am")).toLocaleString("en-IN") : "") + " via any UPI app"];
      }
      case "wa": { const n = v("q_wan").replace(/\D/g, ""); if (!n) return ["", "Enter a WhatsApp number"]; return ["https://wa.me/" + n + (v("q_wam") ? "?text=" + enc(v("q_wam")) : ""), "Chat on WhatsApp: +" + n]; }
      case "wifi": { if (!v("q_ssid")) return ["", "Enter the Wi-Fi name"]; const sec = $("q_sec").value; return ["WIFI:T:" + sec + ";S:" + esc(v("q_ssid")) + ";" + (sec !== "nopass" ? "P:" + esc($("q_pass").value) + ";" : "") + ";", "Join Wi-Fi: " + v("q_ssid")]; }
      case "tel": { const n = v("q_tel").replace(/[^\d+]/g, ""); return n ? ["tel:" + n, "Call " + v("q_tel")] : ["", "Enter a phone number"]; }
      default: return [$("q_text").value, ""];
    }
  }

  let qr = null;
  function draw() {
    const [data, text] = payload();
    label.textContent = text;
    const size = +$("q_size").value; $("q_sv").textContent = size;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.height = size;
    ctx.fillStyle = $("q_bg").value; ctx.fillRect(0, 0, size, size);
    if (!data) { qr = null; return; }
    try { qr = qrcode(0, "M"); qr.addData(data); qr.make(); }
    catch (e) { qr = null; label.textContent = "That is too much text for one QR code. Shorten it."; return; }
    const n = qr.getModuleCount(), quiet = 4, cell = size / (n + quiet * 2);
    ctx.fillStyle = $("q_fg").value;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c))
      ctx.fillRect(Math.floor((c + quiet) * cell), Math.floor((r + quiet) * cell), Math.ceil(cell), Math.ceil(cell));
  }

  function svg() {
    const n = qr.getModuleCount(), q = 4, t = n + q * 2;
    let path = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += "M" + (c + q) + " " + (r + q) + "h1v1h-1z";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" shape-rendering="crispEdges"><rect width="${t}" height="${t}" fill="${$("q_bg").value}"/><path d="${path}" fill="${$("q_fg").value}"/></svg>`;
  }
  const name = () => FY.slug + "-qr-" + seg.type;
  $("q_png").addEventListener("click", async () => { if (!qr) return FY.toast("Fill in the details first.", true); FY.download(await FY.canvasToBlob(canvas, "image/png"), name() + ".png"); FY.confetti(); });
  $("q_svg").addEventListener("click", () => { if (!qr) return FY.toast("Fill in the details first.", true); FY.download(new Blob([svg()], { type: "image/svg+xml" }), name() + ".svg"); FY.confetti(); });
  document.querySelectorAll(".qr-card ~ *, .form-card").forEach(el => el.addEventListener("input", draw));
  const p = FY.preset();
  if (p.type) { seg.set("type", p.type); } else draw();
})();
