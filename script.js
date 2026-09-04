// script.js
const resultElem = document.getElementById("result");
const lastScanInput = document.getElementById("lastScan");
const usedInput = document.getElementById("usedCount");

const loginElem = document.getElementById("login");
const appElem = document.getElementById("app");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginResult = document.getElementById("loginResult");

// Replace with your Apps Script Web App URL
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxm5TH9vgb7q1nms2Z-sMdymxp5FAdw96ya1hJFw6Z2LFYM5ycxjylBsKMdy0QIqB3f/exec";

// === Password ===
// Kept in localStorage so a volunteer stays logged in until they press Lock.
// The Apps Script checks it on every request, so this is only a convenience.
const PASSWORD_KEY = "couponScannerPassword";
let password = localStorage.getItem(PASSWORD_KEY) || "";

function login() {
  const entered = passwordInput.value.trim();
  if (!entered) {
    loginResult.innerText = "Enter the password.";
    return;
  }

  loginBtn.disabled = true;
  loginResult.innerText = "Checking...";

  fetch(WEB_APP_URL + "?login=1&pw=" + encodeURIComponent(entered))
    .then(r => r.text())
    .then(txt => {
      loginBtn.disabled = false;
      if (txt.indexOf("✅") === 0) {
        password = entered;
        localStorage.setItem(PASSWORD_KEY, password);
        passwordInput.value = "";
        loginResult.innerText = "";
        showScanner();
      } else {
        loginResult.innerText = txt;
      }
    })
    .catch(err => {
      loginBtn.disabled = false;
      loginResult.innerText = "Error contacting server";
      console.error(err);
    });
}

function logout() {
  localStorage.removeItem(PASSWORD_KEY);
  password = "";
  location.reload();
}

// === Normal scan check ===
function checkCoupon(id) {
  fetch(WEB_APP_URL + "?id=" + encodeURIComponent(id) + "&pw=" + encodeURIComponent(password))
    .then(r => r.text())
    .then(txt => {
      resultElem.innerText = txt;
    })
    .catch(err => {
      resultElem.innerText = "Error contacting server";
      console.error(err);
    });
}

// === Manual update usage ===
function updateUsage() {
  let id = lastScanInput.value.trim();
  let used = usedInput.value.trim();
  if (!id) {
    resultElem.innerText = "No QR scanned yet.";
    return;
  }
  if (!used) {
    resultElem.innerText = "Enter a usage count.";
    return;
  }

  fetch(WEB_APP_URL + "?id=" + encodeURIComponent(id) + "&update=true&used=" + encodeURIComponent(used) + "&pw=" + encodeURIComponent(password))
    .then(r => r.text())
    .then(txt => {
      resultElem.innerText = txt;
    })
    .catch(err => {
      resultElem.innerText = "Error contacting server";
      console.error(err);
    });
}

// === Scanner ===
let scanningLocked = false;
let scanner = null;

function onScanSuccess(decodedText) {
  if (scanningLocked) return;

  scanningLocked = true;
  lastScanInput.value = decodedText;
  resultElem.innerText = "Scanned: " + decodedText + " (checking...)";

  checkCoupon(decodedText);
  setTimeout(() => scanningLocked = false, 2000);
}

function onScanFailure(error) {
  // ignore continuous scan failures
}

function showScanner() {
  loginElem.hidden = true;
  appElem.hidden = false;

  if (!scanner) {
    scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
    scanner.render(onScanSuccess, onScanFailure);
  }
}

passwordInput.addEventListener("keydown", e => {
  if (e.key === "Enter") login();
});

if (password) showScanner();
