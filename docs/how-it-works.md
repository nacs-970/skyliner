# How Skyliner works

**Explained simply**

*No computer knowledge needed.*

Skyliner plays real pictures of a small patch of sky, taken by a NASA space telescope, like a short video. This booklet explains, in plain words, how it gets those pictures onto your screen.

**How to read it.** Every page is about one thing, with a picture or a small table. You can stop after any page. If you only want to know how to *use* the app, read the user manual instead. If you want the programmer's version, read `docs/architecture.md`.

**What is inside**

- **Part 1.** How the app fits together.
- **Part 2.** The five parts, one per page.
- **Part 3.** What happens when you click, type or wait.
- **Part 4.** Why it is built this way, and what it will not do.
- **Part 5.** The tools used, and a few words explained.

NASA Space Apps Challenge 2026, challenge 12: Planet X and SPHEREx. Written 15 November 2026. The diagrams in this booklet were drawn by an AI assistant, so each one says so.

# Part 1. How the app fits together

## 1.1 What it does, and the five parts

**What it does.** You choose a spot in the sky. The app shows you the pictures that NASA's telescope took of that spot, one after another, in the order they were taken. If something in the sky moves, you can see it move, a little like flipping the pages of a flipbook.

**The problem.** NASA keeps a huge library of pictures. One picture is big, about as big as 15 photos from a phone, and you only want a small square of each one. Also, a web browser is not allowed to use NASA's search directly. So a program has to find the right pictures and cut out the small squares for you.

**The solution has five parts.** They work together like this:

<div class="fig"><svg viewBox="0 0 720 345" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica, Arial, sans-serif" role="img" aria-label="The five parts: the web page, the service, the pipeline, NASA's archive and the cache">
<defs><marker id="a1" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#3b82f6"/></marker></defs>
<rect x="8" y="38" width="140" height="84" rx="10" fill="#eef4ff" stroke="#3b82f6" stroke-width="2"/>
<text x="78" y="72" font-size="17" font-weight="700" text-anchor="middle" fill="#1b1b1f">WEB PAGE</text><text x="78" y="96" font-size="13" text-anchor="middle" fill="#444">what you look at</text>
<rect x="190" y="38" width="140" height="84" rx="10" fill="#eef4ff" stroke="#3b82f6" stroke-width="2"/>
<text x="260" y="72" font-size="17" font-weight="700" text-anchor="middle" fill="#1b1b1f">SERVICE</text><text x="260" y="96" font-size="13" text-anchor="middle" fill="#444">small helper program</text>
<rect x="372" y="38" width="140" height="84" rx="10" fill="#eef4ff" stroke="#3b82f6" stroke-width="2"/>
<text x="442" y="72" font-size="17" font-weight="700" text-anchor="middle" fill="#1b1b1f">PIPELINE</text><text x="442" y="96" font-size="13" text-anchor="middle" fill="#444">prepares the pictures</text>
<rect x="554" y="38" width="158" height="84" rx="10" fill="#fff4e6" stroke="#ff8a00" stroke-width="2"/>
<text x="633" y="72" font-size="17" font-weight="700" text-anchor="middle" fill="#1b1b1f">NASA ARCHIVE</text><text x="633" y="96" font-size="13" text-anchor="middle" fill="#444">the picture library</text>
<rect x="372" y="206" width="140" height="84" rx="10" fill="#eafaf0" stroke="#22a05a" stroke-width="2"/>
<text x="442" y="240" font-size="17" font-weight="700" text-anchor="middle" fill="#1b1b1f">CACHE</text><text x="442" y="264" font-size="13" text-anchor="middle" fill="#444">saved pictures (a folder)</text>
<line x1="148" y1="64" x2="188" y2="64" stroke="#3b82f6" stroke-width="2.5" marker-end="url(#a1)"/><text x="168" y="54" font-size="12" text-anchor="middle" fill="#333">ask</text>
<line x1="188" y1="98" x2="150" y2="98" stroke="#3b82f6" stroke-width="2.5" marker-end="url(#a1)"/><text x="168" y="116" font-size="12" text-anchor="middle" fill="#333">reply</text>
<line x1="330" y1="64" x2="370" y2="64" stroke="#3b82f6" stroke-width="2.5" marker-end="url(#a1)"/><text x="350" y="54" font-size="12" text-anchor="middle" fill="#333">prepare</text>
<line x1="512" y1="80" x2="552" y2="80" stroke="#ff8a00" stroke-width="2.5" marker-end="url(#a1)"/><text x="532" y="70" font-size="12" text-anchor="middle" fill="#333">fetch</text>
<line x1="442" y1="122" x2="442" y2="204" stroke="#22a05a" stroke-width="2.5" marker-end="url(#a1)"/><text x="452" y="168" font-size="12" fill="#333">save a copy</text>
<polyline points="372,248 260,248 260,124" fill="none" stroke="#22a05a" stroke-width="2.5" marker-end="url(#a1)"/><text x="266" y="196" font-size="12" fill="#333">already saved?</text><text x="266" y="211" font-size="12" fill="#333">use it at once</text>
<polyline points="442,290 442,314 78,314 78,124" fill="none" stroke="#22a05a" stroke-width="2.5" stroke-dasharray="6 4" marker-end="url(#a1)"/><text x="100" y="307" font-size="12" fill="#333">the page can also read saved files directly (no service needed)</text>
<text x="712" y="338" font-size="10" text-anchor="end" fill="#888">SI-generated diagram (AI assistant)</text>
</svg></div>

