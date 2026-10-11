/**
 * LG webOS Magic Remote & Conventional Remote Native Controller
 * Optimized for LG webOS 4.0+ (LG C8 OLED TV)
 *
 * Implements:
 * - Pointer Mode (Wand/Mouse) & 5-Way D-Pad Mode
 * - cursorStateChange event listening
 * - Complete LG Remote Keycode mapping (5-way, Color keys, Media keys, Back 461)
 * - Automatic 2D Spatial Navigation for 5-Way Mode
 * - Back button stack handler
 * - System UI focus/blur detection
 */

(function (window, document) {
  'use strict';

  var KEYS = {
    // 5-Way Navigation
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    OK: 13,

    // Navigation & System
    BACK: 461,

    // Magic Remote Color Buttons (MR26GB)
    RED: 403,
    GREEN: 404,
    YELLOW: 405,
    BLUE: 406,

    // Conventional Remote Media Playback Keys
    PLAY: 415,
    PAUSE: 19,
    STOP: 413,
    FAST_FWD: 417,
    REWIND: 412
  };

  var MODE = {
    POINTER: 'pointer',
    FIVE_WAY: '5way'
  };

  var currentMode = MODE.POINTER;
  var currentFocusedElement = null;
  var keyListeners = [];
  var modeListeners = [];
  var backStack = [];

  /**
   * Set active navigation mode and notify listeners
   */
  function setMode(newMode) {
    if (currentMode === newMode) return;
    currentMode = newMode;

    if (document.body) {
      if (newMode === MODE.POINTER) {
        document.body.classList.remove('mode-5way');
        document.body.classList.add('mode-pointer');
      } else {
        document.body.classList.remove('mode-pointer');
        document.body.classList.add('mode-5way');
        ensureFocus();
      }
    }

    for (var i = 0; i < modeListeners.length; i++) {
      try {
        modeListeners[i](newMode);
      } catch (err) {
        console.error('[MagicRemote] Error in mode listener:', err);
      }
    }
  }

  function isElementVisible(el) {
    if (!el || el.disabled) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    if (window.getComputedStyle) {
      var style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
    }
    return true;
  }

  /**
   * Get all currently focusable elements in the document
   */
  function getFocusableElements() {
    var player = document.getElementById('video-player-container');
    var isPlayerActive = player && player.style.display !== 'none';

    var modal = document.getElementById('media-details-modal');
    var isModalActive = modal && modal.classList.contains('open');

    var root = document;
    if (isPlayerActive) {
      root = player;
    } else if (isModalActive) {
      root = modal;
    }

    var selector = 'button:not([disabled]):not([tabindex="-1"]), [href]:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"]):not(input), .focusable:not([disabled]):not([tabindex="-1"])';
    var nodes = root.querySelectorAll(selector);
    var focusables = [];

    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (isElementVisible(el)) {
        focusables.push(el);
      }
    }
    return focusables;
  }

  /**
   * Ensure that an element has 5-way focus
   */
  function ensureFocus() {
    if (currentFocusedElement && document.contains(currentFocusedElement)) {
      applyFocus(currentFocusedElement);
      return;
    }

    var list = getFocusableElements();
    if (list.length > 0) {
      applyFocus(list[0]);
    }
  }

  /**
   * Apply focus to target element and parent container
   */
  function applyFocus(element) {
    if (!element) return;
    if (currentFocusedElement && currentFocusedElement !== element) {
      currentFocusedElement.classList.remove('focused');
      var oldBox = currentFocusedElement.closest('.search-input-box');
      if (oldBox) oldBox.classList.remove('focused');
      currentFocusedElement.blur();
    }

    currentFocusedElement = element;
    currentFocusedElement.classList.add('focused');

    var newBox = element.closest('.search-input-box');
    if (newBox) newBox.classList.add('focused');

    // Bridge: Auto collapse/expand on-screen keyboard based on focus target
    var isMediaTile = element.closest('.search-results-grid') || element.classList.contains('media-tile');
    var isKeyboardTile = element.closest('#onscreen-keyboard');

    if (isMediaTile && window.OnScreenKeyboard && typeof window.OnScreenKeyboard.collapseToLeft === 'function') {
      window.OnScreenKeyboard.collapseToLeft();
    } else if (isKeyboardTile && window.OnScreenKeyboard && typeof window.OnScreenKeyboard.expandFromLeft === 'function') {
      window.OnScreenKeyboard.expandFromLeft();
    }

    try {
      element.focus();
    } catch (e) {}

    // TV Partial Scroll Animation: Keeps navbar 100% fixed, glides tiles down/up just enough for the new row
    var scrollContainer = element.closest('.search-results-container') || document.getElementById('search-results-container');
    if (scrollContainer && (element.classList.contains('media-tile') || element.closest('.search-results-grid'))) {
      scrollPartialContainer(scrollContainer, element);
    }
  }

  var currentScrollAnim = null;

  function scrollPartialContainer(container, element) {
    if (!container || !element) return;
    var cRect = container.getBoundingClientRect();
    var eRect = element.getBoundingClientRect();
    var topBuffer = 30; // Breathing room below fixed search bar
    var bottomBuffer = 50; // Breathing room above screen bottom

    if (eRect.bottom > cRect.bottom - bottomBuffer) {
      // Tile extends past bottom: scroll down just enough to reveal the new row comfortably
      var delta = (eRect.bottom - cRect.bottom) + bottomBuffer;
      smoothScrollBy(container, delta);
    } else if (eRect.top < cRect.top + topBuffer) {
      // Tile extends above top: scroll up just enough
      var delta = eRect.top - (cRect.top + topBuffer);
      smoothScrollBy(container, delta);
    }
  }

  function smoothScrollBy(container, deltaY) {
    if (!container) return;
    if (currentScrollAnim) {
      cancelAnimationFrame(currentScrollAnim);
      currentScrollAnim = null;
    }

    var start = container.scrollTop;
    var maxScroll = container.scrollHeight - container.clientHeight;
    var target = Math.max(0, Math.min(maxScroll, start + deltaY));
    var change = target - start;
    if (Math.abs(change) < 2) return;

    var startTime = (window.performance && window.performance.now) ? window.performance.now() : Date.now();
    var duration = 460; // Slow, buttery smooth cinematic TV glide

    function easeOutQuart(t) {
      return 1 - (--t) * t * t * t;
    }

    function step(currentTime) {
      var elapsed = currentTime - startTime;
      if (elapsed >= duration) {
        container.scrollTop = target;
        currentScrollAnim = null;
        return;
      }
      var progress = easeOutQuart(elapsed / duration);
      container.scrollTop = Math.round(start + (change * progress));
      currentScrollAnim = requestAnimationFrame(step);
    }

    currentScrollAnim = requestAnimationFrame(step);
  }

  /**
   * Calculate directional distance between two bounding rectangles using W3C Spatial Navigation
   * Eliminates negative values and strictly prioritizes same-row/same-column candidates
   */
  function getDistance(currentRect, targetRect, direction) {
    var currentCenter = {
      x: (currentRect.left + currentRect.right) / 2,
      y: (currentRect.top + currentRect.bottom) / 2
    };
    var targetCenter = {
      x: (targetRect.left + targetRect.right) / 2,
      y: (targetRect.top + targetRect.bottom) / 2
    };

    var d_primary = 0;
    var d_orthogonal = 0;
    var overlap = 0;

    switch (direction) {
      case KEYS.RIGHT:
        // Must be genuinely to the right
        if (targetCenter.x <= currentCenter.x + 4 || targetRect.left < currentRect.left + 8) return -1;
        d_primary = Math.max(0, targetRect.left - currentRect.right);
        overlap = Math.max(0, Math.min(currentRect.bottom, targetRect.bottom) - Math.max(currentRect.top, targetRect.top));
        if (overlap > 0) {
          // Direct row neighbor! Strict horizontal priority
          return d_primary + Math.abs(targetCenter.y - currentCenter.y) * 0.2;
        } else {
          // Different row! Large penalty so same-row elements always win
          d_orthogonal = Math.min(Math.abs(targetRect.top - currentRect.bottom), Math.abs(currentRect.top - targetRect.bottom));
          return d_primary + (d_orthogonal * 4.0) + 2000;
        }

      case KEYS.LEFT:
        // Must be genuinely to the left
        if (targetCenter.x >= currentCenter.x - 4 || targetRect.right > currentRect.right - 8) return -1;
        d_primary = Math.max(0, currentRect.left - targetRect.right);
        overlap = Math.max(0, Math.min(currentRect.bottom, targetRect.bottom) - Math.max(currentRect.top, targetRect.top));
        if (overlap > 0) {
          // Direct row neighbor! Strict horizontal priority
          return d_primary + Math.abs(targetCenter.y - currentCenter.y) * 0.2;
        } else {
          // Different row! Large penalty
          d_orthogonal = Math.min(Math.abs(targetRect.top - currentRect.bottom), Math.abs(currentRect.top - targetRect.bottom));
          return d_primary + (d_orthogonal * 4.0) + 2000;
        }

      case KEYS.DOWN:
        // Must be genuinely below
        if (targetCenter.y <= currentCenter.y + 4 || targetRect.top < currentRect.top + 8) return -1;
        d_primary = Math.max(0, targetRect.top - currentRect.bottom);
        overlap = Math.max(0, Math.min(currentRect.right, targetRect.right) - Math.max(currentRect.left, targetRect.left));
        if (overlap > 0) {
          // Direct column neighbor! Strict vertical priority
          return d_primary + Math.abs(targetCenter.x - currentCenter.x) * 0.2;
        } else {
          // Different column! Large penalty
          d_orthogonal = Math.min(Math.abs(targetRect.left - currentRect.right), Math.abs(currentRect.left - targetRect.right));
          return d_primary + (d_orthogonal * 4.0) + 2000;
        }

      case KEYS.UP:
        // Must be genuinely above
        if (targetCenter.y >= currentCenter.y - 4 || targetRect.bottom > currentRect.bottom - 8) return -1;
        d_primary = Math.max(0, currentRect.top - targetRect.bottom);
        overlap = Math.max(0, Math.min(currentRect.right, targetRect.right) - Math.max(currentRect.left, targetRect.left));
        if (overlap > 0) {
          // Direct column neighbor! Strict vertical priority
          return d_primary + Math.abs(targetCenter.x - currentCenter.x) * 0.2;
        } else {
          // Different column! Large penalty
          d_orthogonal = Math.min(Math.abs(targetRect.left - currentRect.right), Math.abs(currentRect.left - targetRect.right));
          return d_primary + (d_orthogonal * 4.0) + 2000;
        }

      default:
        return -1;
    }
  }

  /**
   * Move focus geometrically to the nearest focusable element
   */
  function moveFocus(direction) {
    // If on a media tile and moving left, expand keyboard and focus nearest row
    if (direction === KEYS.LEFT && currentFocusedElement && (currentFocusedElement.classList.contains('media-tile') || currentFocusedElement.closest('.search-results-grid'))) {
      if (window.OnScreenKeyboard && typeof window.OnScreenKeyboard.isCollapsed === 'function' && window.OnScreenKeyboard.isCollapsed()) {
        var cRect = currentFocusedElement.getBoundingClientRect();
        // Check if there are no media tiles further left in the same row
        var grid = document.querySelector('.search-results-grid');
        var tiles = grid ? grid.querySelectorAll('.media-tile') : [];
        var isLeftmost = true;
        for (var t = 0; t < tiles.length; t++) {
          var tr = tiles[t].getBoundingClientRect();
          if (tr.right < cRect.left - 5 && Math.abs(tr.top - cRect.top) < 50) {
            isLeftmost = false;
            break;
          }
        }
        if (isLeftmost) {
          window.OnScreenKeyboard.expandFromLeft();
          var kbTiles = document.querySelectorAll('#onscreen-keyboard .kb-tile:not([disabled])');
          var bestKbTile = null;
          var bestYDiff = Infinity;
          for (var k = 0; k < kbTiles.length; k++) {
            var kRect = kbTiles[k].getBoundingClientRect();
            var diff = Math.abs(kRect.top - cRect.top);
            if (diff < bestYDiff) {
              bestYDiff = diff;
              bestKbTile = kbTiles[k];
            }
          }
          if (bestKbTile) {
            applyFocus(bestKbTile);
            return;
          }
        }
      }
    }

    var focusables = getFocusableElements();
    if (focusables.length === 0) return;

    if (!currentFocusedElement || !document.contains(currentFocusedElement)) {
      applyFocus(focusables[0]);
      return;
    }

    var currentRect = currentFocusedElement.getBoundingClientRect();
    var closestElement = null;
    var closestDistance = Infinity;

    for (var i = 0; i < focusables.length; i++) {
      var candidate = focusables[i];
      if (candidate === currentFocusedElement) continue;

      var candidateRect = candidate.getBoundingClientRect();
      var distance = getDistance(currentRect, candidateRect, direction);

      if (distance >= 0 && distance < closestDistance) {
        closestDistance = distance;
        closestElement = candidate;
      }
    }

    if (closestElement) {
      applyFocus(closestElement);
    }
  }

  /**
   * Handle Keydown Events
   */
  function handleKeyDown(event) {
    var keyCode = event.keyCode || event.which;

    // D-Pad navigation switches mode to 5-way
    if (keyCode === KEYS.LEFT || keyCode === KEYS.RIGHT || keyCode === KEYS.UP || keyCode === KEYS.DOWN) {
      setMode(MODE.FIVE_WAY);
      moveFocus(keyCode);
      event.preventDefault();
      triggerKeyListeners(keyCode, event);
      return;
    }

    // OK / Enter key
    if (keyCode === KEYS.OK) {
      event.preventDefault();
      if (currentMode === MODE.FIVE_WAY && currentFocusedElement) {
        currentFocusedElement.click();
      }
      triggerKeyListeners(keyCode, event);
      return;
    }

    // Back key (webOS 461 or ESC 27)
    if (keyCode === KEYS.BACK || keyCode === 27) {
      if (backStack.length > 0) {
        var handler = backStack.pop();
        try {
          var handled = handler();
          if (handled !== false) {
            event.preventDefault();
            return;
          }
        } catch (err) {
          console.error('[MagicRemote] Error in custom back handler:', err);
        }
      }

      if (window.StreamPlayer && typeof window.StreamPlayer.isOpen === 'function' && window.StreamPlayer.isOpen()) {
        window.StreamPlayer.close();
        event.preventDefault();
        return;
      }

      if (window.MediaSearch && typeof window.MediaSearch.isModalOpen === 'function' && window.MediaSearch.isModalOpen()) {
        window.MediaSearch.closeDetails();
        event.preventDefault();
        return;
      }

      // Notify back listeners
      triggerKeyListeners(keyCode, event);

      // If running inside Media Station X, return to MSX root portal
      if (window.history && window.history.length > 1) {
        try {
          window.history.go(1 - window.history.length);
          event.preventDefault();
          return;
        } catch (e) {
          console.warn('[MagicRemote] MSX exit failed:', e);
        }
      }
      return;
    }

    // Pass through all other keys (Media, Color, etc.)
    triggerKeyListeners(keyCode, event);
  }

  function triggerKeyListeners(keyCode, event) {
    for (var i = 0; i < keyListeners.length; i++) {
      try {
        keyListeners[i](keyCode, event);
      } catch (err) {
        console.error('[MagicRemote] Error in key listener:', err);
      }
    }
  }

  /**
   * Mouse and Pointer Event Listeners
   */
  function handlePointerActivity() {
    setMode(MODE.POINTER);
  }

  /**
   * webOS cursorStateChange event handler
   * LG webOS fires cursorStateChange on document when cursor appears or disappears
   */
  function handleCursorStateChange(event) {
    var isVisible = event.detail && event.detail.visibility;
    if (isVisible) {
      setMode(MODE.POINTER);
    } else {
      setMode(MODE.FIVE_WAY);
    }
  }

  /**
   * System UI Focus / Blur listeners (e.g. Home Launcher overlay)
   */
  function handleWindowBlur() {
    console.log('[MagicRemote] App lost focus to system UI (Launcher/Settings)');
  }

  function handleWindowFocus() {
    console.log('[MagicRemote] App regained focus from system UI');
    if (currentMode === MODE.FIVE_WAY) {
      ensureFocus();
    }
  }

  /**
   * Initialize Magic Remote Listeners
   */
  function init() {
    // Keydown for 5-way D-Pad, OK, Back, Color, Media
    window.addEventListener('keydown', handleKeyDown);

    // Mouse movement / click switches to Pointer mode
    window.addEventListener('mousemove', handlePointerActivity);
    window.addEventListener('wheel', handlePointerActivity);
    window.addEventListener('click', function (e) {
      if (e.target && e.target.classList && e.target.classList.contains('focusable')) {
        applyFocus(e.target);
      }
    });

    // LG webOS native cursor visibility change
    document.addEventListener('cursorStateChange', handleCursorStateChange);

    // System UI overlay detection
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    // Set initial mode
    document.body.classList.add('mode-pointer');
    console.log('[MagicRemote] Native Magic Remote controller initialized.');
  }

  // Public API
  var MagicRemote = {
    KEYS: KEYS,
    MODE: MODE,
    init: init,
    getMode: function () {
      return currentMode;
    },
    onModeChange: function (callback) {
      if (typeof callback === 'function') {
        modeListeners.push(callback);
      }
    },
    onKey: function (callback) {
      if (typeof callback === 'function') {
        keyListeners.push(callback);
      }
    },
    pushBackHandler: function (handler) {
      if (typeof handler === 'function') {
        backStack.push(handler);
      }
    },
    popBackHandler: function () {
      return backStack.pop();
    },
    setFocus: function (element) {
      applyFocus(element);
    },
    getFocusedElement: function () {
      return currentFocusedElement;
    }
  };

  window.MagicRemote = MagicRemote;
})(window, document);
