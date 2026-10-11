/**
 * Universal Apple TV Loading Screen & Activity Indicator (1:1 Replica)
 * - 12-blade radial activity spinner with stepped rotation
 * - Contextual backgrounds: Dark Grey (#2C2C2E) or Pure OLED Black (#000000)
 * - Hardware accelerated for LG webOS 4.0 (Chromium 53)
 */

var AppLoader = (function () {
  'use strict';

  var loaderEl = null;
  var captionEl = null;
  var spinnerContainer = null;

  function getSpinnerSvg(size) {
    var s = size || 64;
    return (
      '<svg class="apple-spinner" viewBox="0 0 64 64" width="' + s + '" height="' + s + '" aria-hidden="true">' +
        '<g class="apple-spinner-blades">' +
          '<rect x="29.5" y="4" width="5" height="15" rx="2.5" fill="#ffffff" opacity="1.00" transform="rotate(0 32 32)"/>' +
          '<rect x="29.5" y="4" width="5" height="15" rx="2.5" fill="#ffffff" opacity="0.91" transform="rotate(30 32 32)"/>' +
          '<rect x="29.5" y="4" width="5" height="15" rx="2.5" fill="#ffffff" opacity="0.82" transform="rotate(60 32 32)"/>' +
          '<rect x="29.5" y="4" width="5" height="15" rx="2.5" fill="#ffffff" opacity="0.73" transform="rotate(90 32 32)"/>' +
          '<rect x="29.5" y="4" width="5" height="15" rx="2.5" fill="#ffffff" opacity="0.64" transform="rotate(120 32 32)"/>' +
          '<rect x="29.5" y="4" width="5" height="15" rx="2.5" fill="#ffffff" opacity="0.55" transform="rotate(150 32 32)"/>' +
          '<rect x="29.5" y="4" width="5" height="15" rx="2.5" fill="#ffffff" opacity="0.46" transform="rotate(180 32 32)"/>' +
          '<rect x="29.5" y="4" width="5" height="15" rx="2.5" fill="#ffffff" opacity="0.37" transform="rotate(210 32 32)"/>' +
          '<rect x="29.5" y="4" width="5" height="15" rx="2.5" fill="#ffffff" opacity="0.28" transform="rotate(240 32 32)"/>' +
          '<rect x="29.5" y="4" width="5" height="15" rx="2.5" fill="#ffffff" opacity="0.20" transform="rotate(270 32 32)"/>' +
          '<rect x="29.5" y="4" width="5" height="15" rx="2.5" fill="#ffffff" opacity="0.14" transform="rotate(300 32 32)"/>' +
          '<rect x="29.5" y="4" width="5" height="15" rx="2.5" fill="#ffffff" opacity="0.08" transform="rotate(330 32 32)"/>' +
        '</g>' +
      '</svg>'
    );
  }

  function init() {
    loaderEl = document.getElementById('app-loading-screen');
    captionEl = document.getElementById('app-loading-caption');
    spinnerContainer = document.getElementById('app-loading-spinner-box');

    if (spinnerContainer && !spinnerContainer.innerHTML.trim()) {
      spinnerContainer.innerHTML = getSpinnerSvg(64);
    }
  }

  /**
   * Show fullscreen or contextual loading screen
   * @param {Object} [options]
   * @param {'grey' | 'black' | 'transparent'} [options.theme='grey'] - Contextual background
   * @param {string} [options.text=''] - Optional caption below loader
   */
  function show(options) {
    if (!loaderEl) init();
    if (!loaderEl) return;

    var theme = (options && options.theme) || 'grey';
    var text = (options && options.text) || '';

    loaderEl.classList.remove('theme-grey', 'theme-black', 'theme-transparent');
    loaderEl.classList.add('theme-' + theme);

    if (captionEl) {
      if (text) {
        captionEl.textContent = text;
        captionEl.style.display = 'block';
      } else {
        captionEl.textContent = '';
        captionEl.style.display = 'none';
      }
    }

    loaderEl.classList.add('active');
    loaderEl.setAttribute('aria-hidden', 'false');
  }

  function hide() {
    if (!loaderEl) return;
    loaderEl.classList.remove('active');
    loaderEl.setAttribute('aria-hidden', 'true');
  }

  return {
    init: init,
    show: show,
    hide: hide,
    getSpinnerSvg: getSpinnerSvg
  };
})();
