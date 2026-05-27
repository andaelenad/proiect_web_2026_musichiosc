"use strict";

window.addEventListener("load", function () {
  if (localStorage.getItem("cookies_acceptate")) {
    return;
  }

  var banner = document.getElementById("banner");
  banner.style.display = "block";

  document.getElementById("ok_cookies").onclick = function () {
    localStorage.setItem("cookies_acceptate", "true");
    banner.style.animation = "disparitieBanner 1s forwards";
    setTimeout(function () {
      banner.remove();
    }, 1000);
  };
});