# 02. The 14 Official 2026 Challenges (Hackathon Topics)

Primary source: https://www.spaceappschallenge.org/2026/challenges/ and the 14 statement pages (raw text in `raw/2026-challenge-statements/`). Statements were published 28 Oct 2026. The per-challenge **Resources** tabs (data sets, tools, partner-agency data) went live by 13 Nov and are collected in [06-challenge-resources-2026.md](06-challenge-resources-2026.md).

Each team picks exactly one challenge. Difficulty tags are NASA's. Several challenges carry two or three tags, meaning the problem can be tackled at more than one level.

## Overview

| # | Challenge | Focus | Difficulty | Subjects |
|---|-----------|-------|-----------|----------|
| 1 | Harmonization of MODIS and VIIRS Hot Spots | Earth | Advanced, Intermediate | Earth Science, Software |
| 2 | The Earth Information Jukebox | Earth | Intermediate, Beginner/Youth | Arts & Multimedia, Earth Science, Software |
| 3 | Dancing with the SARs | Earth | Advanced, Intermediate | Earth Science |
| 4 | Be An Earth System Trend Detective! | Earth | Advanced | Earth Science, Software |
| 5 | Field Shift: Adapting Farms with NASA Data | Earth | Advanced, Intermediate | Arts & Multimedia, Earth Science, Software |
| 6 | Lunar Landing Site Navigator | Moon | Advanced, Intermediate | Human Exploration, Moon, Software, Space Exploration |
| 7 | Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars | Moon (and Mars) | Advanced, Intermediate, Beginner/Youth | Earth Science, Planets & Moons, Software, Space Exploration |
| 8 | Abandoned but not Forgotten: Storytelling about NASA's Discarded Equipment on the Moon and Mars | Moon (and Mars) | Intermediate, Beginner/Youth | Astrophysics, Planets & Moons, Space Exploration |
| 9 | Interplanetary Survival Guide: Martian Map | Mars | Intermediate | Human Exploration, Mars, Planets & Moons, Software, Space Exploration |
| 10 | Space Mission Design Game | Mars/general | Intermediate, Beginner/Youth | Games |
| 11 | Build a Junior Astronaut Mission Trainer | Mars/general | Intermediate, Beginner/Youth | Games, Planets & Moons, Software, Space Exploration, Sun |
| 12 | Planet X and SPHEREx | Beyond | Advanced | Astrophysics, Planets & Moons, Software |
| 13 | Create Health Monitoring Software for Astronauts on Space Missions | Beyond | Intermediate | Human Exploration, Software, Space Exploration |
| 14 | Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data | Beyond | Advanced, Intermediate | Space Exploration |

The "Focus" column follows the grouping on the Lucerne host page (Home / Moon / Mars / Beyond). NASA's own article (2026-10-15) groups the set into three areas instead: returning humans to the Moon (Artemis, Moon Base), preparing for deeper solar system missions (Mars, with some links to Europa and Titan analog environments), and expanding understanding of the universe (astrophysics, including SPHEREx).

**Beginner/Youth-friendly:** #2, #7, #8, #10, #11. **Advanced-only:** #4, #12. **Largest Earth-data challenges:** #1, #3, #4, #5. **Game builders:** #10, #11.

---

## Earth ("Home")

### 1. Harmonization of MODIS and VIIRS Hot Spots (Advanced, Intermediate)
- **Problem:** active-fire records from two sensors cannot be compared directly, so fire managers lack a consistent history (2000s to present).
- **Build:** a web application that harmonizes MODIS and VIIRS hotspot detections into one consistent series and shows a **burning-activity calendar**. Two parts: (1) harmonization so the sensor of origin no longer matters, (2) a web app where users pick a region and date range and get analytics and visualizations.
- **Suggested features:** hotspot counts per month from the early 2000s to now, color ramps showing seasonal and yearly differences, downloadable CSV of detected hotspots, early-warning views for emergency responders, scientists and land managers.

### 2. The Earth Information Jukebox (Intermediate, Beginner/Youth)
- **Problem:** NASA's Earth Information Center (EIC) visualizations rely on sight only.
- **Build:** an "Earth Jukebox" that pairs EIC visual frames with **sonifications generated in real time**.
- **Ideas given:** computer vision on color palettes, shapes or pixel density mapped to pitch, tempo and instrumentation. Deliverable can be a web jukebox, desktop app, backend API, or a playlist of generated audio with an explanation of the method.

