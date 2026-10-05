/* GST invoice generator + GST calculator */
(function () {
  const $ = id => document.getElementById(id);
  const fmt = n => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtPdf = n => "Rs. " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const escH = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const tbody = $("items");
  const items = [
    { d: "Cotton fabric (per metre)", h: "5208", q: 120, r: 180, g: 5 },
    { d: "Stitching service", h: "998821", q: 1, r: 4500, g: 18 }
  ];
  $("dt").value = new Date().toISOString().slice(0, 10);

  function words(num) {
    const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const two = n => n < 20 ? a[n] : b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    const three = n => (n >= 100 ? a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " : "") : "") + (n % 100 ? two(n % 100) : "");
    const conv = n => {
      if (n === 0) return "Zero";
      let s = "";
      const crore = Math.floor(n / 1e7); n %= 1e7;
      const lakh = Math.floor(n / 1e5); n %= 1e5;
      const thou = Math.floor(n / 1e3); n %= 1e3;
      if (crore) s += conv(crore) + " Crore ";
      if (lakh) s += two(lakh) + " Lakh ";
      if (thou) s += two(thou) + " Thousand ";
      if (n) s += three(n);
      return s.trim();
    };
    const rupees = Math.floor(num), paise = Math.round((num - rupees) * 100);
    return "Rupees " + conv(rupees) + (paise ? " and " + two(paise) + " Paise" : "") + " Only";
  }

  function renderRows() {
    tbody.innerHTML = "";
    items.forEach((it, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = '<td><input type="text" data-k="d" aria-label="Item description" style="min-width:140px"></td>' +
        '<td><input type="text" data-k="h" aria-label="HSN or SAC" style="width:84px"></td>' +
        '<td><input type="number" data-k="q" min="0" step="any" aria-label="Quantity" style="width:64px"></td>' +
        '<td><input type="number" data-k="r" min="0" step="any" aria-label="Rate" style="width:90px"></td>' +
        '<td><select data-k="g" aria-label="GST rate" style="width:74px"><option>0</option><option>3</option><option>5</option><option>12</option><option>18</option><option>28</option></select></td>' +
        '<td><button type="button" class="mini" aria-label="Remove item">' + FY.ICON.close + "</button></td>";
      tr.querySelectorAll("[data-k]").forEach(inp => {
        inp.value = it[inp.dataset.k];
        inp.addEventListener("input", () => { it[inp.dataset.k] = inp.type === "number" || inp.tagName === "SELECT" ? +inp.value : inp.value; update(); });
      });
      tr.querySelector("button").addEventListener("click", () => { items.splice(i, 1); renderRows(); update(); });
      tbody.appendChild(tr);
    });
  }

  function calc() {
    const inter = $("sState").value !== $("bState").value;
    let taxable = 0, tax = 0;
    const rows = items.map(it => {
      const amt = (+it.q || 0) * (+it.r || 0), t = amt * (+it.g || 0) / 100;
      taxable += amt; tax += t;
      return { ...it, amt, t };
    });
    const total = taxable + tax, rounded = Math.round(total);
    return { inter, rows, taxable, tax, total, rounded, round: rounded - total };
  }

  function update() {
    const c = calc(), v = id => escH($(id).value);
    const taxRows = c.inter
      ? `<tr><td>IGST</td><td class="r">${fmt(c.tax)}</td></tr>`
      : `<tr><td>CGST</td><td class="r">${fmt(c.tax / 2)}</td></tr><tr><td>SGST</td><td class="r">${fmt(c.tax / 2)}</td></tr>`;
    $("sheet").innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px">
        <div><div style="font-family:var(--font-display);font-size:1.3rem;font-weight:800">${v("sName")}</div><div>${v("sAddr")}</div><div><b>GSTIN:</b> ${v("sGst")}</div><div><b>State:</b> ${v("sState")}</div></div>
        <div style="text-align:right"><div style="font-family:var(--font-display);font-size:1.15rem;font-weight:800;color:#6d3fe0">TAX INVOICE</div><div><b>No:</b> ${v("no")}</div><div><b>Date:</b> ${v("dt")}</div></div>
      </div>
      <div style="background:#f4f1fd;border-radius:10px;padding:10px;margin-bottom:12px"><b>Bill to:</b> ${v("bName")}<br>${v("bAddr")}<br>${$("bGst").value ? "<b>GSTIN:</b> " + v("bGst") + " · " : ""}<b>Place of supply:</b> ${v("bState")}</div>
      <table><thead><tr><th>#</th><th>Item</th><th>HSN/SAC</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">GST</th><th class="r">Amount</th></tr></thead><tbody>
      ${c.rows.map((r, i) => `<tr><td>${i + 1}</td><td>${escH(r.d)}</td><td>${escH(r.h)}</td><td class="r">${r.q}</td><td class="r">${fmt(+r.r || 0)}</td><td class="r">${r.g}%</td><td class="r">${fmt(r.amt)}</td></tr>`).join("")}
      </tbody></table>
      <table style="width:60%;margin-left:auto;margin-top:10px"><tr><td>Taxable value</td><td class="r">${fmt(c.taxable)}</td></tr>${taxRows}
      <tr><td>Round off</td><td class="r">${fmt(c.round)}</td></tr><tr><td><b>Total</b></td><td class="r"><b style="font-size:1.1rem">${fmt(c.rounded)}</b></td></tr></table>
      <p style="margin-top:10px"><b>Amount in words:</b> ${words(c.rounded)}</p>
      <p style="margin-top:10px;white-space:pre-line;color:#5b5277">${v("notes")}</p>
      <div style="margin-top:26px;text-align:right">For ${v("sName")}<br><br>Authorised signatory</div>
      ${FY.isPro() ? "" : '<div class="wm">Made free with ' + FY.site + '</div>'}`;
  }

  function pdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const c = calc(), v = id => $(id).value;
    const W = 595, M = 40; let y = 50;
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text(v("sName"), M, y);
    doc.setTextColor(109, 63, 224); doc.text("TAX INVOICE", W - M, y, { align: "right" }); doc.setTextColor(29, 21, 51);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
    doc.text(doc.splitTextToSize(v("sAddr"), 300), M, y += 16);
    doc.text("GSTIN: " + v("sGst") + "   State: " + v("sState"), M, y += 13);
    doc.text("Invoice no: " + v("no"), W - M, 66, { align: "right" });
    doc.text("Date: " + v("dt"), W - M, 79, { align: "right" });
    y += 20;
    doc.setFillColor(244, 241, 253); doc.roundedRect(M, y, W - 2 * M, 54, 6, 6, "F");
    doc.setFont("helvetica", "bold"); doc.text("Bill to: " + v("bName"), M + 10, y += 16);
    doc.setFont("helvetica", "normal"); doc.text(doc.splitTextToSize(v("bAddr"), W - 2 * M - 20)[0], M + 10, y += 13);
    doc.text((v("bGst") ? "GSTIN: " + v("bGst") + "   " : "") + "Place of supply: " + v("bState"), M + 10, y += 13);
    y += 28;
    const X = [M + 4, M + 24, M + 232, M + 305, M + 375, M + 412, W - M - 4];
    const AL = ["left", "left", "left", "right", "right", "right", "right"];
    const head = ["#", "Item", "HSN/SAC", "Qty", "Rate", "GST", "Amount"];
    doc.setFillColor(29, 21, 51); doc.rect(M, y - 13, W - 2 * M, 20, "F");
    doc.setTextColor(255); doc.setFont("helvetica", "bold");
    head.forEach((h, i) => doc.text(h, X[i], y, { align: AL[i] }));
    doc.setTextColor(29, 21, 51); doc.setFont("helvetica", "normal");
    y += 20;
    c.rows.forEach((r, i) => {
      const desc = doc.splitTextToSize(String(r.d), 200);
      const hsn = doc.splitTextToSize(String(r.h), 90)[0] || "";
      const cells = [String(i + 1), desc, hsn, String(r.q), fmtPdf(+r.r || 0), r.g + "%", fmtPdf(r.amt)];
      cells.forEach((t, k) => doc.text(t, X[k], y, { align: AL[k] }));
      y += 13 * desc.length + 6;
      doc.setDrawColor(229, 225, 242); doc.line(M, y - 10, W - M, y - 10);
      if (y > 700) { doc.addPage(); y = 60; }
    });
    y += 8;
    const sum = [["Taxable value", fmtPdf(c.taxable)]].concat(c.inter ? [["IGST", fmtPdf(c.tax)]] : [["CGST", fmtPdf(c.tax / 2)], ["SGST", fmtPdf(c.tax / 2)]], [["Round off", fmtPdf(c.round)]]);
    sum.forEach(([a, b]) => { doc.text(a, W - M - 200, y); doc.text(b, W - M - 4, y, { align: "right" }); y += 15; });
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text("Total", W - M - 200, y + 4); doc.text(fmtPdf(c.rounded), W - M - 4, y + 4, { align: "right" });
    doc.setFontSize(9.5); y += 30;
    doc.text("Amount in words:", M, y); doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(words(c.rounded), W - 2 * M - 90), M + 90, y);
    y += 30;
    doc.setTextColor(91, 82, 119); doc.text(doc.splitTextToSize(v("notes"), W - 2 * M), M, y);
    doc.setTextColor(29, 21, 51);
    doc.text("For " + v("sName"), W - M, y + 50, { align: "right" });
    doc.text("Authorised signatory", W - M, y + 80, { align: "right" });
    if (!FY.isPro()) { doc.setFontSize(8); doc.setTextColor(138, 130, 166); doc.text("Made free with " + FY.site, W / 2, 820, { align: "center" }); }
    FY.download(doc.output("blob"), "Invoice-" + v("no").replace(/[^\w-]+/g, "_") + ".pdf");
    FY.confetti();
  }

  $("inv").addEventListener("input", update);
  $("inv").addEventListener("submit", e => e.preventDefault());
  $("addItem").addEventListener("click", () => { items.push({ d: "", h: "", q: 1, r: 0, g: 18 }); renderRows(); update(); });
  $("go").addEventListener("click", () => {
    const gstOk = s => !s || /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(s.toUpperCase());
    if (!gstOk($("sGst").value) || !gstOk($("bGst").value)) FY.toast("A GSTIN looks wrong. It should be 15 characters like 08ABCDE1234F1Z5. The PDF was still created.", true);
    pdf();
  });
  renderRows(); update();

  // GST calculator
  const segs = FY.segs(calcGst);
  function calcGst() {
    const amt = +$("cAmt").value || 0, rate = +segs.rate / 100;
    const net = segs.incl === "in" ? amt / (1 + rate) : amt;
    const gst = net * rate;
    $("cNet").textContent = fmt(net); $("cGst").textContent = fmt(gst);
    $("cHalf").textContent = fmt(gst / 2); $("cTot").textContent = fmt(net + gst);
  }
  $("cAmt").addEventListener("input", calcGst);
  calcGst();
})();
