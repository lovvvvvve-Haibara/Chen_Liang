(function () {
  function initMottoTypewriter() {
    var target = document.querySelector('.motto-typewriter');
    if (!target) return;

    var texts = (target.getAttribute('data-texts') || '')
      .split('|')
      .map(function (item) { return item.trim(); })
      .filter(Boolean);

    if (!texts.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      target.textContent = texts[0];
      return;
    }

    var textIndex = 0;
    var charIndex = 0;
    var typing = true;

    function loop() {
      var current = texts[textIndex];

      if (typing) {
        charIndex += 1;
        target.textContent = current.slice(0, charIndex);

        if (charIndex >= current.length) {
          typing = false;
          setTimeout(loop, 1400);
          return;
        }

        setTimeout(loop, 80);
        return;
      }

      charIndex -= 1;
      target.textContent = current.slice(0, Math.max(0, charIndex));

      if (charIndex <= 0) {
        typing = true;
        textIndex = (textIndex + 1) % texts.length;
      }

      setTimeout(loop, 48);
    }

    loop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMottoTypewriter);
  } else {
    initMottoTypewriter();
  }
})();
