/* Resize + convert images (pixels, percent, presets with center crop) */
(function () {
  const items = [];
  const list = document.getElementById("list"), ws = document.getElementById("ws"), drop = document.getElementById("drop");
  const W = document.getElementById("w"), H = document.getElementById("h"), lock = document.getElementById("lock");
  const pct = document.getElementById("pct"), pv = document.getElementById("pv"), preset = document.getElementById("preset");
  const PRESETS = { passport: [413, 531], ssc: [354, 472], "ig-square": [1080, 1080], "ig-story": [1080, 1920], yt: [1280, 720], "fb-cover": [1640, 624], amazon: [2000, 2000], hd: [1920, 1080] };
  const seg = FY.segs((n, v) => { if (n === "mode") showMode(v); });
  function showMode(m) { document.querySelectorAll("[data-show]").forEach(el => el.hidden = el.dataset.show !== m); }
  pct.addEventListener("input", () => pv.textContent = pct.value);

  let ratio = 0;
  W.addEventListener("input", () => { if (lock.checked && ratio && W.value) H.value = Math.round(W.value / ratio); });
  H.addEventListener("input", () => { if (lock.checked && ratio && H.value) W.value = Math.round(H.value * ratio); });

  async function add(files) {
    for (const f of files) {
      try {
        const img = await FY.loadImage(f);
        const c = document.createElement("canvas");
        const s = Math.min(1, 120 / Math.max(img.naturalWidth, img.naturalHeight));
        c.width = img.naturalWidth * s; c.height = img.naturalHeight * s;
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        items.push({ file: f, img, name: f.name, thumb: c.toDataURL("image/jpeg", .7), sub: img.naturalWidth + " × " + img.naturalHeight + " px · " + FY.fmtBytes(f.size) });
        if (!ratio) { ratio = img.naturalWidth / img.naturalHeight; W.value = img.naturalWidth; H.value = img.naturalHeight; }
      } catch (e) { FY.toast(e.message, true); }
    }
    render();
  }
  function render() {
    list.innerHTML = "";
    items.forEach((it, i) => list.appendChild(FY.fileRow(it, i, items.length, { remove: k => { items.splice(k, 1); if (!items.length) ratio = 0; render(); } })));
    ws.hidden = !items.length; drop.hidden = !!items.length;
    document.getElementById("result").hidden = true;
  }

  function target(img) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    if (seg.mode === "percent") { const s = +pct.value / 100; return { w: Math.round(iw * s), h: Math.round(ih * s), crop: false }; }
    if (seg.mode === "preset") { const [w, h] = PRESETS[preset.value]; return { w, h, crop: true }; }
    let w = +W.value || 0, h = +H.value || 0;
    if (items.length > 1 && lock.checked) { // keep each image's own ratio, matched on width
      w = w || Math.round(h * iw / ih); h = Math.round(w * ih / iw);
    }
    if (!w && !h) return { w: iw, h: ih };
    if (!w) w = Math.round(h * iw / ih);
    if (!h) h = Math.round(w * ih / iw);
    return { w, h, crop: false };
  }

  async function run() {
    const btn = document.getElementById("go"); btn.disabled = true; FY.progress(0);
    const outs = [];
    try {
      for (let i = 0; i < items.length; i++) {
        const { img, name } = items[i];
        const t = target(img);
        if (t.w > 12000 || t.h > 12000) throw new Error("Sizes above 12000 px are too large for most browsers.");
        const c = document.createElement("canvas"); c.width = t.w; c.height = t.h;
        const ctx = c.getContext("2d"); ctx.imageSmoothingQuality = "high";
        if (seg.format === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, t.w, t.h); }
        if (t.crop) {
          const s = Math.max(t.w / img.naturalWidth, t.h / img.naturalHeight);
          const sw = t.w / s, sh = t.h / s;
          ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, t.w, t.h);
        } else ctx.drawImage(img, 0, 0, t.w, t.h);
        const blob = await FY.canvasToBlob(c, seg.format, .9);
        const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[seg.format];
        outs.push({ name: FY.baseName(name) + "-" + t.w + "x" + t.h + "." + ext, blob });
        list.children[i].querySelector(".sub").innerHTML = img.naturalWidth + " × " + img.naturalHeight + " → <b>" + t.w + " × " + t.h + "</b> · " + ext.toUpperCase() + " · " + FY.fmtBytes(blob.size);
        FY.progress((i + 1) / items.length);
      }
      FY.progress(null);
      const r = FY.showResult('<h3>All done</h3><p class="muted">' + outs.length + ' image(s) ready</p><button class="btn btn-primary btn-lg" id="dl">Download ' + (outs.length > 1 ? "ZIP" : "image") + "</button>");
      r.querySelector("#dl").addEventListener("click", () => FY.zipAndDownload(outs, FY.slug + "-resized.zip"));
      FY.zipAndDownload(outs, FY.slug + "-resized.zip");
      FY.confetti();
    } catch (e) { FY.progress(null); FY.toast(e.message, true); }
    finally { btn.disabled = false; }
  }

  const p = FY.preset();
  if (p.format) seg.set("format", p.format);
  if (p.mode) seg.set("mode", p.mode);
  if (p.percent) { pct.value = p.percent; pv.textContent = p.percent; }
  if (p.presetKey) preset.value = p.presetKey;
  FY.dropzone(drop, { accept: ["image/*", ".heic", ".heif"], multiple: true, label: "image files", onFiles: add });
  document.getElementById("more").addEventListener("change", e => { add(Array.from(e.target.files)); e.target.value = ""; });
  document.getElementById("go").addEventListener("click", run);
})();
