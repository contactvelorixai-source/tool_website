/* Word counter: words, characters, sentences, paragraphs, reading/speaking time, limits, top words */
(function () {
  const $ = id => document.getElementById(id);
  const txt = $("txt");
  const STOP = new Set("a an the and or but if of to in on at by for with from as is are was were be been it its this that these those i you he she we they me my your our their his her them us not no so do does did have has had will would can could should may might just than then there here what which who whom when where why how all any each few more most other some such only own same too very about into over after before also up out ke ki ka hai aur se mein me ko par bhi to ye wo".split(" "));
  const LIMITS = [["X / Twitter post", 280, "c"], ["Meta description", 160, "c"], ["Instagram caption", 2200, "c"], ["Essay", 250, "w"], ["Essay", 500, "w"], ["Essay", 1000, "w"]];
  const fmt = n => n.toLocaleString("en-IN");
  const time = (w, wpm) => { const s = Math.round(w / wpm * 60); return s < 60 ? s + " sec" : Math.floor(s / 60) + " min " + (s % 60 ? s % 60 + " sec" : ""); };
  try { const saved = localStorage.getItem("fy_wc"); if (saved) txt.value = saved; } catch (e) { /* ignore */ }

  function run() {
    const t = txt.value;
    try { localStorage.setItem("fy_wc", t); } catch (e) { /* ignore */ }
    const words = (t.match(/\S+/g) || []);
    const w = words.length;
    const sentences = (t.match(/[^.!?।]+[.!?।]+(\s|$)|[^.!?।]+$/g) || []).filter(x => x.trim()).length;
    const paras = t.split(/\n\s*\n/).filter(p => p.trim()).length;
    $("wcStats").innerHTML = [["Words", fmt(w)], ["Characters", fmt(t.length)], ["Without spaces", fmt(t.replace(/\s/g, "").length)], ["Sentences", fmt(sentences)],
      ["Paragraphs", fmt(paras)], ["Reading time", w ? time(w, 225) : "0 sec"], ["Speaking time", w ? time(w, 140) : "0 sec"], ["Avg word length", w ? (t.replace(/\s/g, "").length / w).toFixed(1) : "0"]]
      .map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join("");
    $("wcLimits").innerHTML = LIMITS.map(([name, max, kind]) => {
      const n = kind === "c" ? t.length : w, pct = Math.min(100, n / max * 100), over = n > max;
      return `<div class="limit"><div class="row"><span>${name} · ${fmt(max)} ${kind === "c" ? "chars" : "words"}</span><b class="${over ? "over" : ""}">${over ? fmt(n - max) + " over" : fmt(max - n) + " left"}</b></div><div class="meter"><i style="width:${pct}%;background:${over ? "var(--bad)" : "var(--tool)"}"></i></div></div>`;
    }).join("");
    const freq = {};
    words.map(x => x.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")).filter(x => x.length > 2 && !STOP.has(x)).forEach(x => freq[x] = (freq[x] || 0) + 1);
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);
    $("wcTop").innerHTML = top.length ? top.map(([k, v]) => `<span class="chip" style="cursor:default">${k.replace(/[&<>]/g, "")} <b>${v}</b></span>`).join("") : '<span class="muted">Start typing to see your most used words.</span>';
  }
  txt.addEventListener("input", run);
  $("wcClear").addEventListener("click", () => { txt.value = ""; run(); txt.focus(); });
  $("wcCopy").addEventListener("click", () => navigator.clipboard.writeText(txt.value).then(() => FY.toast("Text copied."), () => { txt.select(); FY.toast("Press Ctrl+C or long-press to copy."); }));
  run();
})();
