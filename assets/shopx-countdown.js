const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;
const SECONDS_PER_DAY = SECONDS_PER_HOUR * HOURS_PER_DAY;

const countdownSelector = '[data-shopx-countdown]';
const intervalIdsByCountdown = new Map();

function formatUnit(value) {
  return String(value).padStart(2, '0');
}

function updateCountdown(countdown, endTimestamp) {
  const remainingSeconds = Math.max(
    0,
    Math.floor((endTimestamp - Date.now()) / MILLISECONDS_PER_SECOND)
  );
  const values = {
    days: Math.floor(remainingSeconds / SECONDS_PER_DAY),
    hours: Math.floor((remainingSeconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR),
    minutes: Math.floor((remainingSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE),
    seconds: remainingSeconds % SECONDS_PER_MINUTE,
  };

  Object.entries(values).forEach(([unitName, value]) => {
    const unitElement = countdown.querySelector(
      `[data-shopx-countdown-unit="${unitName}"]`
    );
    if (unitElement) {
      unitElement.textContent = formatUnit(value);
    }
  });

  return remainingSeconds;
}

function stopCountdown(countdown) {
  window.clearInterval(intervalIdsByCountdown.get(countdown));
  intervalIdsByCountdown.delete(countdown);
}

function startCountdown(countdown) {
  if (intervalIdsByCountdown.has(countdown)) {
    return;
  }

  const endTimestamp = Date.parse(countdown.dataset.shopxCountdownEnd);
  if (Number.isNaN(endTimestamp) || updateCountdown(countdown, endTimestamp) === 0) {
    countdown.hidden = true;
    return;
  }

  countdown.hidden = false;
  const intervalId = window.setInterval(() => {
    if (!countdown.isConnected || updateCountdown(countdown, endTimestamp) === 0) {
      countdown.hidden = true;
      stopCountdown(countdown);
    }
  }, MILLISECONDS_PER_SECOND);
  intervalIdsByCountdown.set(countdown, intervalId);
}

function startAllCountdowns(root) {
  root.querySelectorAll(countdownSelector).forEach(startCountdown);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => startAllCountdowns(document));
} else {
  startAllCountdowns(document);
}

document.addEventListener('shopify:section:load', (event) => startAllCountdowns(event.target));
document.addEventListener('shopify:section:unload', (event) => {
  event.target.querySelectorAll(countdownSelector).forEach(stopCountdown);
});
