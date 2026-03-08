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

  function initStatCounters() {
    var statElements = Array.prototype.slice.call(document.querySelectorAll('.stat-value'));
    if (!statElements.length) return;

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function getDecimals(el, target) {
      if (el.dataset.decimals) {
        return parseInt(el.dataset.decimals, 10) || 0;
      }

      var text = String(target);
      var parts = text.split('.');
      return parts.length > 1 ? parts[1].length : 0;
    }

    function formatNumber(value, decimals) {
      return value.toFixed(decimals);
    }

    function setFinalValue(el, target, decimals) {
      var main = el.querySelector('.stat-main') || el;
      main.textContent = formatNumber(target, decimals);
    }

    function animateValue(el) {
      if (el.dataset.animated === 'true') return;
      el.dataset.animated = 'true';

      var target = parseFloat(el.dataset.value || '0');
      if (!isFinite(target)) return;

      var decimals = getDecimals(el, target);
      var duration = parseInt(el.dataset.duration, 10);
      if (!duration || duration < 1000 || duration > 2000) {
        duration = 1200 + Math.round(Math.random() * 600);
      }

      var startTime = null;

      function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
      }

      function step(timestamp) {
        if (startTime === null) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        var eased = easeOutCubic(progress);
        var current = target * eased;
        var main = el.querySelector('.stat-main') || el;
        main.textContent = formatNumber(current, decimals);

        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      }

      window.requestAnimationFrame(step);
    }

    if (prefersReducedMotion) {
      statElements.forEach(function (el) {
        var target = parseFloat(el.dataset.value || '0');
        if (!isFinite(target)) return;
        setFinalValue(el, target, getDecimals(el, target));
      });
      return;
    }

    if (!('IntersectionObserver' in window)) {
      statElements.forEach(function (el) { animateValue(el); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateValue(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.45 });

    statElements.forEach(function (el) { observer.observe(el); });
  }

  function initTechTooltips() {
    var chips = Array.prototype.slice.call(document.querySelectorAll('.tech-chip'));
    if (!chips.length) return;

    var tooltip = document.createElement('div');
    tooltip.className = 'tech-tooltip';
    tooltip.setAttribute('role', 'dialog');
    tooltip.setAttribute('aria-hidden', 'true');
    tooltip.innerHTML =
      '<div class="tech-tooltip-title"></div>' +
      '<div class="tech-tooltip-desc"></div>' +
      '<div class="tech-tooltip-level"></div>';
    document.body.appendChild(tooltip);

    var activeChip = null;
    var isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    function updateTooltip(chip) {
      var name = chip.getAttribute('data-name') || chip.textContent.trim();
      var desc = chip.getAttribute('data-desc') || '';
      var level = chip.getAttribute('data-level') || '了解';

      tooltip.querySelector('.tech-tooltip-title').textContent = name;
      tooltip.querySelector('.tech-tooltip-desc').textContent = desc;
      var levelEl = tooltip.querySelector('.tech-tooltip-level');
      levelEl.textContent = level;
      levelEl.classList.remove('is-familiar', 'is-aware');
      if (level === '熟悉') {
        levelEl.classList.add('is-familiar');
      } else {
        levelEl.classList.add('is-aware');
      }
    }

    function positionTooltip(chip) {
      var rect = chip.getBoundingClientRect();
      var scrollY = window.pageYOffset || document.documentElement.scrollTop;
      var scrollX = window.pageXOffset || document.documentElement.scrollLeft;

      tooltip.style.left = '0px';
      tooltip.style.top = '0px';
      tooltip.classList.add('is-visible');
      tooltip.setAttribute('aria-hidden', 'false');

      var tooltipRect = tooltip.getBoundingClientRect();
      var top = rect.top + scrollY - tooltipRect.height - 12;
      var left = rect.left + scrollX + rect.width / 2 - tooltipRect.width / 2;

      if (top < scrollY + 10) {
        top = rect.bottom + scrollY + 12;
      }

      var maxLeft = scrollX + document.documentElement.clientWidth - tooltipRect.width - 12;
      if (left < scrollX + 12) left = scrollX + 12;
      if (left > maxLeft) left = maxLeft;

      tooltip.style.top = Math.round(top) + 'px';
      tooltip.style.left = Math.round(left) + 'px';
    }

    function showTooltip(chip) {
      activeChip = chip;
      updateTooltip(chip);
      positionTooltip(chip);
      chip.setAttribute('aria-expanded', 'true');
    }

    function hideTooltip() {
      tooltip.classList.remove('is-visible');
      tooltip.setAttribute('aria-hidden', 'true');
      if (activeChip) {
        activeChip.setAttribute('aria-expanded', 'false');
      }
      activeChip = null;
    }

    chips.forEach(function (chip) {
      chip.setAttribute('aria-haspopup', 'dialog');
      chip.setAttribute('aria-expanded', 'false');

      chip.addEventListener('mouseenter', function () {
        showTooltip(chip);
      });

      chip.addEventListener('mouseleave', function () {
        hideTooltip();
      });

      chip.addEventListener('focus', function () {
        showTooltip(chip);
      });

      chip.addEventListener('blur', function () {
        hideTooltip();
      });

      chip.addEventListener('click', function (event) {
        // 非触屏设备：点击不触发 tooltip，只通过 hover / focus 显示
        if (!isTouch) return;

        // 触屏设备：点击作为开关
        event.preventDefault();
        event.stopPropagation();
        if (activeChip === chip) {
          hideTooltip();
        } else {
          showTooltip(chip);
        }
      });
    });

    document.addEventListener('click', function (event) {
      if (!activeChip) return;
      if (event.target.closest('.tech-chip')) return;
      hideTooltip();
    });

    window.addEventListener('scroll', function () {
      if (activeChip) {
        positionTooltip(activeChip);
      }
    }, { passive: true });

    window.addEventListener('resize', function () {
      if (activeChip) {
        positionTooltip(activeChip);
      }
    });
  }

  function initPageEffects() {
    initMottoTypewriter();
    initStatCounters();
    initTechTooltips();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPageEffects);
  } else {
    initPageEffects();
  }
})();





