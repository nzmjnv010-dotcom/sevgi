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
    CK = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
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
    chatStop();
    show("login");
  });

  /* ---------- asosiy sayt ---------- */
  let built = false;
  let ME = null;
  function enter(user) {
    ME = user;
    show("app");
    const u = KEYS.names[user];
    const s = SAYT.salom[user];
    $("#hero-hi").textContent = `${u.emoji} Salom, ${u.ism}`;
    $("#welcome-title").textContent = s.sarlavha;
    $("#welcome-text").textContent = s.matn;
    $("#chat-name").textContent = user === "bonu" ? "Rahmatulloh" : "Bonu";
    if (!built) {
      built = true;
      try { build(); } catch (e) { console.error(e); }
      try { buildExtras(); } catch (e) { console.error(e); }
    }
    try { observe(); } catch (e) { document.querySelectorAll(".reveal").forEach(x => x.classList.add("in")); }
    try { chatStart(); } catch (e) { console.error(e); }
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
          vid.controls = true; vid.playsInline = true; vid.muted = true;
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
  $("#pl-min")?.addEventListener("click", () => $("#player").classList.add("min"));
  $("#pl-close")?.addEventListener("click", () => music(false));

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

  /* ---------- Qo'shimcha sevgi bo'limlari ---------- */
  function buildExtras() {
    const app = $("#app"), before = $("#savol");
    const sec = (id, a, b) => {
      const x = el("section", "section"); x.id = id;
      const h = el("h2", "section-title"); h.appendChild(el("span", "script", a)); h.appendChild(document.createTextNode(" " + b));
      x.appendChild(h); app.insertBefore(x, before); return x;
    };
    const link = (href, t) => { const a = el("a", null, t); a.href = href; a.onclick = () => $("#links").classList.remove("open"); $("#links").insertBefore(a, $("#logout")); };

    // keyingi bayramimiz (har 100 kun va har yil)
    const start = new Date(SAYT.tanishganSana + "T00:00:00");
    if (!isNaN(start)) {
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const days = Math.round((now - start) / 864e5);
      const next100 = (Math.floor(days / 100) + 1) * 100;
      const yil = new Date(start); yil.setFullYear(start.getFullYear() + 1);
      while (yil < now) yil.setFullYear(yil.getFullYear() + 1);
      const dYil = Math.round((yil - now) / 864e5), d100 = next100 - days;
      const p = el("p", "since");
      p.textContent = dYil <= d100
        ? (dYil === 0 ? `🎉 Bugun bizning ${yil.getFullYear() - start.getFullYear()} yilligimiz!` : `💍 ${yil.getFullYear() - start.getFullYear()} yilligimizga ${dYil} kun qoldi`)
        : `🎉 Birga ${next100} kunimizga ${d100} kun qoldi`;
      $("#birthday").after(p);
    }

    // kunning sevgi so'zi
    if (SAYT.kunlikSozlar && SAYT.kunlikSozlar.length) {
      const L = SAYT.kunlikSozlar;
      let i = Math.floor(Date.now() / 864e5) % L.length;
      const x = sec("soz", "Kunning", "sevgi so'zi");
      const c = el("div", "quote card reveal");
      const q = el("p", "quote-text", "“" + L[i] + "”");
      const btn = el("button", "btn ghost quote-btn", "Yana bittasi 💗"); btn.type = "button";
      btn.onclick = e => { i = (i + 1) % L.length; q.classList.remove("pop"); void q.offsetWidth; q.classList.add("pop"); q.textContent = "“" + L[i] + "”"; burst(e.clientX, e.clientY, 10); };
      c.appendChild(el("div", "quote-ico", "💌")); c.appendChild(q); c.appendChild(btn); x.appendChild(c);
      link("#soz", "Kunning so'zi");
    }

    // "ochganda o'qi" xatlari
    if (SAYT.ochgandaXatlar && SAYT.ochgandaXatlar.length) {
      const x = sec("xatlar", "Ochganda", "o'qi");
      x.appendChild(el("p", "section-sub", "Har bir konvert — o'z vaqti uchun. Kerak bo'lganda och 💌"));
      const g = el("div", "envs");
      SAYT.ochgandaXatlar.forEach(xt => {
        const b = el("button", "env-card reveal"); b.type = "button";
        b.appendChild(el("span", "env-emo", xt.emoji));
        b.appendChild(el("span", "env-t", xt.sarlavha));
        b.onclick = () => openLetter(xt.emoji + " " + xt.sarlavha, xt.matn);
        g.appendChild(b);
      });
      x.appendChild(g);
      link("#xatlar", "Xatlar");
    }

    // tug'ilgan kun xati
    if (SAYT.tugilganKunXati && SAYT.bonuTugilganKun) {
      const b = new Date(SAYT.bonuTugilganKun + "T00:00:00");
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const isToday = now.getMonth() === b.getMonth() && now.getDate() === b.getDate();
      const next = new Date(now.getFullYear(), b.getMonth(), b.getDate());
      if (next < now) next.setFullYear(now.getFullYear() + 1);
      const left = Math.round((next - now) / 864e5);
      const x = sec("bday", "Tug'ilgan kun", "xati");
      const c = el("button", "bday card reveal" + (isToday ? " open" : "")); c.type = "button";
      c.appendChild(el("div", "bday-ico", isToday ? "🎁" : "🔒"));
      c.appendChild(el("b", null, isToday ? "Bugun ochiladi! Bos 🎉" : "Bu xat 30-avgustda ochiladi"));
      c.appendChild(el("small", null, isToday ? "Tug'ilgan kuning muborak, malikam!" : `Yana ${left} kun sabr qil 🤍`));
      c.onclick = e => {
        if (isToday) { openLetter("🎂 Tug'ilgan kuning muborak!", SAYT.tugilganKunXati.matn); burst(e.clientX, e.clientY, 30); }
        else { c.classList.remove("shake"); void c.offsetWidth; c.classList.add("shake"); }
      };
      x.appendChild(c);
    }
    observe();
  }

  function openLetter(title, text) {
    let m = $("#lt-modal");
    if (!m) {
      m = el("div", "lt-modal"); m.id = "lt-modal";
      const box = el("div", "lt-box letter");
      const x = el("button", "lt-x", "×"); x.type = "button"; x.onclick = () => (m.hidden = true);
      box.appendChild(x); box.appendChild(el("p", "letter-to")); box.appendChild(el("div", "lt-body"));
      box.appendChild(el("p", "letter-sign script", "Rahmatulloh ❤️"));
      m.appendChild(box); m.onclick = e => { if (e.target === m) m.hidden = true; };
      document.body.appendChild(m);
    }
    m.querySelector(".letter-to").textContent = title;
    const body = m.querySelector(".lt-body"); body.textContent = "";
    text.split(/\n\n+/).forEach(par => body.appendChild(el("p", null, par)));
    m.hidden = false;
    m.querySelector(".lt-box").scrollTop = 0;
  }

  /* ---------- CHAT (Telegram uslubida, shifrlangan, Firebase) ---------- */
  // Eski (keshdagi) index.html bilan ham ishlashi uchun kerakli elementlarni o'zi qo'shadi
  if (!$("#tg")) $("#app").insertAdjacentHTML("beforeend", `    <button id="chat-fab" class="chat-fab" hidden aria-label="Chat">💬<span id="chat-badge" hidden></span></button>

    <!-- Telegram uslubidagi chat -->
    <div id="tg" class="tg" hidden>
      <header class="tg-head">
        <button id="tg-back" class="tg-back" type="button" aria-label="Orqaga">‹</button>
        <div class="tg-ava" id="tg-ava">💗</div>
        <div class="tg-title"><b id="tg-name"></b><small id="tg-status">ulanmoqda…</small></div>
      </header>
      <div id="tg-list" class="tg-list"></div>
      <div id="tg-edit" class="tg-edit" hidden>
        <span class="tg-edit-i">✏️</span>
        <div><b>Tahrirlash</b><small id="tg-edit-old"></small></div>
        <button id="tg-edit-x" type="button" aria-label="Bekor qilish">✕</button>
      </div>
      <form id="tg-form" class="tg-form" autocomplete="off">
        <textarea id="tg-input" rows="1" maxlength="2000" placeholder="Xabar"></textarea>
        <button id="tg-send" type="submit" aria-label="Yuborish">➤</button>
      </form>
    </div>
    <div id="tg-sheet" class="tg-sheet" hidden>
      <div class="tg-sheet-box">
        <div class="tg-sheet-g">
          <button type="button" data-a="edit">✏️ Tahrirlash</button>
          <button type="button" data-a="copy">📋 Nusxalash</button>
        </div>
        <button type="button" data-a="x" class="cancel">Bekor qilish</button>
      </div>
    </div>`);
  if (!$("#song")) $("#app").insertAdjacentHTML("beforeend", '<audio id="song" loop preload="none"></audio>');
  const DB = KEYS.chatDb ? KEYS.chatDb.replace(/\/+$/, "") : null;
  const msgs = new Map(), els = new Map();
  let CFG = {};
  let es = null, es2 = null, seen = {}, editing = null, sheetId = null, chatOpen = false, beat = null, toBottom = true, lastSeenPut = 0;
  const OTHER = () => (ME === "bonu" ? "rahmatulloh" : "bonu");
  const p2 = n => String(n).padStart(2, "0");
  const hm = t => { const d = new Date(t); return p2(d.getHours()) + ":" + p2(d.getMinutes()); };
  const OYLAR = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
  function dayLabel(t) {
    const d = new Date(t), n = new Date(), y = new Date();
    y.setDate(n.getDate() - 1);
    if (d.toDateString() === n.toDateString()) return "Bugun";
    if (d.toDateString() === y.toDateString()) return "Kecha";
    return d.getDate() + "-" + OYLAR[d.getMonth()] + (d.getFullYear() !== n.getFullYear() ? " " + d.getFullYear() : "");
  }
  const lastRead = () => { try { return +localStorage.getItem("rb-read-" + ME) || 0; } catch { return 0; } };
  const setRead = t => { try { localStorage.setItem("rb-read-" + ME, String(t)); } catch {} };

  async function encJson(obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, CK, new TextEncoder().encode(JSON.stringify(obj)));
    return { iv: b64e(iv), ct: b64e(ct) };
  }
  async function decJson(rec) {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64d(rec.iv) }, CK, b64d(rec.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }
  const REEL = /https?:\/\/(?:www\.)?instagram\.com\/(?:[\w.]+\/)?(reels?|p|tv)\/([\w-]+)[^\s]*/i;

  function bubble(id, m) {
    const mine = m.from === ME;
    const b = el("div", "tg-msg " + (m.from === "ai" ? "ai" : mine ? "out" : "in"));
    b.dataset.id = id;
    if (m.from === "ai") b.appendChild(el("span", "tg-ai-l", "🕊️ Yarashtiruvchi maslahati"));
    if (m.edits && m.edits.length) {
      const q = el("div", "tg-prev");
      q.appendChild(el("span", "tg-prev-l", "✏️ Avvalgi xabar" + (m.edits.length > 1 ? "lar" : "") + ":"));
      m.edits.forEach(e => q.appendChild(el("div", "tg-prev-t", e.text)));
      b.appendChild(q);
    }
    const r = (m.text || "").match(REEL);
    if (r) {
      const kind = r[1].toLowerCase().startsWith("reel") ? "reel" : r[1].toLowerCase();
      const f = el("iframe");
      f.src = `https://www.instagram.com/${kind}/${encodeURIComponent(r[2])}/embed/`;
      f.title = "Instagram"; f.loading = "lazy";
      f.allow = "autoplay; encrypted-media; fullscreen";
      b.classList.add("reel");
      b.appendChild(f);
    }
    const txt = r ? m.text.replace(r[0], "").trim() : m.text;
    const body = el("div", "tg-text");
    if (txt) body.appendChild(document.createTextNode(txt));
    const meta = el("span", "tg-meta", (m.star ? "⭐ " : "") + (m.edits && m.edits.length ? "tahrirlangan " : "") + hm(m.t));
    if (mine) meta.appendChild(el("span", "tick", "✓"));
    body.appendChild(meta);
    b.appendChild(body);
    b.addEventListener("click", () => openSheet(id));
    return b;
  }
  function sig(m) { return (m.text || "") + "|" + (m.edits ? m.edits.length : 0) + "|" + (m.star ? 1 : 0); }
  function nearBottom() { const x = $("#tg-list"); return x.scrollHeight - x.scrollTop - x.clientHeight < 140; }
  function scrollEnd() { const x = $("#tg-list"); x.scrollTop = x.scrollHeight; }

  function rebuild() {
    const box = $("#tg-list");
    box.textContent = ""; els.clear();
    const list = [...msgs.entries()].sort((a, b) => a[1].t - b[1].t);
    if (!list.length) box.appendChild(el("div", "tg-day", "Hali xabar yo'q — birinchi bo'lib yoz 💌"));
    let day = "";
    for (const [id, m] of list) {
      const d = dayLabel(m.t);
      if (d !== day) { box.appendChild(el("div", "tg-day", d)); day = d; }
      const b = bubble(id, m); b._sig = sig(m); box.appendChild(b); els.set(id, b);
    }
    afterChange(true);
  }
  function upsert(id, m) {
    const box = $("#tg-list"), near = nearBottom();
    if (els.has(id)) {
      const old = els.get(id);
      if (old._sig === sig(m)) return;
      const b = bubble(id, m); b._sig = sig(m); old.replaceWith(b); els.set(id, b);
      afterChange(false);
      return;
    }
    const list = [...msgs.values()];
    const latest = Math.max(0, ...list.filter(x => x !== m).map(x => x.t));
    if (m.t < latest || !els.size) { rebuild(); return; }
    const prev = list.filter(x => x !== m).sort((a, b) => b.t - a.t)[0];
    if (!prev || dayLabel(prev.t) !== dayLabel(m.t)) box.appendChild(el("div", "tg-day", dayLabel(m.t)));
    const b = bubble(id, m); b._sig = sig(m); box.appendChild(b); els.set(id, b);
    if (near || m.from === ME) toBottom = true;
    afterChange(false);
  }
  function afterChange(initial) {
    updateTicks();
    if (toBottom || initial) { scrollEnd(); toBottom = false; }
    updateBadge();
    if (chatOpen) markSeen();
    happySoon();
  }
  function updateTicks() {
    const s = seen[OTHER()] || 0;
    for (const [id, b] of els) {
      const m = msgs.get(id), t = b.querySelector(".tick");
      if (!t || !m) continue;
      const read = s >= m.t;
      t.textContent = read ? "✓✓" : "✓";
      t.classList.toggle("read", read);
    }
  }
  function updateStatus() {
    const st = $("#tg-status"), s = seen[OTHER()];
    st.classList.remove("on");
    if (!es || es.readyState !== 1) { st.textContent = "ulanmoqda…"; return; }
    if (s && Date.now() - s < 60000) { st.textContent = "onlayn"; st.classList.add("on"); }
    else if (s) { const d = dayLabel(s); st.textContent = "oxirgi marta " + (d === "Bugun" ? "" : d.toLowerCase() + " ") + hm(s) + " da"; }
    else st.textContent = "🔒 shifrlangan chat";
  }
  function updateBadge() {
    const lr = lastRead(), o = OTHER();
    const n = chatOpen ? 0 : [...msgs.values()].filter(m => m.from === o && m.t > lr).length;
    const bd = $("#chat-badge");
    bd.hidden = !n; bd.textContent = n > 99 ? "99+" : String(n);
  }
  function markSeen() {
    if (!chatOpen || document.visibilityState !== "visible") return;
    const latest = Math.max(0, ...[...msgs.values()].map(m => m.t));
    if (latest > lastRead()) setRead(latest);
    const now = Date.now();
    if (now - lastSeenPut > 5000) {
      lastSeenPut = now;
      fetch(`${DB}/seen/${ME}.json`, { method: "PUT", body: String(now) }).catch(() => {});
    }
  }

  async function addRec(id, rec) {
    if (!rec) { msgs.delete(id); const b = els.get(id); if (b) { b.remove(); els.delete(id); } return null; }
    try {
      const m = await decJson(rec);
      if (m.type === "cfg") { if (!CFG._t || m.t > CFG._t) CFG = { ...(m.cfg || {}), _t: m.t }; aiRefresh(); return null; }
      msgs.set(id, m); return m;
    } catch { return null; }
  }
  function chatStart() {
    if (!DB || es) return;
    $("#chat-fab").hidden = false; $("#nav-chat").hidden = false;
    if (!$("#tg-ai")) {
      const b = el("button", "tg-aib", "🕊️"); b.id = "tg-ai"; b.type = "button"; b.title = "Yarashtiruvchi (AI)";
      b.onclick = openAI; $(".tg-head").appendChild(b);
    }
    happySection();
    if (SAYT.gemini && !CFG.gemini) CFG.gemini = SAYT.gemini;
    reelsSetup();
    $("#tg-name").textContent = KEYS.names[OTHER()].ism;
    $("#tg-ava").textContent = OTHER() === "bonu" ? "👸" : "🤴";
    es = new EventSource(`${DB}/chat.json?orderBy="$key"&limitToLast=500`);
    const handle = async (e, patch) => {
      const { path, data } = JSON.parse(e.data);
      if (path === "/") {
        if (!patch) msgs.clear();
        for (const [id, rec] of Object.entries(data || {})) await addRec(id, rec);
        rebuild();
      } else {
        const id = path.slice(1).split("/")[0];
        const m = await addRec(id, data);
        if (m) upsert(id, m);
      }
    };
    es.addEventListener("put", e => handle(e, false));
    es.addEventListener("patch", e => handle(e, true));
    es.onopen = updateStatus; es.onerror = updateStatus;
    es2 = new EventSource(`${DB}/seen.json`);
    es2.addEventListener("put", e => {
      const { path, data } = JSON.parse(e.data);
      if (path === "/") seen = data || {}; else seen[path.slice(1)] = data;
      updateTicks(); updateStatus();
    });
    setInterval(updateStatus, 20000);
  }
  /* ---------- 🎬 Reels ---------- */
  function reelsSetup() {
    if (!$("#tg-reel")) {
      const b = el("button", "tg-reelb", "🎬"); b.id = "tg-reel"; b.type = "button"; b.title = "Nusxalangan Reels'ni yuborish";
      b.onclick = pasteReel; $("#tg-form").prepend(b);
    }
    if (!$("#tg-reels")) {
      const b = el("button", "tg-aib", "🎞️"); b.id = "tg-reels"; b.type = "button"; b.title = "Reels'larimiz";
      b.onclick = openReels; $(".tg-head").insertBefore(b, $("#tg-ai"));
    }
    if (!$("#nav-reels")) {
      const a = el("a", null, "Reels 🎬"); a.id = "nav-reels"; a.href = "#";
      a.onclick = e => { e.preventDefault(); $("#links").classList.remove("open"); openReels(); };
      $("#links").insertBefore(a, $("#logout"));
    }
  }
  async function pasteReel() {
    let t = "";
    try { t = await navigator.clipboard.readText(); } catch {}
    const r = (t || "").match(REEL);
    if (r) { $("#tg-input").value = r[0]; grow(); $("#tg-form").requestSubmit(); return; }
    alert("Avval Instagram'da Reels ostidagi ↗ (ulashish) → \"Ssilkani nusxalash\" ni bos, keyin shu 🎬 tugmani bos.\n\nYoki havolani xabar maydoniga qo'yib yubor.");
  }
  function openReels() {
    if (!$("#reels")) {
      document.body.insertAdjacentHTML("beforeend", `
      <div id="reels" class="tg reels-panel" hidden>
        <header class="tg-head">
          <button id="reels-back" class="tg-back" type="button" aria-label="Orqaga">‹</button>
          <div class="tg-ava">🎬</div>
          <div class="tg-title"><b>Reels'larimiz</b><small id="reels-count"></small></div>
        </header>
        <div id="reels-list" class="reels-list"></div>
      </div>`);
      $("#reels-back").onclick = () => { $("#reels").hidden = true; $("#reels-list").textContent = ""; };
    }
    const list = [...msgs.entries()].filter(([, m]) => REEL.test(m.text || "")).sort((a, b) => b[1].t - a[1].t);
    const box = $("#reels-list"); box.textContent = "";
    $("#reels-count").textContent = list.length ? `${list.length} ta — bir-biringizga yuborganlaringiz` : "hali yo'q";
    if (!list.length) box.appendChild(el("p", "reels-empty", "Hali Reels yo'q. Instagram'da Reels → ↗ → \"Ssilkani nusxalash\", keyin chatda 🎬 tugmasini bos — shu yerda yig'iladi 💗"));
    for (const [id, m] of list) {
      const r = m.text.match(REEL);
      const kind = r[1].toLowerCase().startsWith("reel") ? "reel" : r[1].toLowerCase();
      const c = el("div", "reel-card");
      const top = el("div", "reel-top");
      top.appendChild(el("b", null, (m.from === ME ? "Sen" : (KEYS.names[m.from] || {}).ism) + " yubordi"));
      top.appendChild(el("small", null, dayLabel(m.t) + " " + hm(m.t)));
      c.appendChild(top);
      const txt = m.text.replace(r[0], "").trim();
      if (txt) c.appendChild(el("p", "reel-cap", txt));
      const f = el("iframe"); f.loading = "lazy"; f.title = "Instagram Reels";
      f.allow = "autoplay; encrypted-media; fullscreen";
      f.src = `https://www.instagram.com/${kind}/${encodeURIComponent(r[2])}/embed/`;
      c.appendChild(f);
      const go = el("a", "reel-open", "Instagram'da ochish ↗"); go.href = `https://www.instagram.com/${kind}/${encodeURIComponent(r[2])}/`; go.target = "_blank"; go.rel = "noopener";
      c.appendChild(go);
      box.appendChild(c);
    }
    $("#reels").hidden = false;
  }

  function happySection() {
    if ($("#baxtli")) return;
    const x = el("section", "section"); x.id = "baxtli";
    const h = el("h2", "section-title"); h.appendChild(el("span", "script", "Baxtli")); h.appendChild(document.createTextNode(" onlarimiz ⭐"));
    x.appendChild(h);
    x.appendChild(el("p", "section-sub", "Chatimizdagi eng shirin lahzalar — bosilsa, chatdagi o'sha joy ochiladi"));
    const l = el("div", "happy-list"); l.id = "happy-list"; x.appendChild(l);
    const t = el("div", "happy-tools");
    const b1 = el("button", "btn ghost", "✨ Gemini topib bersin"); b1.id = "happy-ai"; b1.type = "button"; b1.onclick = findHappy;
    const b2 = el("button", "btn ghost", "🕊️ Janjal bo'lsa — maslahat"); b2.type = "button"; b2.onclick = openAI;
    t.appendChild(b1); t.appendChild(b2); x.appendChild(t);
    const sug = el("div", "happy-sug"); sug.id = "happy-sug"; x.appendChild(sug);
    $("#app").insertBefore(x, $("#soz") || $("#savol"));
    const a = el("a", null, "Baxtli onlar ⭐"); a.href = "#baxtli"; a.onclick = () => $("#links").classList.remove("open");
    $("#links").insertBefore(a, $("#logout"));
    renderHappy();
  }
  function chatStop() {
    if (es) es.close(); if (es2) es2.close(); es = es2 = null;
    msgs.clear(); els.clear(); seen = {};
    closeChat(true);
    $("#chat-fab").hidden = true; $("#nav-chat").hidden = true;
  }

  /* ochish / yopish */
  function fit() {
    const vv = window.visualViewport, t = $("#tg");
    if (!vv || t.hidden) return;
    const near = nearBottom();
    t.style.height = vv.height + "px";
    t.style.top = vv.offsetTop + "px";
    if (near) scrollEnd();
  }
  if (window.visualViewport) { visualViewport.addEventListener("resize", fit); visualViewport.addEventListener("scroll", fit); }
  function openChat() {
    if (!DB) return;
    $("#tg").hidden = false; chatOpen = true;
    document.body.classList.add("tg-open");
    $("#links").classList.remove("open");
    fit(); scrollEnd(); updateBadge(); updateStatus();
    lastSeenPut = 0; markSeen();
    clearInterval(beat); beat = setInterval(() => { lastSeenPut = 0; markSeen(); }, 25000);
    try { history.pushState({ tg: 1 }, ""); } catch {}
  }
  function closeChat(silent) {
    if ($("#tg").hidden) return;
    $("#tg").hidden = true; chatOpen = false;
    document.body.classList.remove("tg-open");
    clearInterval(beat); cancelEdit(); closeSheet();
    updateBadge();
    if (!silent && history.state && history.state.tg) { try { history.back(); } catch {} }
  }
  window.addEventListener("popstate", () => { if (chatOpen) closeChat(true); });
  document.addEventListener("visibilitychange", () => { lastSeenPut = 0; markSeen(); });
  $("#chat-fab").addEventListener("click", openChat);
  $("#nav-chat").addEventListener("click", e => { e.preventDefault(); openChat(); });
  $("#tg-back").addEventListener("click", () => closeChat(false));

  /* ---------- ⭐ Baxtli onlar ---------- */
  async function putMsg(id, m) {
    const r = await fetch(`${DB}/chat/${id}.json`, { method: "PUT", body: JSON.stringify(await encJson(m)) });
    if (!r.ok) throw new Error(r.status);
  }
  async function toggleStar(id) {
    const m = msgs.get(id); if (!m) return;
    const nm = { ...m }; if (m.star) delete nm.star; else nm.star = { by: ME, t: Date.now() };
    try { await putMsg(id, nm); } catch { alert("Saqlanmadi, internetni tekshir 🙏"); }
  }
  let happyT = null;
  function happySoon() { clearTimeout(happyT); happyT = setTimeout(renderHappy, 150); }
  const plain = m => (m.text || "").replace(REEL, "🎬 Reels").trim();
  function renderHappy() {
    const box = $("#happy-list"); if (!box) return;
    box.textContent = "";
    const list = [...msgs.entries()].filter(([, m]) => m.star).sort((a, b) => a[1].t - b[1].t);
    if (!list.length) {
      box.appendChild(el("p", "happy-empty", "Hali bu yer bo'sh. Chatdagi istalgan shirin xabarni bosib, \"⭐ Baxtli onlarga qo'shish\" ni tanla — u shu yerda abadiy qoladi."));
      return;
    }
    for (const [id, m] of list) {
      const c = el("button", "happy-card reveal in" + (m.from === "rahmatulloh" ? " r" : " b")); c.type = "button";
      c.appendChild(el("span", "happy-q", "“" + plain(m) + "”"));
      c.appendChild(el("span", "happy-who", (m.from === "ai" ? "🕊️ Maslahatchi" : (KEYS.names[m.from] || {}).ism || "") + " · " + dayLabel(m.t) + " " + hm(m.t)));
      c.onclick = () => { openChat(); const b = els.get(id); if (b) { b.scrollIntoView({ block: "center" }); b.classList.remove("flash"); void b.offsetWidth; b.classList.add("flash"); } };
      box.appendChild(c);
    }
  }

  /* ---------- 🕊️ Gemini AI ---------- */
  // Ikki xil kalit: AI Studio ("AIza...") va Vertex AI express ("AQ...."). Ishlagan yo'l eslab qolinadi.
  const GEM_EPS = [
    { base: "https://generativelanguage.googleapis.com/v1beta/models/", models: ["gemini-3.8-flash", "gemini-flash-latest", "gemini-2.5-flash"] },
    { base: "https://aiplatform.googleapis.com/v1/publishers/google/models/", models: ["gemini-3.8-flash", "gemini-2.5-flash"] },
  ];
  let gemOk = null, gemList = null;
  // Google'dagi mavjud modellar ro'yxatidan eng yangi "flash" modelni tanlaydi
  async function bestModel() {
    if (gemList !== null) return gemList;
    gemList = "";
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${encodeURIComponent(CFG.gemini)}`);
      if (!r.ok) return "";
      const d = await r.json();
      const ok = (d.models || []).filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map(m => m.name.replace("models/", ""))
        .filter(n => /^gemini-[\d.]+-flash$/.test(n) || /^gemini-[\d.]+-flash-\d+$/.test(n));
      const ver = n => parseFloat((n.match(/gemini-([\d.]+)/) || [])[1] || 0);
      ok.sort((a, b) => ver(b) - ver(a) || a.length - b.length);
      gemList = ok[0] || "";
    } catch {}
    return gemList;
  }
  async function gemini(system, contents, json) {
    if (!CFG.gemini) throw new Error("nokey");
    const body = JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents,
      generationConfig: json ? { temperature: 0.2, responseMimeType: "application/json" } : { temperature: 0.8 } });
    const eps = GEM_EPS;
    const tries = gemOk ? [gemOk] : eps.flatMap(ep => ep.models.map(m => ep.base + m));
    if (!gemOk) { const best = await bestModel(); if (best) tries.unshift(GEM_EPS[0].base + best); }
    let lastErr = "";
    const seen = new Set();
    for (let i = 0; i < tries.length; i++) {
      const url = tries[i];
      if (seen.has(url)) continue; seen.add(url);
      let r;
      try { r = await fetch(`${url}:generateContent?key=${encodeURIComponent(CFG.gemini)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body }); }
      catch (e) { lastErr = "tarmoq xatosi"; continue; }
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        gemOk = url;
        return ((d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || []).map(x => x.text || "").join("").trim();
      }
      lastErr = (d.error && d.error.message) || String(r.status);
      // Google "o'rniga models/xxx ni ishlat" desa — o'shani sinab ko'ramiz
      const sug = lastErr.match(/models\/(gemini-[\w.-]+)/g);
      if (sug) sug.map(x => x.replace("models/", "")).filter(m => !url.endsWith("/" + m)).forEach(m => tries.splice(i + 1, 0, GEM_EPS[0].base + m));
      if ([400, 401, 403, 404, 410].includes(r.status)) continue;
      throw new Error(lastErr);
    }
    gemOk = null;
    throw new Error(lastErr || "Gemini javob bermadi");
  }
  const MEDIATOR = `Sen — Rahmatulloh va Bonu degan sevishganlar juftligining iliq, betaraf yarashtiruvchi maslahatchisisan.
Faqat o'zbek tilida (lotin yozuvida), sodda va mehribon tilda yoz.
Qoidalar:
- Hech kimning tarafini olma. Ikkalasining his-tuyg'ularini ham tan ol.
- Asosiy tushunmovchilikni qisqa va aniq ko'rsat.
- Har biri uchun 1–2 ta aniq qadam va aytishi mumkin bo'lgan samimiy gap namunasini ber.
- Hech qachon manipulyatsiya, ayyorlik, jim turib jazolash, rashk uyg'otish kabi usullarni maslahat berma — faqat ochiq, hurmatli va halol muloqotni tavsiya qil.
- Agar zo'ravonlik, tahdid, o'ziga yoki boshqaga zarar yetkazish belgilari bo'lsa — yumshoq, lekin aniq qilib ishonchli kattalar yoki mutaxassisdan yordam so'rashni maslahat ber.
- Javob qisqa bo'lsin: 150 so'zdan oshmasin. Oxirida bitta iliq, umid beruvchi jumla yoz.`;
  let aiHist = [];
  function aiDom() {
    if ($("#ai")) return;
    document.body.insertAdjacentHTML("beforeend", `
    <div id="ai" class="tg ai-panel" hidden>
      <header class="tg-head">
        <button id="ai-back" class="tg-back" type="button" aria-label="Orqaga">‹</button>
        <div class="tg-ava">🕊️</div>
        <div class="tg-title"><b>Yarashtiruvchi</b><small>Gemini AI · betaraf maslahatchi</small></div>
      </header>
      <div id="ai-log" class="tg-list"></div>
      <div id="ai-setup" class="ai-setup" hidden>
        <b>🔑 Bir martalik sozlash</b>
        <p>Maslahatchi ishlashi uchun bepul Gemini kaliti kerak:</p>
        <ol>
          <li><a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> ni och (Gmail bilan kir)</li>
          <li><b>"Create API key"</b> ni bos va kalitni nusxala</li>
          <li>Shu yerga qo'yib, <b>Saqlash</b> ni bos</li>
        </ol>
        <p class="ai-note">Kalit parolingiz bilan shifrlanib saqlanadi — faqat siz ikkovingiz ishlata olasiz. Bittangiz bir marta kiritsangiz yetadi.</p>
        <div class="ai-key"><input id="ai-key" type="password" placeholder="AIza... yoki AQ...." autocomplete="off"><button id="ai-key-save" type="button">Saqlash</button></div>
      </div>
      <form id="ai-form" class="tg-form ai-form" autocomplete="off">
        <label class="ai-ctx"><input type="checkbox" id="ai-ctx" checked> 💬 So'nggi 40 ta xabarimizni ham o'qisin</label>
        <div class="ai-row">
          <textarea id="ai-input" rows="2" maxlength="3000" placeholder="Nima bo'ldi? Ochiq yoz..."></textarea>
          <button id="ai-send" type="submit" aria-label="So'rash">➤</button>
        </div>
      </form>
    </div>`);
    $("#ai-back").onclick = () => { $("#ai").hidden = true; };
    $("#ai-key-save").onclick = saveKey;
    $("#ai-form").addEventListener("submit", askAI);
    $("#ai-input").addEventListener("input", () => { const i = $("#ai-input"); i.style.height = "auto"; i.style.height = Math.min(i.scrollHeight, 140) + "px"; });
  }
  function aiRefresh() {
    if (!$("#ai")) return;
    $("#ai-setup").hidden = !!CFG.gemini;
    $("#ai-form").hidden = !CFG.gemini;
  }
  function aiBubble(role, text, share) {
    const b = el("div", "tg-msg " + (role === "user" ? "out" : "in ai-ans"));
    b.appendChild(el("div", "tg-text", text));
    if (share) {
      const s = el("button", "ai-share", "💌 Chatga ulashish"); s.type = "button";
      s.onclick = async () => {
        s.disabled = true;
        try {
          const r = await fetch(`${DB}/chat.json`, { method: "POST", body: JSON.stringify(await encJson({ from: "ai", by: ME, text, t: Date.now() })) });
          if (!r.ok) throw 0; s.textContent = "✓ Chatga yuborildi";
        } catch { s.disabled = false; alert("Yuborilmadi 🙏"); }
      };
      b.appendChild(s);
    }
    $("#ai-log").appendChild(b);
    $("#ai-log").scrollTop = $("#ai-log").scrollHeight;
    return b;
  }
  function openAI() {
    aiDom(); aiRefresh();
    $("#ai").hidden = false;
    if (!$("#ai-log").children.length) {
      aiBubble("model", `Salom, ${KEYS.names[ME].ism} 🤍 Men betaraf maslahatchiman. Nima bo'lganini ochiq yoz — kim nima dedi, seni nima xafa qildi. Ikkalangizning ham his-tuyg'ularingizni hurmat qilgan holda, qanday yarashish mumkinligini aytib beraman.`);
    }
  }
  async function saveKey() {
    const k = $("#ai-key").value.trim();
    if (!/^(AIza[\w-]{20,}|AQ\.[\w.-]{20,})$/.test(k)) { alert("Kalit \"AIza...\" yoki \"AQ....\" bilan boshlanishi kerak. Qaytadan nusxalab ko'r."); return; }
    const btn = $("#ai-key-save"); btn.disabled = true; btn.textContent = "Tekshirilmoqda…";
    const old = CFG.gemini; CFG.gemini = k;
    try {
      await gemini("Faqat 'ok' deb javob ber.", [{ role: "user", parts: [{ text: "test" }] }]);
      const r = await fetch(`${DB}/chat.json`, { method: "POST", body: JSON.stringify(await encJson({ type: "cfg", cfg: { gemini: k }, from: ME, t: Date.now() })) });
      if (!r.ok) throw new Error("Saqlanmadi");
      $("#ai-key").value = ""; aiRefresh();
      aiBubble("model", "✅ Tayyor! Endi nima bo'lganini yozishing mumkin.");
    } catch (e) { CFG.gemini = old; alert("Kalit ishlamadi: " + e.message); }
    btn.disabled = false; btn.textContent = "Saqlash";
  }
  function recentContext(n) {
    return [...msgs.values()].filter(m => m.from !== "ai").sort((a, b) => a.t - b.t).slice(-n)
      .map(m => `${(KEYS.names[m.from] || {}).ism || "?"}: ${plain(m)}`).join("\n");
  }
  async function askAI(e) {
    e.preventDefault();
    const inp = $("#ai-input"), q = inp.value.trim();
    if (!q) return;
    inp.value = ""; inp.style.height = "auto";
    aiBubble("user", q);
    let text = `Men ${KEYS.names[ME].ism}man. ${q}`;
    if (!aiHist.length && $("#ai-ctx").checked && msgs.size)
      text += `\n\nBizning so'nggi yozishmalarimiz:\n${recentContext(40)}`;
    aiHist.push({ role: "user", parts: [{ text }] });
    const wait = aiBubble("model", "🕊️ O'ylayapman…");
    $("#ai-send").disabled = true;
    try {
      const ans = await gemini(MEDIATOR, aiHist);
      aiHist.push({ role: "model", parts: [{ text: ans }] });
      wait.remove(); aiBubble("model", ans || "…", true);
    } catch (err) {
      aiHist.pop(); wait.remove();
      aiBubble("model", "😔 Javob olib bo'lmadi: " + err.message);
    }
    $("#ai-send").disabled = false;
  }
  async function findHappy() {
    if (!CFG.gemini) { openAI(); return; }
    const out = $("#happy-sug"), btn = $("#happy-ai");
    const list = [...msgs.entries()].filter(([, m]) => m.from !== "ai" && !m.star && m.text).sort((a, b) => a[1].t - b[1].t).slice(-300);
    if (!list.length) { out.textContent = "Chatda hali xabar yo'q."; return; }
    btn.disabled = true; out.textContent = "✨ Gemini chatingizni o'qiyapti…";
    try {
      const txt = list.map(([, m], i) => `${i}. ${(KEYS.names[m.from] || {}).ism}: ${plain(m)}`).join("\n");
      const raw = await gemini("Sen sevishganlar chatidan eng shirin, eng baxtli, eng mehrli lahzalarni topasan. Faqat JSON qaytar: {\"ids\":[raqamlar]}. Ko'pi bilan 8 ta.",
        [{ role: "user", parts: [{ text: txt }] }], true);
      const ids = ((JSON.parse(raw) || {}).ids || []).filter(i => list[i]);
      out.textContent = "";
      if (!ids.length) { out.textContent = "Hozircha topilmadi — yana yozishinglar 😊"; }
      ids.forEach(i => {
        const [id, m] = list[i];
        const row = el("div", "happy-sug-row");
        row.appendChild(el("span", null, "“" + plain(m) + "” — " + (KEYS.names[m.from] || {}).ism));
        const add = el("button", null, "⭐ Qo'shish"); add.type = "button";
        add.onclick = async () => { add.disabled = true; await toggleStar(id); row.remove(); };
        row.appendChild(add); out.appendChild(row);
      });
    } catch (err) { out.textContent = "😔 " + err.message; }
    btn.disabled = false;
  }

  /* amallar oynasi */
  function openSheet(id) {
    const m = msgs.get(id); if (!m) return;
    sheetId = id;
    $("#tg-sheet").querySelector('[data-a="edit"]').hidden = m.from !== ME;
    let sb = $("#tg-sheet").querySelector('[data-a="star"]');
    if (!sb) { sb = el("button", null, ""); sb.type = "button"; sb.dataset.a = "star"; $("#tg-sheet .tg-sheet-g").prepend(sb); }
    sb.textContent = m.star ? "☆ Baxtli onlardan olib tashlash" : "⭐ Baxtli onlarga qo'shish";
    $("#tg-sheet").hidden = false;
  }
  function closeSheet() { $("#tg-sheet").hidden = true; sheetId = null; }
  $("#tg-sheet").addEventListener("click", async e => {
    const a = e.target.dataset && e.target.dataset.a;
    const m = sheetId && msgs.get(sheetId);
    if (a === "copy" && m) { try { await navigator.clipboard.writeText(m.text); } catch {} }
    if (a === "edit" && m) { startEdit(sheetId); }
    if (a === "star" && m) toggleStar(sheetId);
    if (a || e.target.id === "tg-sheet") closeSheet();
  });
  function startEdit(id) {
    const m = msgs.get(id);
    editing = id;
    $("#tg-edit").hidden = false;
    $("#tg-edit-old").textContent = m.text;
    const inp = $("#tg-input");
    inp.value = m.text; grow(); inp.focus();
  }
  function cancelEdit() { editing = null; $("#tg-edit").hidden = true; }
  $("#tg-edit-x").addEventListener("click", () => { cancelEdit(); $("#tg-input").value = ""; grow(); });

  /* yozish */
  function grow() { const i = $("#tg-input"); i.style.height = "auto"; i.style.height = Math.min(i.scrollHeight, 120) + "px"; }
  $("#tg-input").addEventListener("input", grow);
  $("#tg-form").addEventListener("submit", async e => {
    e.preventDefault();
    const inp = $("#tg-input"), text = inp.value.trim().slice(0, 2000);
    if (!text || !CK || !ME) return;
    const btn = $("#tg-send"); btn.disabled = true;
    try {
      let r;
      if (editing) {
        const m = msgs.get(editing);
        if (m.text !== text) {
          const nm = { ...m, text, et: Date.now(), edits: [...(m.edits || []), { text: m.text, t: m.et || m.t }] };
          r = await fetch(`${DB}/chat/${editing}.json`, { method: "PUT", body: JSON.stringify(await encJson(nm)) });
          if (!r.ok) throw 0;
        }
        cancelEdit();
      } else {
        toBottom = true;
        r = await fetch(`${DB}/chat.json`, { method: "POST", body: JSON.stringify(await encJson({ from: ME, text, t: Date.now() })) });
        if (!r.ok) throw 0;
      }
      inp.value = ""; grow(); inp.focus();
    } catch { alert("Xabar ketmadi, internetni tekshirib qayta urinib ko'r 🙏"); }
    btn.disabled = false;
  });

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