### 3. Dancing with the SARs (Advanced, Intermediate)
- **Problem:** surface change (wetland and floodplain shifts, deforestation, wildfires, earthquakes, farming, glaciers, volcanoes) is hard to visualize.
- **Build:** an interactive app using radar data from the **NASA-ISRO Synthetic Aperture Radar (NISAR)** mission to track and visualize one or more types of surface change at locations worldwide.
- **Workflow hinted:** pick a study area (hometown, wetland, ice sheet, fire, flood, volcano), download NISAR data from the supplied resources, optionally add optical or other supplemental data, then build change-detection visualizations.

### 4. Be An Earth System Trend Detective! (Advanced)
- **Problem:** many Earth science variables trend in different directions in different regions; choosing variables and analyzing them is hard.
- **Build:** a tool that selects variables from Earth science missions or models, visualizes how they change over time, and determines **what, where, how much, and whether the change is statistically significant**.
- **Required elements:** variable selection, regional data acquisition, a long time series, a basic statistical analysis with the rate of change and a significance test (t-test, Mann-Kendall or confidence intervals). A response with both visualization and analysis meets the full scope.

### 5. Field Shift: Adapting Farms with NASA Data (Advanced, Intermediate)
- **Problem:** shifting temperature and rainfall, water shortage, extreme weather and poor soil make crop-rotation choices hard.
- **Build:** a **decision-support tool** (app, model, interactive map) that helps farmers explore crop-rotation strategies using NASA Earth observations plus local soil information, crop characteristics and farmer priorities.
- **Data named:** SMAP, ECOSTRESS, GPM, Landsat, MODIS, NASA POWER, GRACE and GRACE-FO, SRTM or other elevation products. Analyze temperature, heat stress, rainfall, soil moisture, evaporation, frost risk, extreme precipitation, vegetation stress.
- **Guidance:** compare at least three rotation strategies including the existing one; highlight bare-field periods and vulnerable seasons; the tool supports, and does not replace, farmer judgment.

## Moon

