# Getting Scrape found

Scrape should come up for people looking for a painting tool, and above all
for people looking for **scrape painting** and **squeegee painting**, kids and
adults alike.

## Where things stand (October 2026)

Searches for these terms show no real competitor. "Scrape painting app" brings
up a scratch-art phone game and data-scraping software; "squeegee painting
online" brings up only craft guides for doing it with real paint, from PBS Kids,
libraries and parenting blogs. Nobody offers the thing itself in a browser.
That is the opening: be the obvious answer for "scrape painting online" and
the "try it without the mess" link every craft guide can point to.

What the search results reward, by term:

| People search for | They want | What ranks now | Our page |
| --- | --- | --- | --- |
| scrape painting, scrape art, acrylic scrape painting | to learn the technique, see examples | Skillshare projects, TikTok and YouTube videos, Pinterest | a guide to scrape painting that ends in the studio |
| squeegee painting, squeegee art for kids | a kids' activity, often process art | PBS Kids, library and toddler-craft blogs | a guide to squeegee painting with kids, with the mess-free version |
| online painting for kids, free painting tool, no download | a tool to use now | roundups (Tux Paint, Kleki, Kids Search) and the tools | the studio itself |
| scrape painting online, squeegee painting app, digital scrape art | exactly us | nothing that fits | the studio itself |

## Done in the site

- Title and description aimed at those terms: "Scrape — free online scrape
  painting & squeegee art".
- A canonical URL, `robots.txt` and a sitemap.
- An `h1` for search engines and screen readers, and a `noscript` summary.
- `WebApplication` structured data: free, for kids and adults, in a browser.
- Open Graph and Twitter cards with a 1200×630 image (`public/og-image.png`),
  so shared links show a painting rather than a bare URL.
- A web manifest and icons, so the studio can be added to a home screen.
- The reference study is `noindex`, so it can't compete with the studio.
- Fonts load from the page head rather than a CSS `@import`, which paints text
  sooner.

## Next in the site: guides

The studio is a canvas; search engines need words to rank. Two guide pages,
plain HTML that loads instantly, each answering its search properly and ending
with the studio:

1. **/scrape-painting/** — what scrape painting is; materials (acrylics, heavy
   paper or canvas, an old card or squeegee); step by step; tips (fewer
   colours, put dark next to light, one confident pull); and "try it here
   first", with pictures painted in Scrape.
2. **/squeegee-painting/** — squeegee painting with kids as process art; what
   to use for small hands (washable paint, card stock, a cut-down squeegee or
   cardboard strip); how to set up for less mess; and the mess-free version for
   rainy days, car rides and classrooms.

Later, if they do well: ideas and colour palettes for scrape art, "scrape
painting for beginners", and a gallery of paintings people choose to share.

## Off the site (the part that moves rankings most)

A new site rises on links and mentions. In rough order:

1. **Google Search Console and Bing Webmaster Tools.** Verify
   `scrape.arccc.co`, submit `/sitemap.xml`, and request indexing of `/`. This
   is also where to watch which searches find the site.
2. **Pinterest.** Scrape art is huge there. Make pins from paintings made in
   Scrape, each linking to the studio or a guide. A board of a few dozen pins
   keeps sending people for years.
3. **Short videos.** A slow pull through paint is the "satisfying" genre that
   does well on TikTok, Instagram Reels and YouTube Shorts. Screen-record pulls,
   put the URL in the profile and captions.
4. **Launches.** Product Hunt; Show HN on Hacker News; Reddit's
   r/InternetIsBeautiful (follow each community's self-promotion rules).
5. **Teachers and parents.** Art-teacher groups and blogs, homeschooling
   communities, Teachers Pay Teachers freebies. A classroom that uses it links
   to it.
6. **The roundups.** Ask the writers of "free online painting tools for kids"
   lists to add Scrape, and the craft blogs that rank for squeegee painting to
   mention it as the mess-free way to try first.

## Ideas in the product

- A small "made with scrape.arccc.co" credit on exported pictures, so every
  shared painting points home.
- A share button that posts a painting to Pinterest.
- A way to share a painting by link, which makes every shared painting a page
  that can be found.

## The address

Easy-to-mistype addresses lose visitors: `scrape.arcc.co`, with two c's,
resolves to someone else's parked page with ads. Say the address carefully in
videos and pins, and consider a short, memorable domain of Scrape's own if one
is available.

## Measuring

Search Console's Performance report, by query, every few weeks. Expect weeks
before Google shows the site much at all, and a few months before the guide
pages settle. Nothing can promise the first spot, but on "scrape painting
online" and "squeegee painting online" there is little in the way.
