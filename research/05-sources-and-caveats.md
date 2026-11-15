# 05. Sources, Method, Caveats and Re-check List

## Method

1. Web searches (standard and extended) for the 2026 event, 2025 winners, Thailand events, judging criteria and past winners.
2. Direct fetches of NASA, Space Apps and partner pages.
3. The official site `spaceappschallenge.org` could not be fetched with `curl` or the web fetch tool: both failed with "unable to get local issuer certificate" (the server sends an incomplete certificate chain that those clients cannot complete). A headless browser (Chromium or Firefox) loaded the pages normally. Certificate verification was never disabled.
4. Page text was extracted with `document.body.innerText`; copies are in `raw/`.

## Sources by reliability

**Official (primary)**
- https://www.spaceappschallenge.org/2026/ (registration steps, timeline, collaborators)
- https://www.spaceappschallenge.org/2026/challenges/ and the 14 statement pages
- https://www.spaceappschallenge.org/resources/participant-faqs/ (updated 2026-11-05)
- https://www.spaceappschallenge.org/2026/local-events/ (plus the Bangkok and Phayao event pages) and /2026/space-agency-partners/
- https://www.spaceappschallenge.org/legal/ (Participant Terms & Conditions, updated 2026-08-07)
- https://www.spaceappschallenge.org/resources/judging-awards-guide/ and https://www.spaceappschallenge.org/resources/project-submission-guide/ (both dated 2026-11-12, read 2026-11-13)
- Each challenge's Resources tab, `/2026/challenges/<slug>/?tab=resources` (read 2026-11-13)
- https://www.spaceappschallenge.org/awards/ and /about/results-and-metrics/
- https://www.spaceappschallenge.org/2025/awards/ (finalists, honorable mentions, nominees)
- NASA Science, 2026-10-15: https://science.nasa.gov/universe/nasa-welcomes-all-ages-experience-levels-for-space-apps-challenge/
- NASA winner announcements: 2025 https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-announces-2025-international-space-apps-challenge-global-winners/ ; 2024 https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-international-space-apps-challenge-announces-2024-global-winners/ ; 2023 https://science.nasa.gov/directorates/smd/2023-nasa-international-space-apps-challenge-announces-10-global-winners ; 2022 https://www.earthdata.nasa.gov/news/nasa-announces-winners-2022-global-space-apps-challenge ; 2021 https://earthdata.nasa.gov/news/nasa-announces-2021-international-space-apps-challenge-global-award-winners

**Secondary (cross-checks)**
- Wikipedia: https://en.wikipedia.org/wiki/NASA_International_Space_Apps_Challenge (history table, 2012-2020 winner names)
- Astrobiology.com (2026-09-04) registration notice, partner list, "judging begins 16 November"
- Local host pages: Lucerne https://www.spaceappschallenge.ch/ (14-challenge list, kick-off time), Kamloops https://www.tru.ca/science/news/nasa-space-apps-challenge.html (sample schedule and prizes), Unique World Robotics UAE https://nasaspaceapps.ae/, The Recursive (Central and Eastern Europe) https://therecursive.com/nasa-space-apps-challenge-2026-where-to-join-it-in-cee , Science Report (Alba Iulia prizes), Seoul National University notice (criteria Impact, Creativity, Validity)
- AWS Builder Center community post (general how-to; not official)
- Thailand: https://www.createwith.com/event/chiang-mai-nasa-space-apps-challenge-chiang-mai-2026-nov-2026 (third-party listing for Chiang Mai)

## Known gaps

| Gap | Why | Action |
|-----|-----|--------|
| Global Offers (free tools from Google, Microsoft, GoDaddy, Meteomatics, Miro) | Announced for 13 Nov, but no page was found; guessed `/2026/global-collaborators/` and `/global-collaborators/` returned "Page Not Found" | Look on the 2026 page, the Global Collaborators link in the site menu, or Space Apps Connect |
| Resources index page | On 13 Nov `/resources/` still listed only the Team Formation and Space Apps Connect guides, although the two new guides load at their direct URLs | Use `/resources/judging-awards-guide/` and `/resources/project-submission-guide/` directly |
| 2025 Global Finalists (45) and Honorable Mentions (23) | The official page loads 20 per page; only the first page was captured | Use the site's "load more" or filters |
| Thai teams in 2023-2025 finalist lists | Lists not fully captured | Filter finalists by Thailand on the site |
| Executive-order claim (29 Sep 2026, "Super Intelligence") | Stated on the official FAQ; not independently verified | Treat as the organizers' stated terminology |
| Global prize for 2026 winners | FAQ: "more information will be announced at a later date" | Watch NASA announcements |

## Conflicts between sources (how they were resolved)

- **2025 Photonics Odyssey award:** one outlet gave a different honor; NASA's announcement says Most Inspirational. Used NASA.
- **2023 winners announcement date:** NASA's article says 26 Jan 2024; another source says 23 Jan 2024; Wikipedia's text elsewhere gives another date. Recorded "January 2024".
- **2024/2023 official winners pages:** the official site pages for these years render a paginated alphabetical list (20 rows, including non-winners and $-prefixed team names), so they were **not used** for the winner lists. NASA's own announcement articles were used instead (they match the Wikipedia names for 2024: WMPGang, GaamaRamma, 42 QuakeHeroes, NVS-knot, AsturExplorers, and so on). Raw dumps are kept in `raw/past-years/` for reference only.
- **Challenge title "CLPS Lunar Mission Browser":** appears on a third-party summary and earlier listings; the official list on 2026-11-08 shows "Lunar Landing Site Navigator". Used the official title.
- **Participant count 373,000 (Wikipedia) vs 487,000+ (official):** used official.
- **Chiang Mai event:** third-party listing only (createwith.com, no organizer or venue); absent from the official local events page, and its registration URL (`/2026/local-events/chiang-mai`) returns "Page Not Found" on 2026-11-08. Treated as unconfirmed.
- **Registration open date:** some pages say 26 Aug, others post on 4 Sep. Official FAQ: 26 Aug 2026.
- **Judging start:** "Nov 16" from a NASA-derived news item; official FAQ gives no date.

## Re-check list for 14 November 2026 and after

1. Each `https://www.spaceappschallenge.org/2026/challenges/<slug>/?tab=resources` page: new items may be added before the hackathon starts.
2. The Global Offers page (free tools from Google, Microsoft, GoDaddy, Meteomatics, Miro): not located on 13 Nov.
3. https://www.spaceappschallenge.org/2026/local-events/ : the local event page you register for (schedule, venue, local prizes).
4. After the event: https://www.spaceappschallenge.org/awards/ for Global Nominees (3 Dec 2026), Global Finalists and Honorable Mentions (17 Dec 2026) and Global Winners (26 Jan 2027).
