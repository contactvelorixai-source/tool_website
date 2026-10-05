/* Age calculator: calendar-accurate years/months/days, totals, next birthday */
(function () {
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, "0");
  const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const parse = v => { const [y, m, d] = v.split("-").map(Number); return new Date(y, m - 1, d); };
  const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();
  const fmt = n => n.toLocaleString("en-IN");
  $("asOn").value = iso(new Date());

  // Whole calendar months first (clamping to month end, e.g. 31 Jan + 1 month = 28/29 Feb), then leftover days
  function addMonths(a, k) { const y = a.getFullYear(), m = a.getMonth() + k; return new Date(y, m, Math.min(a.getDate(), daysIn(y + Math.floor(m / 12), ((m % 12) + 12) % 12))); }
  function diff(a, b) {
    let k = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    if (addMonths(a, k) > b) k--;
    const anchor = addMonths(a, k);
    const d = Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())) / 864e5);
    return { y: Math.floor(k / 12), m: k % 12, d };
  }

  function nextBirthday(dob, from) {
    const mk = y => { const leap = dob.getMonth() === 1 && dob.getDate() === 29 && daysIn(y, 1) === 28; return new Date(y, dob.getMonth(), leap ? 28 : dob.getDate()); };
    let n = mk(from.getFullYear());
    if (n < from) n = mk(from.getFullYear() + 1);
    return n;
  }

  function run() {
    const out = $("ageMore");
    if (!$("dob").value || !$("asOn").value) return;
    const dob = parse($("dob").value), on = parse($("asOn").value);
    if (on < dob) { ["aY", "aM", "aD"].forEach(k => $(k).textContent = "–"); out.innerHTML = '<div style="grid-column:1/-1"><span>Check the dates</span><b style="font-size:1rem">The "Age on" date is before the date of birth.</b></div>'; return; }
    const r = diff(dob, on);
    ["aY", "aM", "aD"].forEach((k, i) => { const el = $(k); el.textContent = [r.y, r.m, r.d][i]; el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); });
    const days = Math.round((Date.UTC(on.getFullYear(), on.getMonth(), on.getDate()) - Date.UTC(dob.getFullYear(), dob.getMonth(), dob.getDate())) / 864e5);
    const nb = nextBirthday(dob, on);
    const toNb = Math.round((Date.UTC(nb.getFullYear(), nb.getMonth(), nb.getDate()) - Date.UTC(on.getFullYear(), on.getMonth(), on.getDate())) / 864e5);
    const wd = d => d.toLocaleDateString("en-IN", { weekday: "long" });
    out.innerHTML = [
      ["Total months", fmt(r.y * 12 + r.m)], ["Total weeks", fmt(Math.floor(days / 7))], ["Total days", fmt(days)], ["Total hours", fmt(days * 24)],
      ["Born on a", wd(dob)], ["Next birthday", toNb === 0 ? "Today! 🎉" : fmt(toNb) + " days"], ["Turning", r.y + (toNb === 0 ? 0 : 1)], ["Birthday falls on", wd(nb)]
    ].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join("");
    if (toNb === 0) FY.confetti();
  }
  ["dob", "asOn"].forEach(id => $(id).addEventListener("input", run));
  run();
})();
