/* Shared site helpers: theme, menu, toasts, confetti, file drop, downloads,
   Pro state, daily free-use limits and the upgrade modal. */
(function () {
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
  };

  const ICON = {
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  /* ---------- Theme ---------- */
  const root = document.documentElement;
  const savedTheme = store.get("fy_theme", null);
  if (savedTheme) root.setAttribute("data-theme", savedTheme);
  function isDark() {
    const t = root.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  }

  /* ---------- Pro + currency ---------- */
  const PRICES = {
    INR: { free: "₹0", month: "₹99", year: "₹799", day: "₹29", cv: "₹49", monthNote: "/month", yearNote: "/year", dayNote: "for 24 hours" },
    USD: { free: "$0", month: "$4.99", year: "$39", day: "$1.99", cv: "$1.49", monthNote: "/month", yearNote: "/year", dayNote: "for 24 hours" }
  };
  function detectCurrency() {
    const saved = store.get("fy_currency", null);
    if (saved) return saved;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (/Kolkata|Calcutta/.test(tz)) return "INR";
    } catch (e) { /* ignore */ }
    return (navigator.language || "").endsWith("-IN") ? "INR" : "USD";
  }

  const FY = {
    store, ICON, PRICES,
    currency: detectCurrency(),
    // Pro is switched on by the payments step later. Until then it stays off.
    isPro() { const p = store.get("fy_pro", null); return !!(p && p.until > Date.now()); },

    fmtBytes(b) {
      if (b < 1024) return b + " B";
      if (b < 1048576) return (b / 1024).toFixed(b < 10240 ? 1 : 0) + " KB";
      return (b / 1048576).toFixed(2) + " MB";
    },
    baseName(name) { return name.replace(/\.[^.]+$/, ""); },

    toast(msg, isErr) {
      let wrap = document.querySelector(".toast-wrap");
      if (!wrap) { wrap = document.createElement("div"); wrap.className = "toast-wrap"; wrap.setAttribute("role", "status"); document.body.appendChild(wrap); }
      const t = document.createElement("div");
      t.className = "toast" + (isErr ? " err" : "");
      t.textContent = msg;
      wrap.appendChild(t);
      setTimeout(() => { t.style.transition = "opacity .3s"; t.style.opacity = "0"; setTimeout(() => t.remove(), 320); }, isErr ? 5200 : 3200);
    },

    confetti() {
      if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const c = document.createElement("canvas");
      c.className = "confetti";
      document.body.appendChild(c);
      const ctx = c.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.scale(dpr, dpr);
      const colors = ["#ff5d73", "#ffb547", "#b5e655", "#2ec4a6", "#3da5ff", "#8b5cf6", "#ff8ad0"];
      const bits = Array.from({ length: 140 }, () => ({
        x: innerWidth / 2 + (Math.random() - .5) * 160, y: innerHeight * .55,
        vx: (Math.random() - .5) * 15, vy: -Math.random() * 16 - 6,
        r: Math.random() * 6 + 4, a: Math.random() * 6, va: (Math.random() - .5) * .4,
        c: colors[(Math.random() * colors.length) | 0], s: Math.random() > .5
      }));
      let frame = 0;
      (function tick() {
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        bits.forEach(b => {
          b.vy += .45; b.vx *= .99; b.x += b.vx; b.y += b.vy; b.a += b.va;
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a); ctx.fillStyle = b.c;
          if (b.s) ctx.fillRect(-b.r / 2, -b.r / 4, b.r, b.r / 2); else { ctx.beginPath(); ctx.arc(0, 0, b.r / 2.4, 0, 7); ctx.fill(); }
          ctx.restore();
        });
        if (++frame < 150) requestAnimationFrame(tick); else c.remove();
      })();
    },

    download(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.rel = "noopener";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    },

    async zipAndDownload(files, zipName) {
      if (files.length === 1) return FY.download(files[0].blob, files[0].name);
      const zip = new JSZip();
      files.forEach(f => zip.file(f.name, f.blob));
      FY.download(await zip.generateAsync({ type: "blob" }), zipName);
    },

    /* Wires a .drop element. opts: { accept: [mime/ext], multiple, onFiles(files) } */
    dropzone(el, opts) {
      const input = el.querySelector("input[type=file]");
      const accepts = f => {
        if (!opts.accept) return true;
        const n = f.name.toLowerCase();
        return opts.accept.some(a => a.startsWith(".") ? n.endsWith(a) : (a.endsWith("/*") ? f.type.startsWith(a.slice(0, -1)) : f.type === a));
      };
      const take = list => {
        const all = Array.from(list || []);
        const ok = all.filter(accepts);
        if (all.length && !ok.length) return FY.toast("That file type does not work here. Try " + (opts.label || "a supported file") + ".", true);
        if (ok.length < all.length) FY.toast((all.length - ok.length) + " file(s) skipped because the type is not supported.", true);
        if (ok.length) opts.onFiles(opts.multiple ? ok : [ok[0]]);
      };
      input.addEventListener("change", () => { take(input.files); input.value = ""; });
      ["dragenter", "dragover"].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.add("over"); }));
      ["dragleave", "drop"].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.remove("over"); }));
      el.addEventListener("drop", e => take(e.dataTransfer && e.dataTransfer.files));
      document.addEventListener("paste", e => {
        const files = e.clipboardData && e.clipboardData.files;
        if (files && files.length && document.contains(el)) take(files);
      });
    },

    /* Decode any supported image (incl. HEIC) into an <img> */
    async loadImage(file) {
      let blob = file;
      const isHeic = /\.(heic|heif)$/i.test(file.name) || /heic|heif/.test(file.type);
      if (isHeic) {
        if (!window.heic2any) await FY.loadScript(FY.rootPath + "assets/vendor/heic2any.min.js");
        const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.95 });
        blob = Array.isArray(out) ? out[0] : out;
      }
      const url = URL.createObjectURL(blob);
      try {
        const img = new Image();
        img.decoding = "async";
        img.src = url;
        await img.decode();
        return img;
      } catch (e) {
        throw new Error("Could not open " + file.name + ". The file may be damaged or in an unsupported format.");
      }
    },

    /* Load a script once, on demand (keeps heavy libraries off the first page load) */
    loadScript(src) {
      FY._scripts = FY._scripts || {};
      if (!FY._scripts[src]) FY._scripts[src] = new Promise((res, rej) => {
        const el = document.createElement("script");
        el.src = src; el.onload = res;
        el.onerror = () => { delete FY._scripts[src]; rej(new Error("Could not load a part of the tool. Check your connection and try again.")); };
        document.head.appendChild(el);
      });
      return FY._scripts[src];
    },

    canvasToBlob(canvas, type, q) {
      return new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error("Could not create the image.")), type, q));
    },

    /* Opens the payment link for a plan (day, month, year, cv) in the visitor's currency */
    checkout(plan) {
      const links = (window.FY_PAY || {})[FY.currency] || {};
      const url = links[plan] || ((window.FY_PAY || {}).INR || {})[plan];
      if (!url) return FY.toast("Payments are opening very soon. Please check back in a day or two.");
      window.location.href = url;
    },

    /* Daily free allowance for paid tools */
    usesToday(key) {
      const d = new Date().toISOString().slice(0, 10);
      const u = store.get("fy_use_" + key, { d, n: 0 });
      return u.d === d ? u.n : 0;
    },
    recordUse(key) {
      const d = new Date().toISOString().slice(0, 10);
      store.set("fy_use_" + key, { d, n: FY.usesToday(key) + 1 });
    },
    canUse(key, limit) { return FY.isPro() || FY.usesToday(key) < limit; },

    upgrade(reason, opts) {
      const p = PRICES[FY.currency];
      const m = document.createElement("div");
      m.className = "modal";
      m.setAttribute("role", "dialog");
      m.setAttribute("aria-modal", "true");
      m.innerHTML =
        '<div class="modal-box">' +
        '<button class="icon-btn modal-close" aria-label="Close">' + ICON.close + '</button>' +
        '<span class="eyebrow">' + FY.brand + ' Pro</span>' +
        '<h2>Unlock every tool</h2>' +
        '<p class="muted">' + (reason || "Get unlimited use, HD results and no ads.") + '</p>' +
        '<div class="plan-opts">' +
        (opts && opts.cv ? '<button type="button" class="plan-opt" data-plan="cv"><span>Just this resume</span><b>' + p.cv + '</b></button>' : '') +
        '<button type="button" class="plan-opt" data-plan="day"><span>Day pass</span><b>' + p.day + '</b></button>' +
        '<button type="button" class="plan-opt best" data-plan="month"><span>Monthly</span><b>' + p.month + '<small style="font-size:.8rem">' + p.monthNote + '</small></b></button>' +
        '<button type="button" class="plan-opt" data-plan="year"><span>Yearly (save 33%)</span><b>' + p.year + '</b></button>' +
        '</div>' +
        '<a class="btn btn-primary btn-block" style="--tool:var(--mango)" href="' + FY.rootPath + 'pricing.html">See Pro plans</a>' +
        '<p class="muted" style="font-size:.85rem;margin-top:12px;text-align:center">UPI, cards and wallets accepted. Cancel anytime.</p>' +
        '</div>';
      const close = () => m.remove();
      m.addEventListener("click", e => {
        if (e.target === m || e.target.closest(".modal-close")) return close();
        const opt = e.target.closest("[data-plan]");
        if (opt) FY.checkout(opt.dataset.plan);
      });
      document.addEventListener("keydown", function esc(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); } });
      document.body.appendChild(m);
      m.querySelector(".modal-close").focus();
    },

    /* Reorderable list: arr is mutated, render() redraws. */
    move(arr, from, to) { if (to < 0 || to >= arr.length) return; arr.splice(to, 0, arr.splice(from, 1)[0]); },

    /* Segmented controls: returns a live {name: value} map; onChange(name, value) */
    segs(onChange) {
      const vals = {};
      document.querySelectorAll("[data-seg]").forEach(g => {
        const name = g.dataset.seg;
        const cur = g.querySelector('[aria-pressed="true"]');
        vals[name] = cur ? cur.dataset.v : null;
        g.addEventListener("click", e => {
          const b = e.target.closest("button[data-v]");
          if (!b) return;
          g.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
          vals[name] = b.dataset.v;
          if (onChange) onChange(name, b.dataset.v);
        });
      });
      vals.set = (name, v) => {
        const g = document.querySelector('[data-seg="' + name + '"]');
        const b = g && g.querySelector('[data-v="' + v + '"]');
        if (b) b.click();
      };
      return vals;
    },

    preset() { try { return JSON.parse(document.getElementById("tool").dataset.preset || "{}"); } catch (e) { return {}; } },

    /* File list row with optional thumbnail, up/down/remove buttons */
    fileRow(item, idx, total, handlers) {
      const li = document.createElement("li");
      li.className = "file-item";
      li.draggable = !!handlers.move;
      const thumb = item.thumb ? '<img class="thumb" alt="" src="' + item.thumb + '">' : '<span class="thumb">' + (item.ext || "FILE") + "</span>";
      const up = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
      const down = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>';
      li.innerHTML = thumb + '<div class="meta"><div class="name"></div><div class="sub"></div></div><div class="acts">' +
        (handlers.move ? '<button class="mini" data-a="up" aria-label="Move up">' + up + '</button><button class="mini" data-a="down" aria-label="Move down">' + down + "</button>" : "") +
        '<button class="mini" data-a="rm" aria-label="Remove">' + ICON.close + "</button></div>";
      li.querySelector(".name").textContent = item.name;
      li.querySelector(".sub").innerHTML = item.sub || "";
      li.querySelector(".acts").addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.a === "rm") handlers.remove(idx);
        if (b.dataset.a === "up") handlers.move(idx, idx - 1);
        if (b.dataset.a === "down") handlers.move(idx, idx + 1);
      });
      if (handlers.move) {
        li.addEventListener("dragstart", e => { li.classList.add("dragging"); e.dataTransfer.setData("text/plain", idx); });
        li.addEventListener("dragend", () => li.classList.remove("dragging"));
        li.addEventListener("dragover", e => e.preventDefault());
        li.addEventListener("drop", e => { e.preventDefault(); e.stopPropagation(); const from = +e.dataTransfer.getData("text/plain"); if (!isNaN(from)) handlers.move(from, idx); });
      }
      return li;
    },

    progress(p) {
      const el = document.getElementById("progress");
      if (!el) return;
      el.hidden = p === null;
      if (p !== null) el.querySelector("b").style.width = Math.round(p * 100) + "%";
    },

    showResult(html) {
      const r = document.getElementById("result");
      r.innerHTML = html; r.hidden = false;
      r.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return r;
    },

    applyPrices(scope) {
      const p = PRICES[FY.currency];
      (scope || document).querySelectorAll("[data-price]").forEach(el => { el.textContent = p[el.dataset.price]; });
      (scope || document).querySelectorAll("[data-cur]").forEach(b => b.setAttribute("aria-pressed", b.dataset.cur === FY.currency));
    }
  };
  FY.rootPath = document.documentElement.dataset.root || "";
  FY.brand = document.documentElement.dataset.brand || "";
  FY.site = document.documentElement.dataset.site || "";
  FY.slug = FY.brand.toLowerCase().replace(/[^a-z0-9]+/g, "");
  window.FY = FY;

  document.addEventListener("DOMContentLoaded", () => {
    if (FY.isPro()) document.body.classList.add("is-pro");

    const themeBtn = document.querySelector("[data-theme-toggle]");
    if (themeBtn) themeBtn.addEventListener("click", () => {
      const next = isDark() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      store.set("fy_theme", next);
    });

    const menuBtn = document.querySelector(".menu-toggle");
    const links = document.querySelector(".nav-links");
    if (menuBtn && links) menuBtn.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open);
    });

    document.querySelectorAll("[data-cur]").forEach(b => b.addEventListener("click", () => {
      FY.currency = b.dataset.cur; store.set("fy_currency", FY.currency); FY.applyPrices();
    }));
    FY.applyPrices();

    document.querySelectorAll("[data-checkout]").forEach(b => b.addEventListener("click", () => FY.checkout(b.dataset.checkout)));
    document.querySelectorAll("[data-upgrade]").forEach(b => b.addEventListener("click", e => { e.preventDefault(); FY.upgrade(b.dataset.upgrade || ""); }));

    // Homepage: rotating hero word + category filter
    const word = document.querySelector("[data-rotate]");
    if (word) {
      const words = word.dataset.rotate.split("|");
      let i = 0;
      setInterval(() => {
        i = (i + 1) % words.length;
        word.innerHTML = "<span>" + words[i] + "</span>";
      }, 2200);
    }
    const demo = document.querySelector("[data-demo]");
    if (demo) {
      const pairs = JSON.parse(demo.dataset.demo);
      let k = 0;
      const badge = demo.querySelector(".demo-badge"), from = demo.querySelector("[data-from]"), to = demo.querySelector("[data-to]");
      const show = () => { const p = pairs[k]; badge.textContent = p[0]; badge.style.background = p[2]; from.textContent = p[0]; to.textContent = p[1]; setTimeout(() => { badge.textContent = p[1]; }, 2300); };
      show();
      setInterval(() => { k = (k + 1) % pairs.length; show(); }, 3200);
    }
    const chips = document.querySelectorAll("[data-filter]");
    chips.forEach(ch => ch.addEventListener("click", () => {
      chips.forEach(c => c.setAttribute("aria-pressed", c === ch));
      const f = ch.dataset.filter;
      document.querySelectorAll(".tool-grid .tool-card").forEach((card, n) => {
        const show = f === "all" || card.dataset.cat.split(" ").includes(f);
        card.hidden = !show;
        if (show) { card.classList.remove("reveal"); void card.offsetWidth; card.style.setProperty("--i", n % 6); card.classList.add("reveal"); }
      });
    }));
  });
})();
