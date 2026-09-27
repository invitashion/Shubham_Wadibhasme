/* === आशीर्वाद भिंत + आमची प्रेमकहाणी (Blessings Wall + Couple Story page) ===
   Self-contained. Does not touch js/a.js.
   Blessings are stored in the SAME Firebase project already used for
   visit-tracking, in a new "blessings" collection.
   If Firestore rules don't allow it yet, it quietly falls back to
   saving on the guest's own device (localStorage) so nothing ever breaks. */
(function () {
  "use strict";

  var PROJECT_ID = "shubham-5098b";
  var API_KEY = "AIzaSyCHFraG_ZvNs2fflTF9NLwTRLXQ6IVYrfs";
  var BASE = "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID + "/databases/(default)/documents/blessings";
  var LKEY = "bw_local_v1";

  function $(sel) { return document.querySelector(sel); }

  var fab = $("#bwFab"), badge = $("#bwBadge"), overlay = $("#bwOverlay"), closeBtn = $("#bwClose");
  var nameEl = $("#bwName"), msgEl = $("#bwMsg"), sendBtn = $("#bwSend"), statusEl = $("#bwStatus");
  var wallEl = $("#bwWall"), totalEl = $("#bwTotal");

  if (!fab || !overlay || !wallEl) return;

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function getLocal() {
    try { return JSON.parse(localStorage.getItem(LKEY) || "[]"); } catch (e) { return []; }
  }
  function saveLocal(list) {
    try { localStorage.setItem(LKEY, JSON.stringify(list.slice(-200))); } catch (e) {}
  }
  function addLocal(item) {
    var l = getLocal();
    l.push(item);
    saveLocal(l);
    return l;
  }

  function renderList(list) {
    list = (list || []).slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    if (!list.length) {
      wallEl.innerHTML = '<p class="bw-empty" id="bwEmpty">सर्वप्रथम आशीर्वाद देणारे आपणच व्हा! 🌸</p>';
    } else {
      wallEl.innerHTML = list.map(function (it) {
        return '<div class="bw-card"><b>' + esc(it.name || "शुभचिंतक") + "</b><p>" + esc(it.msg || "") + "</p></div>";
      }).join("");
    }
    if (totalEl) totalEl.textContent = list.length;
    if (badge) {
      badge.textContent = list.length;
      badge.hidden = list.length === 0;
    }
  }

  function fsDocToItem(doc) {
    var f = doc.fields || {};
    return {
      name: (f.name && f.name.stringValue) || "",
      msg: (f.msg && f.msg.stringValue) || "",
      ts: (f.ts && parseInt(f.ts.integerValue || "0", 10)) || 0
    };
  }

  function loadWall() {
    var local = getLocal();
    renderList(local);
    fetch(BASE + "?key=" + API_KEY + "&pageSize=100")
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (data) {
        var docs = (data && data.documents) || [];
        var remote = docs.map(fsDocToItem);
        renderList(remote.length ? remote : local);
      })
      .catch(function () { /* offline / rules not set yet -> keep local list */ });
  }

  function openWall() {
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    loadWall();
    setTimeout(function () { nameEl && nameEl.focus(); }, 150);
  }
  function closeWall() {
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
  }

  fab.addEventListener("click", openWall);
  if (closeBtn) closeBtn.addEventListener("click", closeWall);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeWall(); });

  if (sendBtn) {
    sendBtn.addEventListener("click", function () {
      var name = (nameEl.value || "").trim();
      var msg = (msgEl.value || "").trim();
      if (!name || !msg) {
        statusEl.textContent = "कृपया नाव आणि शुभेच्छा दोन्ही लिहा 🙏";
        statusEl.className = "bw-status err";
        return;
      }
      sendBtn.disabled = true;
      statusEl.textContent = "पाठवत आहे…";
      statusEl.className = "bw-status";
      var ts = Date.now();
      name = name.slice(0, 60);
      msg = msg.slice(0, 240);
      var item = { name: name, msg: msg, ts: ts };

      fetch(BASE + "?key=" + API_KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            name: { stringValue: name },
            msg: { stringValue: msg },
            ts: { integerValue: String(ts) }
          }
        })
      })
        .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
        .then(function () {
          statusEl.textContent = "🙏 धन्यवाद! आपला आशीर्वाद जतन झाला.";
          statusEl.className = "bw-status";
          nameEl.value = "";
          msgEl.value = "";
          loadWall();
        })
        .catch(function () {
          addLocal(item);
          statusEl.textContent = "🙏 धन्यवाद! आपला आशीर्वाद जतन झाला.";
          statusEl.className = "bw-status";
          nameEl.value = "";
          msgEl.value = "";
          renderList(getLocal());
        })
        .finally(function () { sendBtn.disabled = false; });
    });
  }

  /* --- आमची प्रेमकहाणी: replay the groom/bride "meet in the middle" animation
     every time this page becomes the active page. The site's pager keeps every
     page in the DOM (for the page-curl effect) and often pre-renders the next
     page as "under" before it's ever seen, so a plain CSS auto-play animation
     only ever fires once, off-screen. This restarts it on every visit. --- */
  var momentPage = document.querySelector('section[aria-label="आमची प्रेमकहाणी"]');
  var mhL = document.querySelector("#momentSplit .mh-l");
  var mhR = document.querySelector("#momentSplit .mh-r");
  var mHeart = document.querySelector("#momentSplit .momentheart");
  var mNames = document.querySelector(".momentnames");

  function replayMoment() {
    [mhL, mhR, mHeart, mNames].forEach(function (el) {
      if (!el) return;
      el.style.animation = "none";
      void el.offsetWidth; /* force reflow so the browser "forgets" the old run */
      el.style.animation = "";
    });
  }

  if (momentPage && mhL && mhR) {
    if (momentPage.classList.contains("active")) replayMoment();
    var momentObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.attributeName === "class" && momentPage.classList.contains("active")) {
          replayMoment();
        }
      });
    });
    momentObserver.observe(momentPage, { attributes: true, attributeFilter: ["class"] });
  }

  /* --- व्हिडिओ (graceful placeholder until assets/couple.mp4 exists) --- */
  var vid = document.getElementById("coupleVid");
  var vidFallback = document.getElementById("videoFallback");
  if (vid && vidFallback) {
    vid.addEventListener("error", function () {
      vid.style.display = "none";
      vidFallback.hidden = false;
    }, true);
  }
})();
