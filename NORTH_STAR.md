# Privacy Maker — North Star Vision

*19 september 2026 · Remsey Mailjard*

## Vision

Geen professional zou ooit moeten kiezen tussen AI gebruiken en de mensen beschermen die ze bedienen. Over drie jaar is tekst afschermen voor je 'm in een cloudmodel plakt net zo vanzelfsprekend en onzichtbaar als spellingscontrole - infrastructuur die elke browser, elk tekstveld en elke gereguleerde werkplek in Europa gewoon heeft, in plaats van een los tool dat je moet onthouden te openen.

Privacy Maker wint niet door de grootste te worden, maar door de standaard te worden voor "AI gebruiken zonder gevoelige data te lekken" - open source, 100% lokaal, zonder ooit die belofte in te ruilen voor groei.

## North Star Metric

Het spanningsveld: de beste metric ("documenten geredigeerd per week") is precies de data die dit product principieel niet verzamelt. De metric moet dus zelf privacy-preserving zijn.

**Voorgestelde North Star:** *wekelijks actieve installaties* (PWA + self-hosted instances), gemeten via een geanonimiseerde, opt-in "ik leef nog"-ping zonder inhoud of identifiers - vergelijkbaar met hoe Signal of andere privacy-first tools minimale telemetrie verantwoorden.

**Ondersteunende signalen (geen tracking nodig):**

| Signaal | Wat het laat zien |
| --- | --- |
| GitHub stars / forks / issues | Ontwikkelaarsvertrouwen en community-tractie |
| PWA-installaties (lokaal telbaar, evt. geaggregeerd gedeeld) | Commitment voorbij eenmalig bezoek |
| Partnerorganisaties met actieve pilot | Kwalitatief bewijs voor koepels/founders |
| npm/CDN-downloads van een toekomstige SDK | Ontwikkelaarsadoptie |

Dit vraagt om een expliciete keuze: accepteer je een klein beetje geaggregeerde, anonieme telemetrie (opt-in, geen content) om tractie te kunnen bewijzen aan fondsen/partners, of blijf je volledig blind en vertrouw je alleen op kwalitatief bewijs (testimonials, pilots)?

## Waarom nu

Drie krachten komen samen:

1. **AI-adoptie overrompelt databeheer.** Advocaten, consultants en hulpverleners plakken dagelijks cliëntdossiers in ChatGPT/Copilot omdat het werkt, lang voordat hun organisatie een databeleid heeft dat dat toestaat.
2. **Regelgeving verstrakt.** AVG-handhaving en de EU AI Act duwen richting dataminimalisatie; "we wisten niet dat het onveilig was" wordt geen geldig excuus meer.
3. **De directe-identifier-aanpak is niet genoeg.** Namen en e-mails wegvegen lost de makkelijke 80% op. De lastige 20% - "de buurvrouw van", "zijn opa", "de dochter van de wethouder" - is precies wat iemand in een kleine gemeenschap (een dorp, een cliëntdossier, een jeugdzorgcasus) alsnog herleidbaar maakt. Dat gat is nu net gedicht in dit product (relationele PII-detectie) en is een structureel onderscheidend vermogen, geen feature-toevoeging.

De meeste concurrenten (Microsoft Purview, Google DLP) zijn zelf cloud-diensten: je stuurt de gevoelige data naar een derde partij om te laten beoordelen of het gevoelig is - een tegenstrijdigheid voor precies de sectoren die het hardst bescherming nodig hebben. Privacy Maker's zero-server architectuur is daarom geen implementatiedetail maar het hele verschil.

## Voor wie

**Nu op de landingspagina:** advocaten, consultants, zorgverleners, HR/sociaal werk.

**Volgende ring, in volgorde van natuurlijke aansluiting:**

| Doelgroep | Waarom zij |
| --- | --- |
| Stichtingen/koepels (jeugdzorg, welzijnswerk) | Kleine-gemeenschap-cliëntdossiers waar relationele PII het meest schadelijk is - al eerder besproken als "elke koepel een eigen AI-server" |
| Gemeenten/overheid | AVG-verplichtingen, politiek gevoelige dossiers, geen vrijheid om cloud-AI zomaar te gebruiken |
| Onderwijs | Leerlingdossiers, examenwerk, decentraal beheer per school |
| Journalistiek | Bronbescherming bij het gebruik van AI voor transcripties/samenvattingen |
| Onderzoekers | Kwalitatieve interviewdata die naar AI-tools moet voor analyse |

**Op de lange termijn:** iedereen die iets persoonlijks in een AI-chat plakt - de "stille meerderheid" die nu geen enkel hulpmiddel gebruikt.

## Productpijlers

