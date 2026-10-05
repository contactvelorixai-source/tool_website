/* JPG/PNG/WebP/HEIC to PDF, built in the browser with pdf-lib */
(function () {
  const items = [];
  const list = document.getElementById("list");
  const ws = document.getElementById("ws");
  const drop = document.getElementById("drop");
  const seg = FY.segs();
  const SIZES = { a4: [595.28, 841.89], letter: [612, 792] };

  async function add(files) {
    for (const f of files) {
      try {
        const img = await FY.loadImage(f);
        const c = document.createElement("canvas");
        const s = Math.min(1, 120 / Math.max(img.naturalWidth, img.naturalHeight));
        c.width = Math.max(1, img.naturalWidth * s); c.height = Math.max(1, img.naturalHeight * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        items.push({ file: f, img, name: f.name, thumb: c.toDataURL("image/jpeg", .7), sub: img.naturalWidth + " × " + img.naturalHeight + " px · " + FY.fmtBytes(f.size) });
      } catch (e) { FY.toast(e.message, true); }
    }
    render();
  }

  function render() {
    list.innerHTML = "";
    items.forEach((it, i) => list.appendChild(FY.fileRow(it, i, items.length, {
      remove: k => { items.splice(k, 1); render(); },
      move: (a, b) => { FY.move(items, a, b); render(); }
    })));
    ws.hidden = !items.length;
    drop.hidden = !!items.length;
    document.getElementById("result").hidden = true;
  }

  async function imageBytes(it) {
    const t = it.file.type;
    if (t === "image/jpeg" || t === "image/png") return { bytes: await it.file.arrayBuffer(), type: t };
    const c = document.createElement("canvas");
    c.width = it.img.naturalWidth; c.height = it.img.naturalHeight;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(it.img, 0, 0);
    const b = await FY.canvasToBlob(c, "image/jpeg", .92);
    return { bytes: await b.arrayBuffer(), type: "image/jpeg" };
  }

  async function convert() {
    if (!items.length) return;
    const btn = document.getElementById("go");
    btn.disabled = true; FY.progress(0);
    try {
      const pdf = await PDFLib.PDFDocument.create();
      const margin = +seg.margin;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const { bytes, type } = await imageBytes(it);
        let emb;
        try { emb = type === "image/png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes); }
        catch (e) { // some JPGs (CMYK, progressive variants) fail; re-encode
          const c = document.createElement("canvas"); c.width = it.img.naturalWidth; c.height = it.img.naturalHeight;
          c.getContext("2d").drawImage(it.img, 0, 0);
          emb = await pdf.embedJpg(await (await FY.canvasToBlob(c, "image/jpeg", .92)).arrayBuffer());
        }
        let pw, ph;
        if (seg.size === "fit") { pw = emb.width + margin * 2; ph = emb.height + margin * 2; }
        else {
          [pw, ph] = SIZES[seg.size];
          const land = seg.orient === "landscape" || (seg.orient === "auto" && emb.width > emb.height);
          if (land) [pw, ph] = [ph, pw];
        }
        const page = pdf.addPage([pw, ph]);
        const s = Math.min((pw - margin * 2) / emb.width, (ph - margin * 2) / emb.height, seg.size === "fit" ? 1 : Infinity);
        const w = emb.width * s, h = emb.height * s;
        page.drawImage(emb, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
        FY.progress((i + 1) / items.length);
      }
      const out = new Blob([await pdf.save()], { type: "application/pdf" });
      const name = (items.length === 1 ? FY.baseName(items[0].name) : FY.slug + "-images") + ".pdf";
      FY.progress(null);
      const r = FY.showResult('<h3>Your PDF is ready</h3><p class="muted">' + items.length + " page(s) · " + FY.fmtBytes(out.size) + '</p><button class="btn btn-primary btn-lg" id="dl">Download PDF</button>');
      r.querySelector("#dl").addEventListener("click", () => FY.download(out, name));
      FY.download(out, name);
      FY.confetti();
    } catch (e) {
      FY.progress(null); FY.toast("Could not create the PDF: " + e.message, true);
    } finally { btn.disabled = false; }
  }

  FY.dropzone(drop, { accept: ["image/*", ".heic", ".heif"], multiple: true, label: "JPG, PNG, WebP or HEIC images", onFiles: add });
  document.getElementById("more").addEventListener("change", e => { add(Array.from(e.target.files)); e.target.value = ""; });
  document.getElementById("go").addEventListener("click", convert);
})();
