/* PDF pages to JPG/PNG with pdf.js */
(function () {
  const root = document.documentElement.dataset.root || "";
  pdfjsLib.GlobalWorkerOptions.workerSrc = root + "assets/vendor/pdf.worker.min.js";
  const ws = document.getElementById("ws"), drop = document.getElementById("drop");
  const pages = document.getElementById("pages"), zipBtn = document.getElementById("zip");
  const seg = FY.segs(() => { outs = []; pages.innerHTML = ""; zipBtn.hidden = true; });
  let file = null, outs = [];

  function take(files) {
    file = files[0]; outs = []; pages.innerHTML = ""; zipBtn.hidden = true;
    ws.hidden = false; drop.hidden = true;
    run();
  }

  async function run() {
    if (!file) return;
    const btn = document.getElementById("go"); btn.disabled = true; FY.progress(0);
    outs = []; pages.innerHTML = "";
    try {
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const type = seg.fmt, ext = type === "image/png" ? "png" : "jpg", base = FY.baseName(file.name);
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n);
        const vp = page.getViewport({ scale: +seg.scale });
        const c = document.createElement("canvas");
        c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        const blob = await FY.canvasToBlob(c, type, .92);
        const name = base + "-page-" + n + "." + ext;
        outs.push({ name, blob });
        const card = document.createElement("div");
        card.className = "page-thumb";
        card.innerHTML = '<img alt="Page ' + n + '"><div class="row"><span>Page ' + n + '</span><button class="mini" aria-label="Download page ' + n + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 4v12M7 11l5 5 5-5M5 20h14"/></svg></button></div>';
        card.querySelector("img").src = URL.createObjectURL(blob);
        card.querySelector("button").addEventListener("click", () => FY.download(blob, name));
        pages.appendChild(card);
        FY.progress(n / pdf.numPages);
      }
      FY.progress(null);
      zipBtn.hidden = false;
      zipBtn.textContent = outs.length > 1 ? "Download all " + outs.length + " pages (ZIP)" : "Download image";
      FY.toast(outs.length + " page(s) converted.");
      FY.confetti();
    } catch (e) {
      FY.progress(null);
      FY.toast(/password/i.test(e.message) ? "This PDF is password protected. Remove the password and try again." : "Could not read this PDF: " + e.message, true);
    } finally { btn.disabled = false; }
  }

  FY.dropzone(drop, { accept: ["application/pdf", ".pdf"], multiple: false, label: "a PDF file", onFiles: take });
  document.getElementById("go").addEventListener("click", run);
  zipBtn.addEventListener("click", () => FY.zipAndDownload(outs, FY.baseName(file.name) + "-images.zip"));
})();