*Figure 1. The five parts and how they talk to each other.*

| Part | What it is |
|---|---|
| **Web page** | What you look at: the front page and the viewer |
| **Service** | A small program on your own computer. It answers the page and starts the pipeline when needed |
| **Pipeline** | The steps that fetch the pictures from NASA and prepare them |
| **NASA archive** | NASA's public picture library (called IRSA) |
| **Cache** | A folder on your computer where prepared pictures are saved |

# Part 2. The five parts

## 2.1 NASA's picture archive

**Where the pictures come from.** SPHEREx is a NASA space telescope. It takes pictures of the whole sky in 102 different colours of infrared light (light that our eyes cannot see). It looks at any one spot in **windows that are months apart**, and takes many pictures each time. NASA stores the pictures in a public library, the **IRSA archive**, which anyone can use without a password.

**Why the pictures are not simply downloaded.**

| Fact | What it means for us |
|---|---|
| One picture is about 65 MB | About 15 phone photos in one. Far too big to download hundreds. |
| One spot is covered by 115 to 451 pictures | Downloading them all would take hours and waste NASA's bandwidth. |
| We only need a small square around the spot | The small square is about two-fifths of the width of the full Moon. |

**A trick that saves time.** A picture is stored line by line, like a long scroll. The program can ask the archive for just the lines around your spot, instead of the whole scroll. That is about 2 MB per picture instead of 65 MB. This is called a *range read*. If it fails, the program asks NASA's cutout service for the small square instead, which is slower.

**The archive has two parts.** One part is a *search service* ("which pictures show this spot?"). The other is the *file store* (the picture files). Web pages are not allowed to use the search service, which is the reason the service and the pipeline exist.

## 2.2 The pipeline: preparing the pictures

The pipeline is the program that prepares one spot. It works in five steps.

