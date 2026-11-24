(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const KEY = "rb-sevgi-user";
  const store = {
    get() { try { return localStorage.getItem(KEY); } catch { return null; } },
    set(v) { try { localStorage.setItem(KEY, v); } catch {} },
    del() { try { localStorage.removeItem(KEY); } catch {} },
  };

  /* ---------- uchuvchi yuraklar ---------- */
  const hearts = ["💗", "💕", "💖", "❤️", "🌸", "💞", "🤍"];
  function spawnHeart() {
    const h = el("span", "fh", hearts[Math.floor(Math.random() * hearts.length)]);
    h.style.left = Math.random() * 100 + "vw";
    h.style.fontSize = 12 + Math.random() * 22 + "px";
    h.style.animationDuration = 7 + Math.random() * 7 + "s";
    $("#hearts").appendChild(h);
    setTimeout(() => h.remove(), 15000);
  }
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) setInterval(spawnHeart, 650);

  function burst(x, y, n = 24) {
    for (let i = 0; i < n; i++) {
      const b = el("span", "burst", hearts[i % hearts.length]);
      b.style.left = x + "px"; b.style.top = y + "px";
      const a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 180;
      b.style.setProperty("--x", Math.cos(a) * d + "px");
      b.style.setProperty("--y", Math.sin(a) * d + "px");
      b.style.setProperty("--r", Math.random() * 360 + "deg");
      document.body.appendChild(b);
      setTimeout(() => b.remove(), 1500);
    }
  }

  /* ---------- ekranlar ---------- */
  function show(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.id === id));
    window.scrollTo(0, 0);
  }

  /* ---------- login ---------- */
  let chosen = null;
  document.querySelectorAll(".who-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      chosen = btn.dataset.user;
      document.querySelectorAll(".who-btn").forEach(b => b.classList.toggle("sel", b === btn));
      $("#login-msg").textContent = "";
      $("#password").focus();
    });
  });

  /* ---------- shifrlash ---------- */
  const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const b64e = u => btoa(String.fromCharCode(...new Uint8Array(u)));
  let CK = null, SAYT = null;
  async function unlock(user, pass) {
    const k = KEYS.users[user];
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
    const kek = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64d(k.salt), iterations: KEYS.iter, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64d(k.iv) }, kek, b64d(k.ct));
  }
  async function useKey(raw) {
    CK = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
    SAYT = JSON.parse(new TextDecoder().decode(await decryptUrl("m/d.bin")));
  }
  async function decryptUrl(url) {
    const r = await fetch(url + "?v=" + (KEYS.v || 1));
    if (!r.ok) throw new Error(r.status);
    const buf = await r.arrayBuffer();
    return crypto.subtle.decrypt({ name: "AES-GCM", iv: buf.slice(0, 12) }, CK, buf.slice(12));
  }
  async function blobUrl(url, type) {
    return URL.createObjectURL(new Blob([await decryptUrl(url)], { type }));
  }

  $("#login-form").addEventListener("submit", async e => {
    e.preventDefault();
    primeSong();
    const msg = $("#login-msg"), card = $(".login-card");
    const pass = $("#password").value.trim();
    const fail = t => {
      msg.textContent = t;
      card.classList.remove("shake"); void card.offsetWidth; card.classList.add("shake");
    };
    if (!chosen) { stopSong(); return fail("Avval kimligingni tanla 🙂"); }
    const btn = $("#login-btn");
    btn.disabled = true; btn.textContent = "Ochilmoqda… 💗";
    let raw;
    try { raw = await unlock(chosen, pass.toLowerCase()); await useKey(raw); }
    catch { stopSong(); btn.disabled = false; btn.textContent = "Yuragimni och 💌"; return fail("Bu yurak kaliti emas… yana urinib ko'r 💔"); }
    btn.disabled = false; btn.textContent = "Yuragimni och 💌";
    store.set(chosen + "|" + b64e(raw));
    const r = $(".login-card").getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 30);
    openEnvelope(chosen);
  });

  function openEnvelope(user) {
    $("#env-text").textContent = user === "bonu" ? "Seni sevaman, Bonu" : "Xush kelibsan";
    show("envelope");
    setTimeout(() => { enter(user); music(true); }, 2600);
  }

  $("#logout").addEventListener("click", () => {
    store.del();
    $("#password").value = "";
    chosen = null;
    document.querySelectorAll(".who-btn").forEach(b => b.classList.remove("sel"));
    music(false);
    show("login");
  });

  /* ---------- asosiy sayt ---------- */
  let built = false;
  function enter(user) {
    show("app");
    const u = KEYS.names[user];
    const s = SAYT.salom[user];
    $("#hero-hi").textContent = `${u.emoji} Salom, ${u.ism}`;
    $("#welcome-title").textContent = s.sarlavha;
    $("#welcome-text").textContent = s.matn;
    $("#chat-name").textContent = user === "bonu" ? "Rahmatulloh" : "Bonu";
    if (!built) { build(); built = true; }
    observe();
  }

  function build() {
    // hisoblagich
    const start = new Date(SAYT.tanishganSana + "T00:00:00");
    const pad = n => String(n).padStart(2, "0");
    const tick = () => {
      let diff = Math.max(0, Date.now() - start);
      const d = Math.floor(diff / 864e5); diff %= 864e5;
      const h = Math.floor(diff / 36e5); diff %= 36e5;
      const m = Math.floor(diff / 6e4); const sec = Math.floor((diff % 6e4) / 1e3);
      $("#c-d").textContent = d; $("#c-h").textContent = pad(h);
      $("#c-m").textContent = pad(m); $("#c-s").textContent = pad(sec);
    };
    if (!isNaN(start)) {
      tick(); setInterval(tick, 1000);
      $("#since").textContent = "💞 " + `${start.getDate()}-${["yanvar","fevral","mart","aprel","may","iyun","iyul","avgust","sentabr","oktabr","noyabr","dekabr"][start.getMonth()]}, ${start.getFullYear()}-yil` + " — hammasi shu kuni boshlandi";
    }
    if (SAYT.bonuTugilganKun) {
      const b = new Date(SAYT.bonuTugilganKun + "T00:00:00");
      if (!isNaN(b)) {
        const now = new Date(); now.setHours(0, 0, 0, 0);
        const next = new Date(now.getFullYear(), b.getMonth(), b.getDate());
        if (next < now) next.setFullYear(now.getFullYear() + 1);
        const days = Math.round((next - now) / 864e5);
        const age = next.getFullYear() - b.getFullYear();
        $("#birthday").textContent = days === 0
          ? `🎂 Bugun Bonuning tug'ilgan kuni! ${age} yoshing muborak, malikam! 🎉`
          : `🎂 Bonuning ${age} yoshga to'lishiga ${days} kun qoldi`;
      }
    }

    // maktub
    $("#letter-to").textContent = SAYT.maktub.kimga + ",";
    SAYT.maktub.matn.forEach(p => $("#letter-body").appendChild(el("p", null, p)));
    $("#letter-sign").textContent = SAYT.maktub.imzo;

    // hikoya
    SAYT.hikoya.forEach(h => {
      const it = el("div", "t-item reveal");
      it.appendChild(el("div", "t-dot", h.emoji || "💗"));
      const c = el("div", "t-card card");
      c.appendChild(el("div", "t-date", h.sana));
      c.appendChild(el("h3", null, h.sarlavha));
      c.appendChild(el("p", null, h.matn));
      if (h.rasm) { const im = el("img"); im.src = h.rasm; im.alt = h.sarlavha; im.loading = "lazy"; im.onerror = () => im.remove(); c.appendChild(im); }
      it.appendChild(c);
      $("#timeline").appendChild(it);
    });

    // galereya
    const photos = SAYT.rasmlar.map(r => ({ ...r, ok: false }));
    photos.forEach((p, i) => $("#gallery").appendChild(photoCard(p, i, photos)));
    const shots = SAYT.yozishmaSkrinshotlar.map(f => ({ fayl: f, izoh: "", ok: false }));
    shots.forEach((p, i) => $("#shots").appendChild(photoCard(p, i, shots)));

    // video
    SAYT.videolar.forEach(v => {
      const box = el("div", "v-item card reveal");
      if (v.youtube) {
        const f = el("iframe");
        f.src = "https://www.youtube.com/embed/" + encodeURIComponent(v.youtube) + "?rel=0";
        f.title = v.izoh || "Video";
        f.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
        f.allowFullscreen = true; f.loading = "lazy";
        box.appendChild(f);
        box.appendChild(el("p", null, v.izoh));
        $("#videos").appendChild(box);
        return;
      }
      // Video faqat bosilganda yuklanadi (rasmlar tez ochilishi uchun)
      const ph = el("button", "v-ph");
      ph.type = "button";
      ph.appendChild(el("b", null, "▶"));
      ph.appendChild(el("span", null, "Videoni ko'rish"));
      box.appendChild(ph);
      ph.addEventListener("click", async () => {
        if (ph.disabled) return;
        ph.disabled = true; ph.lastChild.textContent = "Ochilmoqda… 💗";
        try {
          const vid = el("video");
          vid.controls = true; vid.playsInline = true;
          vid.src = await blobUrl(v.fayl, "video/mp4");
          ph.replaceWith(vid);
          vid.play().catch(() => {});
        } catch { ph.disabled = false; ph.lastChild.textContent = "Ochilmadi 😔 Qayta bosing"; }
      });
      box.appendChild(el("p", null, v.izoh));
      $("#videos").appendChild(box);
    });

    // chat
    SAYT.yozishmalar.forEach(m => {
      if (m.kim === "sana") { $("#chat").appendChild(el("div", "msg sep", m.matn)); return; }
      const b = el("div", "msg " + (m.kim === "r" ? "r" : "b"));
      b.appendChild(el("span", "who-tag", m.kim === "r" ? "Rahmatulloh" : "Bonu"));
      b.appendChild(document.createTextNode(m.matn));
      if (m.vaqt) b.appendChild(el("time", null, m.vaqt)); else b.classList.add("nt");
      $("#chat").appendChild(b);
    });

    // sabablar
    if (SAYT.sabablarIzoh) $("#reasons-sub").textContent = SAYT.sabablarIzoh;
    SAYT.sabablar.forEach((t, i) => {
      const c = el("button", "r-card reveal");
      c.type = "button";
      const f = el("div", "r-face r-front");
      f.appendChild(el("b", null, "#" + (i + 1)));
      f.appendChild(el("span", null, "yuragim aytadi 💗"));
      c.appendChild(f);
      c.appendChild(el("div", "r-face r-back", t));
      c.addEventListener("click", () => c.classList.toggle("flip"));
      $("#reasons").appendChild(c);
    });

    // orzular
    SAYT.orzular.forEach(o => {
      const li = el("li", o.bajarildi ? "done" : "");
      const chk = el("span", "chk", "✓");
      li.appendChild(chk);
      li.appendChild(el("span", null, o.matn));
      li.addEventListener("click", e => {
        li.classList.toggle("done");
        if (li.classList.contains("done")) burst(e.clientX, e.clientY, 12);
      });
      $("#dreams").appendChild(li);
    });

    // savol
    const no = $("#no");
    const noTexts = ["Yo'q", "Ishonchingiz komilmi? 🥺", "Yana o'ylab ko'r 😢", "Yuragim og'riyapti 💔", "Baribir ushlolmaysan 😜"];
    let tries = 0;
    const run = () => {
      tries++;
      no.textContent = noTexts[Math.min(tries, noTexts.length - 1)];
      const x = (Math.random() - .5) * Math.min(300, innerWidth - 160);
      const y = (Math.random() - .5) * 140;
      no.style.transform = `translate(${x}px, ${y}px)`;
      const yes = $("#yes");
      yes.style.transform = `scale(${Math.min(1 + tries * .12, 1.7)})`;
    };
    no.addEventListener("mouseenter", run);
    no.addEventListener("click", e => { e.preventDefault(); run(); });
    $("#yes").addEventListener("click", e => {
      for (let i = 0; i < 4; i++) setTimeout(() => burst(e.clientX + (Math.random() - .5) * 200, e.clientY + (Math.random() - .5) * 100, 26), i * 220);
      $("#q-area").style.display = "none";
      $("#q-answer").textContent = "Bilardim! 💖 Men ham seni butun dunyodan ko'proq sevaman. Sen — mening bugunim, ertam va abadiyatimsan. ♾️";
    });

    // menyu
    $("#burger").addEventListener("click", () => $("#links").classList.toggle("open"));
    document.querySelectorAll("#links a").forEach(a => a.addEventListener("click", () => $("#links").classList.remove("open")));

    // musiqa
    if (KEYS.music || KEYS.yt) {
      $("#music").hidden = false;
      $("#music").addEventListener("click", () => {
        if (KEYS.music) { const a = $("#song"); a.paused ? playSong() : stopSong(true); return; }
        const pl = $("#player");
        if (pl.hidden || pl.classList.contains("min")) music(true);
        else pl.classList.add("min");
      });
    }
  }

  /* ---------- musiqa ---------- */
  // Fayl bo'lsa (musiqa.mp3) — login tugmasi bosilganda darhol chaladi (iPhone ham ruxsat beradi).
  function primeSong() {
    if (!KEYS.music) return;
    const a = $("#song");
    if (!a.src) a.src = KEYS.music;
    a.play().then(() => $("#music").classList.add("on")).catch(() => {});
  }
  function playSong() { primeSong(); }
  function stopSong(keep) {
    const a = $("#song"); a.pause(); if (!keep) a.currentTime = 0;
    $("#music").classList.remove("on");
  }
  // Avval kirgan bo'lsa: birinchi teginishda chaladi
  function songOnFirstTouch() {
    if (!KEYS.music) return;
    const go = () => { document.removeEventListener("pointerdown", go); if ($("#song").paused) primeSong(); };
    document.addEventListener("pointerdown", go);
  }

  // Fayl bo'lmasa — YouTube pleer (15-soniyadan)
  function music(on) {
    if (KEYS.music) { on ? primeSong() : stopSong(); return; }
    const pl = $("#player"), fr = $("#pl-frame"), btn = $("#music");
    if (!KEYS.yt) return;
    if (!on) { fr.textContent = ""; pl.hidden = true; pl.classList.remove("min"); btn.classList.remove("on"); return; }
    if (!fr.firstChild) {
      const id = encodeURIComponent(KEYS.yt);
      const f = el("iframe");
      f.allow = "autoplay; encrypted-media";
      f.title = "Bizning qo'shig'imiz";
      f.src = `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&start=${KEYS.ytStart || 0}&rel=0`;
      fr.appendChild(f);
    }
    pl.hidden = false; pl.classList.remove("min"); btn.classList.add("on");
  }
  $("#pl-min").addEventListener("click", () => $("#player").classList.add("min"));
  $("#pl-close").addEventListener("click", () => music(false));

  function photoCard(p, i, list) {
    const fig = el("figure", "g-item reveal");
    const img = el("img");
    img.alt = "";
    const wait = el("div", "ph loading");
    wait.appendChild(el("b", null, "💗"));
    wait.appendChild(el("span", null, "Rasm ochilmoqda…"));
    fig.appendChild(wait);
    img.onload = () => { p.ok = true; img.alt = p.izoh || "Bizning rasmimiz"; wait.remove(); };
    img.onerror = () => {
      const ph = el("div", "ph");
      ph.appendChild(el("b", null, ["💑", "🌹", "📸", "💐", "🥰", "✨"][i % 6]));
      ph.appendChild(el("span", null, "Rasm ochilmadi — sahifani yangilang"));
      wait.remove(); img.replaceWith(ph);
    };
    fig.appendChild(img);
    lazy(fig, async () => {
      for (let t = 0; t < 3; t++) {
        try { p.url = await blobUrl(p.fayl, "image/jpeg"); img.src = p.url; return; }
        catch { await new Promise(r => setTimeout(r, 1500)); }
      }
      img.onerror();
    });
    if (p.izoh) fig.appendChild(el("figcaption", null, p.izoh));
    fig.addEventListener("click", () => {
      const ok = list.filter(x => x.ok);
      const idx = ok.indexOf(p);
      if (idx >= 0) openLb(ok, idx);
    });
    return fig;
  }

  /* ---------- lightbox ---------- */
  let lbList = [], lbI = 0;
  const lb = $("#lightbox");
  function openLb(list, i) { lbList = list; lbI = i; drawLb(); lb.hidden = false; }
  function drawLb() { const p = lbList[lbI]; $("#lb-img").src = p.url; $("#lb-cap").textContent = p.izoh || ""; }
  const step = d => { lbI = (lbI + d + lbList.length) % lbList.length; drawLb(); };
  $(".lb-close").onclick = () => (lb.hidden = true);
  $(".lb-prev").onclick = () => step(-1);
  $(".lb-next").onclick = () => step(1);
  lb.addEventListener("click", e => { if (e.target === lb) lb.hidden = true; });
  document.addEventListener("keydown", e => {
    if (lb.hidden) return;
    if (e.key === "Escape") lb.hidden = true;
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });

  /* ---------- scroll animatsiya ---------- */
  let io;
  function observe() {
    io && io.disconnect();
    io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        if (en.target.classList.contains("phone")) {
          en.target.querySelectorAll(".msg").forEach((m, k) => setTimeout(() => m.classList.add("in"), k * 450));
        }
        io.unobserve(en.target);
      });
    }, { threshold: .15 });
    document.querySelectorAll(".reveal:not(.in)").forEach(x => io.observe(x));
  }

  function lazy(node, fn) {
    const o = new IntersectionObserver(es => {
      if (es.some(e => e.isIntersecting)) { o.disconnect(); fn(); }
    }, { rootMargin: "400px" });
    o.observe(node);
  }

  /* ---------- avval kirgan bo'lsa ---------- */
  (async () => {
    const saved = store.get();
    if (!saved) return;
    const [user, raw] = saved.split("|");
    if (!KEYS.names[user] || !raw) return store.del();
    try { await useKey(b64d(raw)); enter(user); songOnFirstTouch(); } catch { store.del(); }
  })();
})();
