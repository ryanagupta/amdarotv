/**
 * Streaming Video Player Controller for webOS TV
 * Integrates HTML5 video with Stremio streams, OSD controls, and Magic Remote
 */

var StreamPlayer = (function () {
  var container = null;
  var video = null;
  var osd = null;
  var titleEl = null;
  var progressBar = null;
  var progressFill = null;
  var timeDisplay = null;
  var playBtn = null;
  var playIcon = null;
  var backBtn = null;
  var audioBtn = null;
  var audioCurrent = null;
  var audioMenu = null;
  var audioList = null;

  var isPlaying = false;
  var isPlayerOpen = false;
  var isAudioMenuOpen = false;
  var osdTimeout = null;
  var currentAudioTrackIdx = 0;

  var DEFAULT_AUDIO_TRACKS = [
    { id: 'en', label: 'English (Original)', shortCode: 'EN' },
    { id: 'es', label: 'Spanish (Español)', shortCode: 'ES' },
    { id: 'fr', label: 'French (Français)', shortCode: 'FR' },
    { id: 'de', label: 'German (Deutsch)', shortCode: 'DE' },
    { id: 'it', label: 'Italian (Italiano)', shortCode: 'IT' },
    { id: 'ja', label: 'Japanese (日本語)', shortCode: 'JA' }
  ];

  function init() {
    container = document.getElementById('video-player-container');
    video = document.getElementById('stream-video');
    osd = document.getElementById('player-osd');
    titleEl = document.getElementById('player-title');
    progressBar = document.getElementById('player-progress-bar');
    progressFill = document.getElementById('player-progress-fill');
    timeDisplay = document.getElementById('player-time-display');
    playBtn = document.getElementById('player-play-btn');
    playIcon = document.getElementById('player-play-icon');
    backBtn = document.getElementById('player-back-btn');
    audioBtn = document.getElementById('player-audio-btn');
    audioCurrent = document.getElementById('player-audio-current');
    audioMenu = document.getElementById('player-audio-menu');
    audioList = document.getElementById('player-audio-list');

    if (!video) return;

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('play', function () {
      isPlaying = true;
      updatePlayButtonUI();
    });
    video.addEventListener('pause', function () {
      isPlaying = false;
      updatePlayButtonUI();
    });
    video.addEventListener('ended', function () {
      isPlaying = false;
      updatePlayButtonUI();
      showOSD();
    });

    if (playBtn) {
      playBtn.addEventListener('click', togglePlay);
    }

    if (backBtn) {
      backBtn.addEventListener('click', closePlayer);
    }

    if (audioBtn) {
      audioBtn.addEventListener('click', toggleAudioMenu);
    }

    if (progressBar) {
      progressBar.addEventListener('click', function (e) {
        var rect = progressBar.getBoundingClientRect();
        var pos = (e.clientX - rect.left) / rect.width;
        if (video.duration) {
          video.currentTime = pos * video.duration;
        }
      });
    }

    // Key handling when player is open
    document.addEventListener('keydown', handlePlayerKeys, true);
  }

  function handlePlayerKeys(e) {
    if (!isPlayerOpen) return;

    var code = e.keyCode || e.which;
    showOSD();

    // webOS Back key (461) or Escape (27)
    if (code === 461 || code === 27) {
      e.preventDefault();
      e.stopPropagation();
      if (isAudioMenuOpen) {
        closeAudioMenu();
        if (audioBtn && window.MagicRemote) {
          window.MagicRemote.setFocus(audioBtn);
        }
        return;
      }
      closePlayer();
      return;
    }

    // Play/Pause key (415 = Play, 19 = Pause)
    if (code === 415) {
      play();
      e.preventDefault();
    } else if (code === 19) {
      pause();
      e.preventDefault();
    } else if (code === 37 && !isAudioMenuOpen) {
      // Rewind 10s
      seek(-10);
      e.preventDefault();
    } else if (code === 39 && !isAudioMenuOpen) {
      // Forward 10s
      seek(10);
      e.preventDefault();
    }
  }

  function toggleAudioMenu() {
    if (isAudioMenuOpen) {
      closeAudioMenu();
    } else {
      openAudioMenu();
    }
  }

  function openAudioMenu() {
    if (!audioMenu || !audioList) return;
    buildAudioTrackList();
    audioMenu.style.display = 'block';
    isAudioMenuOpen = true;

    // Focus active track
    var activeItem = audioList.querySelector('.audio-track-item.active') || audioList.querySelector('.audio-track-item');
    if (activeItem && window.MagicRemote) {
      window.MagicRemote.setFocus(activeItem);
    }
  }

  function closeAudioMenu() {
    if (!audioMenu) return;
    audioMenu.style.display = 'none';
    isAudioMenuOpen = false;
  }

  function buildAudioTrackList() {
    if (!audioList) return;
    audioList.innerHTML = '';

    var tracks = [];
    if (video.audioTracks && video.audioTracks.length > 0) {
      for (var i = 0; i < video.audioTracks.length; i++) {
        var t = video.audioTracks[i];
        tracks.push({
          index: i,
          label: t.label || t.language || ('Track ' + (i + 1)),
          shortCode: (t.language || 'TRK').toUpperCase().slice(0, 3),
          enabled: t.enabled
        });
      }
    } else {
      // Fallback tracks
      for (var j = 0; j < DEFAULT_AUDIO_TRACKS.length; j++) {
        tracks.push({
          index: j,
          label: DEFAULT_AUDIO_TRACKS[j].label,
          shortCode: DEFAULT_AUDIO_TRACKS[j].shortCode,
          enabled: j === currentAudioTrackIdx
        });
      }
    }

    for (var k = 0; k < tracks.length; k++) {
      (function (track) {
        var item = document.createElement('button');
        item.className = 'audio-track-item focusable' + (track.enabled ? ' active' : '');
        item.tabIndex = 0;
        item.innerHTML =
          '<span class="audio-track-label">' + track.label + '</span>' +
          (track.enabled ? '<span class="audio-track-check">✓</span>' : '');

        item.addEventListener('click', function (e) {
          e.stopPropagation();
          selectAudioTrack(track);
        });

        audioList.appendChild(item);
      })(tracks[k]);
    }
  }

  function selectAudioTrack(track) {
    currentAudioTrackIdx = track.index;

    // Switch native HTML5 audio track if available
    if (video.audioTracks && video.audioTracks.length > 0) {
      for (var i = 0; i < video.audioTracks.length; i++) {
        video.audioTracks[i].enabled = (i === track.index);
      }
    }

    if (audioCurrent) {
      audioCurrent.textContent = 'Audio: ' + track.shortCode;
    }

    closeAudioMenu();
    if (audioBtn && window.MagicRemote) {
      window.MagicRemote.setFocus(audioBtn);
    }
  }

  function load(url, meta) {
    if (!container || !video) init();
    if (!container || !video) return;

    meta = meta || {};
    if (titleEl) titleEl.textContent = meta.title || 'Now Playing';
    if (audioCurrent) audioCurrent.textContent = 'Audio: EN';
    closeAudioMenu();

    video.src = url;
    video.load();

    container.style.display = 'block';
    isPlayerOpen = true;

    showOSD();

    if (playBtn && window.MagicRemote) {
      window.MagicRemote.setFocus(playBtn);
    }
  }

  function play() {
    if (!video) return;
    video.play().then(function () {
      isPlaying = true;
      updatePlayButtonUI();
      scheduleHideOSD();
    }).catch(function (e) {
      console.warn('Playback error:', e);
    });
  }

  function pause() {
    if (!video) return;
    video.pause();
    isPlaying = false;
    updatePlayButtonUI();
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
    updateProgress();
  }

  function updateProgress() {
    if (!video || !video.duration) return;
    var percent = (video.currentTime / video.duration) * 100;
    if (progressFill) progressFill.style.width = percent + '%';
    if (timeDisplay) {
      timeDisplay.textContent = formatTime(video.currentTime) + ' / ' + formatTime(video.duration);
    }
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
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updatePlayButtonUI() {
    if (!playIcon) return;
    if (isPlaying) {
      // Show pause icon
      playIcon.innerHTML =
        '<rect x="6" y="4" width="4" height="16"/>' +
        '<rect x="14" y="4" width="4" height="16"/>';
    } else {
      // Show play icon
      playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
    }
  }

  function showOSD() {
    if (!osd) return;
    osd.classList.remove('hidden');
    scheduleHideOSD();
  }

  function scheduleHideOSD() {
    if (osdTimeout) clearTimeout(osdTimeout);
    if (!isPlaying) return; // Keep visible when paused
    osdTimeout = setTimeout(function () {
      if (osd && isPlaying) {
        osd.classList.add('hidden');
      }
    }, 4000);
  }

  function closePlayer() {
    if (!container || !video) return;
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
