/**
 * Alphabet Keyboard Controller for webOS 4.0 TV (Chromium 53)
 * Full A-Z letter tiles + Space & Delete
 * Compatible with Chromium 53 (No CSS Grid, Flexbox row layouts)
 */

var OnScreenKeyboard = (function () {
  'use strict';

  var keyboardElement = null;
  var searchInput = null;
  var isCollapsed = false;

  function init() {
    keyboardElement = document.getElementById('onscreen-keyboard');
    searchInput = document.getElementById('search-input');

    if (!keyboardElement || !searchInput) return;

    // Attach click listeners to all letter tiles
    var letterTiles = keyboardElement.querySelectorAll('.kb-tile[data-char]');
    for (var i = 0; i < letterTiles.length; i++) {
      (function (tile) {
        tile.addEventListener('click', function (e) {
          e.stopPropagation();
          var char = tile.getAttribute('data-char');
          if (char) {
            insertText(char);
          }
        });
      })(letterTiles[i]);
    }

    // Space button
    var spaceBtn = document.getElementById('kb-btn-space');
    if (spaceBtn) {
      spaceBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        insertText(' ');
      });
    }

    // Delete button
    var deleteBtn = document.getElementById('kb-btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        deleteChar();
      });
    }

    console.log('[Keyboard] Alphabet keyboard initialized with direct letter tiles.');
  }

  var lastInputTime = 0;
  var INPUT_DEBOUNCE_MS = 180;

  function insertText(char) {
    var now = Date.now();
    if (now - lastInputTime < INPUT_DEBOUNCE_MS) return;
    lastInputTime = now;

    if (!searchInput) return;
    searchInput.value += char;
    triggerInputEvent();
  }

  function deleteChar() {
    var now = Date.now();
    if (now - lastInputTime < INPUT_DEBOUNCE_MS) return;
    lastInputTime = now;

    if (!searchInput || searchInput.value.length === 0) return;
    searchInput.value = searchInput.value.slice(0, -1);
    triggerInputEvent();
  }

  function triggerInputEvent() {
    var event = document.createEvent('Event');
    event.initEvent('input', true, true);
    searchInput.dispatchEvent(event);
  }

  // Smooth sliding collapse into the left edge
  function collapseToLeft() {
    if (isCollapsed) return;
    isCollapsed = true;
    if (keyboardElement) {
      keyboardElement.classList.add('collapsed-left');
    }
    var resultsContainer = document.getElementById('search-results-container');
    if (resultsContainer) {
      resultsContainer.classList.add('keyboard-collapsed');
      resultsContainer.classList.add('expanded-left');
    }
  }

  function expandFromLeft() {
    if (!isCollapsed) return;
    isCollapsed = false;
    if (keyboardElement) {
      keyboardElement.classList.remove('collapsed-left');
    }
    var resultsContainer = document.getElementById('search-results-container');
    if (resultsContainer) {
      resultsContainer.classList.remove('keyboard-collapsed');
      resultsContainer.classList.remove('expanded-left');
    }
  }

  function collapse() {
    collapseToLeft();
  }

  function expand() {
    expandFromLeft();
  }

  function toggle() {
    if (isCollapsed) {
      expandFromLeft();
    } else {
      collapseToLeft();
    }
  }

  return {
    init: init,
    collapse: collapse,
    expand: expand,
    collapseToLeft: collapseToLeft,
    expandFromLeft: expandFromLeft,
    toggle: toggle,
    isCollapsed: function () {
      return isCollapsed;
    }
  };
})();