1. **Detectiekwaliteit.** Relationele/indirecte PII (net gebouwd) doortrekken naar echte coreferentie ("hij", "zij" terugkoppelen naar eerder genoemde personen), domeinspecifieke entiteiten (dossiernummers, BSN-achtige patronen per sector), en continue modelverbetering zonder de download groter te maken dan nodig.
2. **Organisatie-deployment.** De "koepel-AI-server": zelf-gehost, batchverwerking voor teams, nog steeds zero-cloud, maar gedeeld binnen een organisatie met auditlog - zonder de belofte "jouw server, jouw data" in te ruilen voor "onze server".
3. **Integraties.** Een browserextensie die direct in het tekstvak van ChatGPT/Claude/Copilot redigeert (geen copy-paste-rondje meer nodig), een Office/Outlook-invoegtoepassing, en een publieke API/SDK (WASM-package) waarmee ontwikkelaars detectie lokaal in hun eigen pipeline inbouwen.
4. **Vertrouwen & verificatie.** Het redactiecertificaat (SHA-256) bestaat al; uitbreiden naar ondertekende, exporteerbare audit trails en kant-en-klare compliance-profielen (AVG, en op termijn sectorspecifiek).
5. **Samenwerking.** Gedeelde woordenboeken/detectielabels binnen een team - via een exporteerbaar configuratiebestand, niet via een server, zodat het lokale-eerst-principe overeind blijft.

## Duurzaamheid onder AGPL-3.0

De code blijft volledig open en zelf-hosten blijft altijd gratis - dat is niet onderhandelbaar en het hele vertrouwenspunt. Financiering moet daar dus omheen gebouwd worden, niet erdoorheen:

| Bron | Hoe het werkt |
| --- | --- |
| Managed team-tier | De self-hosted koepel-server voor organisaties draaien (updates, support, SLA) - klassieke open-core, code blijft gratis |
| Sponsor-/supportcontracten | Koepels, gemeenten en zorgpartijen die gewaarborgde compliance-ondersteuning nodig hebben, niet alleen code |
| Subsidies | NLnet, EU-fondsen voor digitale soevereiniteit, SIDN fonds - sluiten goed aan bij de "datasoevereiniteit"-missie |
| Donaties/GitHub Sponsors | Open-sourcecommunity |
| Extensie/integratielaag | Een lichte eenmalige of abonnementsprijs voor het gemaksgedeelte (browserextensie, Office-invoegtoepassing), terwijl de kernengine gratis blijft |

**Expliciet uitgesloten:** gebruiksdata verkopen (kan sowieso niet, die bestaat niet), advertenties, of iets dat de zero-server-belofte zou compromitteren.

## Roadmap, komende 12 maanden

| Periode | Mijlpaal | Pijler |
| --- | --- | --- |
| Nu (Q4 2026) | Relationele PII-detectie, Fluent-restyling en PWA-installatie zijn live; volgende stap: detectienauwkeurigheid verfijnen | Detectiekwaliteit |
| Q1 2027 | Browserextensie MVP - redigeerknop rechtstreeks in het tekstvak van ChatGPT/Claude/Copilot | Integraties |
| Q2 2027 | Alpha van de zelf-gehoste teamserver, met 1-2 koepels als pilotpartner | Organisatie-deployment |
| Q3 2027 | Publieke API/SDK (npm-package rond de WASM-detectie-engine) voor ontwikkelaars | Integraties |
| Q4 2027 | Certificaat v2 (ondertekend, exporteerbaar, compliance-profielen) + gedeelde teamwoordenboeken | Vertrouwen & samenwerking |

Sequencing is bewust: elke pijler is een eigen project. Niet gelijktijdig starten voorkomt dat detectiekwaliteit - het fundament waar alles op leunt - ondersneeuwt.

## Risico's & open vragen

- **Modelplafond.** Lokale, kleine modellen (65-279 MB) zullen qua nuance altijd achterlopen op cloud-LLM's. Eerlijk communiceren over recall/precisie-afwegingen in plaats van "vindt alles" beloven.
- **Tractie bewijzen zonder telemetrie is intrinsiek moeilijk.** Nodig voor subsidies/partners, maar botst met de zero-tracking-belofte (zie North Star Metric hierboven) - vraagt een bewuste keuze, geen toeval.
- **De teamserver-pijler kan zelf de cloud-afhankelijkheid worden die dit product juist bestrijdt.** Zorgvuldig ontwerp nodig zodat "jouw server" niet stilletjes "onze server" wordt.
- **Scope creep.** Relationele detectie, extensie, server, API en compliance-features zijn elk hun eigen project - vraagt sequencing-discipline (zie roadmap), niet alles tegelijk bouwen.
- **Open vraag:** vereist de browserextensie server-side coördinatie om compose-vakken op veel verschillende sites automatisch te herkennen (onderhoudslast), en ondermijnt die afhankelijkheid de lokale-garantie als dat niet zorgvuldig wordt ontworpen?
