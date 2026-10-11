/**
 * webOS Remote Control Key Handler
 * Optimized for LG webOS 4.0 (Chromium 53)
 */

var RemoteControl = (function () {
  var KeyCodes = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    ENTER: 13,
    BACK: 461,
    PLAY: 415,
    PAUSE: 19,
    STOP: 413,
    FAST_FWD: 417,
    REWIND: 412,
    RED: 403,
    GREEN: 404,
    YELLOW: 405,
    BLUE: 406
  };

  var listeners = [];

  function init() {
    window.addEventListener('keydown', handleKeyDown);
  }

  function handleKeyDown(event) {
    var keyCode = event.keyCode;

    // Handle webOS back button
    if (keyCode === KeyCodes.BACK) {
      // Prevent default exit if handled internally
      event.preventDefault();
    }

    for (var i = 0; i < listeners.length; i++) {
      listeners[i](keyCode, event);
    }
  }

  function onKey(callback) {
    if (typeof callback === 'function') {
      listeners.push(callback);
    }
  }

  return {
    KEYS: KeyCodes,
    init: init,
    onKey: onKey
  };
})();
