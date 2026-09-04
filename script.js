// script.js
const loginElem     = document.getElementById("login");
const appElem       = document.getElementById("app");
const loginForm     = document.getElementById("loginForm");
const passwordInput = document.getElementById("password");
const loginBtn      = document.getElementById("loginBtn");
const loginResult   = document.getElementById("loginResult");

const verdictElem   = document.getElementById("verdict");
const ringWrap      = document.querySelector(".verdict__ring");
const ringSvg       = document.getElementById("ring");
const ringNum       = document.getElementById("ringNum");
const wordElem      = document.getElementById("verdictWord");
const nameElem      = document.getElementById("verdictName");
const metaElem      = document.getElementById("verdictMeta");
const rawElem       = document.getElementById("verdictRaw");

const lastScanInput = document.getElementById("lastScan");
const usedInput     = document.getElementById("usedCount");

// Replace with your Apps Script Web App URL
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbw70TvgTi-F0z3WDr6SXaF-wxH9kQVEd1yLEobxCzqaeUq6ZwZEWga5j0zRTg2-ICnh/exec";

// === Password ===
// Kept in localStorage so a volunteer stays logged in until they press Lock.
// The Apps Script checks it on every request, so this is only a convenience.
const PASSWORD_KEY = "couponScannerPassword";
let password = localStorage.getItem(PASSWORD_KEY) || "";

function login(e) {
  if (e) e.preventDefault();
  const entered = passwordInput.value.trim();
  if (!entered) {
    setNotice("Enter the password to continue.");
    return;
  }

  loginBtn.disabled = true;
  setNotice("Checking…", true);

  fetch(WEB_APP_URL + "?login=1&pw=" + encodeURIComponent(entered))
    .then(r => r.text())
    .then(txt => {
      loginBtn.disabled = false;
      if (txt.trim().indexOf("✅") === 0) {
        password = entered;
        localStorage.setItem(PASSWORD_KEY, password);
        passwordInput.value = "";
        setNotice("");
        showScanner();
      } else {
        setNotice("That password didn't work. Check with the organisers.");
      }
    })
    .catch(err => {
      loginBtn.disabled = false;
      setNotice("Can't reach the server. Check the connection and try again.");
      console.error(err);
    });
}

function setNotice(msg, info) {
  loginResult.textContent = msg;
  loginResult.classList.toggle("is-info", !!info);
}

function logout() {
  localStorage.removeItem(PASSWORD_KEY);
  password = "";
  location.reload();
}

// === Talking to the sheet ===

function request(query, pendingWord) {
  paint({ state: "busy", word: pendingWord });

  fetch(WEB_APP_URL + query + "&pw=" + encodeURIComponent(password))
    .then(r => r.text())
    .then(txt => paint(parseReply(txt)))
    .catch(err => {
      paint({ state: "invalid", word: "No connection", raw: "The scan didn't reach the sheet. Try again." });
      console.error(err);
    });
}

function checkCoupon(id) {
  request("?id=" + encodeURIComponent(id), "Checking…");
}

function updateUsage() {
  const id = lastScanInput.value.trim();
  const used = usedInput.value.trim();
  if (!id) {
    paint({ state: "warn", word: "Nothing to adjust", raw: "Scan a coupon first." });
    return;
  }
  if (used === "") {
    paint({ state: "warn", word: "Enter a count", raw: "Type how many uses have been taken." });
    return;
  }
  request("?id=" + encodeURIComponent(id) + "&update=true&used=" + encodeURIComponent(used), "Updating…");
}

// === Reading the sheet's replies ===
// The Apps Script answers in plain sentences. Pull the pieces we can
// recognise and fall back to showing its own words when we can't.