<div class="fig"><svg viewBox="0 0 720 190" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica, Arial, sans-serif" role="img" aria-label="The five steps of the pipeline: find, cut out, line up, shrink, save">
<defs><marker id="a2" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#3b82f6"/></marker></defs>
<g font-size="13" text-anchor="middle" fill="#1b1b1f">
<rect x="6" y="24" width="124" height="118" rx="10" fill="#eef4ff" stroke="#3b82f6" stroke-width="2"/><circle cx="68" cy="24" r="14" fill="#3b82f6"/><text x="68" y="29" font-size="15" font-weight="700" fill="#fff">1</text><text x="68" y="62" font-size="16" font-weight="700">FIND</text><text x="68" y="86" fill="#444">Ask NASA which</text><text x="68" y="103" fill="#444">pictures show</text><text x="68" y="120" fill="#444">this spot</text>
<rect x="150" y="24" width="124" height="118" rx="10" fill="#eef4ff" stroke="#3b82f6" stroke-width="2"/><circle cx="212" cy="24" r="14" fill="#3b82f6"/><text x="212" y="29" font-size="15" font-weight="700" fill="#fff">2</text><text x="212" y="62" font-size="16" font-weight="700">CUT OUT</text><text x="212" y="86" fill="#444">Take only the</text><text x="212" y="103" fill="#444">small square</text><text x="212" y="120" fill="#444">from each one</text>
<rect x="294" y="24" width="124" height="118" rx="10" fill="#eef4ff" stroke="#3b82f6" stroke-width="2"/><circle cx="356" cy="24" r="14" fill="#3b82f6"/><text x="356" y="29" font-size="15" font-weight="700" fill="#fff">3</text><text x="356" y="62" font-size="16" font-weight="700">LINE UP</text><text x="356" y="86" fill="#444">Make every star</text><text x="356" y="103" fill="#444">sit at the same</text><text x="356" y="120" fill="#444">place</text>
<rect x="438" y="24" width="124" height="118" rx="10" fill="#eef4ff" stroke="#3b82f6" stroke-width="2"/><circle cx="500" cy="24" r="14" fill="#3b82f6"/><text x="500" y="29" font-size="15" font-weight="700" fill="#fff">4</text><text x="500" y="62" font-size="16" font-weight="700">SHRINK</text><text x="500" y="86" fill="#444">Save only what</text><text x="500" y="103" fill="#444">changed, in small</text><text x="500" y="120" fill="#444">files</text>
<rect x="582" y="24" width="124" height="118" rx="10" fill="#eafaf0" stroke="#22a05a" stroke-width="2"/><circle cx="644" cy="24" r="14" fill="#22a05a"/><text x="644" y="29" font-size="15" font-weight="700" fill="#fff">5</text><text x="644" y="62" font-size="16" font-weight="700">SAVE</text><text x="644" y="86" fill="#444">Put the files in</text><text x="644" y="103" fill="#444">the cache for the</text><text x="644" y="120" fill="#444">page to read</text>
</g>
<line x1="131" y1="83" x2="148" y2="83" stroke="#3b82f6" stroke-width="2.5" marker-end="url(#a2)"/><line x1="275" y1="83" x2="292" y2="83" stroke="#3b82f6" stroke-width="2.5" marker-end="url(#a2)"/><line x1="419" y1="83" x2="436" y2="83" stroke="#3b82f6" stroke-width="2.5" marker-end="url(#a2)"/><line x1="563" y1="83" x2="580" y2="83" stroke="#3b82f6" stroke-width="2.5" marker-end="url(#a2)"/>
<text x="712" y="182" font-size="10" text-anchor="end" fill="#888">SI-generated diagram (AI assistant)</text>
</svg></div>

*Figure 2. The five steps of the pipeline.*

**Step 3, "line up", in plain words.** The telescope does not point at exactly the same place every time, so each picture is a little shifted and turned. The pipeline uses the position information that NASA stores with every picture to put all the small squares on one common grid. After that, a star that does not move stays on the same dot in every frame. A star that does not move stays on the same dot. Brightness can still change from picture to picture, because each picture is a different colour of light, and because of noise.

**Step 4, "shrink", in plain words.** Most of the sky looks the same from one picture to the next. So the pipeline stores the first picture in full, and for the next ones it keeps only the small tiles that changed by more than the noise. The shrunk copy ends up about **10 to 15 times smaller** than the raw numbers. The price is that it is not an exact copy. It is good for looking at, not for measuring. (The cache also keeps the original pictures, and the page can show either.)

**Stars that move.** Some stars drift across the sky, such as Barnard's Star. An old catalogue says where the star was in the year 2000, and by now it has moved. If the square were centred on the old position, the star would sit far off to one side. For NASA's test targets, a developer step moves the catalogue position to the date of the pictures before anything is fetched. A position you type on the page is used exactly as typed.