### 6. Lunar Landing Site Navigator (Advanced, Intermediate)
- **Problem:** Moon south pole missions face extreme lighting and communication limits. Existing Sun and Earth position tools have complicated interfaces.
- **Build:** an intuitive tool for mission planners, educators and the public to **compare landing sites and dates quickly**, showing Sun and Earth positions relative to the horizon to judge power generation and direct-to-Earth communication windows.
- **Ideas given:** site picker (Apollo sites, future CLPS targets, commercial and other nations' missions, custom coordinates), date and time selection, time remaining before sunset or Earthset, solar elevation and sunlight duration, 2D, 3D or timeline animations across a lunar day.
- **Naming note:** a third-party page and an earlier listing called a similar challenge "CLPS Lunar Mission Browser". The official list on 2026-11-08 uses "Lunar Landing Site Navigator".

### 7. Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars (Advanced, Intermediate, Beginner/Youth)
- **Problem:** terrestrial analog sites (Atacama Desert, Haughton Crater, Death Valley) let teams test equipment before flight, but many analogs are not well characterized.
- **Build:** use open Earth, Moon and Mars data from NASA and other agencies to **identify and characterize new Earth analogs** (deserts, polar regions, volcanic and arid terrain, caves) for bases or landing sites, then present as a map, visualization or other tool.
- **Format is open:** written report, interactive map, similarity-ranking system, ML tool, story. One compelling site or a global comparison are both fine.

### 8. Abandoned but not Forgotten: Storytelling about NASA's Discarded Equipment on the Moon and Mars (Intermediate, Beginner/Youth)
- **Problem:** since the 1960s NASA has left hardware on the Moon, Mars and in deep space (finished rovers, instruments, probes still traveling).
- **Build:** a story-driven educational tool or narrative for **school-age and casual space fans** that explains what the hardware is, why it was there and the science it enabled.
- **Format is open:** interactive web experience (HTML/CSS/JavaScript), educational game, illustrated digital children's book, short video, and more.

## Mars

### 9. Interplanetary Survival Guide: Martian Map (Intermediate)
- **Problem:** the first astronauts on Mars will need the best possible map of routes, destinations and current conditions.
- **Build:** a **layered, integrated view** of a Mars location or route combining data from multiple NASA science missions to help a human explorer plan and carry out a successful "Marswalk" with new science.
- **Guidance:** consider at least three data types (optical, thermal, spectral, topographic, geophysical, atmospheric, radiation, chemical); include space weather and radiation context; astronaut safety is NASA's first priority. Start with a well-explored rover site or a less-studied area for a harder variant.

### 10. Space Mission Design Game (Intermediate, Beginner/Youth)
- **Problem:** students rarely get to experiment with an entire mission from concept to operation.
- **Build:** an **interactive game** to design, manage and simulate a complete space mission: objective and requirements, spacecraft design, science instruments, launch vehicle and orbit, and constraints (budget, mass, power, communications, data, lifetime).
- **Suggested scope:** single-player or team play (up to 4 players), mission configuration, resource management, simulation and evaluation with feedback on mission success.

### 11. Build a Junior Astronaut Mission Trainer (Intermediate, Beginner/Youth)
- **Problem:** space STEM content either oversimplifies engineering trade-offs or is too complex for young learners.
- **Build:** an interactive game or app where **kids aged 7-12** run a lunar or Martian outpost, balancing life support, radiation shielding, power, food production and communication delay.
- **Guidance:** make every choice a real trade-off. Ground the simulation in open NASA data where possible (DONKI for solar activity and radiation risk, OSDR for astronaut health and biology findings, Artemis and Mars surface mission data). Format open: survival game, narrative simulator, mission-control dashboard; browser, mobile or desktop. A working prototype demonstrating the trade-off mechanic is the goal.

## Beyond

### 12. Planet X and SPHEREx (Advanced)
- **Problem:** NASA's SPHEREx mission (data since May 2025) maps the whole sky every six months in 102 near-infrared bands, covering more than a billion objects. Moving objects (comets, asteroids, brown dwarfs, possible new planets) can be spotted by comparing images over time, but the volume is too large for one person.
- **Build:** a **public-facing web tool** where users enter sky coordinates (Right Ascension and declination) and see a series of SPHEREx images of that patch like a short video, to spot motion.
- **Test targets given:** Barnard's Star, Epsilon Indi B, WISE 0855 (RA 08h55m10.831s, Dec -7d14m42.53s), variable stars RW Aurigae and R Draconis.
- **Ideas:** easy updates as new data arrives, add or subtract images from different times, summing the six detector arrays for signal-to-noise, spectra on the fly, adjustable field of view, overlays from Gaia or WISE, URL-based coordinates for embedding, show contamination flags. Tools mentioned: Astropy and Aladin (CDS). Related citizen science: backyardworlds.org.

### 13. Create Health Monitoring Software for Astronauts on Space Missions (Intermediate)
- **Problem:** long missions bring radiation, isolation, altered gravity and a closed environment, causing immune changes, bone loss, cardiovascular events and behavioral health problems. Astronauts must spot many changes in themselves.
- **Build:** a **visual self-assessment tool** that collects health indicators (any input: text, clicks, camera images) and gives guidance on treatment and health improvement.
- **Guidance:** use NASA's Human Research Program and other agency resources to decide which indicators are measurable in space and useful for a quick assessment. UI matters: e.g., a clickable human figure with per-body-part information, animations and interactivity.

### 14. Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data (Advanced, Intermediate)
- **Problem:** decades of NASA flame experiments in microgravity (for example on the ISS), now public in NASA's **Physical Science Informatics (PSI)** database, are hard to find, compare and interpret.
- **Build:** an **SI-powered, web-based dashboard** that summarizes, ranks and interprets combustion investigations to deliver fire safety insights for crew environments (spacecraft, stations, lunar and Martian bases, pressurized rovers).
- **Ideas:** rank studies by relevance to habitable-environment fire safety, extract data for predictive flammability modeling, highlight research informing new fire safety controls and equipment, and show Earth spin-offs (ISS fine-water-mist extinguishers, smoke detectors, firefighter gear). Rocket and propellant fires are out of scope of the PSI data.

---

## Reading the set as a whole (interpretation)

- Many challenges ask for a **web tool or visualization on open NASA data**: #1, #3, #4, #6, #7, #9, #12, #14.
- Three ask for **games or education for kids**: #8, #10, #11 (plus the youth tag on #2 and #7).
- Two are **astronaut-health or safety tools**: #13, #14.
- Because the FAQ requires teams to disclose SI (AI) use, challenges that explicitly call for SI (#14) or for real-time generation (#2) fit that requirement naturally.
- Prior-year winners skew toward projects that combine a clear audience, real data, and a polished demo (see [03-past-winners.md](03-past-winners.md)).
