(() => {
  const $ = (id) => document.getElementById(id);
  const ART = window.ART;

  const playerArt = $("playerArt");
  const viewer = $("viewer");
  const stage = $("stage");
  const mover = $("mover");
  const card = $("card");
  const glare = $("glare");
  const hint = $("hint");

  const backdrop = document.createElement("div");
  backdrop.className = "backdrop";
  viewer.prepend(backdrop);

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  /* ---------------- Transform state ---------------- */
  const m = { x: 0, y: 0, s: 1 }; // mover: pan / zoom
  const t = { rx: 0, ry: 0 }; // card tilt

  function render() {
    mover.style.transform = `translate(${m.x}px, ${m.y}px) scale(${m.s})`;
    mover.style.setProperty("--s", m.s);
    card.style.transform = `rotateX(${t.rx}deg) rotateY(${t.ry}deg)`;
    glare.style.setProperty("--gx", `${50 + t.ry * 2}%`);
    glare.style.setProperty("--gy", `${30 - t.rx * 2}%`);
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
    render();
    viewer.classList.add("open", "dragging");
    viewer.setAttribute("aria-hidden", "false");
    const start = flipTransform();
    playerArt.classList.add("hidden");
    const anim = mover.animate(
      [{ transform: start }, { transform: "translate(0,0) scale(1)" }],
      { duration: 520, easing: "cubic-bezier(.2,.9,.25,1.05)" }
    );
    card.querySelector(".face").animate(
      [{ borderRadius: "6px" }, { borderRadius: "10px" }],
      { duration: 520 }
    );
    anim.onfinish = () => {
      viewer.classList.remove("dragging");
      animating = false;
    };
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

  /* ---------------- Explore detail ---------------- */
  const ZOOM = 1.4;
  const baseY = () => -Math.min(90, viewer.clientHeight * 0.1);
  let activeSpot = 0;

  function openDetail() {
    viewer.classList.add("detail");
    Object.assign(t, { rx: 0, ry: 0 });
    m.s = ZOOM;
    m.x = 0;
    m.y = baseY();
    focusSpot(0, false);
    render();
  }

  function closeDetail() {
    viewer.classList.remove("detail");
    Object.assign(m, { x: 0, y: 0, s: 1 });
    Object.assign(t, { rx: 0, ry: 0 });
    render();
  }

  const toggleDetail = () =>
    viewer.classList.contains("detail") ? closeDetail() : openDetail();

  /* ---------------- Pointer: tilt / pan / tap ---------------- */
  let drag = null;

  stage.addEventListener("pointerdown", (e) => {
    if (animating || e.button > 0) return;
    drag = {
      id: e.pointerId,
      x0: e.clientX, y0: e.clientY, t0: performance.now(),
      mx: m.x, my: m.y, onCard: card.contains(e.target), moved: false,
      pan: viewer.classList.contains("detail"),
    };
    try {
      stage.setPointerCapture(e.pointerId);
    } catch (_) {}
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

  /* ---------------- Hotspots + captions ---------------- */
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
    m.y = baseY() - ((h.y - 50) / 100) * W * 0.35;
    render();
  }

  /* ---------------- Keyboard ---------------- */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && viewer.classList.contains("open")) closeViewer();
    if ((e.key === "Enter" || e.key === " ") && viewer.classList.contains("open") && document.activeElement === document.body) {
      e.preventDefault();
      toggleDetail();
    }
  });

  render();
})();
