// Umami page counts, on the live site only. It shares arccc.co's Umami
// website; filter by hostname (scrape.arccc.co) to see Scrape alone. Visitors
// who ask not to be tracked (Do Not Track, Global Privacy Control) aren't.
(function () {
  if (location.hostname !== 'scrape.arccc.co') return;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;
  var tracker = document.createElement('script');
  tracker.defer = true;
  tracker.src = 'https://cloud.umami.is/script.js';
  tracker.setAttribute('data-website-id', 'e89f2295-18f3-4834-a689-bdf3afdacddd');
  tracker.setAttribute('data-domains', 'scrape.arccc.co');
  tracker.setAttribute('data-exclude-hash', 'true');
  document.head.appendChild(tracker);
})();
