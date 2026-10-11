/**
 * 1:1 Apple TV+ Video Player Experience for webOS TV
 *
 * Implements:
 * 1. Initial play: Top-left BBFC rating icon (15, 12, etc.) & center Apple TV logo with 3s fade-out.
 * 2. Down key brings up 1:1 Apple TV+ OSD: S1, E1 · Episode Title, Show/Movie Title.
 * 3. Scrubber with elapsed time, remaining time (-XX:XX), floating thumbnail preview box & ⏩ fast-forward indicator.
 * 4. Fast-forward / rewind interactions (right/left keys on timeline, OK stops).
 * 5. Pill tabs: Info, InSight, Continue Watching toggle interactive bottom glass drawers.
 * 6. Right circular controls: Subtitles popup & Audio switcher popup in dark rounded glass.
 * 7. InSight tab: circular cast portraits with Actor and Character names.
 * 8. Info tab: episode thumb, synopsis, meta pills (CC, SDH, AD), [ ▶ From Beginning ] & [ ⓘ Go to Show ].
 * 9. Continue Watching tab: horizontal episode/show cards with progress bars and Apple TV badges.
 */

var StreamPlayer = (function () {
  // DOM Elements
  var container = null;
  var video = null;
  var startOverlay = null;
  var ratingBadge = null;
  var bufferingOverlay = null;

  var osd = null;
  var subTitleEl = null;
  var mainTitleEl = null;

  var scrubberWrapper = null;
  var previewBox = null;
  var previewImg = null;
  var previewTime = null;
  var timeline = null;
  var progressFill = null;
  var scrubberThumb = null;
  var timeCurrent = null;
  var timeRemaining = null;
  var ffwdIndicator = null;

  var tabInfo = null;
  var tabInsight = null;
  var tabContinue = null;
  var subtitlesBtn = null;
  var audioBtn = null;

  var subtitlesModal = null;
  var subOptionOn = null;
  var subOptionOff = null;

  var audioModal = null;
  var audioOptions = [];

  var drawerInfo = null;
  var drawerInfoThumb = null;
  var drawerInfoTitle = null;
  var drawerInfoSynopsis = null;
  var drawerInfoGenres = null;
  var drawerInfoEp = null;
  var drawerInfoRuntime = null;
  var btnFromBeginning = null;
  var btnGotoShow = null;

  var drawerInsight = null;
  var drawerContinue = null;

  // State
  var isPlaying = false;
  var isPlayerOpen = false;
  var isFastForwarding = false;
  var fastForwardSpeed = 1;
  var fastForwardTimer = null;
  var scrubPreviewTime = 0;

  var osdTimeout = null;
  var startOverlayTimeout = null;
  var currentMeta = null;

  var activeDrawer = null; // 'info', 'insight', 'continue', null
  var isSubtitlesOpen = false;
  var isAudioOpen = false;

  var BBFC_ASSET_MAP = {
    '15': 'assets/15.svg',
    '18': 'assets/18.png',
    '12': 'assets/12.png',
    '12A': 'assets/12A.png',
    'PG': 'assets/PG.png',
    'U': 'assets/U.png'
  };

  function init() {
    container = document.getElementById('video-player-container');
    video = document.getElementById('stream-video');
    startOverlay = document.getElementById('player-start-overlay');
    ratingBadge = document.getElementById('player-rating-badge');
    bufferingOverlay = document.getElementById('player-buffering-overlay');

    osd = document.getElementById('player-osd');
    subTitleEl = document.getElementById('player-sub-title');
    mainTitleEl = document.getElementById('player-main-title');

    scrubberWrapper = document.querySelector('.player-scrubber-wrapper');
    previewBox = document.getElementById('player-preview-box');
    previewImg = document.getElementById('player-preview-img');
    previewTime = document.getElementById('player-preview-time');
    timeline = document.getElementById('player-timeline');
    progressFill = document.getElementById('player-progress-fill');
    scrubberThumb = document.getElementById('player-scrubber-thumb');
    timeCurrent = document.getElementById('player-time-current');
    timeRemaining = document.getElementById('player-time-remaining');
    ffwdIndicator = document.getElementById('player-ffwd-indicator');

    tabInfo = document.getElementById('player-tab-info');
    tabInsight = document.getElementById('player-tab-insight');
    tabContinue = document.getElementById('player-tab-continue');
    subtitlesBtn = document.getElementById('player-subtitles-btn');
    audioBtn = document.getElementById('player-audio-btn');

    subtitlesModal = document.getElementById('player-subtitles-modal');
    subOptionOn = document.getElementById('sub-option-on');
    subOptionOff = document.getElementById('sub-option-off');

    audioModal = document.getElementById('player-audio-modal');

    drawerInfo = document.getElementById('player-drawer-info');
    drawerInfoThumb = document.getElementById('drawer-info-thumb');
    drawerInfoTitle = document.getElementById('drawer-info-title');
    drawerInfoSynopsis = document.getElementById('drawer-info-synopsis');
    drawerInfoGenres = document.getElementById('drawer-info-genres');
    drawerInfoEp = document.getElementById('drawer-info-ep');
    drawerInfoRuntime = document.getElementById('drawer-info-runtime');
    btnFromBeginning = document.getElementById('btn-from-beginning');
    btnGotoShow = document.getElementById('btn-goto-show');

    drawerInsight = document.getElementById('player-drawer-insight');
    drawerContinue = document.getElementById('player-drawer-continue');

    if (!video) return;

    // Video events
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', function () {
      isPlaying = true;
      scheduleHideOSD();
    });
    video.addEventListener('pause', function () {
      isPlaying = false;
      showOSD();
    });
    video.addEventListener('waiting', function () {
      if (bufferingOverlay) bufferingOverlay.style.display = 'flex';
    });
    video.addEventListener('playing', function () {
      if (bufferingOverlay) bufferingOverlay.style.display = 'none';
    });
    video.addEventListener('ended', function () {
      isPlaying = false;
      showOSD();
    });

    // Timeline clicks
    if (timeline) {
      timeline.addEventListener('click', function (e) {
        var rect = timeline.getBoundingClientRect();
        var percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        if (video.duration) {
          video.currentTime = percent * video.duration;
        }
      });
    }

    // Tab button clicks
    if (tabInfo) {
      tabInfo.addEventListener('click', function () {
        toggleDrawer('info');
      });
    }
    if (tabInsight) {
      tabInsight.addEventListener('click', function () {
        toggleDrawer('insight');
      });
    }
    if (tabContinue) {
      tabContinue.addEventListener('click', function () {
        toggleDrawer('continue');
      });
    }

    // Subtitles button & options
    if (subtitlesBtn) {
      subtitlesBtn.addEventListener('click', toggleSubtitles);
    }
    if (subOptionOn) {
      subOptionOn.addEventListener('click', function () {
        subOptionOn.classList.add('active');
        subOptionOn.innerHTML = '<span class="check-icon">✓</span> On';
        if (subOptionOff) {
          subOptionOff.classList.remove('active');
          subOptionOff.textContent = 'Off';
        }
      });
    }
    if (subOptionOff) {
      subOptionOff.addEventListener('click', function () {
        subOptionOff.classList.add('active');
        subOptionOff.innerHTML = '<span class="check-icon">✓</span> Off';
        if (subOptionOn) {
          subOptionOn.classList.remove('active');
          subOptionOn.textContent = 'On';
        }
      });
    }

    // Audio button & options
    if (audioBtn) {
      audioBtn.addEventListener('click', toggleAudio);
    }
    if (audioModal) {
      var items = audioModal.querySelectorAll('.floating-panel-item');
      for (var i = 0; i < items.length; i++) {
        (function (el) {
          el.addEventListener('click', function () {
            for (var j = 0; j < items.length; j++) {
              items[j].classList.remove('active');
              var text = items[j].textContent.replace('✓', '').trim();
              items[j].textContent = text;
            }
            el.classList.add('active');
            var raw = el.textContent.trim();
            el.innerHTML = '<span class="check-icon">✓</span> ' + raw;
            closeAudio();
          });
        })(items[i]);
      }
    }

    // Drawer info buttons
    if (btnFromBeginning) {
      btnFromBeginning.addEventListener('click', function () {
        if (video) video.currentTime = 0;
        play();
        closeDrawer();
      });
    }
    if (btnGotoShow) {
      btnGotoShow.addEventListener('click', function () {
        closePlayer();
      });
    }

    // Global Key handling
    document.addEventListener('keydown', handlePlayerKeys, true);

    console.log('[StreamPlayer] Apple TV+ 1:1 Video Player Initialized.');
  }

  /**
   * Load and play media with rich metadata
   */
  function load(url, meta) {
    if (!container || !video) init();
    if (!container || !video) return;

    currentMeta = meta || {};
    closeDrawer();
    closeSubtitles();
    closeAudio();
    stopFastForward();

    // 1. Initial Play Overlay: Show BBFC badge top-left + Apple TV logo center
    var cert = (currentMeta.rating || '15').toString().toUpperCase().trim();
    if (cert === 'R' || cert === 'TV-MA') cert = '15';
    else if (cert === 'PG-13' || cert === 'TV-14') cert = '12';
    else if (cert === 'TV-PG') cert = 'PG';
    else if (cert === 'G' || cert === 'TV-G') cert = 'U';

    var badgeAsset = BBFC_ASSET_MAP[cert] || 'assets/15.svg';
    if (ratingBadge) {
      ratingBadge.src = badgeAsset;
    }

    if (startOverlay) {
      startOverlay.classList.remove('hidden');
      startOverlay.style.display = 'flex';
      if (startOverlayTimeout) clearTimeout(startOverlayTimeout);
      // Fades out after 3 seconds exactly as requested
      startOverlayTimeout = setTimeout(function () {
        if (startOverlay) {
          startOverlay.classList.add('hidden');
          setTimeout(function () {
            if (startOverlay && startOverlay.classList.contains('hidden')) {
              startOverlay.style.display = 'none';
            }
          }, 800);
        }
      }, 3000);
    }

    // 2. Titles
    if (subTitleEl) subTitleEl.textContent = currentMeta.subTitle || 'Apple Original';
    if (mainTitleEl) mainTitleEl.textContent = currentMeta.title || 'Apple TV+';

    // 3. Populate Drawers
    populateInfoDrawer(currentMeta);
    populateInsightDrawer(currentMeta.cast || []);
    populateContinueDrawer(currentMeta.continueItems || []);

    // 4. Reset Timeline & Preview
    if (previewImg) previewImg.src = currentMeta.thumb || '';
    if (progressFill) progressFill.style.width = '0%';
    if (timeCurrent) timeCurrent.textContent = '00:00';
    if (timeRemaining) timeRemaining.textContent = '-00:00';
    if (ffwdIndicator) ffwdIndicator.style.display = 'none';
    if (previewBox) previewBox.style.display = 'none';

    // 5. Open Player
    video.src = url;
    video.load();

    container.style.display = 'block';
    isPlayerOpen = true;

    showOSD();

    // Default focus to Scrubber Bar
    if (timeline && window.MagicRemote) {
      window.MagicRemote.setFocus(timeline);
    }
  }

  function play() {
    if (!video) return;
    video.play().then(function () {
      isPlaying = true;
      scheduleHideOSD();
    }).catch(function (e) {
      console.warn('[StreamPlayer] Playback error:', e);
    });
  }

  function pause() {
    if (!video) return;
    video.pause();
    isPlaying = false;
    showOSD();
  }

  function togglePlay() {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function seek(deltaSeconds) {
    if (!video || !video.duration) return;
    var target = Math.max(0, Math.min(video.duration, video.currentTime + deltaSeconds));
    video.currentTime = target;
    onTimeUpdate();
  }

  function onTimeUpdate() {
    if (!video || !video.duration || isFastForwarding) return;
    var percent = (video.currentTime / video.duration) * 100;
    if (progressFill) progressFill.style.width = percent + '%';
    if (timeCurrent) timeCurrent.textContent = formatTime(video.currentTime);
    if (timeRemaining) timeRemaining.textContent = '-' + formatTime(video.duration - video.currentTime);
  }

  function formatTime(seconds) {
    var s = Math.floor(seconds || 0);
    var m = Math.floor(s / 60);
    var h = Math.floor(m / 60);
    s = s % 60;
    m = m % 60;
    if (h > 0) {
      return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  /**
   * Fast-Forward on Timeline
   */
  function startFastForward() {
    if (!video || !video.duration) return;
    isFastForwarding = true;
    showOSD();

    if (ffwdIndicator) ffwdIndicator.style.display = 'inline-flex';
    if (previewBox) previewBox.style.display = 'block';

    if (fastForwardTimer) clearInterval(fastForwardTimer);
    fastForwardSpeed = (fastForwardSpeed === 1) ? 2 : (fastForwardSpeed === 2 ? 4 : 8);

    fastForwardTimer = setInterval(function () {
      if (!video || !video.duration) return;
      var newTime = Math.min(video.duration, video.currentTime + (3 * (fastForwardSpeed / 2)));
      video.currentTime = newTime;

      var percent = (newTime / video.duration) * 100;
      if (progressFill) progressFill.style.width = percent + '%';
      if (previewBox) previewBox.style.left = percent + '%';
      if (previewTime) previewTime.textContent = formatTime(newTime);
      if (timeCurrent) timeCurrent.textContent = formatTime(newTime);
      if (timeRemaining) timeRemaining.textContent = '-' + formatTime(video.duration - newTime);

      if (newTime >= video.duration) {
        stopFastForward();
      }
    }, 250);
  }

  function startRewind() {
    if (!video || !video.duration) return;
    isFastForwarding = true;
    showOSD();

    if (previewBox) previewBox.style.display = 'block';

    if (fastForwardTimer) clearInterval(fastForwardTimer);
    fastForwardTimer = setInterval(function () {
      if (!video || !video.duration) return;
      var newTime = Math.max(0, video.currentTime - 4);
      video.currentTime = newTime;

      var percent = (newTime / video.duration) * 100;
      if (progressFill) progressFill.style.width = percent + '%';
      if (previewBox) previewBox.style.left = percent + '%';
      if (previewTime) previewTime.textContent = formatTime(newTime);
      if (timeCurrent) timeCurrent.textContent = formatTime(newTime);
      if (timeRemaining) timeRemaining.textContent = '-' + formatTime(video.duration - newTime);

      if (newTime <= 0) {
        stopFastForward();
      }
    }, 250);
  }

  function stopFastForward() {
    if (fastForwardTimer) {
      clearInterval(fastForwardTimer);
      fastForwardTimer = null;
    }
    isFastForwarding = false;
    fastForwardSpeed = 1;
    if (ffwdIndicator) ffwdIndicator.style.display = 'none';
    if (previewBox) previewBox.style.display = 'none';
    if (video && !video.paused) {
      video.play();
    }
  }

  /**
   * OSD Visibility
   */
  function showOSD() {
    if (!osd) return;
    osd.classList.remove('hidden');
    scheduleHideOSD();
  }

  function scheduleHideOSD() {
    if (osdTimeout) clearTimeout(osdTimeout);
    if (!isPlaying || activeDrawer || isSubtitlesOpen || isAudioOpen || isFastForwarding) return;
    osdTimeout = setTimeout(function () {
      if (osd && isPlaying && !activeDrawer && !isSubtitlesOpen && !isAudioOpen && !isFastForwarding) {
        osd.classList.add('hidden');
      }
    }, 4500);
  }

  /**
   * Drawers (Info, InSight, Continue Watching)
   */
  function toggleDrawer(name) {
    if (activeDrawer === name) {
      closeDrawer();
      return;
    }
    closeDrawer();
    closeSubtitles();
    closeAudio();

    activeDrawer = name;
    if (name === 'info' && drawerInfo) {
      drawerInfo.style.display = 'flex';
      if (tabInfo) tabInfo.classList.add('active');
      if (btnFromBeginning && window.MagicRemote) {
        window.MagicRemote.setFocus(btnFromBeginning);
      }
    } else if (name === 'insight' && drawerInsight) {
      drawerInsight.style.display = 'flex';
      if (tabInsight) tabInsight.classList.add('active');
      var firstCard = drawerInsight.querySelector('.insight-cast-card');
      if (firstCard && window.MagicRemote) {
        window.MagicRemote.setFocus(firstCard);
      }
    } else if (name === 'continue' && drawerContinue) {
      drawerContinue.style.display = 'flex';
      if (tabContinue) tabContinue.classList.add('active');
      var firstContinue = drawerContinue.querySelector('.continue-item-card');
      if (firstContinue && window.MagicRemote) {
        window.MagicRemote.setFocus(firstContinue);
      }
    }
  }

  function closeDrawer() {
    activeDrawer = null;
    if (drawerInfo) drawerInfo.style.display = 'none';
    if (drawerInsight) drawerInsight.style.display = 'none';
    if (drawerContinue) drawerContinue.style.display = 'none';

    if (tabInfo) tabInfo.classList.remove('active');
    if (tabInsight) tabInsight.classList.remove('active');
    if (tabContinue) tabContinue.classList.remove('active');

    scheduleHideOSD();
  }

  /**
   * Floating Panels (Subtitles & Audio)
   */
  function toggleSubtitles() {
    if (isSubtitlesOpen) {
      closeSubtitles();
    } else {
      openSubtitles();
    }
  }

  function openSubtitles() {
    closeAudio();
    closeDrawer();
    if (!subtitlesModal) return;
    subtitlesModal.style.display = 'block';
    isSubtitlesOpen = true;
    if (subOptionOff && window.MagicRemote) {
      window.MagicRemote.setFocus(subOptionOff);
    }
  }

  function closeSubtitles() {
    if (subtitlesModal) subtitlesModal.style.display = 'none';
    isSubtitlesOpen = false;
    scheduleHideOSD();
  }

  function toggleAudio() {
    if (isAudioOpen) {
      closeAudio();
    } else {
      openAudio();
    }
  }

  function openAudio() {
    closeSubtitles();
    closeDrawer();
    if (!audioModal) return;
    audioModal.style.display = 'block';
    isAudioOpen = true;
    var activeOpt = audioModal.querySelector('.floating-panel-item.active') || audioModal.querySelector('.floating-panel-item');
    if (activeOpt && window.MagicRemote) {
      window.MagicRemote.setFocus(activeOpt);
    }
  }

  function closeAudio() {
    if (audioModal) audioModal.style.display = 'none';
    isAudioOpen = false;
    scheduleHideOSD();
  }

  /**
   * Populate Info Tab
   */
  function populateInfoDrawer(meta) {
    if (!drawerInfo) return;
    if (drawerInfoThumb) drawerInfoThumb.src = meta.thumb || '';
    if (drawerInfoTitle) drawerInfoTitle.textContent = meta.subTitle || meta.title || 'Apple Original';
    if (drawerInfoSynopsis) drawerInfoSynopsis.textContent = meta.overview || 'Enjoy this exclusive Apple TV+ presentation.';
    if (drawerInfoGenres) drawerInfoGenres.textContent = meta.genres || 'Drama';
    if (drawerInfoEp) drawerInfoEp.textContent = meta.subTitle ? meta.subTitle.split('·')[0].trim() : 'Feature';
    if (drawerInfoRuntime) drawerInfoRuntime.textContent = meta.runtime || '55 mins';
  }

  /**
   * Populate InSight Tab with Cast Members
   */
  function populateInsightDrawer(cast) {
    if (!drawerInsight) return;
    drawerInsight.innerHTML = '';

    var topCast = (cast && cast.length) ? cast.slice(0, 10) : [
      { name: 'Jon Hamm', character: 'Coop', profile_path: null },
      { name: 'Olivia Munn', character: 'Mel', profile_path: null },
      { name: 'Amanda Peet', character: 'Elena', profile_path: null }
    ];

    topCast.forEach(function (actor) {
      var card = document.createElement('div');
      card.className = 'insight-cast-card focusable';
      card.tabIndex = 0;

      var avatar = actor.profile_path
        ? ('https://image.tmdb.org/t/p/w185' + actor.profile_path)
        : 'icons/apple_tv_logo.svg';

      card.innerHTML =
        '<img class="insight-avatar" src="' + avatar + '" alt="' + escapeHTML(actor.name) + '" onerror="this.src=\'icons/apple_tv_logo.svg\'">' +
        '<div class="insight-details">' +
          '<div class="insight-actor">' + escapeHTML(actor.name) + '</div>' +
          '<div class="insight-character">' + escapeHTML(actor.character || 'Cast') + '</div>' +
        '</div>';

      drawerInsight.appendChild(card);
    });
  }

  /**
   * Populate Continue Watching Tab
   */
  function populateContinueDrawer(items) {
    if (!drawerContinue) return;
    drawerContinue.innerHTML = '';

    var displayItems = (items && items.length) ? items.slice(0, 6) : [];
    if (displayItems.length === 0) {
      drawerContinue.innerHTML = '<div style="color: rgba(255,255,255,0.6); padding: 20px;">No additional episodes found.</div>';
      return;
    }

    displayItems.forEach(function (it) {
      var card = document.createElement('div');
      card.className = 'continue-item-card focusable';
      card.tabIndex = 0;

      var thumb = it.backdrop_path
        ? ('https://image.tmdb.org/t/p/w500' + it.backdrop_path)
        : (it.backdrop || it.poster || '');

      var title = it.title || it.name || 'Next Episode';

      card.innerHTML =
        '<div class="continue-card-thumb-wrap" style="position: relative;">' +
          '<img class="continue-card-thumb" src="' + thumb + '" alt="' + escapeHTML(title) + '">' +
          '<div style="position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 4px; font-size: 11px; color: #fff;"> tv</div>' +
        '</div>' +
        '<div class="continue-card-info">' +
          '<div class="continue-card-title">' + escapeHTML(title) + '</div>' +
        '</div>';

      card.addEventListener('click', function () {
        closePlayer();
      });

      drawerContinue.appendChild(card);
    });
  }

  /**
   * Remote Key Handling in Video Player
   */
  function handlePlayerKeys(e) {
    if (!isPlayerOpen) return;
    var code = e.keyCode || e.which;

    // Back key (461 / 27)
    if (code === 461 || code === 27) {
      e.preventDefault();
      e.stopPropagation();

      if (isSubtitlesOpen) {
        closeSubtitles();
        if (subtitlesBtn && window.MagicRemote) window.MagicRemote.setFocus(subtitlesBtn);
        return;
      }
      if (isAudioOpen) {
        closeAudio();
        if (audioBtn && window.MagicRemote) window.MagicRemote.setFocus(audioBtn);
        return;
      }
      if (activeDrawer) {
        var targetTab = (activeDrawer === 'info') ? tabInfo : (activeDrawer === 'insight' ? tabInsight : tabContinue);
        closeDrawer();
        if (targetTab && window.MagicRemote) window.MagicRemote.setFocus(targetTab);
        return;
      }

      closePlayer();
      return;
    }

    // Media Keys
    if (code === 415) { // Play
      play();
      e.preventDefault();
      return;
    }
    if (code === 19) { // Pause
      pause();
      e.preventDefault();
      return;
    }
    if (code === 417) { // Fast-Forward
      startFastForward();
      e.preventDefault();
      return;
    }
    if (code === 412) { // Rewind
      startRewind();
      e.preventDefault();
      return;
    }
    if (code === 413) { // Stop
      closePlayer();
      e.preventDefault();
      return;
    }

    // Enter / OK (13)
    if (code === 13) {
      if (isFastForwarding) {
        stopFastForward();
        e.preventDefault();
        return;
      }
      // If OSD is hidden, pressing OK shows OSD
      if (osd && osd.classList.contains('hidden')) {
        showOSD();
        e.preventDefault();
        return;
      }
    }

    // Down Arrow (40): Brings OSD up or moves down to pills
    if (code === 40) {
      if (osd && osd.classList.contains('hidden')) {
        showOSD();
        if (timeline && window.MagicRemote) window.MagicRemote.setFocus(timeline);
        e.preventDefault();
        return;
      }
      showOSD();
      var active = document.activeElement;
      if (active === timeline) {
        if (tabInfo && window.MagicRemote) window.MagicRemote.setFocus(tabInfo);
        e.preventDefault();
        return;
      }
    }

    // Up Arrow (38)
    if (code === 38) {
      if (isSubtitlesOpen) {
        closeSubtitles();
        if (subtitlesBtn && window.MagicRemote) window.MagicRemote.setFocus(subtitlesBtn);
        e.preventDefault();
        return;
      }
      if (isAudioOpen) {
        closeAudio();
        if (audioBtn && window.MagicRemote) window.MagicRemote.setFocus(audioBtn);
        e.preventDefault();
        return;
      }
      if (activeDrawer) {
        var returnTab = (activeDrawer === 'info') ? tabInfo : (activeDrawer === 'insight' ? tabInsight : tabContinue);
        closeDrawer();
        if (returnTab && window.MagicRemote) window.MagicRemote.setFocus(returnTab);
        e.preventDefault();
        return;
      }
      var activeEl = document.activeElement;
      if (activeEl === tabInfo || activeEl === tabInsight || activeEl === tabContinue || activeEl === subtitlesBtn || activeEl === audioBtn) {
        if (timeline && window.MagicRemote) window.MagicRemote.setFocus(timeline);
        e.preventDefault();
        return;
      }
      if (activeEl === timeline) {
        if (osd) osd.classList.add('hidden');
        e.preventDefault();
        return;
      }
    }

    // Right Arrow (39) on Timeline: Fast-Forward
    if (code === 39) {
      var focused = document.activeElement;
      if (focused === timeline && !activeDrawer && !isSubtitlesOpen && !isAudioOpen) {
        startFastForward();
        e.preventDefault();
        return;
      }
    }

    // Left Arrow (37) on Timeline: Rewind
    if (code === 37) {
      var foc = document.activeElement;
      if (foc === timeline && !activeDrawer && !isSubtitlesOpen && !isAudioOpen) {
        startRewind();
        e.preventDefault();
        return;
      }
    }
  }

  function closePlayer() {
    if (!container || !video) return;
    stopFastForward();
    closeDrawer();
    closeSubtitles();
    closeAudio();

    video.pause();
    video.removeAttribute('src');
    video.load();

    container.style.display = 'none';
    isPlayerOpen = false;

    // Refocus modal play button
    var modalPlay = document.getElementById('modal-play-btn');
    if (modalPlay && window.MagicRemote) {
      window.MagicRemote.setFocus(modalPlay);
    }
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return {
    init: init,
    load: load,
    play: play,
    pause: pause,
    togglePlay: togglePlay,
    seek: seek,
    close: closePlayer,
    isOpen: function () {
      return isPlayerOpen;
    }
  };
})();

// Auto-initialize StreamPlayer on DOM load
document.addEventListener('DOMContentLoaded', function () {
  StreamPlayer.init();
});
