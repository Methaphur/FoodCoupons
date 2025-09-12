const resultElem = document.getElementById("result");
const lastScanInput = document.getElementById("lastScan");
const usedInput = document.getElementById("usedCount");

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx3j20MU__Ff98j8B79jRmS03H-KqXU0PZ5c6fIJXBZuxN2IoZf0VVDa7vxHoH5YlM_/exec";

// === Normal scan check ===
function checkCoupon(id) {
  fetch(WEB_APP_URL + "?id=" + encodeURIComponent(id))
    .then(r => r.text())
    .then(txt => {
      resultElem.innerText = txt;
    })
    .catch(err => {
      resultElem.innerText = "⚠️ Error contacting server";
      console.error(err);
    });
}

// === Manual update usage ===
function updateUsage() {
  let id = lastScanInput.value.trim();
  let used = usedInput.value.trim();
  if (!id) {
    resultElem.innerText = "⚠️ No QR scanned yet!";
    return;
  }
  if (!used) {
    resultElem.innerText = "⚠️ Enter how many used";
    return;
  }

  fetch(WEB_APP_URL + "?id=" + encodeURIComponent(id) + "&update=true&used=" + encodeURIComponent(used))
    .then(r => r.text())
    .then(txt => {
      resultElem.innerText = txt;
    })
    .catch(err => {
      resultElem.innerText = "⚠️ Error contacting server";
      console.error(err);
    });
}

// === Scanner ===

let scanningLocked = false;

function onScanSuccess(decodedText) {
    if (scanningLocked) return; // skip if still in cooldown

  scanningLocked = true;
  lastScanInput.value = decodedText;
  resultElem.innerText = "Scanned: " + decodedText + " (checking...)";

  checkCoupon(decodedText);
  // allow next scan (even same QR) after 2s
  setTimeout(() => scanningLocked = false, 2000);
}

function onScanFailure(error) {
  // ignore continuous scan failures
}

let scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
scanner.render(onScanSuccess, onScanFailure);
