/**
 * Media Search & Discovery Engine for webOS 4.0 (Chromium 53)
 * Exact 1:1 Apple TV+ Search Experience
 * - Empty State: Curated Browse Grid (Ted Lasso, MLS, 4K HDR, Action, Comedy...)
 * - Search State: Dynamic Suggestions Bar, Category Tabs (Top Results vs Movies)
 * - Top Results Tab: Wide Horizontal Glass Cards
 * - Movies Tab: Apple TV+ 2:3 Vertical Posters with Focused Subtitle
 * - Apple TV+ 7-Card Loading Skeleton Shimmer Animation
 * TMDB API Key: 1dbff444724afdb19b4bf5e8cc1c98b8
 * TVDB API Key: 7dceeb2b-1e71-4d2f-8227-d6b1d628aab3
 */

var MediaSearch = (function () {
  'use strict';

  var TMDB_KEY = '1dbff444724afdb19b4bf5e8cc1c98b8';
  var TVDB_KEY = '7dceeb2b-1e71-4d2f-8227-d6b1d628aab3';
  var TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w500';
  var TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/original';

  var searchInput = null;
  var searchDisplay = null;
  var suggestionsBar = null;
  var sugg1 = null;
  var sugg1Text = null;
  var sugg2 = null;
  var sugg2Text = null;
  var categoryTabs = null;
  var tabTop = null;
  var tabMovies = null;
  var browseSection = null;
  var browseGrid = null;
  var resultsSection = null;
  var resultsGrid = null;
  var skeletonLoader = null;
  var topBackPill = null;

  var currentQuery = '';
  var currentTab = 'top'; // 'top' or 'movies'
  var searchTimeout = null;
  var currentItemsList = [];
  var currentGenreFilter = null;

  var GENRES = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Sci-Fi',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western',
    10759: 'Action & Adventure',
    10765: 'Sci-Fi & Fantasy'
  };

  function init() {
    searchInput = document.getElementById('search-input');
    searchDisplay = document.getElementById('search-query-display');
    suggestionsBar = document.getElementById('search-suggestions-bar');
    sugg1 = document.getElementById('sugg-pill-1');
    sugg1Text = document.getElementById('sugg-text-1');
    sugg2 = document.getElementById('sugg-pill-2');
    sugg2Text = document.getElementById('sugg-text-2');
    categoryTabs = document.getElementById('search-category-tabs');
    tabTop = document.getElementById('tab-top-results');
    tabMovies = document.getElementById('tab-movies');
    browseSection = document.getElementById('search-browse-section');
    browseGrid = document.getElementById('search-browse-grid');
    resultsSection = document.getElementById('search-results-section');
    resultsGrid = document.getElementById('search-results-grid');
    skeletonLoader = document.getElementById('search-skeleton-loader');
    topBackPill = document.getElementById('search-top-pill');

    // Input event from OSK
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        var q = searchInput.value.trim();
        onQueryChanged(q);
      });
    }

    // Top-Left Pill (< Search)
    if (topBackPill) {
      topBackPill.addEventListener('click', function () {
        resetSearch();
      });
    }

    // Category Tabs
    if (tabTop) {
      tabTop.addEventListener('click', function () {
        switchTab('top');
      });
    }
    if (tabMovies) {
      tabMovies.addEventListener('click', function () {
        switchTab('movies');
      });
    }

    // Suggestions Pills
    if (sugg1) {
      sugg1.addEventListener('click', function () {
        if (sugg1Text && sugg1Text.textContent) {
          applyQuery(sugg1Text.textContent);
        }
      });
    }
    if (sugg2) {
      sugg2.addEventListener('click', function () {
        if (sugg2Text && sugg2Text.textContent) {
          applyQuery(sugg2Text.textContent);
        }
      });
    }

    // Build the initial Browse grid (Image 1)
    renderBrowseGrid();

    console.log('[Search] MediaSearch Apple TV+ replica initialized.');
  }

  function resetSearch() {
    if (window.OnScreenKeyboard) {
      window.OnScreenKeyboard.clearText();
      window.OnScreenKeyboard.expandFromLeft();
    }
    onQueryChanged('');
    if (window.MagicRemote) {
      var firstKey = document.querySelector('#onscreen-keyboard .kb-key');
      if (firstKey) window.MagicRemote.setFocus(firstKey);
    }
  }

  function applyQuery(query) {
    if (window.OnScreenKeyboard) {
      window.OnScreenKeyboard.setText(query);
    } else if (searchInput) {
      searchInput.value = query;
    }
    onQueryChanged(query);
  }

  function onQueryChanged(q) {
    currentQuery = q;
    currentGenreFilter = null;

    if (!q) {
      // Empty query state (Image 1)
      if (searchDisplay) {
        searchDisplay.textContent = 'Movies, Shows, Cast, and More';
        searchDisplay.classList.add('empty');
      }
      if (suggestionsBar) suggestionsBar.style.display = 'none';
      if (categoryTabs) categoryTabs.style.display = 'none';
      if (resultsSection) resultsSection.style.display = 'none';
      if (browseSection) browseSection.style.display = 'block';
      if (skeletonLoader) skeletonLoader.style.display = 'none';
      return;
    }

    // Active query state (Images 2, 3, 4)
    if (searchDisplay) {
      searchDisplay.textContent = q;
      searchDisplay.classList.remove('empty');
    }

    // Update suggestions pills
    if (suggestionsBar) {
      suggestionsBar.style.display = 'flex';
      if (sugg1Text) sugg1Text.textContent = q;
      if (sugg2Text) sugg2Text.textContent = 'movies from ' + q;
    }

    // Show category tabs
    if (categoryTabs) {
      categoryTabs.style.display = 'block';
    }

    // Hide browse, show results
    if (browseSection) browseSection.style.display = 'none';
    if (resultsSection) resultsSection.style.display = 'block';

    // Show skeleton shimmer loading animation (Image 5)
    showSkeleton(true);

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function () {
      executeSearch(q);
    }, 320);
  }

  function switchTab(tab) {
    currentTab = tab;
    if (tab === 'movies') {
      if (tabTop) tabTop.classList.remove('active');
      if (tabMovies) tabMovies.classList.add('active');
    } else {
      if (tabMovies) tabMovies.classList.remove('active');
      if (tabTop) tabTop.classList.add('active');
    }

    // Re-render results in new tab layout
    renderResults(currentItemsList);
  }

  function showSkeleton(show) {
    if (!skeletonLoader) return;
    skeletonLoader.style.display = show ? 'flex' : 'none';
  }

  /**
   * Render Curated Apple TV+ Browse Section (Image 1)
   */
  function renderBrowseGrid() {
    if (!browseGrid) return;
    browseGrid.innerHTML = '';

    var browseItems = [
      {
        id: 'ted_lasso',
        title: 'Ted Lasso',
        image: 'https://image.tmdb.org/t/p/w500/5fhZdwPmsUm9y0RkC775y1b4mF4.jpg',
        badge: 'icons/apple_tv_logo.svg',
        type: 'featured',
        mediaType: 'tv',
        tmdbId: 97546
      },
      {
        id: 'mls',
        title: 'MLS Season Pass',
        image: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
        badge: 'icons/mls_crest.svg',
        type: 'featured'
      },
      {
        id: '4k_hdr',
        title: '4K HDR',
        isGradient: true,
        gradientCss: 'linear-gradient(135deg, #1d63ff 0%, #a429b9 50%, #e60067 100%)',
        type: 'collection'
      },
      {
        id: 'action',
        title: 'Action',
        image: 'https://image.tmdb.org/t/p/w500/wRnbWt44nKjs3nsLIIwknvJN54Y.jpg',
        genreId: 28,
        type: 'genre'
      },
      {
        id: 'comedy',
        title: 'Comedy',
        image: 'https://image.tmdb.org/t/p/w500/eU0b6F93P6bS55B810WqC9o2K4k.jpg',
        genreId: 35,
        type: 'genre'
      },
      {
        id: 'scifi',
        title: 'Sci-Fi',
        image: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
        genreId: 878,
        type: 'genre'
      },
      {
        id: 'horror',
        title: 'Horror',
        image: 'https://image.tmdb.org/t/p/w500/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg',
        genreId: 27,
        type: 'genre'
      },
      {
        id: 'animation',
        title: 'Animation',
        image: 'https://image.tmdb.org/t/p/w500/kDp1vUBnMpe8ak4rjgl3cLELqjU.jpg',
        genreId: 16,
        type: 'genre'
      },
      {
        id: 'drama',
        title: 'Drama',
        image: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
        genreId: 18,
        type: 'genre'
      },
      {
        id: 'family',
        title: 'Kids & Family',
        image: 'https://image.tmdb.org/t/p/w500/2CAL2433ZeIihfX1Hb2139CX0pW.jpg',
        genreId: 10751,
        type: 'genre'
      }
    ];

    for (var i = 0; i < browseItems.length; i++) {
      var item = browseItems[i];
      var card = createBrowseCard(item);
      browseGrid.appendChild(card);
    }
  }

  function createBrowseCard(item) {
    var card = document.createElement('div');
    card.className = 'browse-card focusable';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', item.title);

    if (item.isGradient) {
      card.style.background = item.gradientCss;
      card.innerHTML =
        '<div class="browse-card-gradient">' +
          '<div class="browse-card-title" style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">' + escapeHTML(item.title) + '</div>' +
        '</div>';
    } else {
      var badgeHtml = item.badge
        ? '<img class="browse-card-badge" src="' + item.badge + '" alt="Badge">'
        : '<div class="browse-card-title">' + escapeHTML(item.title) + '</div>';

      card.innerHTML =
        '<img class="browse-card-image" src="' + item.image + '" alt="' + escapeHTML(item.title) + '" loading="lazy">' +
        '<div class="browse-card-gradient">' +
          badgeHtml +
        '</div>';
    }

    card.addEventListener('click', function () {
      if (item.id === 'ted_lasso') {
        // Open Ted Lasso in the 5-stage Apple TV+ detail modal
        fetchItemDetails('tv', item.tmdbId, function (err, details) {
          if (!err && details && window.DetailView) {
            DetailView.open(details, [details], 0);
          }
        });
      } else if (item.genreId) {
        // Filter by genre
        applyQuery(item.title);
      } else {
        applyQuery(item.title);
      }
    });

    return card;
  }

  function fetchItemDetails(type, id, cb) {
    var url = 'https://api.themoviedb.org/3/' + type + '/' + id + '?api_key=' + TMDB_KEY;
    fetchJSON(url, function (err, data) {
      if (err || !data) {
        cb(err);
        return;
      }
      var norm = normalizeSingleItem(data, type);
      cb(null, norm);
    });
  }

  function normalizeSingleItem(item, type) {
    var title = item.title || item.name || item.original_title || 'Untitled';
    var releaseDate = item.release_date || item.first_air_date || '';
    var year = releaseDate ? releaseDate.substring(0, 4) : '';
    var genres = (item.genres || []).map(function (g) { return g.name; }).slice(0, 2).join(' • ');

    return {
      id: item.id,
      mediaType: type,
      title: title,
      year: year,
      rating: item.vote_average ? item.vote_average.toFixed(1) : '8.2',
      poster: item.poster_path ? (TMDB_IMG_BASE + item.poster_path) : null,
      backdrop: item.backdrop_path ? (TMDB_BACKDROP_BASE + item.backdrop_path) : null,
      overview: item.overview || '',
      genres: genres || 'Comedy',
      voteCount: item.vote_count || 120
    };
  }

  /**
   * Execute TMDB query
   */
  function executeSearch(query) {
    var encoded = encodeURIComponent(query);
    var movieUrl = 'https://api.themoviedb.org/3/search/movie?api_key=' + TMDB_KEY + '&query=' + encoded;
    var tvUrl = 'https://api.themoviedb.org/3/search/tv?api_key=' + TMDB_KEY + '&query=' + encoded;

    var pending = 2;
    var allItems = [];

    function checkDone() {
      pending--;
      if (pending === 0) {
        showSkeleton(false);

        // Sort by popularity
        allItems.sort(function (a, b) {
          return (b.popularity || 0) - (a.popularity || 0);
        });

        currentItemsList = allItems;
        renderResults(allItems);
      }
    }

    fetchJSON(movieUrl, function (err, data) {
      if (!err && data && data.results) {
        var movies = normalizeResults(data.results, 'movie');
        allItems = allItems.concat(movies);
      }
      checkDone();
    });

    fetchJSON(tvUrl, function (err, data) {
      if (!err && data && data.results) {
        var shows = normalizeResults(data.results, 'tv');
        allItems = allItems.concat(shows);
      }
      checkDone();
    });
  }

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

      var genreIds = item.genre_ids || [];
      var genreNames = [];
      for (var g = 0; g < genreIds.length && genreNames.length < 2; g++) {
        if (GENRES[genreIds[g]]) {
          genreNames.push(GENRES[genreIds[g]]);
        }
      }
      var genreString = genreNames.join(' • ');

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
        voteCount: item.vote_count || 0,
        genreString: genreString || (mediaType === 'tv' ? 'Series' : 'Sci-Fi')
      });
    }
    return out;
  }

  /**
   * Render results based on current tab:
   * - 'top': Wide Horizontal Cards (Images 2, 3)
   * - 'movies': 2:3 Vertical Posters with Focused Subtitle (Images 4, 5)
   */
  function renderResults(items) {
    if (!resultsGrid) return;
    resultsGrid.innerHTML = '';

    if (!items || items.length === 0) {
      resultsGrid.innerHTML =
        '<div style="padding: 60px 20px; color: rgba(255, 255, 255, 0.5); font-size: 18px;">' +
          'No results found for "' + escapeHTML(currentQuery) + '".' +
        '</div>';
      return;
    }

    var filteredItems = items;
    if (currentTab === 'movies') {
      filteredItems = items.filter(function (it) {
        return it.mediaType === 'movie';
      });
      if (filteredItems.length === 0) filteredItems = items;
    }

    if (currentTab === 'top') {
      // Wide Horizontal Cards (Images 2 & 3)
      for (var i = 0; i < filteredItems.length; i++) {
        var card = createWideCard(filteredItems[i], i, filteredItems);
        resultsGrid.appendChild(card);
      }
    } else {
      // 2:3 Vertical Poster Cards (Images 4 & 5)
      for (var j = 0; j < filteredItems.length; j++) {
        var posterCard = createPosterCard(filteredItems[j], j, filteredItems);
        resultsGrid.appendChild(posterCard);
      }
    }
  }

  /**
   * Wide Horizontal Glass Card (Images 2 & 3)
   */
  function createWideCard(item, index, list) {
    var card = document.createElement('div');
    card.className = 'media-card-wide focusable';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', item.title);

    var typeLabel = item.mediaType === 'tv' ? 'TV Show' : 'Movie';
    var subtitleParts = [typeLabel];
    if (item.genreString) subtitleParts.push(item.genreString);
    if (item.year) subtitleParts.push(item.year);
    var subtitle = subtitleParts.join(' • ');

    var posterSrc = item.poster || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';

    card.innerHTML =
      '<img class="wide-poster-thumb" src="' + posterSrc + '" alt="' + escapeHTML(item.title) + '" loading="lazy">' +
      '<div class="wide-card-info">' +
        '<div class="wide-card-title">' + escapeHTML(item.title) + '</div>' +
        '<div class="wide-card-meta">' + escapeHTML(subtitle) + '</div>' +
      '</div>';

    card.addEventListener('click', function () {
      if (window.DetailView) {
        DetailView.open(item, list, index);
      }
    });

    return card;
  }

  /**
   * 2:3 Vertical Poster Card with Bottom Overlay on Focus (Images 4 & 5)
   */
  function createPosterCard(item, index, list) {
    var card = document.createElement('div');
    card.className = 'media-card-poster focusable';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', item.title);

    var typeLabel = item.mediaType === 'tv' ? 'TV Show' : 'Movie';
    var subtitle = typeLabel + (item.genreString ? (' • ' + item.genreString) : '');

    var posterSrc = item.poster || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';

    card.innerHTML =
      '<img class="poster-card-img" src="' + posterSrc + '" alt="' + escapeHTML(item.title) + '" loading="lazy">' +
      '<div class="poster-card-overlay">' +
        '<div class="poster-card-subtitle">' + escapeHTML(subtitle) + '</div>' +
      '</div>';

    card.addEventListener('click', function () {
      if (window.DetailView) {
        DetailView.open(item, list, index);
      }
    });

    return card;
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
    search: onQueryChanged,
    applyQuery: applyQuery,
    resetSearch: resetSearch,
    switchTab: switchTab,
    showSkeleton: showSkeleton
  };
})();
