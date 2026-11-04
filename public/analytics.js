// Self-hosted Umami page counts for Scrape's own website record, live site
// only. Honour Do Not Track and Global Privacy Control.
(function () {
  if (location.hostname !== 'scrape.arccc.co') return;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;
  var tracker = document.createElement('script');
  tracker.defer = true;
  tracker.src = 'https://analytics.arccc.co/script.js';
  tracker.setAttribute('data-website-id', 'bd46aa36-148d-4e67-947e-3ab37759761e');
  tracker.setAttribute('data-domains', 'scrape.arccc.co');
  tracker.setAttribute('data-do-not-track', 'true');
  tracker.setAttribute('data-exclude-hash', 'true');
  document.head.appendChild(tracker);
})();