function parseReply(text) {
  const t = (text || "").trim();

  if (t.indexOf("🔒") === 0) return { state: "locked" };

  const counts = t.match(/Remaining:\s*(\d+)\s*\/\s*(\d+)/i);
  const name   = t.match(/([^\n✅❌⚠️|]+?)'s Coupons?/);
  const slot   = t.match(/Time Slot:\s*([^\n]+)/i);

  const out = {
    name: name ? name[1].replace(/^\s*Updated\s+/i, "").trim() : "",
    slot: slot ? slot[1].trim() : "",
    remaining: counts ? parseInt(counts[1], 10) : null,
    total:     counts ? parseInt(counts[2], 10) : null
  };

  if (t.indexOf("✅") === 0) {
    out.state = "ok";
    out.word = /Updated/i.test(t) ? "Updated" : "Verified";
    if (out.remaining === 0) out.word = "Verified";
  } else if (/used up/i.test(t)) {
    out.state = "spent";
    out.word = "Already used";
    out.raw = "Every use on this coupon has been taken.";
  } else if (t.indexOf("❌") === 0) {
    out.state = "invalid";
    out.word = "Not valid";
    out.raw = /not found/i.test(t) ? "No coupon in the sheet matches this code." : "This code isn't a coupon.";
  } else if (t.indexOf("⚠") === 0) {
    out.state = "warn";
    out.word = "Check that again";
    out.raw = t.replace(/^⚠️?\s*/, "");
  } else {
    out.state = "warn";
    out.word = "Unexpected reply";
    out.raw = t;
  }

  return out;
}

// === Painting the verdict ===

function paint(v) {
  if (v.state === "locked") {
    localStorage.removeItem(PASSWORD_KEY);
    password = "";
    appElem.hidden = true;
    loginElem.hidden = false;
    setNotice("The password changed. Enter the new one to carry on.");
    return;
  }

  verdictElem.className = "verdict is-" + v.state;
  wordElem.textContent  = v.word || "";
  nameElem.textContent  = v.name || "";
  rawElem.textContent   = v.raw || "";

  drawRing(v.remaining, v.total, v.state);

  metaElem.replaceChildren();
  if (v.state !== "busy") {
    if (v.remaining !== null && v.total !== null) addMeta("Uses left", v.remaining + " of " + v.total);
    if (v.slot) addMeta("Time slot", v.slot);
    const id = lastScanInput.value.trim();
    if (id && v.state !== "warn") addMeta("Coupon", id, true);
  }

  // Restart the entrance animation
  verdictElem.classList.remove("is-fresh");
  void verdictElem.offsetWidth;
  verdictElem.classList.add("is-fresh");
}

function addMeta(label, value, mono) {
  const wrap = document.createElement("div");
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = label;
  dd.textContent = value;
  if (mono) dd.className = "is-id";
  wrap.append(dt, dd);
  metaElem.append(wrap);
}

// === The ring: one segment per remaining use ===
// Borrows the concentric form of a pookalam so the count reads from
// arm's length without anyone having to focus on a number.

function polar(cx, cy, r, deg) {
  const rad = (deg - 90) * Math.PI / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function arc(cx, cy, r, from, to) {
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  return "M " + x1.toFixed(2) + " " + y1.toFixed(2) +
         " A " + r + " " + r + " 0 " + (to - from > 180 ? 1 : 0) + " 1 " +
         x2.toFixed(2) + " " + y2.toFixed(2);
}

function drawRing(remaining, total, state) {
  ringSvg.replaceChildren();

  if (remaining === null || total === null || total <= 0 || state === "busy") {
    ringWrap.hidden = true;
    ringNum.textContent = "";
    return;
  }

  ringWrap.hidden = false;
  ringNum.textContent = remaining;

  const cx = 60, cy = 60, r = 48;

  // Past a dozen uses the segments turn to slivers, so switch to one
  // proportional arc instead.
  if (total > 12) {
    add(arc(cx, cy, r, 0, 359.9), "seg seg--off");
    if (remaining > 0) add(arc(cx, cy, r, 0, Math.max(1, (remaining / total) * 359.9)), "seg seg--on");
    return;
  }

  const gap = total === 1 ? 0 : Math.min(10, 90 / total);
  const step = 360 / total;

  for (let i = 0; i < total; i++) {
    const from = i * step + gap / 2;
    const to   = (i + 1) * step - gap / 2;
    add(arc(cx, cy, r, from, to === from ? to + 359.9 : to),
        "seg " + (i < remaining ? "seg--on" : "seg--off"));
  }

  function add(d, cls) {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", d);
    p.setAttribute("class", cls);
    ringSvg.append(p);
  }
}

// === Pookalam on the lock screen ===
// Concentric petal rings, the flower carpet laid at an Onam threshold.

function drawPookalam() {
  const svg = document.getElementById("pookalam");
  if (!svg) return;

  const rings = [
    { r: 98, n: 24, rx: 5, ry: 14, fill: "#F5A524" },
    { r: 76, n: 18, rx: 6, ry: 13, fill: "#D9B44A" },
    { r: 56, n: 14, rx: 6, ry: 12, fill: "#F3EEDF" },
    { r: 36, n: 10, rx: 7, ry: 11, fill: "#A98BE0" }
  ];

  rings.forEach((ring, i) => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.style.animationDelay = (i * 0.09) + "s";
    for (let k = 0; k < ring.n; k++) {
      const e = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
      e.setAttribute("cx", 120);
      e.setAttribute("cy", 120 - ring.r);
      e.setAttribute("rx", ring.rx);
      e.setAttribute("ry", ring.ry);
      e.setAttribute("fill", ring.fill);
      e.setAttribute("transform", "rotate(" + (k * 360 / ring.n) + " 120 120)");
      g.append(e);
    }
    svg.append(g);
  });

  const core = document.createElementNS("http://www.w3.org/2000/svg", "g");
  core.style.animationDelay = "0.36s";
  const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("cx", 120); c.setAttribute("cy", 120); c.setAttribute("r", 15);
  c.setAttribute("fill", "#E75A47");
  core.append(c);
  svg.append(core);
}

// === Scanner ===
let scanningLocked = false;
let scanner = null;

function onScanSuccess(decodedText) {
  if (scanningLocked) return;

  scanningLocked = true;
  lastScanInput.value = decodedText;
  checkCoupon(decodedText);
  setTimeout(() => scanningLocked = false, 2000);
}

function onScanFailure(error) {
  // ignore continuous scan failures
}

function showScanner() {
  loginElem.hidden = true;
  appElem.hidden = false;

  if (scanner) return;

  const config = { fps: 10, qrbox: 250, rememberLastUsedCamera: true, showTorchButtonIfSupported: true };
  // Skip the file-upload tab when the library exposes its scan-type enum
  if (typeof Html5QrcodeScanType !== "undefined") {
    config.supportedScanTypes = [Html5QrcodeScanType.SCAN_TYPE_CAMERA];
  }

  scanner = new Html5QrcodeScanner("reader", config);
  scanner.render(onScanSuccess, onScanFailure);
}

// === Wiring ===
loginForm.addEventListener("submit", login);
document.getElementById("lockBtn").addEventListener("click", logout);
document.getElementById("updateBtn").addEventListener("click", updateUsage);

drawPookalam();
if (password) showScanner();
