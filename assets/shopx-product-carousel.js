const CAROUSEL_SELECTOR = '[data-shopx-product-carousel]';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const PERCENT = 100;
const cleanupByCarousel = new Map();

function getScrollBehavior() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches ? 'auto' : 'smooth';
}

function getActiveList(carousel) {
  const activePanel = carousel.querySelector('[data-shopx-product-carousel-panel]:not([hidden])');
  return activePanel ? activePanel.querySelector('[data-shopx-product-carousel-list]') : null;
}

function updateControls(carousel) {
  const list = getActiveList(carousel);
  const progressBar = carousel.querySelector('[data-shopx-product-carousel-progress]');
  const previousButton = carousel.querySelector('[data-shopx-product-carousel-previous]');
  const nextButton = carousel.querySelector('[data-shopx-product-carousel-next]');
  if (!list) {
    return;
  }

  const maxScroll = list.scrollWidth - list.clientWidth;
  const visibleShare = list.scrollWidth > 0 ? list.clientWidth / list.scrollWidth : 1;
  const scrollShare = maxScroll > 0 ? list.scrollLeft / maxScroll : 0;
  const barWidthPercent = Math.min(PERCENT, visibleShare * PERCENT);
  const barOffsetPercent = (scrollShare * (PERCENT - barWidthPercent) * PERCENT) / barWidthPercent;

  if (progressBar) {
    progressBar.style.setProperty('--shopx-product-carousel-progress-width', `${barWidthPercent}%`);
    progressBar.style.setProperty('--shopx-product-carousel-progress-offset', `${barOffsetPercent}%`);
  }
  if (previousButton) {
    previousButton.disabled = list.scrollLeft <= 1;
  }
  if (nextButton) {
    nextButton.disabled = list.scrollLeft >= maxScroll - 1;
  }
}

function scrollByCard(carousel, direction) {
  const list = getActiveList(carousel);
  const firstItem = list ? list.querySelector('li') : null;
  if (!list || !firstItem) {
    return;
  }
  const gap = parseFloat(window.getComputedStyle(list).columnGap) || 0;
  list.scrollBy({
    left: direction * (firstItem.getBoundingClientRect().width + gap),
    behavior: getScrollBehavior(),
  });
}

function selectTab(carousel, selectedTab) {
  const tabs = carousel.querySelectorAll('[data-shopx-product-carousel-tab]');
  tabs.forEach((tab) => {
    const isSelected = tab === selectedTab;
    tab.setAttribute('aria-selected', String(isSelected));
    tab.tabIndex = isSelected ? 0 : -1;
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    if (panel) {
      panel.hidden = !isSelected;
    }
  });
  updateControls(carousel);
}

function handleTabKeydown(carousel, event) {
  const tabs = Array.from(carousel.querySelectorAll('[data-shopx-product-carousel-tab]'));
  const currentIndex = tabs.indexOf(event.target);
  if (currentIndex === -1) {
    return;
  }
  const keyOffsets = { ArrowRight: 1, ArrowLeft: -1 };
  let nextIndex = null;
  if (event.key in keyOffsets) {
    nextIndex = (currentIndex + keyOffsets[event.key] + tabs.length) % tabs.length;
  } else if (event.key === 'Home') {
    nextIndex = 0;
  } else if (event.key === 'End') {
    nextIndex = tabs.length - 1;
  }
  if (nextIndex === null) {
    return;
  }
  event.preventDefault();
  tabs[nextIndex].focus();
  selectTab(carousel, tabs[nextIndex]);
}

function initCarousel(carousel) {
  if (cleanupByCarousel.has(carousel)) {
    return;
  }

  const handleClick = (event) => {
    const tab = event.target.closest('[data-shopx-product-carousel-tab]');
    if (tab) {
      selectTab(carousel, tab);
      return;
    }
    if (event.target.closest('[data-shopx-product-carousel-previous]')) {
      scrollByCard(carousel, -1);
    } else if (event.target.closest('[data-shopx-product-carousel-next]')) {
      scrollByCard(carousel, 1);
    }
  };
  const handleKeydown = (event) => handleTabKeydown(carousel, event);
  const handleScroll = () => updateControls(carousel);
  const handleResize = () => updateControls(carousel);

  carousel.addEventListener('click', handleClick);
  carousel.addEventListener('keydown', handleKeydown);
  carousel.addEventListener('scroll', handleScroll, { capture: true, passive: true });
  window.addEventListener('resize', handleResize);

  cleanupByCarousel.set(carousel, () => {
    carousel.removeEventListener('click', handleClick);
    carousel.removeEventListener('keydown', handleKeydown);
    carousel.removeEventListener('scroll', handleScroll, { capture: true });
    window.removeEventListener('resize', handleResize);
  });

  updateControls(carousel);
}

function initAll(root) {
  root.querySelectorAll(CAROUSEL_SELECTOR).forEach(initCarousel);
}

function destroyAll(root) {
  root.querySelectorAll(CAROUSEL_SELECTOR).forEach((carousel) => {
    const cleanup = cleanupByCarousel.get(carousel);
    if (cleanup) {
      cleanup();
      cleanupByCarousel.delete(carousel);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initAll(document));
} else {
  initAll(document);
}

document.addEventListener('shopify:section:load', (event) => initAll(event.target));
document.addEventListener('shopify:section:unload', (event) => destroyAll(event.target));
