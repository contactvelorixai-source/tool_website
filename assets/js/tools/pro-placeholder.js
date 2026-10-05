/* Paid server tools (PDF to Word, background remover): UI is ready, processing switches on with payments */
(function () {
  const tool = document.getElementById("tool").dataset.tool;
  const isPdf = tool === "pdf2word";
  const ws = document.getElementById("ws"), drop = document.getElementById("drop"), list = document.getElementById("list");
  let file = null;
  function take(files) {
    file = files[0];
    if (file.size > 10 * 1048576 && !FY.isPro()) FY.toast("Free files can be up to 10 MB. Pro handles up to 100 MB.", true);
    list.innerHTML = "";
    const row = { name: file.name, ext: isPdf ? "PDF" : "IMG", sub: FY.fmtBytes(file.size) };
    if (!isPdf) row.thumb = URL.createObjectURL(file);
    list.appendChild(FY.fileRow(row, 0, 1, { remove: () => { file = null; ws.hidden = true; drop.hidden = false; } }));
    ws.hidden = false; drop.hidden = true;
  }
  FY.dropzone(drop, { accept: isPdf ? ["application/pdf", ".pdf"] : ["image/*"], multiple: false, label: isPdf ? "a PDF file" : "an image", onFiles: take });
  document.getElementById("go").addEventListener("click", () => {
    FY.upgrade(isPdf
      ? "PDF to Word is launching with Pro. Get unlimited editable Word files that keep your layout, plus 2 free conversions a day for everyone."
      : "The AI background remover is launching with Pro. Get HD cut-outs, white backgrounds for Amazon and Flipkart, and batch mode.");
  });
})();
