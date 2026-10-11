/**
 * Main Application Bootstrap
 * Target: 2018 LG C8 (webOS 4.0)
 */

window.addEventListener('load', function () {
  // Initialize native Magic Remote & Conventional Remote controller
  MagicRemote.init();

  // Initialize streaming media player container
  StreamPlayer.init('app');

  // Initialize universal top-left navbar
  UniversalNavbar.init();

  // Initialize collapsible on-screen keyboard
  OnScreenKeyboard.init();

  // Initialize TMDB & TVDB search engine & results
  MediaSearch.init();

  // Mode change listener (Pointer Mode vs 5-Way Mode)
  MagicRemote.onModeChange(function (mode) {
    console.log('[App] Remote navigation mode changed to:', mode);
  });

  // Global key event handler
  MagicRemote.onKey(function (keyCode) {
    switch (keyCode) {
      // Back key (webOS 461)
      case MagicRemote.KEYS.BACK:
        console.log('[App] webOS Back button pressed');
        break;

      // Conventional Media Playback Keys
      case MagicRemote.KEYS.PLAY:
        StreamPlayer.play();
        break;
      case MagicRemote.KEYS.PAUSE:
        StreamPlayer.pause();
        break;
      case MagicRemote.KEYS.STOP:
        StreamPlayer.stop();
        break;
      case MagicRemote.KEYS.FAST_FWD:
        console.log('[App] Fast-Forward key pressed');
        break;
      case MagicRemote.KEYS.REWIND:
        console.log('[App] Rewind key pressed');
        break;

      // Magic Remote Color Buttons (MR26GB)
      case MagicRemote.KEYS.RED:
        console.log('[App] Red button pressed');
        break;
      case MagicRemote.KEYS.GREEN:
        console.log('[App] Green button pressed');
        break;
      case MagicRemote.KEYS.YELLOW:
        console.log('[App] Yellow button pressed');
        break;
      case MagicRemote.KEYS.BLUE:
        console.log('[App] Blue button pressed');
        break;

      default:
        break;
    }
  });

  console.log('[App] webOS Streaming Service Initialized on LG C8 (webOS 4.0).');
});
