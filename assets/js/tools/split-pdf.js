/* Split / extract PDF pages with pdf-lib */
(function () {
  let src = null, file = null;
  const list = document.getElementById("list"), ws = document.getElementById("ws"), drop = document.getElementById("drop");
  const ranges = document.getElementById("ranges");
  const seg = FY.segs((n, v) => { if (n === "mode") document.getElementById("rangeWrap").hidden = v === "each"; });

  async function take(files) {
    file = files[0];
    try {
      src = await PDFLib.PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    } catch (e) { return FY.toast("Could not open this PDF. It may be damaged or password protected.", true); }
    const n = src.getPageCount();
    list.innerHTML = "";
    list.appendChild(FY.fileRow({ name: file.name, ext: "PDF", sub: n + " page(s) · " + FY.fmtBytes(file.size) }, 0, 1, { remove: () => { src = null; ws.hidden = true; drop.hidden = false; } }));
    ranges.placeholder = "e.g. 1-" + Math.min(3, n) + (n > 4 ? ", " + n : "");
    ws.hidden = false; drop.hidden = true;
    document.getElementById("result").hidden = true;
  }

  function parse(text, max) {
    const groups = [];
    for (const part of text.split(",").map(s => s.trim()).filter(Boolean)) {
      const m = part.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
      if (!m) throw new Error('"' + part + '" is not a page or range. Use numbers like 2 or 4-6.');
      let a = +m[1], b = m[2] ? +m[2] : a;
      if (a > b) [a, b] = [b, a];
      if (a < 1 || b > max) throw new Error("Pages must be between 1 and " + max + ".");
      groups.push({ label: a === b ? "" + a : a + "-" + b, idx: Array.from({ length: b - a + 1 }, (_, k) => a - 1 + k) });
    }
    if (!groups.length) throw new Error("Type the pages you want, for example 1-3, 5.");
    return groups;
  }

  async function run() {
    if (!src) return;
    const n = src.getPageCount();
    let groups;
    try {
      groups = seg.mode === "each" ? Array.from({ length: n }, (_, i) => ({ label: "" + (i + 1), idx: [i] })) : parse(ranges.value, n);
    } catch (e) { return FY.toast(e.message, true); }
    if (document.getElementById("oneFile").checked) groups = [{ label: "selected", idx: groups.flatMap(g => g.idx) }];
    const btn = document.getElementById("go"); btn.disabled = true; FY.progress(0);
    try {
      const base = FY.baseName(file.name), outs = [];
      for (let i = 0; i < groups.length; i++) {
        const doc = await PDFLib.PDFDocument.create();
        (await doc.copyPages(src, groups[i].idx)).forEach(p => doc.addPage(p));
        outs.push({ name: base + "-pages-" + groups[i].label + ".pdf", blob: new Blob([await doc.save()], { type: "application/pdf" }) });
        FY.progress((i + 1) / groups.length);
      }
      FY.progress(null);
      const r = FY.showResult("<h3>Done!</h3><p class=\"muted\">" + outs.length + " PDF file(s) created</p><button class=\"btn btn-primary btn-lg\" id=\"dl\">Download " + (outs.length > 1 ? "ZIP" : "PDF") + "</button>");
      r.querySelector("#dl").addEventListener("click", () => FY.zipAndDownload(outs, base + "-split.zip"));
      FY.zipAndDownload(outs, base + "-split.zip");
      FY.confetti();
    } catch (e) { FY.progress(null); FY.toast("Split failed: " + e.message, true); }
    finally { btn.disabled = false; }
  }

  FY.dropzone(drop, { accept: ["application/pdf", ".pdf"], multiple: false, label: "a PDF file", onFiles: take });
  document.getElementById("go").addEventListener("click", run);
})();
