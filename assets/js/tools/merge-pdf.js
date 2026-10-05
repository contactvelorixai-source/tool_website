/* Merge PDFs with pdf-lib */
(function () {
  const items = [];
  const list = document.getElementById("list"), ws = document.getElementById("ws"), drop = document.getElementById("drop");

  async function add(files) {
    for (const f of files) {
      try {
        const bytes = await f.arrayBuffer();
        const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
        items.push({ file: f, bytes, name: f.name, ext: "PDF", pages: doc.getPageCount(), sub: doc.getPageCount() + " page(s) · " + FY.fmtBytes(f.size) });
      } catch (e) { FY.toast("Could not open " + f.name + ". It may be damaged or password protected.", true); }
    }
    render();
  }
  function render() {
    list.innerHTML = "";
    items.forEach((it, i) => list.appendChild(FY.fileRow(it, i, items.length, {
      remove: k => { items.splice(k, 1); render(); },
      move: (a, b) => { FY.move(items, a, b); render(); }
    })));
    ws.hidden = !items.length; drop.hidden = !!items.length;
    document.getElementById("result").hidden = true;
  }

  async function merge() {
    if (items.length < 2) return FY.toast("Add at least two PDFs to merge.", true);
    const btn = document.getElementById("go"); btn.disabled = true; FY.progress(0);
    try {
      const out = await PDFLib.PDFDocument.create();
      for (let i = 0; i < items.length; i++) {
        const src = await PDFLib.PDFDocument.load(items[i].bytes, { ignoreEncryption: true });
        const copied = await out.copyPages(src, src.getPageIndices());
        copied.forEach(p => out.addPage(p));
        FY.progress((i + 1) / items.length);
      }
      const blob = new Blob([await out.save()], { type: "application/pdf" });
      FY.progress(null);
      const total = items.reduce((s, x) => s + x.pages, 0);
      const r = FY.showResult('<h3>Merged!</h3><p class="muted">' + items.length + " files · " + total + " pages · " + FY.fmtBytes(blob.size) + '</p><button class="btn btn-primary btn-lg" id="dl">Download merged PDF</button>');
      r.querySelector("#dl").addEventListener("click", () => FY.download(blob, FY.slug + "-merged.pdf"));
      FY.download(blob, FY.slug + "-merged.pdf");
      FY.confetti();
    } catch (e) { FY.progress(null); FY.toast("Merge failed: " + e.message, true); }
    finally { btn.disabled = false; }
  }

  FY.dropzone(drop, { accept: ["application/pdf", ".pdf"], multiple: true, label: "PDF files", onFiles: add });
  document.getElementById("more").addEventListener("change", e => { add(Array.from(e.target.files)); e.target.value = ""; });
  document.getElementById("go").addEventListener("click", merge);
})();
