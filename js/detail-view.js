/**
 * Apple TV+ 1:1 Media Details View & Modal Animation Controller
 * Target: 2018 LG C8 OLED (webOS 4.0 / Chromium 53)
 *
 * Implements the 5-stage animation and interaction flow:
 * - Stage 1: Card modal with side peek cards, pristine image, no metadata
 * - Stage 2: Smooth metadata fade-in after ~1.6s (tag pill, title, specs, buttons)
 * - Stage 3: Full-screen expansion on Down arrow/interaction, top hint, white focus pill
 * - Stage 4: Scroll down to Season tabs & 16:9 Episode cards with runtime & synopsis
 * - Stage 5: Scroll down to Trailers, Related portrait posters & Cast circular avatars
 */

var DetailView = (function () {
  'use strict';

  var TMDB_KEY = '1dbff444724afdb19b4bf5e8cc1c98b8';
  var TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w500';
  var TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/original';
  var TMDB_STILL_BASE = 'https://image.tmdb.org/t/p/w500';
  var TMDB_PROFILE_BASE = 'https://image.tmdb.org/t/p/w300';
  var STREMIO_BASE = 'https://aiostreams.elfhosted.com/stremio/f7e141bd-d649-45de-bc9f-74ffa42a3436/eyJpIjoidVF6cVhJS1Q3V2dYOTNUT1J3UmpIQT09IiwiZSI6ImdEYjNHdFVtQjF0Mi9OeVF0UVc4RzNhZ09wSG1odnZzUnhmT01uZFoyV009IiwidCI6ImEifQ';

  // DOM Elements
  var modalEl = null;
  var carouselStageEl = null;
  var heroCardEl = null;
  var heroBgImgEl = null;
  var heroContentEl = null;
  var peekLeftEl = null;
  var peekRightEl = null;
  var peekLeftImg = null;
  var peekRightImg = null;
  var topHintEl = null;
  var closeBtnEl = null;

  // Hero Metadata Elements
  var titleLogoEl = null;
  var titleEl = null;
  var categoryTextEl = null;
  var ageBadgeImgEl = null;
  var ageBadgeEl = null;
  var overviewEl = null;
  var dateRuntimeEl = null;
  var playBtn = null;
  var playBtnText = null;
  var watchlistBtn = null;
  var moreBtn = null;
  var subInfoEl = null;
  var starringNamesEl = null;
  var starringWrapper = null;
  var directorNamesEl = null;
  var directorWrapper = null;

  // Scrollable Section Elements
  var scrollContainerEl = null;
  var scrollLogoEl = null;
  var scrollTitleEl = null;
  var scrollBgImgEl = null;
  var scrollBackdropEl = null;
  var seasonTabsContainer = null;
  var seasonTabsEl = null;
  var episodesSectionEl = null;
  var episodesListEl = null;
  var trailersSectionEl = null;
  var trailersListEl = null;
  var relatedSectionEl = null;
  var relatedListEl = null;
  var castSectionEl = null;
  var castListEl = null;

  // Stream Drawer Elements
  var streamSelectorEl = null;
  var streamListEl = null;
  var streamCloseBtnEl = null;

  // State
  var isOpen = false;
  var currentStage = 1; // 1, 2, 3, 4, 5
  var currentItem = null;
  var itemsList = [];
  var currentIndex = 0;
  var activeSeasonNumber = 1;
  var currentShowData = null;
  var stageTimer = null;
  var lastFocusedBeforeModal = null;
  var isScrollTransitioning = false;

  function init() {
    modalEl = document.getElementById('media-details-modal');
    if (!modalEl) return;

    carouselStageEl = document.getElementById('modal-carousel-stage');
    heroCardEl = document.getElementById('modal-hero-card');
    heroBgImgEl = document.getElementById('modal-hero-bg-img');
    heroContentEl = document.getElementById('modal-hero-content');
    peekLeftEl = document.getElementById('modal-peek-left');
    peekRightEl = document.getElementById('modal-peek-right');
    peekLeftImg = document.getElementById('peek-left-img');
    peekRightImg = document.getElementById('peek-right-img');
    topHintEl = document.getElementById('modal-top-hint');
    closeBtnEl = document.getElementById('modal-close-btn');

    titleLogoEl = document.getElementById('modal-title-logo');
    titleEl = document.getElementById('modal-title');
    categoryTextEl = document.getElementById('modal-category-text');
    ageBadgeImgEl = document.getElementById('modal-age-badge-img');
    ageBadgeEl = document.getElementById('modal-age-badge');
    overviewEl = document.getElementById('modal-overview');
    dateRuntimeEl = document.getElementById('modal-date-runtime');
    playBtn = document.getElementById('modal-play-btn');
    playBtnText = document.getElementById('modal-play-btn-text');
    watchlistBtn = document.getElementById('modal-watchlist-btn');
    moreBtn = document.getElementById('modal-more-btn');
    subInfoEl = document.getElementById('modal-sub-info');
    starringNamesEl = document.getElementById('starring-names');
    starringWrapper = document.getElementById('modal-starring');
    directorNamesEl = document.getElementById('director-names');
    directorWrapper = document.getElementById('modal-director');

    scrollContainerEl = document.getElementById('modal-scroll-container');
    scrollLogoEl = document.getElementById('modal-scroll-logo');
    scrollTitleEl = document.getElementById('modal-scroll-title');
    scrollBgImgEl = document.getElementById('modal-scroll-bg-img');
    scrollBackdropEl = document.getElementById('modal-scroll-backdrop');
    seasonTabsContainer = document.getElementById('modal-season-tabs-container');
    seasonTabsEl = document.getElementById('modal-season-tabs');
    episodesSectionEl = document.getElementById('modal-episodes-section');
    episodesListEl = document.getElementById('modal-episodes-list');
    trailersSectionEl = document.getElementById('modal-trailers-section');
    trailersListEl = document.getElementById('modal-trailers-list');
    relatedSectionEl = document.getElementById('modal-related-section');
    relatedListEl = document.getElementById('modal-related-list');
    castSectionEl = document.getElementById('modal-cast-section');
    castListEl = document.getElementById('modal-cast-list');

    streamSelectorEl = document.getElementById('modal-stream-selector');
    streamListEl = document.getElementById('modal-stream-list');
    streamCloseBtnEl = document.getElementById('modal-stream-close-btn');

    // Close button click
    if (closeBtnEl) {
      closeBtnEl.addEventListener('click', function () {
        close();
      });
    }

    // Top hint click (returns to Stage 2 / controls)
    if (topHintEl) {
      topHintEl.addEventListener('click', function () {
        transitionToStage(2);
      });
    }

    // Play button click
    if (playBtn) {
      playBtn.addEventListener('click', function () {
        handlePlayMain();
      });
    }

    // Watchlist toggle
    if (watchlistBtn) {
      watchlistBtn.addEventListener('click', function () {
        toggleWatchlist();
      });
    }

    // More / Episodes button click (scrolls down to episodes/trailers)
    if (moreBtn) {
      moreBtn.addEventListener('click', function () {
        transitionToStage(4);
      });
    }

    // Stream drawer close
    if (streamCloseBtnEl) {
      streamCloseBtnEl.addEventListener('click', function () {
        if (streamSelectorEl) streamSelectorEl.style.display = 'none';
        if (playBtn && window.MagicRemote) {
          window.MagicRemote.setFocus(playBtn);
        }
      });
    }

    // Peek card clicks to cycle
    if (peekLeftEl) {
      peekLeftEl.addEventListener('click', function () {
        stepNeighbor(-1);
      });
    }
    if (peekRightEl) {
      peekRightEl.addEventListener('click', function () {
        stepNeighbor(1);
      });
    }

    // Track scroll events inside detail container
    if (scrollContainerEl) {
      scrollContainerEl.addEventListener('scroll', function () {
        var scrollTop = scrollContainerEl.scrollTop;
        if (scrollTop > 200 && currentStage < 4) {
          currentStage = 4;
        } else if (scrollTop <= 50 && currentStage >= 4) {
          currentStage = 3;
        }
      });
    }

    // Register Back button handler with Magic Remote
    if (window.MagicRemote && typeof window.MagicRemote.pushBackHandler === 'function') {
      window.MagicRemote.pushBackHandler(function () {
        if (!isOpen) return false;
        return handleBack();
      });
    }

    // Register key interceptor with Magic Remote
    if (window.MagicRemote && typeof window.MagicRemote.onKey === 'function') {
      window.MagicRemote.onKey(function (keyCode) {
        if (!isOpen) return;
        handleModalKey(keyCode);
      });
    }

    console.log('[DetailView] Apple TV+ Modal Controller Initialized.');
  }

  /**
   * Open the modal for a given movie/TV show
   */
  function open(item, allItems, index) {
    if (!modalEl || !item) return;

    isOpen = true;
    currentItem = item;
    itemsList = (allItems && allItems.length) ? allItems : [item];
    currentIndex = (typeof index === 'number') ? index : itemsList.indexOf(item);
    if (currentIndex < 0) currentIndex = 0;

    activeSeasonNumber = 1;
    currentShowData = null;
    clearTimeout(stageTimer);

    // Save previous focus
    lastFocusedBeforeModal = document.activeElement;

    modalEl.setAttribute('aria-hidden', 'false');
    modalEl.classList.add('open');

    // Populate peek cards
    updatePeekCards();

    // Populate initial hero view with immediate available item data
    populateHeroImmediate(item);

    // Set scroll position to 0
    if (scrollContainerEl) {
      scrollContainerEl.scrollTop = 0;
    }

    // Start in Stage 3: Full Hero mode with ClearArt logo, metadata and white Play pill
    transitionToStage(3);

    // Fetch full TMDB data (cast, seasons, episodes, related, trailers) in background
    fetchFullDetails(item);
  }

  /**
   * Update Left and Right peek cards
   */
  function updatePeekCards() {
    var prevItem = (currentIndex > 0) ? itemsList[currentIndex - 1] : itemsList[itemsList.length - 1];
    var nextItem = (currentIndex < itemsList.length - 1) ? itemsList[currentIndex + 1] : itemsList[0];

    if (peekLeftImg && prevItem) {
      peekLeftImg.src = prevItem.backdrop || prevItem.poster || '';
    }
    if (peekRightImg && nextItem) {
      peekRightImg.src = nextItem.backdrop || nextItem.poster || '';
    }
  }

  /**
   * Step to previous (-1) or next (+1) neighbor
   */
  function stepNeighbor(direction) {
    var newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = itemsList.length - 1;
    if (newIndex >= itemsList.length) newIndex = 0;

    var targetItem = itemsList[newIndex];
    if (targetItem) {
      open(targetItem, itemsList, newIndex);
    }
  }

  /**
   * Populate immediate data into the Hero screen
   */
  function populateHeroImmediate(item) {
    var isTv = item.mediaType === 'tv';

    // Hero background image
    var highResBg = item.backdrop || item.poster || '';
    if (heroBgImgEl) {
      heroBgImgEl.src = highResBg;
    }
    if (scrollBgImgEl) {
      scrollBgImgEl.src = highResBg;
    }

    // Display title & reset logo visibility
    var title = item.title || item.name || '';
    if (titleLogoEl) {
      titleLogoEl.src = '';
      titleLogoEl.style.display = 'none';
    }
    if (titleEl) {
      titleEl.style.display = 'block';
      titleEl.textContent = title;
    }
    if (scrollLogoEl) {
      scrollLogoEl.src = '';
      scrollLogoEl.style.display = 'none';
    }
    if (scrollTitleEl) {
      scrollTitleEl.style.display = 'block';
      scrollTitleEl.textContent = title;
    }

    // Category / Genre text
    var mediaTypeLabel = isTv ? 'TV Show' : 'Movie';
    var genreText = item.genres ? (' • ' + item.genres) : (isTv ? ' • Comedy • Drama' : ' • Feature Film');
    if (categoryTextEl) {
      categoryTextEl.textContent = mediaTypeLabel + genreText;
    }

    // Age certification badge
    updateAgeBadge(item.certification || (isTv ? '15' : '12'));

    // Overview
    if (overviewEl) {
      overviewEl.textContent = item.overview || 'Experience the acclaimed award-winning story on Apple TV+.';
    }

    // Date & Runtime
    var dateStr = formatAirDate(item.year || item.releaseDate || '');
    var runtimeStr = isTv ? '30 mins' : '1h 55m';
    if (dateRuntimeEl) {
      dateRuntimeEl.textContent = (dateStr ? dateStr + ' • ' : '') + runtimeStr;
    }

    // Play button text
    if (playBtnText) {
      playBtnText.textContent = isTv ? 'Play Season 1, Ep 1' : 'Play Movie';
    }

    // Sub-info text
    if (subInfoEl) {
      subInfoEl.textContent = 'Stream with AIOStreams • 4K Dolby Atmos & Dolby Vision';
    }

    // Reset scrollable sections
    if (episodesListEl) episodesListEl.innerHTML = '<div class="loading-state-pill">Loading episodes...</div>';
    if (trailersListEl) trailersListEl.innerHTML = '';
    if (relatedListEl) relatedListEl.innerHTML = '';
    if (castListEl) castListEl.innerHTML = '';

    if (streamSelectorEl) streamSelectorEl.style.display = 'none';
  }

  /**
   * Transition between stages
   */
  function transitionToStage(stage) {
    currentStage = stage;
    if (!carouselStageEl || !modalEl) return;

    // Remove all stage classes
    carouselStageEl.classList.remove('stage-1-card', 'stage-2-meta', 'stage-3-fullscreen', 'stage-4-scrolled');
    modalEl.classList.remove('stage-1-active', 'stage-2-active', 'stage-3-active', 'stage-4-active');

    switch (stage) {
      case 1:
        // Stage 1: Rounded Card, Pristine Image, no metadata
        carouselStageEl.classList.add('stage-1-card');
        modalEl.classList.add('stage-1-active');
        if (heroContentEl) heroContentEl.style.opacity = '0';
        if (topHintEl) topHintEl.classList.remove('visible');
        break;

      case 2:
        // Stage 2: Card with smooth metadata fade-in
        carouselStageEl.classList.add('stage-2-meta');
        modalEl.classList.add('stage-2-active');
        if (heroContentEl) {
          heroContentEl.style.opacity = '1';
        }
        if (topHintEl) topHintEl.classList.remove('visible');
        break;

      case 3:
        // Stage 3: Full Screen Hero, White Action Focus Pill, Top Hint
        carouselStageEl.classList.add('stage-3-fullscreen');
        modalEl.classList.add('stage-3-active');
        if (heroContentEl) heroContentEl.style.opacity = '1';
        if (topHintEl) topHintEl.classList.add('visible');

        // Ensure scroll container is at top
        if (scrollContainerEl) {
          try {
            scrollContainerEl.scrollTo({ top: 0, behavior: 'smooth' });
          } catch (e) {
            scrollContainerEl.scrollTop = 0;
          }
        }

        // Apply 5-way focus to the primary Play Button
        setTimeout(function () {
          if (playBtn && window.MagicRemote) {
            window.MagicRemote.setFocus(playBtn);
          }
        }, 120);
        break;

      case 4:
      case 5:
        // Stage 4 & 5: Scrolled down to episodes/trailers/related
        carouselStageEl.classList.add('stage-3-fullscreen', 'stage-4-scrolled');
        modalEl.classList.add('stage-4-active');
        if (topHintEl) topHintEl.classList.remove('visible');

        // Smoothly push down to lower content (Stage 4)
        if (scrollContainerEl) {
          var targetY = 1080;
          try {
            scrollContainerEl.scrollTo({ top: targetY, behavior: 'smooth' });
          } catch (e) {
            scrollContainerEl.scrollTop = targetY;
          }
        }

        // Focus first season pill or first episode card or first trailer
        setTimeout(function () {
          var firstSeason = seasonTabsEl ? seasonTabsEl.querySelector('.season-tab-btn') : null;
          var firstEp = episodesListEl ? episodesListEl.querySelector('.episode-card') : null;
          var firstTrailer = trailersListEl ? trailersListEl.querySelector('.trailer-card') : null;
          var target = firstSeason || firstEp || firstTrailer || playBtn;
          if (target && window.MagicRemote) {
            window.MagicRemote.setFocus(target);
          }
        }, 300);
        break;
    }
  }

  /**
   * Fetch official clearart logo from TMDB
   */
  function fetchImages(item) {
    var isTv = item.mediaType === 'tv';
    var url = 'https://api.themoviedb.org/3/' + (isTv ? 'tv' : 'movie') + '/' + item.id + '/images?api_key=' + TMDB_KEY;
    fetchJSON(url, function (err, data) {
      if (err || !data || !data.logos || data.logos.length === 0) return;
      var bestLogo = null;
      for (var i = 0; i < data.logos.length; i++) {
        var l = data.logos[i];
        if (l.iso_639_1 === 'en' || !l.iso_639_1) {
          bestLogo = l;
          break;
        }
      }
      if (!bestLogo) bestLogo = data.logos[0];
      if (bestLogo && bestLogo.file_path) {
        var logoUrl = 'https://image.tmdb.org/t/p/w500' + bestLogo.file_path;
        if (titleLogoEl) {
          titleLogoEl.src = logoUrl;
          titleLogoEl.style.display = 'block';
        }
        if (titleEl) {
          titleEl.style.display = 'none';
        }
        if (scrollLogoEl) {
          scrollLogoEl.src = logoUrl;
          scrollLogoEl.style.display = 'block';
        }
        if (scrollTitleEl) {
          scrollTitleEl.style.display = 'none';
        }
      }
    });
  }

  /**
   * Update BBFC Age Rating Badges (15, 12, 18, PG, U)
   */
  function updateAgeBadge(cert) {
    var raw = (cert || '15').toString().toUpperCase().trim();
    if (raw === 'R' || raw === 'TV-MA' || raw === '16' || raw === 'MA') raw = '15';
    else if (raw === 'PG-13' || raw === 'TV-14') raw = '12';
    else if (raw === 'TV-PG') raw = 'PG';
    else if (raw === 'G' || raw === 'TV-G' || raw === 'TV-Y' || raw === 'TV-Y7') raw = 'U';

    var assetMap = {
      '15': 'assets/15.svg',
      '18': 'assets/18.png',
      '12': 'assets/12.png',
      '12A': 'assets/12A.png',
      'PG': 'assets/PG.png',
      'U': 'assets/U.png'
    };

    var asset = assetMap[raw];
    if (asset && ageBadgeImgEl) {
      ageBadgeImgEl.src = asset;
      ageBadgeImgEl.style.display = 'inline-block';
      if (ageBadgeEl) ageBadgeEl.style.display = 'none';
    } else if (ageBadgeEl) {
      ageBadgeEl.textContent = cert || '15';
      ageBadgeEl.style.display = 'inline-flex';
      if (ageBadgeImgEl) ageBadgeImgEl.style.display = 'none';
    }
  }

  /**
   * Fetch full details from TMDB
   */
  function fetchFullDetails(item) {
    var isTv = item.mediaType === 'tv';
    var endpoint = isTv
      ? 'https://api.themoviedb.org/3/tv/' + item.id + '?api_key=' + TMDB_KEY + '&append_to_response=credits,recommendations,similar,videos,content_ratings'
      : 'https://api.themoviedb.org/3/movie/' + item.id + '?api_key=' + TMDB_KEY + '&append_to_response=credits,recommendations,similar,videos,release_dates';

    // 0. Fetch TMDB ClearArt Logos
    fetchImages(item);

    fetchJSON(endpoint, function (err, data) {
      if (err || !data) return;
      currentShowData = data;

      // 1. Refined Categories & Genres
      if (data.genres && data.genres.length > 0) {
        var genreNames = data.genres.slice(0, 3).map(function (g) { return g.name; }).join(' • ');
        if (categoryTextEl) {
          categoryTextEl.textContent = (isTv ? 'TV Show • ' : 'Movie • ') + genreNames;
        }
      }

      // 2. Refined Age Certification
      var cert = extractCertification(data, isTv);
      if (cert) {
        updateAgeBadge(cert);
      }

      // 3. Runtime & Air Date
      var dateStr = formatAirDate(data.first_air_date || data.release_date || '');
      var runtimeStr = '';
      if (isTv) {
        var epRun = (data.episode_run_time && data.episode_run_time[0]) ? data.episode_run_time[0] : 30;
        runtimeStr = epRun + ' mins';
      } else {
        var mins = data.runtime || 110;
        var h = Math.floor(mins / 60);
        var m = mins % 60;
        runtimeStr = (h > 0 ? (h + 'h ') : '') + m + 'm';
      }
      if (dateRuntimeEl) {
        dateRuntimeEl.textContent = (dateStr ? dateStr + ' • ' : '') + runtimeStr;
      }

      // 4. Starring cast (bottom right)
      if (data.credits && data.credits.cast && data.credits.cast.length > 0) {
        var top3 = data.credits.cast.slice(0, 3).map(function (c) { return c.name; }).join(', ');
        if (starringNamesEl) {
          starringNamesEl.textContent = top3;
        }
        if (starringWrapper) {
          starringWrapper.style.display = 'block';
        }
      }

      // 4b. Director / Creator
      if (data.credits && data.credits.crew) {
        var directors = data.credits.crew.filter(function (c) {
          return c.job === 'Director' || c.job === 'Executive Producer' || c.job === 'Creator';
        });
        if (directors.length > 0 && directorNamesEl) {
          directorNamesEl.textContent = directors.slice(0, 2).map(function (d) { return d.name; }).join(', ');
          if (directorWrapper) directorWrapper.style.display = 'block';
        }
      }

      // 5. Render Season Tabs and load episodes (for TV shows)
      if (isTv) {
        if (seasonTabsContainer) seasonTabsContainer.style.display = 'block';
        if (episodesSectionEl) episodesSectionEl.style.display = 'block';
        renderSeasonTabs(data.seasons || []);
        loadSeasonEpisodes(item.id, 1);
      } else {
        if (seasonTabsContainer) seasonTabsContainer.style.display = 'none';
        if (episodesSectionEl) episodesSectionEl.style.display = 'none';
      }

      // 6. Render Trailers
      if (data.videos && data.videos.results) {
        renderTrailers(data.videos.results);
      }

      // 7. Render Related Titles
      var related = (data.recommendations && data.recommendations.results && data.recommendations.results.length)
        ? data.recommendations.results
        : (data.similar && data.similar.results ? data.similar.results : []);
      renderRelated(related, isTv ? 'tv' : 'movie');

      // 8. Render Cast & Crew
      if (data.credits && data.credits.cast) {
        renderCastAvatars(data.credits.cast);
      }
    });
  }

  /**
   * Extract certification badge string
   */
  function extractCertification(data, isTv) {
    if (isTv && data.content_ratings && data.content_ratings.results) {
      for (var i = 0; i < data.content_ratings.results.length; i++) {
        var r = data.content_ratings.results[i];
        if (r.iso_3166_1 === 'GB' || r.iso_3166_1 === 'US') {
          return r.rating;
        }
      }
    } else if (!isTv && data.release_dates && data.release_dates.results) {
      for (var j = 0; j < data.release_dates.results.length; j++) {
        var rel = data.release_dates.results[j];
        if ((rel.iso_3166_1 === 'GB' || rel.iso_3166_1 === 'US') && rel.release_dates && rel.release_dates[0]) {
          var c = rel.release_dates[0].certification;
          if (c) return c;
        }
      }
    }
    return isTv ? '15' : '12';
  }

  /**
   * Render Season Pills Navigation (Stage 4)
   */
  function renderSeasonTabs(seasons) {
    if (!seasonTabsEl) return;
    seasonTabsEl.innerHTML = '';

    // Filter out specials (season 0) if desired, or keep real seasons
    var regularSeasons = seasons.filter(function (s) {
      return s.season_number > 0;
    });

    if (regularSeasons.length === 0) {
      regularSeasons = [{ season_number: 1, name: 'Season 1' }];
    }

    regularSeasons.forEach(function (s) {
      var tabBtn = document.createElement('button');
      tabBtn.className = 'season-tab-btn focusable' + (s.season_number === activeSeasonNumber ? ' active' : '');
      tabBtn.tabIndex = 0;
      tabBtn.textContent = s.name || ('Season ' + s.season_number);
      tabBtn.setAttribute('data-season', s.season_number);

      tabBtn.addEventListener('click', function () {
        switchSeason(s.season_number);
      });

      seasonTabsEl.appendChild(tabBtn);
    });
  }

  /**
   * Switch active season
   */
  function switchSeason(seasonNumber) {
    activeSeasonNumber = seasonNumber;
    if (seasonTabsEl) {
      var allTabs = seasonTabsEl.querySelectorAll('.season-tab-btn');
      for (var i = 0; i < allTabs.length; i++) {
        var btn = allTabs[i];
        if (parseInt(btn.getAttribute('data-season'), 10) === seasonNumber) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    }

    if (currentItem) {
      loadSeasonEpisodes(currentItem.id, seasonNumber);
    }
  }

  /**
   * Load episodes for given season (TMDB)
   */
  function loadSeasonEpisodes(showId, seasonNumber) {
    if (!episodesListEl) return;
    episodesListEl.innerHTML = '<div class="loading-state-pill">Loading Season ' + seasonNumber + ' episodes...</div>';

    var url = 'https://api.themoviedb.org/3/tv/' + showId + '/season/' + seasonNumber + '?api_key=' + TMDB_KEY;
    fetchJSON(url, function (err, data) {
      if (err || !data || !data.episodes || data.episodes.length === 0) {
        episodesListEl.innerHTML = '<div class="no-episodes-msg">No episode data available for this season.</div>';
        return;
      }

      episodesListEl.innerHTML = '';

      data.episodes.forEach(function (ep) {
        var card = document.createElement('div');
        card.className = 'episode-card focusable';
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', 'Episode ' + ep.episode_number + ': ' + ep.name);

        var stillUrl = ep.still_path ? (TMDB_STILL_BASE + ep.still_path) : (currentItem.backdrop || '');
        var runtimeText = (ep.runtime || 30) + 'm';
        var airDateFormatted = formatAirDate(ep.air_date);

        card.innerHTML =
          '<div class="episode-thumb-wrap">' +
            (stillUrl ? '<img class="episode-thumb-img" src="' + stillUrl + '" alt="' + escapeHTML(ep.name) + '" loading="lazy">' : '<div class="episode-placeholder">▶</div>') +
            '<div class="episode-duration-pill">▶ ' + runtimeText + '</div>' +
          '</div>' +
          '<div class="episode-info-box">' +
            '<div class="episode-eyebrow">EPISODE ' + ep.episode_number + '</div>' +
            '<h4 class="episode-name">' + escapeHTML(ep.name) + '</h4>' +
            '<p class="episode-overview">' + escapeHTML(ep.overview || 'No synopsis available.') + '</p>' +
            '<div class="episode-bottom-meta">' +
              '<span>' + airDateFormatted + '</span>' +
              '<span class="meta-age-circle">15</span>' +
            '</div>' +
          '</div>';

        card.addEventListener('click', function () {
          playEpisode(showId, seasonNumber, ep.episode_number, ep.name);
        });

        episodesListEl.appendChild(card);
      });
    });
  }

  /**
   * Render Trailers row (16:9 cards)
   */
  function renderTrailers(videos) {
    if (!trailersListEl || !trailersSectionEl) return;
    var trailers = videos.filter(function (v) {
      return v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser' || v.type === 'Clip');
    }).slice(0, 6);

    if (trailers.length === 0) {
      trailersSectionEl.style.display = 'none';
      return;
    }
    trailersSectionEl.style.display = 'block';
    trailersListEl.innerHTML = '';

    trailers.forEach(function (t) {
      var card = document.createElement('div');
      card.className = 'trailer-card focusable';
      card.tabIndex = 0;

      var thumbUrl = 'https://img.youtube.com/vi/' + t.key + '/hqdefault.jpg';

      card.innerHTML =
        '<div class="trailer-thumb-wrap">' +
          '<img class="trailer-thumb-img" src="' + thumbUrl + '" alt="' + escapeHTML(t.name) + '" loading="lazy">' +
          '<div class="trailer-play-overlay">▶ 2m</div>' +
        '</div>' +
        '<div class="trailer-title">' + escapeHTML(t.name) + '</div>';

      card.addEventListener('click', function () {
        // Play trailer or open YouTube
        window.open('https://www.youtube.com/watch?v=' + t.key, '_blank');
      });

      trailersListEl.appendChild(card);
    });
  }

  /**
   * Render Related Titles row (Stage 5, 2:3 vertical posters with Apple TV badge)
   */
  function renderRelated(items, mediaType) {
    if (!relatedListEl || !relatedSectionEl) return;
    if (!items || items.length === 0) {
      relatedSectionEl.style.display = 'none';
      return;
    }
    relatedSectionEl.style.display = 'block';
    relatedListEl.innerHTML = '';

    var displayItems = items.slice(0, 10);
    displayItems.forEach(function (rel) {
      var card = document.createElement('div');
      card.className = 'related-card focusable';
      card.tabIndex = 0;

      var posterUrl = rel.poster_path ? (TMDB_IMG_BASE + rel.poster_path) : '';
      var title = rel.title || rel.name || '';
      var typeLabel = mediaType === 'tv' ? 'TV Show • Comedy' : 'Movie';

      card.innerHTML =
        '<div class="related-poster-wrap">' +
          (posterUrl ? '<img class="related-poster-img" src="' + posterUrl + '" alt="' + escapeHTML(title) + '" loading="lazy">' : '<div class="related-placeholder">🎬</div>') +
          '<div class="related-apple-badge"><span class="apple-logo-tiny"></span> tv</div>' +
        '</div>' +
        '<div class="related-details">' +
          '<h5 class="related-title">' + escapeHTML(title) + '</h5>' +
          '<span class="related-subtitle">' + typeLabel + '</span>' +
        '</div>';

      card.addEventListener('click', function () {
        var normalized = {
          id: rel.id,
          mediaType: mediaType,
          title: title,
          overview: rel.overview,
          backdrop: rel.backdrop_path ? (TMDB_BACKDROP_BASE + rel.backdrop_path) : posterUrl,
          poster: posterUrl,
          year: (rel.first_air_date || rel.release_date || '').substring(0, 4)
        };
        open(normalized, [normalized], 0);
      });

      relatedListEl.appendChild(card);
    });
  }

  /**
   * Render Cast & Crew row (Stage 5, 140px circular portraits)
   */
  function renderCastAvatars(cast) {
    if (!castListEl || !castSectionEl) return;
    var topCast = cast.slice(0, 12);

    if (topCast.length === 0) {
      castSectionEl.style.display = 'none';
      return;
    }
    castSectionEl.style.display = 'block';
    castListEl.innerHTML = '';

    topCast.forEach(function (actor) {
      var card = document.createElement('div');
      card.className = 'cast-avatar-card focusable';
      card.tabIndex = 0;

      var photoUrl = actor.profile_path ? (TMDB_PROFILE_BASE + actor.profile_path) : '';

      card.innerHTML =
        '<div class="cast-avatar-circle">' +
          (photoUrl ? '<img class="cast-avatar-img" src="' + photoUrl + '" alt="' + escapeHTML(actor.name) + '" loading="lazy">' : '<div class="cast-placeholder">👤</div>') +
        '</div>' +
        '<div class="cast-actor-name">' + escapeHTML(actor.name) + '</div>' +
        '<div class="cast-character-name">' + escapeHTML(actor.character || '') + '</div>';

      castListEl.appendChild(card);
    });
  }

  /**
   * Handle primary play button click
   */
  function handlePlayMain() {
    if (!currentItem) return;
    var isTv = currentItem.mediaType === 'tv';
    if (isTv) {
      playEpisode(currentItem.id, 1, 1, currentItem.title + ' - S1 E1');
    } else {
      playMovie(currentItem.id, currentItem.title);
    }
  }

  /**
   * Play TV Episode using Stremio Addon
   */
  function playEpisode(showId, season, episode, epTitle) {
    if (playBtnText) playBtnText.textContent = 'Finding Streams...';
    var stremioId = 'tmdb:' + showId + ':' + season + ':' + episode;
    var stremioUrl = STREMIO_BASE + '/stream/series/' + stremioId + '.json';

    fetchJSON(stremioUrl, function (err, data) {
      if (playBtnText) playBtnText.textContent = 'Play Season ' + season + ', Ep ' + episode;
      if (err || !data || !data.streams || data.streams.length === 0) {
        alert('No streams found for ' + epTitle);
        return;
      }
      showStreamPicker(data.streams, (currentItem ? currentItem.title : '') + ' - S' + season + 'E' + episode);
    });
  }

  /**
   * Play Movie using Stremio Addon
   */
  function playMovie(movieId, movieTitle) {
    if (playBtnText) playBtnText.textContent = 'Finding Streams...';
    var stremioId = 'tmdb:' + movieId;
    var stremioUrl = STREMIO_BASE + '/stream/movie/' + stremioId + '.json';

    fetchJSON(stremioUrl, function (err, data) {
      if (playBtnText) playBtnText.textContent = 'Play Movie';
      if (err || !data || !data.streams || data.streams.length === 0) {
        alert('No streams found for ' + movieTitle);
        return;
      }
      showStreamPicker(data.streams, movieTitle);
    });
  }

  /**
   * Display stream picker drawer
   */
  function showStreamPicker(streams, title) {
    if (!streamSelectorEl || !streamListEl) {
      if (window.StreamPlayer && streams[0]) {
        window.StreamPlayer.load(streams[0].url, { title: title, quality: '1080P' });
        window.StreamPlayer.play();
      }
      return;
    }

    streamListEl.innerHTML = '';
    streamSelectorEl.style.display = 'block';

    var count = Math.min(streams.length, 8);
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
            '<span class="stream-play-pill">Play ▶</span>' +
          '</div>';

        card.addEventListener('click', function () {
          streamSelectorEl.style.display = 'none';
          if (window.StreamPlayer) {
            var isTv = currentItem && currentItem.mediaType === 'tv';
            window.StreamPlayer.load(st.url, {
              title: currentItem ? (currentItem.title || currentItem.name) : 'Apple TV+',
              subTitle: isTv ? title : (currentItem ? (currentItem.year || '') : ''),
              overview: currentItem ? currentItem.overview : '',
              thumb: currentItem ? (currentItem.backdrop || currentItem.poster) : '',
              rating: currentItem ? (currentItem.certification || '15') : '15',
              genres: currentItem ? (currentItem.genres || 'Drama') : 'Drama',
              runtime: currentItem ? (isTv ? '50 mins' : '1h 55m') : '50 mins',
              cast: (currentShowData && currentShowData.credits && currentShowData.credits.cast) ? currentShowData.credits.cast : [],
              continueItems: (currentShowData && currentShowData.recommendations && currentShowData.recommendations.results) ? currentShowData.recommendations.results : (itemsList || [])
            });
            window.StreamPlayer.play();
          }
        });

        streamListEl.appendChild(card);
      })(streams[s]);
    }

    var first = streamListEl.querySelector('.stream-card-btn');
    if (first && window.MagicRemote) {
      window.MagicRemote.setFocus(first);
    }
  }

  function parseStreamInfo(stream) {
    var rawTitle = (stream.title || stream.description || '') + ' ' + (stream.name || '');
    var quality = '1080P';
    if (/4k|2160p|uhd/i.test(rawTitle)) quality = '4K UHD';
    else if (/1080p|fhd/i.test(rawTitle)) quality = '1080P HD';
    else if (/720p|hd/i.test(rawTitle)) quality = '720P HD';

    var provider = 'Direct';
    if (/\[rd\+\]|realdebrid|real-debrid/i.test(rawTitle)) provider = '⚡ Real-Debrid';
    else if (/torrentio/i.test(rawTitle)) provider = 'Torrentio';
    else if (/aiostreams/i.test(rawTitle)) provider = 'AIOStreams';

    var audio = '';
    if (/atmos/i.test(rawTitle)) audio = 'Dolby Atmos';
    else if (/5\.1|ddp|eac3/i.test(rawTitle)) audio = '5.1 Audio';

    var sizeMatch = rawTitle.match(/([0-9]+(?:\.[0-9]+)?\s*(?:GB|MB))/i);
    var size = sizeMatch ? sizeMatch[1].toUpperCase() : '';

    var details = [provider, audio, size].filter(Boolean).join(' • ');

    return {
      quality: quality,
      provider: provider,
      details: details || (stream.name || 'High Speed Stream')
    };
  }

  function toggleWatchlist() {
    if (!watchlistBtn) return;
    watchlistBtn.classList.toggle('active');
    var svg = watchlistBtn.querySelector('svg');
    if (watchlistBtn.classList.contains('active')) {
      watchlistBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 22px; height: 22px;"><polyline points="20 6 9 17 4 12"/></svg>';
    } else {
      watchlistBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 22px; height: 22px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    }
  }

  /**
   * Handle Back Key / Dismissal
   */
  function handleBack() {
    if (!isOpen) return false;

    // If stream selector is open, close it first
    if (streamSelectorEl && streamSelectorEl.style.display !== 'none') {
      streamSelectorEl.style.display = 'none';
      if (playBtn && window.MagicRemote) {
        window.MagicRemote.setFocus(playBtn);
      }
      return true;
    }

    // If scrolled down in Stage 4/5, scroll back up to Stage 3 Hero
    if (currentStage >= 4) {
      transitionToStage(3);
      return true;
    }

    // If in Stage 3, close modal completely
    close();
    return true;
  }

  /**
   * Intercept 5-way D-Pad keys when modal is active
   */
  function handleModalKey(keyCode) {
    if (!isOpen || !window.MagicRemote) return;
    var KEYS = window.MagicRemote.KEYS;

    // Stage 3 (Full Screen Hero):
    if (currentStage === 3) {
      if (keyCode === KEYS.DOWN) {
        // Press Down scrolls smoothly down to Stage 4 (Episodes / Related / Trailers)
        transitionToStage(4);
        return;
      }
      if (keyCode === KEYS.LEFT && itemsList.length > 1) {
        stepNeighbor(-1);
        return;
      }
      if (keyCode === KEYS.RIGHT && itemsList.length > 1) {
        stepNeighbor(1);
        return;
      }
    }

    // Stage 4 / 5 (Scrolled Down Content):
    if (currentStage >= 4) {
      if (keyCode === KEYS.UP) {
        var focusedEl = document.activeElement;
        // If on season tabs, or first row, or near the top of Stage 4, push back up to Stage 3 Hero
        var isTopRow = !focusedEl ||
          focusedEl.classList.contains('season-tab-btn') ||
          (episodesListEl && episodesListEl.firstElementChild === focusedEl) ||
          (trailersListEl && trailersListEl.firstElementChild === focusedEl) ||
          (scrollContainerEl && scrollContainerEl.scrollTop <= 1120);

        if (isTopRow) {
          transitionToStage(3);
          return;
        }
      }
    }
  }

  /**
   * Close the modal cleanly
   */
  function close() {
    if (!isOpen) return;
    isOpen = false;
    clearTimeout(stageTimer);

    if (modalEl) {
      modalEl.setAttribute('aria-hidden', 'true');
      modalEl.classList.remove('open', 'stage-1-active', 'stage-2-active', 'stage-3-active', 'stage-4-active');
    }
    if (carouselStageEl) {
      carouselStageEl.classList.remove('stage-1-card', 'stage-2-meta', 'stage-3-fullscreen', 'stage-4-scrolled');
    }
    if (streamSelectorEl) {
      streamSelectorEl.style.display = 'none';
    }

    // Restore focus to search results grid
    if (window.MagicRemote && lastFocusedBeforeModal && document.contains(lastFocusedBeforeModal)) {
      window.MagicRemote.setFocus(lastFocusedBeforeModal);
    }
  }

  // Utilities
  function formatAirDate(dateStr) {
    if (!dateStr) return '';
    try {
      var d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    } catch (e) {
      return dateStr;
    }
  }

  function fetchJSON(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.timeout = 10000;
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var parsed = JSON.parse(xhr.responseText);
          callback(null, parsed);
        } catch (e) {
          callback(e, null);
        }
      } else {
        callback(new Error('HTTP ' + xhr.status), null);
      }
    };
    xhr.onerror = function () {
      callback(new Error('Network error'), null);
    };
    xhr.ontimeout = function () {
      callback(new Error('Timeout'), null);
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
    open: open,
    close: close,
    isOpen: function () { return isOpen; },
    transitionToStage: transitionToStage
  };
})();
