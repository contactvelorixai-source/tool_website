/* Image compressor with exact KB targets (binary search on quality, then dimensions) */
(function () {
  const items = [];
  const list = document.getElementById("list");
  const ws = document.getElementById("ws");
  const drop = document.getElementById("drop");
  const seg = FY.segs();
  const q = document.getElementById("quality"), qv = document.getElementById("qv");
  const custom = document.getElementById("customKb");
  let targetKB = 0;

  function setTarget(kb) {
    targetKB = kb;
    document.querySelectorAll("#targets .chip").forEach(c => c.setAttribute("aria-pressed", +c.dataset.kb === kb && !custom.value));
    document.getElementById("qualityWrap").hidden = kb > 0;
  }
  document.getElementById("targets").addEventListener("click", e => {
    const c = e.target.closest(".chip"); if (!c) return;
    custom.value = ""; setTarget(+c.dataset.kb);
  });
  custom.addEventListener("input", () => { const v = Math.max(0, +custom.value || 0); setTarget(v); });
  q.addEventListener("input", () => { qv.textContent = q.value; });

  async function add(files) {
    for (const f of files) {
      try {
        const img = await FY.loadImage(f);
        const c = document.createElement("canvas");
        const s = Math.min(1, 120 / Math.max(img.naturalWidth, img.naturalHeight));
        c.width = img.naturalWidth * s; c.height = img.naturalHeight * s;
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        items.push({ file: f, img, name: f.name, thumb: c.toDataURL("image/jpeg", .7), sub: FY.fmtBytes(f.size) + " · " + img.naturalWidth + " × " + img.naturalHeight });
      } catch (e) { FY.toast(e.message, true); }
    }
    render();
  }
  function render() {
    list.innerHTML = "";
    items.forEach((it, i) => list.appendChild(FY.fileRow(it, i, items.length, { remove: k => { items.splice(k, 1); render(); } })));
    ws.hidden = !items.length; drop.hidden = !!items.length;
    document.getElementById("result").hidden = true;
  }

  function draw(img, scale, type) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * scale));
    c.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = c.getContext("2d");
    if (type === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }

  async function toTarget(img, type, bytes) {
    let scale = 1, best = null;
    for (let round = 0; round < 8; round++) {
      const c = draw(img, scale, type);
      let lo = 0.05, hi = 0.95, fit = null;
      for (let k = 0; k < 7; k++) {
        const mid = (lo + hi) / 2;
        const b = await FY.canvasToBlob(c, type, mid);
        if (b.size <= bytes) { fit = b; lo = mid; } else hi = mid;
      }
      if (fit) return fit;
      const smallest = await FY.canvasToBlob(c, type, 0.05);
      best = smallest;
      scale *= Math.max(0.3, Math.sqrt(bytes / smallest.size) * 0.92);
    }
    return best;
  }

  async function run() {
    const btn = document.getElementById("go"); btn.disabled = true; FY.progress(0);
    const outs = []; let before = 0, after = 0, missed = 0;
    try {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        let type = seg.fmt === "same" ? (it.file.type === "image/png" || it.file.type === "image/webp" ? it.file.type : "image/jpeg") : seg.fmt;
        if (targetKB && type === "image/png") type = "image/jpeg"; // PNG has no quality knob
        let blob;
        if (targetKB) {
          blob = await toTarget(it.img, type, targetKB * 1024);
          if (blob.size > targetKB * 1024) missed++;
        } else {
          blob = await FY.canvasToBlob(draw(it.img, 1, type), type, +q.value / 100);
          if (blob.size >= it.file.size && it.file.type === type) blob = it.file; // already smaller
        }
        const ext = type === "image/webp" ? ".webp" : type === "image/png" ? ".png" : ".jpg";
        outs.push({ name: FY.baseName(it.name) + (targetKB ? "-" + targetKB + "kb" : "-compressed") + ext, blob });
        before += it.file.size; after += blob.size;
        const row = list.children[i];
        if (row) row.querySelector(".sub").innerHTML = FY.fmtBytes(it.file.size) + " → <b>" + FY.fmtBytes(blob.size) + '</b> <span class="saving">-' + Math.max(0, Math.round((1 - blob.size / it.file.size) * 100)) + "%</span>";
        FY.progress((i + 1) / items.length);
      }
      FY.progress(null);
      const pct = Math.max(0, Math.round((1 - after / before) * 100));
      const r = FY.showResult("<h3>Saved " + pct + "%</h3><p class=\"muted\">" + FY.fmtBytes(before) + " → " + FY.fmtBytes(after) +
        (missed ? " · " + missed + " image(s) could not reach " + targetKB + " KB, so we kept the smallest version." : "") +
        '</p><button class="btn btn-primary btn-lg" id="dl">Download ' + (outs.length > 1 ? "all (ZIP)" : "image") + "</button>");
      r.querySelector("#dl").addEventListener("click", () => FY.zipAndDownload(outs, FY.slug + "-compressed.zip"));
      FY.zipAndDownload(outs, FY.slug + "-compressed.zip");
      FY.confetti();
    } catch (e) { FY.progress(null); FY.toast("Compression failed: " + e.message, true); }
    finally { btn.disabled = false; }
  }

  const p = FY.preset();
  if (p.targetKB) setTarget(p.targetKB); else setTarget(0);
  FY.dropzone(drop, { accept: ["image/*", ".heic", ".heif"], multiple: true, label: "JPG, PNG, WebP or HEIC images", onFiles: add });
  document.getElementById("more").addEventListener("change", e => { add(Array.from(e.target.files)); e.target.value = ""; });
  document.getElementById("go").addEventListener("click", run);
})();