## 2.3 The cache: why the second visit is instant

The cache is just a folder on your computer. Each spot you have looked at has its own sub-folder, named after its position in the sky.

- **Ask again, get it at once.** If you ask for a spot that is already in the cache, nothing is fetched. The page reads the files and shows them.
- **Nearby counts as the same.** If you ask for a position within about 5 arcminutes of the centre of a saved spot (about one-sixth of the width of the Moon), that saved spot opens at once.
- **New pictures need a developer command.** If NASA adds or re-processes pictures later, a developer command can fetch just those. The app does not do this by itself.
- **A starter set is included.** The project comes with five spots already in the cache: NASA's five test targets, on one of the six cameras. So a first-time visitor sees real pictures straight away, with no waiting and nothing to install.

| What is in the cache | Looks like | Why |
|---|---|---|
| The pictures of one spot | Files with names like `sky.data.js` (a few MB each) | The page reads them directly |
| A list of when each picture was taken | `sky.index.js` | The timeline is drawn from it |
| The shrunk copy | `sky.store.js` | The page can show the shrunk version too |
| A note on what the spot is | `target.json` | Its name, position and where the position came from |

## 2.4 The service: the helper program

The service is a small program that runs on **your own computer**. It does three jobs.

1. **Serves the pages.** It hands your browser the front page and the viewer.
2. **Answers "is this spot saved?"** It looks in the cache.
3. **Starts the pipeline** when the spot is not saved, and reports how far it is, so the page can show a progress bar.

**Rules the service keeps.**

| Rule | Why |
|---|---|
| One job at a time (and only two pictures read at once within it) | NASA's archive is shared by everyone. We do not flood it. |
| At most 5 jobs waiting | If more come, the page says "the queue is full, try again in a few minutes". |
| Only your own computer can talk to it | Nobody else on the internet can give it orders. |
| Only valid numbers are accepted | A position must be a real RA (0 to 360) and Dec (-90 to 90), nothing else. |
| Cancel is always possible | Pressing Cancel stops the job and removes a new, unfinished spot. |

**You start the service yourself** with `./start.sh` (or `start.bat` on Windows). If you only want to look at the five prepared spots, you do not need the service at all.

## 2.5 The web page

The web page is what you see. It has two parts.

- **The front page** is a blank page with two boxes (the position) and five buttons (the test targets). It checks what you typed and talks to the service.
- **The viewer** is the flipbook itself. It has the picture, the play buttons, and the timeline underneath.

**How the viewer shows a picture.** It reads the saved numbers (how bright each dot of the picture is), removes the background glow, turns the numbers into shades of grey, and paints the dots on the screen. When you press play, it paints the next picture, and the next, many times a second.

**The timeline** is drawn from the *real times* the pictures were taken. That is why it has long gaps: the telescope really did not look at that spot for months. The page does not hide the gaps and does not make up pictures to fill them.

**Made of plain parts.** The page uses only the basic building blocks of the web (HTML for the structure, CSS for the look, JavaScript for the behaviour), with no extra libraries and no building step. That keeps it small and easy to read.

# Part 3. What happens when you click, type or wait

## 3.1 You click a test target, like Barnard's Star

This is the fast path. It even works with **no service and no internet**.

1. You open `index.html` in your browser.
2. The page reads the list of saved spots and shows five buttons.
3. You click **Barnard's Star**.
4. The page finds that spot in the list and opens the viewer.
5. The viewer reads the saved files and shows the first picture.

Nothing is fetched from NASA. Nothing leaves your computer.

## 3.2 You type a spot nobody has looked at before

This is the slow path. It needs the service and an internet connection. It takes about **5 to 10 minutes** (from Thailand), mostly because NASA's archive is busy and the pictures are read a few at a time.

