/**
 * Media Search & Discovery Engine for webOS 4.0 (Chromium 53)
 * Integrates TMDB (Movies & TV) and TVDB
 * TMDB API Key: 1dbff444724afdb19b4bf5e8cc1c98b8
 * TVDB API Key: 7dceeb2b-1e71-4d2f-8227-d6b1d628aab3
 */

var MediaSearch = (function () {
  'use strict';

  var TMDB_KEY = '1dbff444724afdb19b4bf5e8cc1c98b8';
  var TVDB_KEY = '7dceeb2b-1e71-4d2f-8227-d6b1d628aab3';
  var TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w500';
  var TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/original';
  var STREMIO_BASE = 'https://aiostreams.elfhosted.com/stremio/f7e141bd-d649-45de-bc9f-74ffa42a3436/eyJpIjoidVF6cVhJS1Q3V2dYOTNUT1J3UmpIQT09IiwiZSI6ImdEYjNHdFVtQjF0Mi9OeVF0UVc4RzNhZ09wSG1odnZzUnhmT01uZFoyV009IiwidCI6ImEifQ';

  var resultsContainer = null;
  var detailsModal = null;
  var searchInput = null;
  var searchTimeout = null;
  var currentQuery = '';
  var isModalOpen = false;
  var lastSelectedTile = null;

  function init() {
    resultsContainer = document.getElementById('search-results-grid');
    detailsModal = document.getElementById('media-details-modal');
    searchInput = document.getElementById('search-input');

    if (!resultsContainer) return;

    // Listen to input changes from OSK or remote
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        var query = searchInput.value.trim();
        if (query !== currentQuery) {
          currentQuery = query;
          clearTimeout(searchTimeout);
          searchTimeout = setTimeout(function () {
            performSearch(currentQuery);
          }, 350);
        }
      });
    }

    // Modal close button
    var modalCloseBtn = document.getElementById('modal-close-btn');
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', function () {
        closeDetails();
      });
    }

    // Register Back button (webOS 461) to close modal
    if (window.MagicRemote && typeof window.MagicRemote.pushBackHandler === 'function') {
      window.MagicRemote.pushBackHandler(function () {
        if (isModalOpen) {
          closeDetails();
          return true; // handled
        }
        return false;
      });
    }

    // Initial load: trending popular titles
    loadTrending();

    console.log('[Search] MediaSearch initialized with TMDB & TVDB.');
  }

  /**
   * Load trending movies & shows on launch so dead space is filled
   */
  function loadTrending() {
    renderLoading('Discovering trending movies & shows...');

    var url = 'https://api.themoviedb.org/3/trending/all/day?api_key=' + TMDB_KEY;
    fetchJSON(url, function (err, data) {
      if (err || !data || !data.results) {
        renderError('Unable to load trending titles. Check internet connection.');
        return;
      }
      var items = normalizeResults(data.results);
      renderResults(items);
    });
  }

  /**
   * Search Movies (TMDB) & TV Shows (TMDB/TVDB)
   */
  function performSearch(query) {
    if (!query) {
      loadTrending();
      return;
    }

    renderLoading('Searching for "' + escapeHTML(query) + '"...');

    var encoded = encodeURIComponent(query);
    var movieUrl = 'https://api.themoviedb.org/3/search/movie?api_key=' + TMDB_KEY + '&query=' + encoded;
    var tvUrl = 'https://api.themoviedb.org/3/search/tv?api_key=' + TMDB_KEY + '&query=' + encoded;

    var pending = 2;
    var allItems = [];

    function checkDone() {
      pending--;
      if (pending === 0) {
        if (allItems.length === 0) {
          renderEmpty('No results found for "' + escapeHTML(query) + '"');
        } else {
          // Sort by popularity
          allItems.sort(function (a, b) {
            return (b.popularity || 0) - (a.popularity || 0);
          });
          renderResults(allItems);
        }
      }
    }

    // Search Movies
    fetchJSON(movieUrl, function (err, data) {
      if (!err && data && data.results) {
        var movies = normalizeResults(data.results, 'movie');
        allItems = allItems.concat(movies);
      }
      checkDone();
    });

    // Search TV Shows
    fetchJSON(tvUrl, function (err, data) {
      if (!err && data && data.results) {
        var shows = normalizeResults(data.results, 'tv');
        allItems = allItems.concat(shows);
      }
      checkDone();
    });
  }

  /**
   * Normalize TMDB and TV data into unified structure
   */
  function normalizeResults(rawList, forcedType) {
    var out = [];
    for (var i = 0; i < rawList.length; i++) {
      var item = rawList[i];
      var mediaType = forcedType || item.media_type || (item.title ? 'movie' : 'tv');
      if (mediaType === 'person') continue;

      var title = item.title || item.name || item.original_title || item.original_name || 'Untitled';
      var releaseDate = item.release_date || item.first_air_date || '';
      var year = releaseDate ? releaseDate.substring(0, 4) : '';
      var rating = item.vote_average ? item.vote_average.toFixed(1) : null;
      var poster = item.poster_path ? (TMDB_IMG_BASE + item.poster_path) : null;
      var backdrop = item.backdrop_path ? (TMDB_BACKDROP_BASE + item.backdrop_path) : poster;

      out.push({
        id: item.id,
        mediaType: mediaType,
        title: title,
        year: year,
        rating: rating,
        poster: poster,
        backdrop: backdrop,
        overview: item.overview || 'No overview available.',
        popularity: item.popularity || 0,
        voteCount: item.vote_count || 0
      });
    }
    return out;
  }

  var currentItemsList = [];

  /**
   * Render tiles into results grid
   */
  function renderResults(items) {
    if (!resultsContainer) return;
    resultsContainer.innerHTML = '';
    currentItemsList = items || [];

    for (var i = 0; i < currentItemsList.length; i++) {
      var item = currentItemsList[i];
      var card = createCardElement(item, i);
      resultsContainer.appendChild(card);
    }
  }

  function createCardElement(item, index) {
    var card = document.createElement('div');
    card.className = 'media-tile focusable';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', item.title + (item.year ? ' (' + item.year + ')' : ''));

    var posterHtml = item.poster
      ? '<img class="tile-poster" src="' + item.poster + '" alt="' + escapeHTML(item.title) + '" loading="lazy">'
      : '<div class="tile-poster-placeholder"><span class="placeholder-icon">🎬</span><span class="placeholder-text">' + escapeHTML(item.title) + '</span></div>';

    // Pure tile cover image: No titles underneath, no content on the tile
    card.innerHTML = posterHtml;

    card.addEventListener('click', function () {
      lastSelectedTile = card;
      if (window.DetailView) {
        DetailView.open(item, currentItemsList, index);
      } else {
        openDetails(item);
      }
    });

    return card;
  }

  function parseStreamInfo(stream) {
    var rawTitle = (stream.title || stream.description || '') + ' ' + (stream.name || '');
    var quality = '1080P';
    if (/4k|2160p|uhd/i.test(rawTitle)) {
      quality = '4K UHD';
    } else if (/1080p|fhd/i.test(rawTitle)) {
      quality = '1080P HD';
    } else if (/720p|hd/i.test(rawTitle)) {
      quality = '720P HD';
    }

    var provider = 'Direct';
    if (/\[rd\+\]|realdebrid|real-debrid/i.test(rawTitle)) {
      provider = '⚡ Real-Debrid';
    } else if (/torrentio/i.test(rawTitle)) {
      provider = 'Torrentio';
    } else if (/aiostreams/i.test(rawTitle)) {
      provider = 'AIOStreams';
    }

    var audio = '';
    if (/atmos/i.test(rawTitle)) audio = 'Dolby Atmos';
    else if (/dts-hd|dts/i.test(rawTitle)) audio = 'DTS-HD';
    else if (/ddp|eac3|5\.1/i.test(rawTitle)) audio = '5.1 Audio';

    var sizeMatch = rawTitle.match(/([0-9]+(?:\.[0-9]+)?\s*(?:GB|MB))/i);
    var size = sizeMatch ? sizeMatch[1].toUpperCase() : '';

    var metaDetails = [provider, audio, size].filter(Boolean).join(' • ');

    return {
      quality: quality,
      provider: provider,
      details: metaDetails || (stream.name || 'High Speed Stream')
    };
  }

  /**
   * Fetch and display detailed metadata & actor cast
   */
  function openDetails(item) {
    if (window.DetailView) {
      var idx = currentItemsList.indexOf(item);
      DetailView.open(item, currentItemsList, idx >= 0 ? idx : 0);
      return;
    }
    if (!detailsModal) return;
    isModalOpen = true;
    detailsModal.setAttribute('aria-hidden', 'false');

    var backdropEl = document.getElementById('modal-backdrop-img');
    var posterEl = document.getElementById('modal-poster-img');
    var titleEl = document.getElementById('modal-title');
    var metaEl = document.getElementById('modal-meta-strip');
    var overviewEl = document.getElementById('modal-overview');
    var castGridEl = document.getElementById('modal-cast-grid');
    var playBtn = document.getElementById('modal-play-btn');
    var playText = document.getElementById('modal-play-text');
    var streamSelector = document.getElementById('modal-stream-selector');
    var streamList = document.getElementById('modal-stream-list');
    var streamCloseBtn = document.getElementById('modal-stream-close-btn');

    if (backdropEl) backdropEl.style.backgroundImage = item.backdrop ? 'url(' + item.backdrop + ')' : 'none';
    if (posterEl) posterEl.src = item.poster || '';
    if (titleEl) titleEl.textContent = item.title;
    if (overviewEl) overviewEl.textContent = item.overview;

    var typeText = item.mediaType === 'tv' ? 'TV Series' : 'Movie';
    var ratingText = item.rating ? '★ ' + item.rating + ' (' + item.voteCount + ' votes)' : '';
    if (metaEl) {
      metaEl.innerHTML =
        '<span class="meta-pill type">' + typeText + '</span>' +
        (item.year ? '<span class="meta-pill year">' + item.year + '</span>' : '') +
        (ratingText ? '<span class="meta-pill rating">' + ratingText + '</span>' : '');
    }

    if (castGridEl) {
      castGridEl.innerHTML = '<div class="loading-cast">Loading cast & actor info...</div>';
    }

    if (streamSelector) {
      streamSelector.style.display = 'none';
    }
    if (playText) {
      playText.textContent = 'Play Now';
    }

    if (streamCloseBtn) {
      streamCloseBtn.onclick = function () {
        if (streamSelector) streamSelector.style.display = 'none';
        if (playBtn && window.MagicRemote) {
          window.MagicRemote.setFocus(playBtn);
        }
      };
    }

    // Hook up Stremio Add-on Playback
    if (playBtn) {
      playBtn.onclick = function () {
        if (playText) playText.textContent = 'Finding Streams...';
        playBtn.setAttribute('disabled', 'true');

        var stremioType = item.mediaType === 'tv' ? 'series' : 'movie';
        var stremioId = item.mediaType === 'tv' ? ('tmdb:' + item.id + ':1:1') : ('tmdb:' + item.id);
        var stremioUrl = STREMIO_BASE + '/stream/' + stremioType + '/' + stremioId + '.json';

        fetchJSON(stremioUrl, function (err, data) {
          playBtn.removeAttribute('disabled');
          if (playText) playText.textContent = 'Play Now';

          if (err || !data || !data.streams || data.streams.length === 0) {
            alert('No streams found for this title.');
            return;
          }

          var streams = data.streams;

          // If stream selector sheet exists, populate and display it
          if (streamSelector && streamList) {
            streamList.innerHTML = '';
            streamSelector.style.display = 'block';

            var count = Math.min(streams.length, 6);
            for (var s = 0; s < count; s++) {
              (function (st) {
                var info = parseStreamInfo(st);

                var card = document.createElement('button');
                card.className = 'stream-card-btn focusable';
                card.tabIndex = 0;

                card.innerHTML =
                  '<div class="stream-card-left">' +
                    '<span class="stream-card-quality">' + escapeHTML(info.quality) + '</span>' +
                    '<span class="stream-card-details">' + escapeHTML(info.details) + '</span>' +
                  '</div>' +
                  '<div class="stream-card-right">' +
                    '<span class="stream-play-pill">Play <svg viewBox="0 0 24 24" fill="currentColor" style="width: 12px; height: 12px; margin-left: 4px;"><polygon points="5 3 19 12 5 21 5 3"/></svg></span>' +
                  '</div>';

                card.addEventListener('click', function () {
                  if (window.StreamPlayer) {
                    window.StreamPlayer.load(st.url, { title: item.title, quality: info.quality });
                    window.StreamPlayer.play();
                  }
                });

                streamList.appendChild(card);
              })(streams[s]);
            }

            var firstBtn = streamList.querySelector('.stream-card-btn');
            if (firstBtn && window.MagicRemote) {
              window.MagicRemote.setFocus(firstBtn);
            }
          } else {
            // Direct auto-play first stream
            if (window.StreamPlayer) {
              window.StreamPlayer.load(streams[0].url, { title: item.title, quality: streams[0].name || '1080P' });
              window.StreamPlayer.play();
            }
          }
        });
      };
    }

    detailsModal.classList.add('open');

    // Focus play button immediately on modal open
    setTimeout(function () {
      if (playBtn && window.MagicRemote) {
        window.MagicRemote.setFocus(playBtn);
      }
    }, 60);

    // Fetch credits & actors from TMDB
    var creditsUrl = 'https://api.themoviedb.org/3/' + item.mediaType + '/' + item.id + '/credits?api_key=' + TMDB_KEY;
    fetchJSON(creditsUrl, function (err, data) {
      if (!castGridEl) return;
      if (err || !data || !data.cast || data.cast.length === 0) {
        castGridEl.innerHTML = '<div class="no-cast">Cast information not available.</div>';
        return;
      }

      var cast = data.cast.slice(0, 10); // top 10 actors
      castGridEl.innerHTML = '';

      for (var i = 0; i < cast.length; i++) {
        var actor = cast[i];
        var actorCard = document.createElement('div');
        actorCard.className = 'actor-card';

        var photoHtml = actor.profile_path
          ? '<img class="actor-photo" src="' + TMDB_IMG_BASE + actor.profile_path + '" alt="' + escapeHTML(actor.name) + '">'
          : '<div class="actor-photo-placeholder">👤</div>';

        actorCard.innerHTML =
          photoHtml +
          '<div class="actor-info">' +
            '<div class="actor-name">' + escapeHTML(actor.name) + '</div>' +
            '<div class="actor-character">' + escapeHTML(actor.character || '') + '</div>' +
          '</div>';

        castGridEl.appendChild(actorCard);
      }
    });
  }

  function closeDetails() {
    if (!detailsModal) return;
    isModalOpen = false;
    detailsModal.setAttribute('aria-hidden', 'true');
    detailsModal.classList.remove('open');

    // Return focus to last selected card or search input
    if (window.MagicRemote) {
      if (lastSelectedTile && document.contains(lastSelectedTile)) {
        window.MagicRemote.setFocus(lastSelectedTile);
      } else {
        var firstCard = resultsContainer ? resultsContainer.querySelector('.media-tile') : null;
        if (firstCard) {
          window.MagicRemote.setFocus(firstCard);
        } else if (searchInput) {
          var box = document.querySelector('.search-input-box');
          if (box) window.MagicRemote.setFocus(box);
        }
      }
    }
  }

  function renderLoading(msg) {
    if (!resultsContainer) return;
    resultsContainer.innerHTML =
      '<div class="results-state-msg">' +
        '<div class="spinner"></div>' +
        '<span>' + msg + '</span>' +
      '</div>';
  }

  function renderEmpty(msg) {
    if (!resultsContainer) return;
    resultsContainer.innerHTML =
      '<div class="results-state-msg empty">' +
        '<div class="state-icon">🔍</div>' +
        '<span>' + msg + '</span>' +
      '</div>';
  }

  function renderError(msg) {
    if (!resultsContainer) return;
    resultsContainer.innerHTML =
      '<div class="results-state-msg error">' +
        '<div class="state-icon">⚠️</div>' +
        '<span>' + msg + '</span>' +
      '</div>';
  }

  function fetchJSON(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.timeout = 8000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            var data = JSON.parse(xhr.responseText);
            callback(null, data);
          } catch (e) {
            callback(e);
          }
        } else {
          callback(new Error('HTTP status ' + xhr.status));
        }
      }
    };
    xhr.ontimeout = function () {
      callback(new Error('Request timed out'));
    };
    xhr.onerror = function () {
      callback(new Error('Network error'));
    };
    xhr.send();
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
    search: performSearch,
    loadTrending: loadTrending,
    closeDetails: closeDetails,
    isModalOpen: function () {
      return isModalOpen;
    }
  };
})();
