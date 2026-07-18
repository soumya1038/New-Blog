(function () {
  function readRuntimeData() {
    var node = document.getElementById('article-template-runtime-data');
    if (!node) return {};

    try {
      return JSON.parse(node.textContent || '{}') || {};
    } catch (error) {
      return {};
    }
  }

  function toArray(list) {
    return Array.prototype.slice.call(list || []);
  }

  function initArticleTemplateRuntime() {
    var runtimeData = readRuntimeData();
    var heightPadding = Number(runtimeData.heightPadding || 0);
    var paginationConfig = runtimeData.paginationConfig || {};
    var storyText = String(runtimeData.storyText || '');
    var summaryText = String(runtimeData.summaryText || '');

    var root = document.documentElement;
    root.classList.add('js');

    var revealNodes = toArray(document.querySelectorAll('.reveal'));
    var markVisible = function (node) {
      node.classList.add('is-visible');
    };

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            markVisible(entry.target);
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.02, rootMargin: '0px 0px -8% 0px' }
      );

      revealNodes.forEach(function (node) {
        observer.observe(node);
      });
      setTimeout(function () {
        revealNodes.forEach(markVisible);
      }, 1400);
    } else {
      revealNodes.forEach(markVisible);
    }

    var progressTopFill = document.getElementById('progress-top-fill');
    var progressSerifFill = document.getElementById('progress-serif-fill');

    var reportFrameHeight = function () {
      try {
        var rootNode = document.querySelector('.template-root');
        var rootHeight = rootNode ? Math.ceil(rootNode.getBoundingClientRect().height + heightPadding) : 0;
        var docEl = document.documentElement;
        var body = document.body;
        var documentHeight = Math.max(
          body ? body.scrollHeight : 0,
          body ? body.offsetHeight : 0,
          docEl ? docEl.scrollHeight : 0,
          docEl ? docEl.offsetHeight : 0
        );
        var nextHeight = rootHeight > 0 ? rootHeight : documentHeight;
        if (!nextHeight) return;

        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'article-template:height', height: nextHeight }, '*');
        }
      } catch (error) {
        // Ignore postMessage failures.
      }
    };

    var scheduleHeightSync = function () {
      reportFrameHeight();
      requestAnimationFrame(reportFrameHeight);
      setTimeout(reportFrameHeight, 120);
    };

    toArray(document.querySelectorAll('.custom-product-tag-overlay')).forEach(function (node) {
      node.addEventListener('toggle', scheduleHeightSync);
    });

    var updateProgress = function () {
      var doc = document.documentElement;
      var top = doc.scrollTop || document.body.scrollTop || 0;
      var total = Math.max(doc.scrollHeight - doc.clientHeight, 1);
      var ratio = Math.max(0, Math.min(1, top / total));
      var percent = (ratio * 100).toFixed(2) + '%';

      if (progressTopFill) progressTopFill.style.width = percent;
      if (progressSerifFill) progressSerifFill.style.height = percent;
    };

    var parallaxNode = document.querySelector('[data-parallax] img');
    var updateParallax = function () {
      if (!parallaxNode) return;
      var doc = document.documentElement;
      var top = doc.scrollTop || document.body.scrollTop || 0;
      var amount = Math.min(56, top * 0.06);
      parallaxNode.style.transform = 'scale(1.07) translateY(' + amount.toFixed(2) + 'px)';
    };

    var playBtn = document.getElementById('reader-play-btn');
    var muteBtn = document.getElementById('reader-mute-btn');
    var summaryBtn = document.getElementById('reader-summary-btn');
    var volumeInput = document.getElementById('reader-volume');
    var statusNode = document.getElementById('reader-status');
    var storyNode = document.getElementById('reader-story');
    var summaryNode = document.getElementById('reader-summary');
    var paginationNav = document.getElementById('story-pagination-nav');
    var pagePrevBtn = document.getElementById('story-page-prev');
    var pageNextBtn = document.getElementById('story-page-next');
    var pageStatusNode = document.getElementById('story-page-status');
    var readerShell = document.getElementById('reader-shell');
    var readerContent = document.getElementById('reader-content');
    var layoutGrid = readerShell ? readerShell.closest('.layout-grid') : null;
    var synth = window.speechSynthesis || null;
    var isPlaying = false;
    var isPaused = false;
    var isSummaryMode = false;
    var volume = 1;
    var lastVolume = 1;
    var activeUtterance = null;
    var paginatedPages = [];
    var activePageIndex = 0;

    if (summaryNode) {
      summaryNode.hidden = true;
      summaryNode.style.display = 'none';
      summaryNode.setAttribute('aria-hidden', 'true');
    }
    if (storyNode) {
      storyNode.hidden = false;
      storyNode.style.display = '';
      storyNode.setAttribute('aria-hidden', 'false');
    }
    if (readerShell) readerShell.classList.remove('is-summary-mode');
    if (layoutGrid) layoutGrid.classList.remove('summary-mode-grid');

    var setStatus = function (message) {
      if (statusNode) statusNode.textContent = message;
    };

    var pageScopedBlocks = toArray(document.querySelectorAll('[data-page-placement]'));
    var syncPageScopedBlockVisibility = function () {
      if (!pageScopedBlocks.length) return;

      var totalPages = Math.max(paginatedPages.length, 1);
      var activePage = Math.min(activePageIndex + 1, totalPages);

      pageScopedBlocks.forEach(function (blockNode) {
        if (!blockNode || !blockNode.getAttribute) return;
        var mode = String(blockNode.getAttribute('data-page-placement') || 'all').toLowerCase();
        var shouldShow = true;

        if (mode === 'first') shouldShow = activePage === 1;
        else if (mode === 'last') shouldShow = activePage === totalPages;
        else if (mode === 'middle') shouldShow = totalPages > 2 && activePage > 1 && activePage < totalPages;

        blockNode.hidden = !shouldShow;
        blockNode.style.display = shouldShow ? '' : 'none';
        blockNode.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
      });
    };

    var updateStoryPagination = function () {
      var totalPages = paginatedPages.length;
      var hasMultiplePages = totalPages > 1;
      var canGoPrev = hasMultiplePages && activePageIndex > 0;
      var canGoNext = hasMultiplePages && activePageIndex < totalPages - 1;

      paginatedPages.forEach(function (page, index) {
        var isActive = index === activePageIndex;
        page.classList.toggle('is-active', isActive);
        page.hidden = !isActive;
      });

      if (pageStatusNode) {
        pageStatusNode.textContent = (Math.min(activePageIndex + 1, Math.max(totalPages, 1))) + ' / ' + Math.max(totalPages, 1);
      }

      if (pagePrevBtn) {
        pagePrevBtn.classList.toggle('is-hidden', !canGoPrev);
        pagePrevBtn.hidden = !canGoPrev;
        pagePrevBtn.disabled = !canGoPrev;
        pagePrevBtn.tabIndex = canGoPrev ? 0 : -1;
        pagePrevBtn.setAttribute('aria-disabled', canGoPrev ? 'false' : 'true');
        pagePrevBtn.setAttribute('aria-hidden', canGoPrev ? 'false' : 'true');
      }

      if (pageNextBtn) {
        pageNextBtn.classList.toggle('is-hidden', !canGoNext);
        pageNextBtn.hidden = !canGoNext;
        pageNextBtn.disabled = !canGoNext;
        pageNextBtn.tabIndex = canGoNext ? 0 : -1;
        pageNextBtn.setAttribute('aria-disabled', canGoNext ? 'false' : 'true');
        pageNextBtn.setAttribute('aria-hidden', canGoNext ? 'false' : 'true');
      }

      if (paginationNav) {
        var navHidden = isSummaryMode || !hasMultiplePages;
        paginationNav.hidden = navHidden;
        paginationNav.classList.remove('is-next-only', 'is-prev-only');
        if (!navHidden) {
          if (!canGoPrev && canGoNext) paginationNav.classList.add('is-next-only');
          else if (canGoPrev && !canGoNext) paginationNav.classList.add('is-prev-only');
        }
      }

      syncPageScopedBlockVisibility();
      scheduleHeightSync();
      setTimeout(reportFrameHeight, 90);
    };

    var splitLongParagraphBlocks = function (options) {
      if (!storyNode) return;
      var minParagraphLength = options && options.minParagraphLength ? Number(options.minParagraphLength) : 900;
      var chunkSize = options && options.chunkSize ? Number(options.chunkSize) : 420;

      var paragraphNodes = toArray(storyNode.querySelectorAll('p'));
      paragraphNodes.forEach(function (paragraph) {
        var text = (paragraph.textContent || '').replace(/\s+/g, ' ').trim();
        if (text.length < minParagraphLength) return;

        var sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
        if (sentences.length < 2) return;

        var chunks = [];
        var bucket = '';

        sentences.forEach(function (sentence) {
          var candidate = (bucket + ' ' + sentence).trim();
          if (candidate.length > chunkSize && bucket) {
            chunks.push(bucket.trim());
            bucket = sentence.trim();
          } else {
            bucket = candidate;
          }
        });

        if (bucket.trim()) chunks.push(bucket.trim());
        if (chunks.length < 2) return;

        var leadClass = paragraph.classList.contains('lead');

        chunks.forEach(function (chunk, index) {
          var splitParagraph = document.createElement('p');
          splitParagraph.textContent = chunk;
          if (leadClass && index === 0) {
            splitParagraph.className = 'lead';
          }
          paragraph.parentNode.insertBefore(splitParagraph, paragraph);
        });

        paragraph.remove();
      });
    };

    var paginateStory = function () {
      if (!paginationConfig || !paginationConfig.enabled) return false;
      if (!storyNode || storyNode.dataset.paginated === 'true') return false;

      splitLongParagraphBlocks(
        paginationConfig.forceManual
          ? { minParagraphLength: 220, chunkSize: 180 }
          : { minParagraphLength: 900, chunkSize: 420 }
      );

      var blocks = toArray(storyNode.children || []);
      if (blocks.length < 2) return false;

      var totalText = (storyNode.textContent || '').replace(/\s+/g, ' ').trim().length;
      var minBlocks = paginationConfig.hasRichMedia ? 4 : 6;
      if (!paginationConfig.forceManual && blocks.length < minBlocks && totalText < 1000 && !paginationConfig.hasRichMedia) return false;

      var desiredPages = Math.max(2, Math.min(paginationConfig.forceManual ? 6 : 3, paginationConfig.targetPages || 2));
      var pages = [];
      if (paginationConfig.forceManual) {
        var blocksPerPage = Math.max(1, Math.ceil(blocks.length / desiredPages));
        for (var pageCursor = 0; pageCursor < desiredPages; pageCursor += 1) {
          var from = pageCursor * blocksPerPage;
          var to = Math.min(blocks.length, from + blocksPerPage);
          if (from >= blocks.length) break;

          var manualPage = document.createElement('section');
          manualPage.className = 'story-page';
          blocks.slice(from, to).forEach(function (block) {
            manualPage.appendChild(block);
          });

          if (manualPage.children.length) {
            pages.push(manualPage);
          }
        }
      } else {
        var perPageTarget = Math.max(760, Math.ceil(totalText / desiredPages));
        var currentPage = document.createElement('section');
        currentPage.className = 'story-page';
        var currentBucket = 0;
        var pageIndex = 0;

        blocks.forEach(function (block) {
          var blockSize = Math.max((block.textContent || '').trim().length, 70);
          var tag = (block.tagName || '').toLowerCase();
          var hasBoundaryWeight = tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'figure' || tag === 'blockquote';
          var shouldStartNewPage =
            pageIndex < desiredPages - 1
            && (
              (currentBucket >= perPageTarget && currentPage.children.length >= 3)
              || (hasBoundaryWeight && currentBucket >= Math.floor(perPageTarget * 0.72) && currentPage.children.length >= 2)
            );

          if (shouldStartNewPage) {
            pages.push(currentPage);
            currentPage = document.createElement('section');
            currentPage.className = 'story-page';
            currentBucket = 0;
            pageIndex += 1;
          }

          currentPage.appendChild(block);
          currentBucket += blockSize;
        });

        if (currentPage.children.length) pages.push(currentPage);
      }
      if (pages.length < 2) return false;

      storyNode.innerHTML = '';
      paginatedPages = pages;
      activePageIndex = 0;

      paginatedPages.forEach(function (page, index) {
        page.setAttribute('data-page-index', String(index + 1));
        storyNode.appendChild(page);
      });

      storyNode.classList.add('is-paginated');
      storyNode.dataset.paginated = 'true';
      updateStoryPagination();
      return true;
    };

    var updateControlLabels = function () {
      if (playBtn) {
        if (isPlaying && !isPaused) playBtn.textContent = 'Pause';
        else if (isPaused) playBtn.textContent = 'Resume';
        else playBtn.textContent = 'Play';
      }

      if (muteBtn) {
        muteBtn.textContent = volume === 0 ? 'Unmute' : 'Mute';
      }
    };

    var stopReading = function () {
      if (!synth) return;
      synth.cancel();
      isPlaying = false;
      isPaused = false;
      activeUtterance = null;
      updateControlLabels();
    };

    var setSummaryMode = function (nextMode) {
      isSummaryMode = Boolean(nextMode);

      if (readerShell) readerShell.classList.toggle('is-summary-mode', isSummaryMode);
      if (layoutGrid) layoutGrid.classList.toggle('summary-mode-grid', isSummaryMode);

      if (summaryNode) {
        summaryNode.hidden = !isSummaryMode;
        summaryNode.style.display = isSummaryMode ? 'grid' : 'none';
        summaryNode.setAttribute('aria-hidden', isSummaryMode ? 'false' : 'true');
      }
      if (storyNode) {
        storyNode.hidden = isSummaryMode;
        storyNode.style.display = isSummaryMode ? 'none' : '';
        storyNode.setAttribute('aria-hidden', isSummaryMode ? 'true' : 'false');
      }

      if (paginationNav) {
        paginationNav.hidden = isSummaryMode || Math.max(paginatedPages.length, 1) < 2;
      }

      if (summaryBtn) summaryBtn.textContent = isSummaryMode ? 'Original' : 'Summary';

      stopReading();
      setStatus(isSummaryMode ? 'Summary mode enabled' : 'Reading full article');

      if (readerContent) {
        readerContent.style.minHeight = '0px';
        readerContent.style.height = 'auto';
      }

      if (readerShell) {
        readerShell.style.minHeight = '0px';
        readerShell.style.height = 'auto';
      }

      if (paginatedPages.length) {
        updateStoryPagination();
      } else {
        syncPageScopedBlockVisibility();
      }

      requestAnimationFrame(function () {
        updateProgress();
        reportFrameHeight();
      });
      scheduleHeightSync();
      setTimeout(reportFrameHeight, 160);
      setTimeout(reportFrameHeight, 360);
      setTimeout(reportFrameHeight, 760);
    };

    var getActiveText = function () {
      var source = isSummaryMode ? summaryText : storyText;
      return (source || '').replace(/\s+/g, ' ').trim();
    };

    var startReading = function () {
      if (!synth) {
        setStatus('Audio playback is not supported in this browser.');
        return;
      }

      var text = getActiveText();
      if (!text) {
        setStatus('No readable text available.');
        return;
      }

      stopReading();
      activeUtterance = new SpeechSynthesisUtterance(text);
      activeUtterance.rate = 1;
      activeUtterance.pitch = 1;
      activeUtterance.volume = volume;

      activeUtterance.onend = function () {
        isPlaying = false;
        isPaused = false;
        updateControlLabels();
        setStatus(isSummaryMode ? 'Summary ready for listening.' : 'Reading full article');
      };

      synth.speak(activeUtterance);
      isPlaying = true;
      isPaused = false;
      updateControlLabels();
      setStatus(isSummaryMode ? 'Reading summary aloud' : 'Reading article aloud');
    };

    if (summaryBtn) {
      summaryBtn.addEventListener('click', function () {
        setSummaryMode(!isSummaryMode);
      });
    }

    if (pagePrevBtn) {
      pagePrevBtn.addEventListener('click', function () {
        if (activePageIndex <= 0) return;
        activePageIndex -= 1;
        updateStoryPagination();
      });
    }

    if (pageNextBtn) {
      pageNextBtn.addEventListener('click', function () {
        if (activePageIndex >= paginatedPages.length - 1) return;
        activePageIndex += 1;
        updateStoryPagination();
      });
    }

    var handleStoryPageKeydown = function (event) {
      if (isSummaryMode || paginatedPages.length < 2) return;
      var tag = (event.target && event.target.tagName ? event.target.tagName : '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (event.key === 'ArrowLeft' && activePageIndex > 0) {
        event.preventDefault();
        activePageIndex -= 1;
        updateStoryPagination();
      }

      if (event.key === 'ArrowRight' && activePageIndex < paginatedPages.length - 1) {
        event.preventDefault();
        activePageIndex += 1;
        updateStoryPagination();
      }
    };

    window.addEventListener('keydown', handleStoryPageKeydown);

    if (playBtn) {
      playBtn.addEventListener('click', function () {
        if (!synth) {
          setStatus('Audio playback is not supported in this browser.');
          return;
        }

        if (isPlaying && !isPaused) {
          synth.pause();
          isPaused = true;
          updateControlLabels();
          setStatus('Audio paused');
          return;
        }

        if (isPaused) {
          synth.resume();
          isPaused = false;
          updateControlLabels();
          setStatus(isSummaryMode ? 'Reading summary aloud' : 'Reading article aloud');
          return;
        }

        startReading();
      });
    }

    if (muteBtn) {
      muteBtn.addEventListener('click', function () {
        if (volume === 0) {
          volume = lastVolume > 0 ? lastVolume : 1;
        } else {
          lastVolume = volume;
          volume = 0;
        }

        if (volumeInput) volumeInput.value = String(volume);
        stopReading();
        updateControlLabels();
        setStatus(volume === 0 ? 'Audio muted' : 'Audio unmuted');
      });
    }

    if (volumeInput) {
      volumeInput.addEventListener('input', function (event) {
        var next = parseFloat(event.target.value);
        if (Number.isNaN(next)) return;
        volume = Math.max(0, Math.min(1, next));
        if (volume > 0) lastVolume = volume;
        stopReading();
        updateControlLabels();
        setStatus('Volume set to ' + Math.round(volume * 100) + '%');
      });
    }

    if (!summaryText && summaryBtn) {
      summaryBtn.disabled = true;
      summaryBtn.classList.add('reader-btn-disabled');
      setSummaryMode(false);
    }

    if (!synth) {
      if (playBtn) playBtn.disabled = true;
      if (muteBtn) muteBtn.disabled = true;
      setStatus('Audio playback is not supported in this browser.');
    }

    paginateStory();
    syncPageScopedBlockVisibility();
    updateControlLabels();

    var onScroll = function () {
      updateProgress();
      updateParallax();
    };

    updateProgress();
    updateParallax();
    scheduleHeightSync();

    var mediaNodes = toArray(document.querySelectorAll('img, video'));
    mediaNodes.forEach(function (node) {
      if (!node) return;
      if (node.tagName === 'IMG' && node.complete) return;

      var onMediaReady = function () {
        scheduleHeightSync();
      };

      node.addEventListener('load', onMediaReady, { passive: true });
      node.addEventListener('error', onMediaReady, { passive: true });

      if (node.tagName === 'VIDEO') {
        node.addEventListener('loadedmetadata', onMediaReady, { passive: true });
      }
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('resize', reportFrameHeight);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initArticleTemplateRuntime, { once: true });
  } else {
    initArticleTemplateRuntime();
  }
})();
