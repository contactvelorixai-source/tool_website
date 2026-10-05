/* OCR with tesseract.js, 2 free scans a day (Pro: unlimited) */
(function () {
  const root = document.documentElement.dataset.root || "";
  const LIMIT = 2, KEY = "ocr";
  const ws = document.getElementById("ws"), drop = document.getElementById("drop"), list = document.getElementById("list");
  const out = document.getElementById("out"), outWrap = document.getElementById("outWrap"), left = document.getElementById("left");
  const seg = FY.segs();
  let file = null, img = null;

  const showLeft = () => { left.textContent = FY.isPro() ? "Unlimited (Pro)" : Math.max(0, LIMIT - FY.usesToday(KEY)); };
  showLeft();

  async function take(files) {
    file = files[0];
    try { img = await FY.loadImage(file); } catch (e) { return FY.toast(e.message, true); }
    list.innerHTML = "";
    list.appendChild(FY.fileRow({ name: file.name, thumb: img.src, sub: img.naturalWidth + " × " + img.naturalHeight + " · " + FY.fmtBytes(file.size) }, 0, 1,
      { remove: () => { file = null; ws.hidden = true; drop.hidden = false; outWrap.hidden = true; } }));
    ws.hidden = false; drop.hidden = true; outWrap.hidden = true;
  }

  async function run() {
    if (!file) return;
    if (!FY.canUse(KEY, LIMIT)) return FY.upgrade("You have used your 2 free scans for today. Pro gives unlimited scans and stronger handwriting recognition.");
    const btn = document.getElementById("go"); btn.disabled = true; FY.progress(0.02);
    let worker;
    try {
      worker = await Tesseract.createWorker(seg.lang, 1, {
        workerPath: root + "assets/vendor/tesseract-worker.min.js",
        logger: m => { if (m.status === "recognizing text") FY.progress(0.3 + m.progress * 0.7); else if (typeof m.progress === "number") FY.progress(0.02 + m.progress * 0.28); }
      });
      const { data } = await worker.recognize(file);
      FY.recordUse(KEY); showLeft();
      out.value = data.text.trim() || "No text found. Try a sharper, straighter photo.";
      outWrap.hidden = false; FY.progress(null);
      out.scrollIntoView({ behavior: "smooth", block: "center" });
      FY.confetti();
    } catch (e) {
      FY.progress(null);
      FY.toast("Text recognition could not start. Check your internet connection, as the language files download on first use.", true);
    } finally { btn.disabled = false; if (worker) worker.terminate(); }
  }

  FY.dropzone(drop, { accept: ["image/*"], multiple: false, label: "an image", onFiles: take });
  document.getElementById("go").addEventListener("click", run);
  document.getElementById("copy").addEventListener("click", () => {
    navigator.clipboard.writeText(out.value).then(() => FY.toast("Text copied."), () => { out.select(); FY.toast("Press Ctrl+C or long-press to copy."); });
  });
  document.getElementById("txt").addEventListener("click", () => FY.download(new Blob([out.value], { type: "text/plain" }), FY.baseName(file ? file.name : "text") + ".txt"));
})();
