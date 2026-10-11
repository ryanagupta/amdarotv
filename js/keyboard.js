/**
 * Apple TV+ On-Screen Keyboard Controller for webOS 4.0 TV (Chromium 53)
 * Exact 6-column x 5-row layout + Mode Switcher [ abc | 123 ] + Action Row (SPACE, [⌫], CLEAR)
 * Smooth auto-collapse to the left margin with spatial navigation integration.
 */

var OnScreenKeyboard = (function () {
  'use strict';

  var keyboardElement = null;
  var searchInput = null;
  var isCollapsed = false;
  var currentMode = 'abc';

  function init() {
    keyboardElement = document.getElementById('onscreen-keyboard');
    searchInput = document.getElementById('search-input');

    // Mode switchers: [ abc | 123 ]
    var modeAbc = document.getElementById('kb-mode-abc');
    var mode123 = document.getElementById('kb-mode-123');

    if (modeAbc) {
      modeAbc.addEventListener('click', function (e) {
        e.stopPropagation();
        setMode('abc');
      });
    }

    if (mode123) {
      mode123.addEventListener('click', function (e) {
        e.stopPropagation();
        setMode('123');
      });
    }

    if (!keyboardElement || !searchInput) return;

    // Attach click listeners to all character keys (.kb-key[data-char])
    var charKeys = keyboardElement.querySelectorAll('.kb-key[data-char]');
    for (var i = 0; i < charKeys.length; i++) {
      (function (key) {
        key.addEventListener('click', function (e) {
          e.stopPropagation();
          var char = key.getAttribute('data-char');
          if (char) {
            insertText(char);
          }
        });
      })(charKeys[i]);
    }

    // Space button
    var spaceBtn = document.getElementById('kb-btn-space');
    if (spaceBtn) {
      spaceBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        insertText(' ');
      });
    }

    // Backspace button
    var deleteBtn = document.getElementById('kb-btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        deleteChar();
      });
    }

    // Clear button
    var clearBtn = document.getElementById('kb-btn-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        clearText();
      });
    }

    console.log('[Keyboard] Apple TV+ 6-column keyboard initialized.');
  }

  function setMode(mode) {
    currentMode = mode;
    var modeAbc = document.getElementById('kb-mode-abc');
    var mode123 = document.getElementById('kb-mode-123');
    var gridAbc = document.getElementById('kb-grid-abc');
    var grid123 = document.getElementById('kb-grid-123');

    if (mode === '123') {
      if (modeAbc) {
        modeAbc.classList.remove('active');
        modeAbc.setAttribute('aria-selected', 'false');
      }
      if (mode123) {
        mode123.classList.add('active');
        mode123.setAttribute('aria-selected', 'true');
      }
      if (gridAbc) gridAbc.style.display = 'none';
      if (grid123) grid123.style.display = 'flex';
    } else {
      if (mode123) {
        mode123.classList.remove('active');
        mode123.setAttribute('aria-selected', 'false');
      }
      if (modeAbc) {
        modeAbc.classList.add('active');
        modeAbc.setAttribute('aria-selected', 'true');
      }
      if (grid123) grid123.style.display = 'none';
      if (gridAbc) gridAbc.style.display = 'flex';
    }
  }

  var lastInputTime = 0;
  var INPUT_DEBOUNCE_MS = 140;

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

  function clearText() {
    if (!searchInput) return;
    searchInput.value = '';
    triggerInputEvent();
  }

  function setText(text) {
    if (!searchInput) return;
    searchInput.value = text || '';
    triggerInputEvent();
  }

  function triggerInputEvent() {
    var event = document.createEvent('Event');
    event.initEvent('input', true, true);
    searchInput.dispatchEvent(event);
  }

  // Smooth sliding collapse into the left edge (Image 3)
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
    setMode: setMode,
    insertText: insertText,
    deleteChar: deleteChar,
    clearText: clearText,
    setText: setText,
    isCollapsed: function () {
      return isCollapsed;
    }
  };
})();
