(function () {
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function createTypewriter(options) {
    var el = options.el;
    var texts = options.texts || [];
    var typingMin = options.typingMin || 55;
    var typingMax = options.typingMax || 95;
    var deletingMin = options.deletingMin || 35;
    var deletingMax = options.deletingMax || 60;
    var holdAfterType = options.holdAfterType || 1400;
    var holdAfterDelete = options.holdAfterDelete || 260;
    var loop = options.loop !== false;
    var onComplete = options.onComplete || function () {};

    if (!el || !texts.length) return null;

    var state = {
      textIndex: 0,
      charIndex: 0,
      mode: 'typing', // typing | holdTyped | deleting | holdDeleted
      rafId: 0,
      lastTime: 0,
      delay: typingMin,
      running: true
    };

    function randomBetween(min, max) {
      return min + Math.random() * (max - min);
    }

    function setNextDelay() {
      var current = texts[state.textIndex] || '';
      var nearEnd = state.charIndex >= current.length - 2;

      if (state.mode === 'typing') {
        state.delay = randomBetween(
          nearEnd ? typingMin + 10 : typingMin,
          nearEnd ? typingMax + 25 : typingMax
        );
      } else if (state.mode === 'deleting') {
        state.delay = randomBetween(deletingMin, deletingMax);
      } else if (state.mode === 'holdTyped') {
        state.delay = holdAfterType;
      } else {
        state.delay = holdAfterDelete;
      }
    }

    function render() {
      var current = texts[state.textIndex] || '';
      el.textContent = current.slice(0, state.charIndex);
    }

    function step(timestamp) {
      if (!state.running) return;
      if (!state.lastTime) {
        state.lastTime = timestamp;
        setNextDelay();
      }

      if (timestamp - state.lastTime < state.delay) {
        state.rafId = window.requestAnimationFrame(step);
        return;
      }

      state.lastTime = timestamp;
      var current = texts[state.textIndex] || '';

      if (state.mode === 'typing') {
        state.charIndex += 1;
        render();

        if (state.charIndex >= current.length) {
          state.mode = 'holdTyped';
        }
        setNextDelay();
      } else if (state.mode === 'holdTyped') {
        state.mode = 'deleting';
        setNextDelay();
      } else if (state.mode === 'deleting') {
        state.charIndex -= 1;
        render();

        if (state.charIndex <= 0) {
          state.charIndex = 0;
          if (!loop && state.textIndex >= texts.length - 1) {
            state.running = false;
            onComplete();
            return;
          }
          state.mode = 'holdDeleted';
        }
        setNextDelay();
      } else if (state.mode === 'holdDeleted') {
        state.textIndex = (state.textIndex + 1) % texts.length;
        state.mode = 'typing';
        setNextDelay();
      }

      state.rafId = window.requestAnimationFrame(step);
    }

    render();
    state.rafId = window.requestAnimationFrame(step);

    return {
      stop: function () {
        state.running = false;
        if (state.rafId) window.cancelAnimationFrame(state.rafId);
      }
    };
  }

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

    createTypewriter({
      el: target,
      texts: texts,
      typingMin: 58,
      typingMax: 92,
      deletingMin: 34,
      deletingMax: 52,
      holdAfterType: 1500,
      holdAfterDelete: 220,
      loop: true
    });
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
      el._statMain.textContent = formatNumber(target, decimals);
    }

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function animateValue(el) {
      if (el.dataset.animated === 'true') return;
      el.dataset.animated = 'true';

      var target = parseFloat(el.dataset.value || '0');
      if (!isFinite(target)) return;

      var decimals = getDecimals(el, target);
      var duration = parseInt(el.dataset.duration, 10);
      if (!duration || duration < 1000 || duration > 2200) {
        duration = 1300 + Math.round(Math.random() * 500);
      }

      var startTime = null;
      var lastRendered = '';

      function step(timestamp) {
        if (startTime === null) startTime = timestamp;

        var progress = clamp((timestamp - startTime) / duration, 0, 1);
        var eased = easeOutCubic(progress);
        var current = target * eased;
        var output = formatNumber(current, decimals);

        if (output !== lastRendered) {
          el._statMain.textContent = output;
          lastRendered = output;
        }

        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          setFinalValue(el, target, decimals);
        }
      }

      window.requestAnimationFrame(step);
    }

    statElements.forEach(function (el) {
      el._statMain = el.querySelector('.stat-main') || el;
    });

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
    }, {
      threshold: 0.35,
      rootMargin: '0px 0px -8% 0px'
    });

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
    var rafId = 0;

    function updateTooltip(chip) {
      var name = chip.getAttribute('data-name') || chip.textContent.trim();
      var desc = chip.getAttribute('data-desc') || '';
      var level = chip.getAttribute('data-level') || '了解';

      tooltip.querySelector('.tech-tooltip-title').textContent = name;
      tooltip.querySelector('.tech-tooltip-desc').textContent = desc;

      var levelEl = tooltip.querySelector('.tech-tooltip-level');
      levelEl.textContent = level;
      levelEl.classList.remove('is-familiar', 'is-aware');
      levelEl.classList.add(level === '熟悉' ? 'is-familiar' : 'is-aware');
    }

    function positionTooltip(chip) {
      if (!chip) return;

      var rect = chip.getBoundingClientRect();
      var tooltipRect = tooltip.getBoundingClientRect();

      var top = rect.top - tooltipRect.height - 12;
      var left = rect.left + rect.width / 2 - tooltipRect.width / 2;

      if (top < 10) {
        top = rect.bottom + 12;
      }

      var maxLeft = window.innerWidth - tooltipRect.width - 12;
      left = clamp(left, 12, maxLeft);

      tooltip.style.transform =
        'translate3d(' + Math.round(left) + 'px,' + Math.round(top) + 'px,0)';
    }

    function requestPositionUpdate() {
      if (!activeChip) return;
      if (rafId) return;

      rafId = window.requestAnimationFrame(function () {
        rafId = 0;
        positionTooltip(activeChip);
      });
    }

    function showTooltip(chip) {
      activeChip = chip;
      updateTooltip(chip);

      tooltip.classList.add('is-visible');
      tooltip.setAttribute('aria-hidden', 'false');
      chip.setAttribute('aria-expanded', 'true');

      requestPositionUpdate();
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
        if (!isTouch) return;

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

    window.addEventListener('scroll', requestPositionUpdate, { passive: true });
    window.addEventListener('resize', requestPositionUpdate);
  }

  function initEntryIntro() {
    var intro = document.getElementById('entry-intro');
    var textEl = document.getElementById('entry-intro-text');
    var historyEl = document.getElementById('entry-intro-history');
    var skipBtn = document.getElementById('entry-intro-skip');

    if (!intro || !textEl || !historyEl || !document.body.classList.contains('entry-page')) return;

    var lines = [
      '你好',
      '欢迎来到梁辰的简历',
      '请点击您想了解的职业方向'
    ];

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var cancelled = false;
    var typewriter = null;

    function finishIntro() {
      if (cancelled) return;
      cancelled = true;

      if (typewriter) typewriter.stop();

      intro.classList.add('is-hidden');
      window.setTimeout(function () {
        intro.setAttribute('aria-hidden', 'true');
      }, 320);
    }

    function pushHistoryLine(text) {
      var lineEl = document.createElement('p');
      lineEl.className = 'entry-intro-line';
      lineEl.textContent = text;
      historyEl.appendChild(lineEl);

      window.requestAnimationFrame(function () {
        lineEl.classList.add('is-stacked');
      });
    }

    function runLine(index) {
      if (cancelled || index >= lines.length) return;

      textEl.textContent = '';

      typewriter = createTypewriter({
        el: textEl,
        texts: [lines[index]],
        typingMin: 75,
        typingMax: 115,
        deletingMin: 40,
        deletingMax: 60,
        holdAfterType: 320,
        holdAfterDelete: 0,
        loop: false,
        onComplete: function () {
          if (cancelled) return;

          pushHistoryLine(lines[index]);
          textEl.textContent = '';

          if (index >= lines.length - 1) {
            window.setTimeout(finishIntro, 950);
          } else {
            window.setTimeout(function () {
              runLine(index + 1);
            }, 260);
          }
        }
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', finishIntro);
    }

    if (reduceMotion) {
      lines.forEach(function (line) {
        pushHistoryLine(line);
      });
      textEl.textContent = '';
      window.setTimeout(finishIntro, 700);
      return;
    }

    runLine(0);
  }

  function initPageEffects() {
    initEntryIntro();
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