<div class="fig"><svg viewBox="0 0 720 250" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica, Arial, sans-serif" role="img" aria-label="What happens when you type a position: is it saved? if yes open at once, if no prepare it, then open">
<defs><marker id="a3" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#3b82f6"/></marker></defs>
<rect x="6" y="90" width="128" height="62" rx="10" fill="#eef4ff" stroke="#3b82f6" stroke-width="2"/><text x="70" y="118" font-size="14" font-weight="700" text-anchor="middle" fill="#1b1b1f">You type</text><text x="70" y="136" font-size="13" text-anchor="middle" fill="#444">a spot</text>
<polygon points="250,60 340,121 250,182 160,121" fill="#fff9e6" stroke="#e6a800" stroke-width="2"/><text x="250" y="117" font-size="14" font-weight="700" text-anchor="middle" fill="#1b1b1f">Saved in</text><text x="250" y="135" font-size="14" font-weight="700" text-anchor="middle" fill="#1b1b1f">the cache?</text>
<rect x="420" y="14" width="150" height="62" rx="10" fill="#eafaf0" stroke="#22a05a" stroke-width="2"/><text x="495" y="42" font-size="14" font-weight="700" text-anchor="middle" fill="#1b1b1f">Open at once</text><text x="495" y="60" font-size="13" text-anchor="middle" fill="#444">no waiting</text>
<rect x="420" y="150" width="150" height="86" rx="10" fill="#eef4ff" stroke="#3b82f6" stroke-width="2"/><text x="495" y="176" font-size="14" font-weight="700" text-anchor="middle" fill="#1b1b1f">Prepare it</text><text x="495" y="194" font-size="13" text-anchor="middle" fill="#444">fetch, line up, shrink</text><text x="495" y="212" font-size="13" text-anchor="middle" fill="#444">with a progress bar</text>
<rect x="610" y="90" width="104" height="62" rx="10" fill="#eafaf0" stroke="#22a05a" stroke-width="2"/><text x="662" y="118" font-size="14" font-weight="700" text-anchor="middle" fill="#1b1b1f">The viewer</text><text x="662" y="136" font-size="13" text-anchor="middle" fill="#444">opens</text>
<line x1="134" y1="121" x2="158" y2="121" stroke="#3b82f6" stroke-width="2.5" marker-end="url(#a3)"/>
<polyline points="300,92 300,45 418,45" fill="none" stroke="#22a05a" stroke-width="2.5" marker-end="url(#a3)"/><text x="330" y="38" font-size="13" font-weight="700" fill="#22a05a">YES</text>
<polyline points="300,150 300,193 418,193" fill="none" stroke="#3b82f6" stroke-width="2.5" marker-end="url(#a3)"/><text x="330" y="186" font-size="13" font-weight="700" fill="#3b82f6">NO</text>
<polyline points="570,45 662,45 662,88" fill="none" stroke="#22a05a" stroke-width="2.5" marker-end="url(#a3)"/>
<polyline points="570,193 662,193 662,154" fill="none" stroke="#3b82f6" stroke-width="2.5" marker-end="url(#a3)"/>
<text x="712" y="244" font-size="10" text-anchor="end" fill="#888">SI-generated diagram (AI assistant)</text>
</svg></div>

*Figure 3. What happens when you type a position.*

**While you wait, the loading screen shows three steps:** searching NASA's archive, reading the pictures (with "image 12 of 61, about 4 minutes left"), and building the view. You can leave the tab open. You can press **Cancel** at any time.

**The next time you ask for the same spot, it takes the fast path of page 3.1.**

## 3.3 You type a new spot, but the service is not running

If the service is not running, the page does not crash. It shows a box that says how to start it (`./start.sh`, with a Copy button), and it keeps checking every two seconds. The moment the service starts, the page carries on by itself.

If you ask for a spot that **is** in the cache, you never see this box. The page can open it without the service. (The front page does show a small note that the service is not running. You can ignore it for saved spots.)

| You ask for... | Service running? | What happens |
|---|---|---|
| A spot in the cache | No | Opens at once |
| A spot in the cache | Yes | Opens at once |
| A new spot | Yes | Prepared, with a progress bar (5 to 10 minutes) |
| A new spot | No | The page waits and shows how to start the service |

# Part 4. Why it is built this way, and what it will not do

## 4.1 Four reasons for the design

