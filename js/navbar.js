/**
 * Universal Glassmorphic Navbar Controller
 * Optimized for LG webOS 4.0 (Chromium 53)
 *
 * Implements:
 * - Always collapsed by default into the 3-line hamburger menu button
 * - When uncollapsed (expanded), the 3 lines menu icon is completely hidden
 * - Only the navigation buttons (Home, Search, Settings) and slider are shown
 * - Selecting an item, pressing remote Back (461), or navigating away collapses it back
 * - Hardware-accelerated sliding indicator (translate3d)
 */

var UniversalNavbar = (function () {
  'use strict';

  var navElement = null;
  var toggleBtn = null;
  var sliderElement = null;
  var navItemsWrapper = null;
  var activeButton = null;
  var isExpanded = false;

  function init() {
    navElement = document.getElementById('universal-nav');
    toggleBtn = document.getElementById('menu-toggle-btn');
    sliderElement = document.getElementById('nav-slider');
    navItemsWrapper = document.getElementById('nav-items-wrapper');
    activeButton = document.getElementById('nav-btn-search');

    if (!navElement || !toggleBtn || !sliderElement) {
      console.warn('[Navbar] Required navbar elements missing.');
      return;
    }

    // Default to COLLAPSED state
    collapse();

    // Toggle button click (when collapsed)
    toggleBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      expand();
    });

    // Selecting search button collapses or confirms
    if (activeButton) {
      activeButton.addEventListener('click', function (e) {
        e.stopPropagation();
        // If expanded, selecting it collapses back to menu button
        collapse();
      });
    }

    // Collapse when clicking outside the navbar
    document.addEventListener('click', function (e) {
      if (isExpanded && !navElement.contains(e.target)) {
        collapse();
      }
    });

    // Back key (webOS 461) collapses the navbar if expanded
    if (window.MagicRemote && typeof window.MagicRemote.onKey === 'function') {
      window.MagicRemote.onKey(function (keyCode) {
        if (keyCode === window.MagicRemote.KEYS.BACK && isExpanded) {
          collapse();
        }
      });
    }

    console.log('[Navbar] Universal navbar initialized (collapsed by default).');
  }

  function updateSliderPosition(btn) {
    if (!btn || !sliderElement) return;

    var btnLeft = btn.offsetLeft;
    var btnWidth = btn.offsetWidth;

    sliderElement.style.webkitTransform = 'translate3d(' + btnLeft + 'px, 0, 0)';
    sliderElement.style.transform = 'translate3d(' + btnLeft + 'px, 0, 0)';
    sliderElement.style.width = btnWidth + 'px';
  }

  function expand() {
    isExpanded = true;
    navElement.classList.remove('collapsed');
    navElement.classList.add('expanded');

    // Position slider over active button
    setTimeout(function () {
      updateSliderPosition(activeButton);
    }, 40);

    // Focus active search button in 5-way mode
    if (window.MagicRemote && activeButton) {
      window.MagicRemote.setFocus(activeButton);
    }
  }

  function collapse() {
    isExpanded = false;
    navElement.classList.remove('expanded');
    navElement.classList.add('collapsed');

    // Focus back on toggle button if in 5-way mode
    if (window.MagicRemote && toggleBtn) {
      window.MagicRemote.setFocus(toggleBtn);
    }
  }

  return {
    init: init,
    expand: expand,
    collapse: collapse,
    isExpanded: function () {
      return isExpanded;
    }
  };
})();
