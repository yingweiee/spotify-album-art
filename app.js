(() => {
  const $ = (id) => document.getElementById(id);
  const ART = window.ART;

  const phone = $("phone");
  const playerArt = $("playerArt");
  const viewer = $("viewer");
  const stage = $("stage");
  const mover = $("mover");
  const card = $("card");
  const glare = $("glare");
  const hint = $("hint");
  const sheet = $("sheet");
  const frontImg = card.querySelector(".front img");

  const backdrop = document.createElement("div");
  backdrop.className = "backdrop";
  viewer.prepend(backdrop);

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  /* ---------------- Concepts ---------------- */
  const CONCEPTS = {
    flip: {
      desc: "Tap the artwork and it flips over like a record sleeve, showing liner notes on the back: credits, the story behind the cover and its colour palette. You can still drag to tilt it.",
      hint: ["Drag to tilt · Tap to flip", "Tap to flip back"],
    },
    explore: {
      desc: "Tap to zoom into the artwork. Numbered hotspots mark details worth noticing, and a caption card below explains each one. Drag to look around the cover.",
      hint: ["Drag to tilt · Tap to explore", ""],
    },
    sheet: {
      desc: "Tap and the artwork shrinks to the top while a sheet slides up with the full story: palette, credits, the making-of and other editions you can preview on the cover.",
      hint: ["Drag to tilt · Tap for art details", ""],
    },
  };

  let concept = "flip";
  try {
    concept = new URLSearchParams(location.search).get("c") || localStorage.getItem("concept") || "flip";
  } catch (_) {}
  if (!CONCEPTS[concept]) concept = "flip";

  function setConcept(c) {
    if (viewer.classList.contains("detail")) closeDetail();
    concept = c;
    viewer.dataset.concept = c;
    document.querySelectorAll("[data-concept]").forEach((b) => {
      if (b.tagName === "BUTTON") b.setAttribute("aria-selected", String(b.dataset.concept === c));
    });
    $("conceptDesc").textContent = CONCEPTS[c].desc;
    updateHint();
    try {
      localStorage.setItem("concept", c);
      history.replaceState(null, "", `?c=${c}`);
    } catch (_) {}
  }
  document.querySelectorAll(".pills button").forEach((b) =>
    b.addEventListener("click", () => setConcept(b.dataset.concept))
  );

  /* ---------------- Transform state ---------------- */
  const m = { x: 0, y: 0, s: 1 }; // mover: pan / scale / placement
  const t = { rx: 0, ry: 0 }; // card tilt
  let flipped = false;

  function render() {
    mover.style.transform = `translate(${m.x}px, ${m.y}px) scale(${m.s})`;
    mover.style.setProperty("--s", m.s);
    card.style.transform = `rotateX(${t.rx}deg) rotateY(${t.ry + (flipped ? 180 : 0)}deg)`;
    glare.style.setProperty("--gx", `${50 + t.ry * 2}%`);
    glare.style.setProperty("--gy", `${30 - t.rx * 2}%`);
  }

  function updateHint() {
    const [idle, detail] = CONCEPTS[concept].hint;
    hint.textContent = viewer.classList.contains("detail") ? detail : idle;
  }

  /* ---------------- Player ---------------- */
  const TOTAL = 125;
  let elapsed = 19;
  let playing = true;
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  function tick() {
    const pct = (elapsed / TOTAL) * 100;
    $("fill").style.width = pct + "%";
    $("knob").style.left = pct + "%";
    $("elapsed").textContent = fmt(elapsed);
    $("remaining").textContent = "-" + fmt(TOTAL - elapsed);
  }
  setInterval(() => {
    if (!playing) return;
    elapsed = (elapsed + 1) % TOTAL;
    tick();
  }, 1000);
  tick();
  $("play").addEventListener("click", () => {
    playing = !playing;
    $("play").setAttribute("aria-label", playing ? "Pause" : "Play");
    $("playIcon").innerHTML = playing
      ? '<path d="M7 5h3.4v14H7zM13.6 5H17v14h-3.4z"/>'
      : '<path d="M8 5v14l11-7z"/>';
  });

  /* ---------------- Open / close viewer (shared-element transition) ---------------- */
  let animating = false;

  function flipTransform() {
    const from = playerArt.getBoundingClientRect();
    const to = mover.getBoundingClientRect();
    const s = from.width / to.width;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    return `translate(${dx}px, ${dy}px) scale(${s})`;
  }

  function openViewer() {
    if (animating) return;
    animating = true;
    Object.assign(m, { x: 0, y: 0, s: 1 });
    Object.assign(t, { rx: 0, ry: 0 });
    flipped = false;
    render();
    viewer.classList.add("open", "dragging");
    viewer.setAttribute("aria-hidden", "false");
    const start = flipTransform();
    playerArt.classList.add("hidden");
    const anim = mover.animate(
      [{ transform: start }, { transform: "translate(0,0) scale(1)" }],
      { duration: 520, easing: "cubic-bezier(.2,.9,.25,1.05)" }
    );
    card.querySelector(".face.front").animate(
      [{ borderRadius: "6px" }, { borderRadius: "10px" }],
      { duration: 520 }
    );
    anim.onfinish = () => {
      viewer.classList.remove("dragging");
      animating = false;
    };
    updateHint();
  }

  function closeViewer() {
    if (animating) return;
    if (viewer.classList.contains("detail")) {
      closeDetail();
      return;
    }
    animating = true;
    viewer.classList.add("closing", "dragging");
    const current = getComputedStyle(mover).transform;
    Object.assign(m, { x: 0, y: 0, s: 1 });
    Object.assign(t, { rx: 0, ry: 0 });
    render();
    const end = flipTransform();
    const anim = mover.animate(
      [{ transform: current === "none" ? "none" : current }, { transform: end }],
      { duration: 380, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }
    );
    anim.onfinish = () => {
      playerArt.classList.remove("hidden");
      viewer.classList.remove("open", "closing", "dragging");
      viewer.setAttribute("aria-hidden", "true");
      anim.cancel();
      animating = false;
    };
  }

  playerArt.addEventListener("click", openViewer);
  $("close").addEventListener("click", closeViewer);

  /* ---------------- Detail (per concept) ---------------- */
  let activeSpot = 0;

  function openDetail() {
    viewer.classList.add("detail");
    Object.assign(t, { rx: 0, ry: 0 });
    const H = viewer.clientHeight;
    const W = mover.offsetWidth;

    if (concept === "flip") {
      flipped = true;
    } else if (concept === "explore") {
      m.s = 1.4;
      m.y = -Math.min(90, H * 0.1);
      focusSpot(0, false);
    } else if (concept === "sheet") {
      sheet.querySelector(".sheet-body").scrollTop = 0;
      const sheetTop = H * 0.36;
      const target = (60 + sheetTop) / 2;
      m.s = clamp((sheetTop - 90) / W, 0.35, 0.6);
      m.y = target - H / 2;
      m.x = 0;
    }
    render();
    updateHint();
  }

  function closeDetail() {
    viewer.classList.remove("detail");
    sheet.style.removeProperty("--sheet-drag");
    flipped = false;
    Object.assign(m, { x: 0, y: 0, s: 1 });
    Object.assign(t, { rx: 0, ry: 0 });
    render();
    updateHint();
  }

  const toggleDetail = () =>
    viewer.classList.contains("detail") ? closeDetail() : openDetail();

  /* ---------------- Pointer: tilt / pan / tap ---------------- */
  let drag = null;

  stage.addEventListener("pointerdown", (e) => {
    if (animating || e.button > 0) return;
    const onCard = card.contains(e.target);
    drag = {
      id: e.pointerId,
      x0: e.clientX, y0: e.clientY, t0: performance.now(),
      mx: m.x, my: m.y, onCard, moved: false,
      pan: concept === "explore" && viewer.classList.contains("detail"),
    };
    stage.setPointerCapture(e.pointerId);
  });

  stage.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    const dy = e.clientY - drag.y0;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    if (!drag.moved && !drag.onCard && !drag.pan) return;
    drag.moved = true;
    viewer.classList.add("dragging");

    if (drag.pan) {
      const W = mover.offsetWidth * m.s;
      const H = mover.offsetHeight * m.s;
      const limX = Math.max(0, (W - viewer.clientWidth) / 2) + 30;
      const limY = Math.max(0, (H - viewer.clientHeight * 0.7) / 2) + 30;
      m.x = clamp(drag.mx + dx, -limX, limX);
      m.y = clamp(drag.my + dy, -limY - 90, limY);
    } else {
      // rubber-banded tilt
      t.ry = 28 * Math.tanh(dx / 160);
      t.rx = -28 * Math.tanh(dy / 160);
    }
    render();
  });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    viewer.classList.remove("dragging");
    if (!d.pan) {
      t.rx = 0;
      t.ry = 0;
      render();
    }
    const quick = performance.now() - d.t0 < 400;
    if (!d.moved && quick && e.type === "pointerup") {
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      if (hit && hit.closest(".hotspot")) {
        focusSpot(Number(hit.closest(".hotspot").dataset.i), true);
      } else if (hit && card.contains(hit)) {
        toggleDetail();
      } else if (viewer.classList.contains("detail")) {
        closeDetail();
      }
    }
  }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  /* ---------------- Concept 1: back of sleeve ---------------- */
  $("back").innerHTML = `
    <span class="eyebrow">Liner notes</span>
    <h2>${ART.album}</h2>
    <span class="by">${ART.artist} · ${ART.year} · ${ART.label}</span>
    <dl>${ART.credits.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
    <p class="story">${ART.story}</p>
    <div class="swatches">${ART.palette.map(([, hex]) => `<span style="background:${hex}"></span>`).join("")}</div>
  `;

  /* ---------------- Concept 2: hotspots + captions ---------------- */
  $("hotspots").innerHTML = ART.hotspots
    .map((h, i) => `<button class="hotspot" data-i="${i}" style="left:${h.x}%;top:${h.y}%" aria-label="${h.title}">${i + 1}</button>`)
    .join("");

  const annot = $("annot");
  function renderAnnot() {
    const h = ART.hotspots[activeSpot];
    annot.innerHTML = `
      <div class="row">
        <span class="num">${activeSpot + 1}</span>
        <h3>${h.title}</h3>
        <div class="nav">
          <button data-step="-1" aria-label="Previous detail"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button>
          <button data-step="1" aria-label="Next detail"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>
        </div>
      </div>
      <p>${h.text}</p>
      <div class="dots">${ART.hotspots.map((_, i) => `<span class="${i === activeSpot ? "on" : ""}"></span>`).join("")}</div>
    `;
    document.querySelectorAll(".hotspot").forEach((el, i) => el.classList.toggle("active", i === activeSpot));
  }
  annot.addEventListener("click", (e) => {
    const b = e.target.closest("[data-step]");
    if (!b) return;
    const n = ART.hotspots.length;
    focusSpot((activeSpot + Number(b.dataset.step) + n) % n, true);
  });

  function focusSpot(i, pan) {
    activeSpot = i;
    renderAnnot();
    if (!pan) return;
    // gently pan so the chosen detail drifts toward centre
    const h = ART.hotspots[i];
    const W = mover.offsetWidth * m.s;
    const limX = Math.max(0, (W - viewer.clientWidth) / 2) + 30;
    m.x = clamp(-((h.x - 50) / 100) * W * 0.8, -limX, limX);
    m.y = -Math.min(90, viewer.clientHeight * 0.1) - ((h.y - 50) / 100) * W * 0.35;
    render();
  }

  /* ---------------- Concept 3: sheet ---------------- */
  $("sheetBody").innerHTML = `
    <h2>${ART.album}</h2>
    <p class="sub">Artwork · ${ART.artist} · ${ART.year}</p>

    <h4>Colour palette</h4>
    <div class="palette">${ART.palette
      .map(([name, hex]) => `<div><i style="background:${hex}"></i><b>${name}</b><small>${hex.toUpperCase()}</small></div>`)
      .join("")}</div>

    <h4>The story</h4>
    <p class="story">${ART.story}</p>
    <p class="medium">${ART.medium}</p>

    <h4>Credits</h4>
    <dl class="credits">${ART.credits.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}
      <div><dt>Label</dt><dd>${ART.label}</dd></div></dl>

    <h4>Editions</h4>
    <div class="editions">${ART.editions
      .map(([name, hue], i) => `<button class="${i === 0 ? "on" : ""}" data-hue="${hue}"><img src="art.svg" alt="" style="filter:hue-rotate(${hue})" draggable="false"><span>${name}</span></button>`)
      .join("")}</div>
  `;
  $("sheetBody").addEventListener("click", (e) => {
    const b = e.target.closest("[data-hue]");
    if (!b) return;
    document.querySelectorAll(".editions button").forEach((x) => x.classList.toggle("on", x === b));
    const f = `hue-rotate(${b.dataset.hue})`;
    frontImg.style.filter = f;
    playerArt.querySelector("img").style.filter = f;
  });

  // drag sheet down to dismiss
  const grab = $("grab");
  let sd = null;
  grab.addEventListener("pointerdown", (e) => {
    sd = { y0: e.clientY, id: e.pointerId, dy: 0 };
    grab.setPointerCapture(e.pointerId);
    sheet.classList.add("dragging");
  });
  grab.addEventListener("pointermove", (e) => {
    if (!sd || e.pointerId !== sd.id) return;
    sd.dy = Math.max(0, e.clientY - sd.y0);
    sheet.style.setProperty("--sheet-drag", sd.dy + "px");
  });
  const endSheet = (e) => {
    if (!sd || e.pointerId !== sd.id) return;
    sheet.classList.remove("dragging");
    const tap = sd.dy < 4;
    const dismiss = sd.dy > 90 || tap;
    sd = null;
    if (dismiss) closeDetail();
    else sheet.style.removeProperty("--sheet-drag");
  };
  grab.addEventListener("pointerup", endSheet);
  grab.addEventListener("pointercancel", endSheet);

  /* ---------------- Keyboard ---------------- */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && viewer.classList.contains("open")) closeViewer();
    if ((e.key === "Enter" || e.key === " ") && viewer.classList.contains("open") && document.activeElement === document.body) {
      e.preventDefault();
      toggleDetail();
    }
  });

  setConcept(concept);
  render();
})();