**1. Web pages cannot use NASA's search service.** For safety, browsers only allow a page to talk to servers that give them permission. NASA's search service does not give that permission to web pages. So a program that is not a web page has to ask on the page's behalf. That is the service and the pipeline. We tested this on 14 November 2026.

**2. Keep it light.** Small files, no extra libraries, no building step. The page opens straight from a folder. A person can read every file.

**3. Run on your own computer.** We did not set up a public website. Everything runs on your own machine, so there is nothing to log in to, nothing to pay for and nothing that tracks you.

**4. Be honest.** The app says "Real SPHEREx data". It never makes up pictures. It never claims to have found something.

## 4.2 Safe and fair

| Question | Answer |
|---|---|
| Does it send my information anywhere? | No. Typing a position sends nothing but requests to NASA's archive for that spot. A star's name goes to a public star catalogue (SIMBAD) only when a developer runs the star look-up command for the test targets. No personal information goes anywhere. |
| Does it track me? | No. No accounts, no cookies, no tracking. Your theme and settings stay in your own browser. |
| Is it fair to NASA's archive? | Yes. One job at a time with two pictures read at once, a small square instead of a whole picture, a polite client name, waiting and trying again when the archive is busy, and a cache so nothing is fetched twice. |
| Can anyone else use my service? | No. It only answers pages on your own computer. |
| Is the data safe to open? | The program reads NASA's files with a trusted science library and never runs anything found inside them. |

## 4.3 What it will not do

- **It does not find moving things.** It shows pictures. You do the looking. It never says "this is a planet" or "this is a discovery".
- **It does not fill the gaps.** If the telescope did not look for six months, the timeline shows six months of nothing.
- **It cannot see very faint stars in one picture.** Two of NASA's test targets (WISE 0855 and Epsilon Indi B) are too faint to see in a single frame.
- **It is not a measuring tool.** The shrunk copy is for looking, not for exact numbers.
- **It does not cover the whole sky yet.** It works where NASA's first data release (DR1) has pictures.
- **It is not on the internet yet.** It runs on one computer. A public website was not part of the plan.

# Part 5. The tools used, and a few words explained

## 5.1 What is used, in plain terms

| Part | Made with | In plain words |
|---|---|---|
| The web page | HTML, CSS, JavaScript | The three basic languages of the web. No extras. |
| Drawing the pictures | A browser feature called *canvas* | A blank sheet the page paints dots on. |
| The service | Python, with FastAPI and Uvicorn | A small program that listens for requests on your computer. |
| The pipeline | Python, with astropy and numpy | Free science tools that read NASA's picture files and do the maths. |
| Starting everything | `uv` | A free tool that starts the service and installs what each program needs (the service's two small parts, and the science tools for the pipeline). |
| NASA's archive | IRSA and its public file store | Where the real pictures live. |
| Star positions | SIMBAD | A public catalogue of stars. |

Everything above is free. The list of every outside item and its license is in `docs/references.md`.

## 5.2 A few words explained

| Word | Meaning |
|---|---|
| **Service** | A small program running on your computer. It answers the page and starts the pipeline. |
| **Pipeline** | The steps that turn NASA's pictures into files the page can show. |
| **Cache** | A folder where prepared spots are saved. |
| **Patch** | One small square of sky, about two-fifths the width of the Moon. |
| **Detector** | One of the telescope's six cameras. Each sees different colours of infrared light. |
| **Observing window** | A period when the telescope looked at your spot. They are months apart. |
| **Frame** | One picture of the patch at one moment. |
| **Archive (IRSA)** | NASA's public library of pictures. |
| **Range read** | Asking the archive for just some lines of a picture, not the whole thing. |

## 5.3 Where to read more

| If you want to... | Read |
|---|---|
| Learn how to use the app, button by button | `docs/user-manual.pdf` |
| See the programmer's version, with every route and file format | `docs/architecture.md` |
| See the rules, decisions and open questions | `AGENTS.md` |
| See every outside tool and license | `docs/references.md` |
| See every use of AI in this project | `docs/si-log.md` |
