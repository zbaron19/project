# Theft-Prevention & Ownership-Registration Platform for High-Value Recreational Equipment

## Investor-Style Deep Research — Bikes, E-Bikes, Skis & Adjacent Gear

**Date:** August 1, 2026
**Prepared as:** venture due-diligence memo on a hypothetical startup combining tamper-resistant physical identifiers (secure NFC / QR / covert forensic marks bound to serial numbers), a universal ownership registry, stolen-item alerts, resale verification, retailer/police/resort/insurer/marketplace integrations, and recovery workflows.

**Bottom line up front — Recommendation: PIVOT (conditional).**
Pass on the concept *as specified* (multi-vertical consumer registry + tag kit spanning bikes and skis): forty years of natural experiments show the registry layer itself does not monetize, deterrence claims are weak, and free/state-run incumbents occupy the "universal registry" slot. But the underlying problem is real, growing in dollar terms, and newly supported by regulatory tailwinds — and there is a defensible, narrower wedge: **an e-bike-first, B2B2C "digital title + point-of-sale registration rail" monetized through insurers, marketplaces, and compliance — not through bike owners.** Build only that wedge, with explicit 12-month kill gates (§22–23). Skis are a season-two partnership experiment, not a founding vertical.

---

## 0. How to read this document

Every factual claim is tagged:

- **[E] Evidence** — directly stated by a cited source (URL given; year of the statistic noted). Vendor-published claims are additionally flagged as such.
- **[I] Inference** — our extrapolation, with the reasoning or arithmetic shown.

Research method: four parallel research workstreams (theft incidence & demand; competitive/registry history; identifier hardware & costs; business models, legal & adversarial), ~200 distinct searches and page fetches executed against live web sources in August 2026, plus direct verification of load-bearing numbers. ~230 sources cited; a consolidated source list appears in §24. Several primary sites (bikeindex.org, project529.com pages, nj.gov, tandfonline) returned HTTP 403 to direct fetch during this session; where noted, figures rely on search-index snippets or secondary mirrors of those pages — flagged inline. Conflicting sources are reported, not averaged. Market-research-house figures (Grand View, Dataintelo, Verified Market Reports, etc.) are treated as directional only.

Two caveats on the evidence base itself:
1. Registry-effectiveness numbers mostly come from registries (marketing risk). Where possible we anchor on government/insurer statistics (FBI NIBRS, ONS, CBS-NL, GDV, French Ministry of Interior) and treat vendor effect sizes ("83% less likely to be stolen") skeptically.
2. Ski-theft data is thin everywhere — that thinness is itself a finding (§2.4).

---

## 1. Executive Summary

**The problem is large, under-served, and getting more expensive per incident.**
An estimated **2.4 million bicycles are stolen annually in the US — >$1.4B in losses** — per the January 2025 UC Davis ITS / UC Santa Barbara / Bike Index study fielded with YouGov [E: findingspress.org/article/127974; bikeindex.org 2025 stats page]. Only ~37% of victims report to police [E: same study]; police-recorded thefts (~127–150k in 2023) capture a small fraction [E: FBI NIBRS via join.cc and bikebounty.com]. Europe is worse per capita: the Netherlands recorded **928,000 stolen bikes in 2023 (+30% vs 2021, €698M damages)** [E: CBS Safety Monitor via dutchnews.nl, Dec 2024]; Germany logged ~246,600 police-recorded thefts in 2024 with insurers paying a **record €160M — average claim €1,190, 3× the level of 20 years ago** [E: GDV, Apr 2025]; France recorded **>420,000 thefts in 2024 (+8%)** [E: Ministry of Interior via bicytrust.fr]. The e-bike transition is the economic engine: specialty-channel e-bike ASP is **$3,055** in the US [E: Circana/PeopleForBikes 2024] and thieves are documented to be deliberately targeting e-bikes [E: GDV 2025].

**Recovery — not deterrence — is what registration provably fixes, and the fix is real but modest.**
Baseline: <5% of stolen US bikes are returned to owners; ~98% of police-recovered bikes go to auction/charity because owners can't be identified [E: 529 Garage / project529.com LE pages]. Registration multiplies recovery odds ~3×: 15.1% vs 4.8% with a 529 shield [E: 529 data via logistimatics.com]; marked bikes in France recover at 7–10% vs 2–3% unmarked [E: bicytrust.fr 2025]; Calgary doubled its recovery rate from 12% to 21.5% within a year of adopting Bike Index [E: bikeindex.org 2025 report]. But even in the best systems, ~90% of stolen bikes never come home, and France's mandatory-marking regime did not stop thefts rising +8% in 2024 [E: above]. The strongest theft *reductions* ever measured in any property category came from device-bound kill switches (iPhone Activation Lock: −40% SF, −25% NYC, −50% London within ~18 months) [E: TechCrunch 2014; 9to5mac 2015] — a bar no sticker-plus-database product can reach.

**Nobody has ever built a venture-scale business on consumer registration — and many have tried.**
National Bike Registry charged consumers for 33 years and accumulated ~400k records; free apps passed that in their first years [E: Wikipedia/NBR; bicycleretailer.com 2017]. Bike Index — 1.4–1.8M bikes, the open-API standard — is a 501(c)(3) running on ~$73k/yr of donations [E: bikeindex.org 2022 report]. Project 529 — ~3.1M bikes, the only registry with a documented city-scale theft reduction (Vancouver −35% in year one) — exited in April 2024 not to a tech acquirer but to insurtech **Two Three Bird**, which is bundling it with Sundays/Velosure insurance and an Upway certified-resale partnership [E: bikebiz.com; twothreebird.com]. The monetization that *does* work is adjacent: **Recipero/CheckMEND** (free consumer registration, paid trade/insurer/police checks — $18.5B of items checked in 2024) [E: recipero.com], **LeadsOnline** (police-pays SaaS, PE-backed, consolidating) [E: ta.com], **Datatag/Selectamark** (marking-kit hardware + OEM programs; the UK motorcycle MASTER scheme, fitted at the factory and industry-funded, shows a 6× theft differential — the strongest deterrence datapoint in any two-wheel vertical) [E: masterscheme.org].

**The timing argument is real — three things changed in 2023–2026:**
1. **Mandates arrived.** France: marking mandatory on all new bikes since 2021 — ~7M bikes registered by 2025 [E: veloessentiel.fr]. Belgium took MyBike national (2024). The UK Equipment Theft (Prevention) Act 2023 establishes the forensic-marking + registration template (secondary regulations still pending as of March 2026). **New Jersey now requires MVC registration of ALL e-bikes effective July 19, 2026** [E: nj.gov/mvc via njbwc.org, oslaw.com] — the first US state to treat e-bikes as registrable vehicles.
2. **The industry started paying for verification.** Trek auto-registers every new bike sold at Trek retail with 529 via its Ascend POS [E: help.ascendrms.com]; Bike Index ships a Lightspeed POS auto-registration integration [E: bikeindex.org/lightspeed]; Upway registers every certified e-bike it sells [E: twothreebird.com 2025]; insurers condition coverage on certified locks (NL/ART), coding (DE), or marking (UK MASTER) [E: stichtingart.nl; adfc.de; masterscheme.org].
3. **A direct competitor just validated (and crowded) the exact thesis:** **BikeTagz** (Los Angeles) launched March 26, 2026 — NTAG 424 DNA cryptographic NFC bound to a verified ownership record with identity-verified transfers — pitching itself as the "VIN for e-bikes" [E: natlawreview.com press release]. Early-stage, no funding/pricing/partnership data found.

**Why the concept as specified still fails the venture test:** consumer WTP attaches to hardware and insurance, not registration; the registry slot is occupied by free/network incumbents and, increasingly, the state; marketplace integration — the key unlock — has failed for 20 years because platforms treat stolen-goods checks as liability-creating [I: from eBay/Meta/OfferUp posture, §12.4]; the ski vertical's reported theft volume is 2–3 orders of magnitude below bikes (≈21 reported thefts in Breckenridge over an entire early season vs ~2.4M US bike thefts/yr) [E: summitdaily.com; I: national scaling]; and unit economics on a $39–59 kit with realistic attach rates produce a $5–20M-ARR outcome, not $100M+ (§14–15).

**The recommendation (§23) in one paragraph:** Do not build the horizontal consumer registry. If you want this space, build the **e-bike digital-title rail**: secure-ID hardware embedded at OEM/retail point of sale (Datatag MASTER playbook), free registration as the data layer, monetized via (a) insurance partnerships that price verified security posture (the Two Three Bird/Laka pattern), (b) per-check resale-verification for marketplaces/recommerce (the CheckMEND pattern), and (c) state e-bike-registration compliance infrastructure as mandates spread from NJ. Run the 6 validation experiments in §17 first (~$30–60k, 90 days); fund a 12-month wedge for $1.5–2.5M with the kill gates in §21–22; treat skis as one paid resort pilot, and expand hardware categories only after the bike rail monetizes.

---

## 2. Problem & Theft Landscape

### 2.1 United States — bicycles

| Metric | Value | Source / tag |
|---|---|---|
| Actual thefts per year | **~2.4M adult bikes (2,376,578), 709.6/100k people** | [E] UC Davis ITS + UCSB + Bike Index + YouGov, published Jan 2025 (findingspress.org/article/127974) |
| Annual loss value | **>$1.4B** (≈$583/bike average [I: 1.4B÷2.4M]) | [E] same study |
| Police-reported thefts (2023) | 127,646 (join.cc read of FBI data) vs "nearly 150,000, >$148M" (bikebounty.com read) — both plausible NIBRS cuts | [E, conflicting] |
| Share of victims who report | **37%** (study); other estimates 20–40% | [E] bikeindex.org 2025 stats; thebestbikelock.com |
| Bikes returned to owners | **<5%**; ~98% of police-recovered bikes go unclaimed to auction | [E] 529 Garage via logistimatics.com; project529.com |
| Victims who knew their serial number | **<20%** | [E] logistimatics.com — the core registry-gap datapoint |
| Theft trend in registry data | Bike Index reported thefts **+15% in 2024** | [E] bicycleretailer.com, Jan 2025 |
| Fleet-relative rate | ~2.4% of the ~100M US installed base stolen per year | [I: 2.4M ÷ 100–110M installed base] |

E-bikes: 12% of Bike Index-reported thefts in 2024 and rising [E: bikeindex.org]; vendor data (AlterLock) claims e-bike theft +25–40% YoY in major US cities and ~4% recovery — directional only [E-vendor]. A widely repeated claim that e-bikes are "2.5× more likely to be stolen than a car" traces to the March 2026 BikeTagz press release [E: natlawreview.com] — treat as marketing.

### 2.2 Europe — the denser, richer comparison set

- **Netherlands:** 928,000 bikes stolen 2023 (+30% vs 2021), €698M damages, 40% reporting rate; ~5.2 thefts per 100 residents/yr ≈ 7× US per-capita intensity [E: CBS via dutchnews.nl/nltimes.nl; I: per-capita math]. Police reports 2024: >86,000 (Amsterdam 11,000) [E: dutchnews.nl Mar 2025].
- **Germany:** ~246,600 police-recorded thefts 2024; insured losses €160M (record), 135,000 insured thefts, average claim €1,190 (3× in 20 years); GDV explicitly attributes severity growth to targeting of e-bikes [E: gdv.de Apr 2025; zdfheute.de].
- **France:** >420,000 recorded thefts 2024 (+8%); ADMA-estimated actual range 350–580k/yr; **~100,000 recovered bikes/yr cannot be returned for lack of identification** — the single cleanest demand datapoint for identity infrastructure [E: bicytrust.fr; planetoscope.com; fub.fr]; ~80,000 French cyclists/yr quit cycling over theft [E: FUB via cyclassur.fr].
- **UK:** recorded thefts declining (77,170 FY22/23 → 66,960 FY23/24 → ~49,085 in 2025 rolling) but ~4× under-reporting gap; ~1–2% of cases solved; only ~2% of London's ~40,000/yr stolen bikes recovered [E: ONS/statista; crimerate.co.uk; ITV Feb 2026].

[I] Strategic read: the US is the *largest* single theft market by value; NL/DE/FR are the *most monetized* (insurance, mandates). Any US play should treat European systems as the proven reference designs.

### 2.3 The e-bike shift is the economic story

- US 2024 unit sales: ~13.0M bikes total, of which ~920k e-bikes through tracked channels + ~450k DTC + ~80k P2P ≈ **1M+ e-bikes/yr**; tracked market $6.6B [E: PeopleForBikes/Circana].
- E-bike ASP: **$3,055 specialty channel / $669 mass channel / ~$1,780 DTC [I]** [E: Circana via peopleforbikes.org].
- EU: 5.1M e-bikes sold 2023; e-bike ASP €2,681 (2024); Germany alone 2.05M e-bikes (53% of units) [E: CONEBI/LEVA-EU].
- Insurance follows value: Dutch e-bike insurance market **€621M (2023)**, 62% of e-bike owners insured at ~€14/mo [E: leva-eu.com; nltimes.nl]; German claim severity tripled in 20 years [E: GDV].

[I] Theft-prevention products historically sold against a $500 average bike; they now sell against a $2,000–3,500 e-bike that is insured, motorized, electronically addressable, and — since NJ (July 2026) — beginning to be *registered like a vehicle* in the US. Every structural trend (value, insurability, regulability, OEM electronics) favors the e-bike wedge over the general-bike wedge.

### 2.4 Skis and snowboards — a real nuisance, not a market

Hard incidence data:
- Breckenridge PD: **21 reported ski/snowboard thefts from season open (Nov 10) through Dec 31** in the spike season, vs 3 (2022), 9 (2021), 0 (2020) in the same window [E: vaildaily.com/summitdaily.com — note our two research passes dated this spike to the 2023-24 and 2024-25 openings respectively; either way the absolute numbers hold]. Summit County sheriff logged 8+ cases county-wide in the first weeks of 2024-25 [E: snowboarder.com Dec 2024].
- Serial resale cases exist and get prosecuted: Park City (Jan 2025), Deer Valley repeat thief (2024–25), Boreal CA (Jan 2024, grand theft), Whistler rental-fraud ring reselling on Facebook Marketplace (late 2024) [E: townlift.com; kpcw.org; theunion.com; cbc.ca].
- Holiday-maker surveys: 1-in-8 to 1-in-10 winter-sports travelers report theft/loss experience (58% of those, equipment) [E: Ski Club GB via travelmole.com; Ipsos]; but measured per-day odds ≈1:100,000 across seven resorts [E: gravirax.com].
- **NOT FOUND anywhere: national ski-theft counts, dollar totals, or recovery rates** — NIBRS doesn't break out skis; NSAA/SIA publish nothing on theft [E: absence after directed search].

[I] Order-of-magnitude estimate: scaling Breckenridge's reported volume by skier-visit share (Breck ≈2.8% of 61.5M US visits) implies very roughly **2,000–5,000 reported thefts/season nationally, perhaps 5,000–25,000 actual** — i.e., 1/100th to 1/500th of bike theft volume. Structural differences that hurt a ski registry: equipment often lacks unique serials (or carries them in abradable topsheet locations) [E: weekand.com; unofficialnetworks.com]; theft is concentrated in ~500 controllable venues where operators already sell the solution (lockers, valet, Ski Key racks) and disclaim liability [E: vailskishop.com; skikey.com; Vail release documents]; season is 4–5 months. Structural upside: high per-item value ($800–1,500 setups), felony attention from sheriffs, dense venue partnerships possible, genuine white space (no scaled registry exists — §6.5).

**Verdict on skis:** a *feature and a partnership channel* (resort-branded tag+registry amenity, tested with 1–3 resorts), not a founding vertical. Any pitch deck sizing "ski theft TAM" alongside bike theft is mixing a pond with an ocean.

### 2.5 Adjacent categories (for later expansion, with better $ density)

- **Construction/power tools:** US site theft $300M–$1B/yr, <25% recovery; UK £1.1B/yr; London van tool theft 9,559 incidents/£11M in 2024 (+70%/4yrs) [E: multiple 2025 industry sources]. DeWalt/Milwaukee already ship tool-ID ecosystems [E]. Biggest adjacent dollars, hardest channel (jobsite B2B).
- **Watercraft:** 4,461 US thefts (2022), NICB-tracked, HIN system exists [E: nicb.org].
- **Golf:** >$100M/yr US claims (low confidence), seasonal spikes +27% [E: tracki.com; golfbusinessnews.com].
- Surfboards, kayaks, camera gear: anecdote-level only; camera gear already has a vertical registry (Lenstag) [E].

---

## 3. Demand Evidence — who actually feels this pain, and what do they pay today?

### 3.1 Behavioral impact (the "why now" for OEMs and cities)

- After a theft: **45% of US victims ride less or stop entirely; 69% replace the bike; 11% say they won't replace it** [E: UC Davis/UCSB/YouGov via bikeindex.org 2025; ucits.org project page]. Earlier Montreal data: ~50% of cyclists have experienced theft; 7% quit for good [E: McGill/van Lierop]. UK: 66% ride less, 25% stop [E: stolen-bikes.co.uk survey via GB News]; London Cycling Campaign: up to a quarter never cycle again [E: lcc.org.uk].
- Fear of theft as an adoption barrier: ~40% of French non-cyclists cite it [E: ECF analysis paper 2023]; listed among top-4 barriers in US e-bike incentive research [E: sciencedirect 2024].

[I] Implication: the theft problem is an *industry churn problem* (lost riders = lost lifetime equipment/service revenue) and a *city mode-shift problem* — which is why OEMs, advocacy orgs, and municipalities are plausible funders even where consumers aren't.

### 3.2 Revealed willingness to pay (what the money does today)

| Spend category | Size / price points | Tag |
|---|---|---|
| Bike locks (global) | $1.2–1.5B/yr, 4.6–6.2% CAGR | [E, second-tier research houses, conflicting scopes] |
| GPS bike trackers | $350–412M (2024) → ~$750M–1.2B (2033) | [E, directional] |
| Find My-network trackers | AirTag $29; Knog Scout $59.95 (no sub); Moto Tag 2 $20–30 | [E: knog.com; 9to5google] |
| Cellular GPS + subs | AlterLock $4.99/mo; PowUnity ~€40/yr; Bosch ConnectModule $224.95 + $59.99/yr | [E: vendor pages] |
| Bike insurance | NL: 62% of e-bike owners, ~€14/mo; US specialty: 3–8% of bike value/yr ($150–200 on a $3k e-bike); Europe market ~$3B | [E: leva-eu; velosurance.com; verifiedmarketreports — last one directional] |
| Marking kits | BikeRegister £13–30; Datatag £24.95–34.49; DataDot $49.95; 529 Shield ~$11–13 | [E: vendor/retailer pages] |
| Registration itself | **$0 everywhere that scale exists** (Bike Index, 529, BikeRegister, Immobilise consumer side) | [E] |

[I] The WTP hierarchy is unambiguous: consumers pay for *hardware* (locks, trackers: $30–250 one-time) and, where values are high, *insurance* ($100–300/yr); they pay a *one-time* $11–50 for marking kits when police/shops push them; they have never paid meaningfully for registration (NBR's 33-year failure, §6.2). Any revenue model built on consumer registration fees contradicts four decades of evidence.

### 3.3 Registration demand when it's free and channelized

- 529 Garage: >3.1M bikes registered; ~$1.1B in registered value [E: twothreebird.com; gearjunkie.com].
- Bike Index: 1.4M (2025) → ~1.78M bikes (2026), 15,996 → ~17,800 recoveries cumulative [E: bikebounty serial-checker page; Wikipedia 2026].
- France: ~7M bikes in FNUCI by 2025 (mandate-driven), +50–100k/month [E: veloessentiel.fr].
- Immobilise (UK, all property): >34M items [E: immobilise.com].
- Stop Heling (NL, buyer-side checking): 1.52M registrations, **8.4M serial checks** [E: stopheling.nl] — evidence that *checking* demand exists at consumer scale when the state runs it.

[I] Free registration converts when embedded in a channel (POS, campus mandate, police event, insurance requirement). The scarce asset is not registry software — it's *channel position at the moment of sale/claim*.

---

## 4. Regulatory Environment & Tailwinds

**Europe — the reference designs (all [E] unless noted):**

| Regime | Mechanism | Result |
|---|---|---|
| **France** (LOM law; décrets effective Jan 1, 2021 new / Jul 1, 2021 used) | Marking mandatory for all bikes ≥16" sold by professionals; central FNUCI database (APIC); six licensed operators (Bicycode, Paravol, Recobike, Auvray, MFC, Decathlon) | ~7M bikes registered by 2025; marked-bike recovery 7–10% vs 2–3% unmarked; thefts nonetheless +8% in 2024; only ~18% of victims file reports (ecologie.gouv.fr; veloessentiel.fr; bicytrust.fr) |
| **Denmark** (since 1942/1948) | Unique frame VIN legally required on every bike sold; **insurers refuse theft payouts without it** | Near-universal compliance with zero policing — insurance is the enforcement mechanism (Wikipedia/Danish VIN system; thelocal.dk) |
| **Japan** (bōhan tōroku) | Registration legally required at purchase, ~¥500–660, 10-year validity, prefectural police databases; police stop-checks | Functions as national ownership infrastructure; English-language effectiveness stats NOT FOUND (mailmate.jp; nippon.com) |
| **Netherlands** | RDW stolen-bike register (2008); Stop Heling buyer-check app tied to mandatory digital second-hand-dealer register (DOR) | 8.4M consumer serial checks; resale chokepoint enforcement (stopheling.nl; business.gov.nl) |
| **Belgium** | MyBike QR registry, Brussels → national April 2024 | >50k Brussels registrations pre-expansion (be.brussels; vrt.be) |
| **UK** | Equipment Theft (Prevention) Act 2023 — enables mandatory immobilisers + **forensic marking + registration database** for ATVs/quads, extendable | Royal Assent Jul 2023, but secondary regulations still unlaid as of Mar 2026 — tailwinds arrive slowly (legislation.gov.uk; gregsmith.co.uk) |

**United States — the new development (2026):**
- **New Jersey** (law enacted Jan 19, 2026; effective **July 19, 2026**): ALL e-bikes must be registered with the Motor Vehicle Commission (Form BA-49EB, in-person appointment, 6-point ID); riders 15+ need a driver's license or motorized-bicycle license; helmets mandatory; insurance required only for >28 mph "electric motorized bicycles"; under-15 operation banned. MVC began appointments June 23, 2026 [E: nj.gov/mvc via njbwc.org, oslaw.com, fsresidential.com, gottheimer.house.gov].
- **California**: new 2026 registration rules for off-highway "eMoto" electric motorcycles [E: getvinverification.com].
- No federal VIN requirement exists for Class 1–3 e-bikes; the frame serial is the operative ID [E: goatpowerbikes.com et al.].
- INFORM Consumers Act (2023): marketplace seller-verification — first FTC enforcement Sept 2025 (Temu, $2M); senators pressing for more; **no evidence yet it reduced stolen-goods fencing** [E: ftc.gov; gtlaw.com; durbin.senate.gov; NOT FOUND on efficacy].

[I] Read for the thesis: (1) mandates are the only force that has ever crushed the registry cold-start problem (France: 7M in 4 years vs Bike Index's 1.8M in 13); (2) the US just opened its first mandatory e-bike registration market, and NJ's DMV-appointment implementation is exactly the clunky, hardware-less process a private "registration rail" could underprice/white-label if other states follow; (3) regulatory timing risk cuts both ways — states may run registries themselves (disintermediation), and UK shows multi-year lag between statute and enforcement. A venture bet purely on US mandate spread is premature; mandates are upside optionality, not the base case.

---

## 5. Competitive Landscape (August 2026)

### 5.1 Registries

| Player | Scale | Model | Status / lesson |
|---|---|---|---|
| **Bike Index** (US, 501c3, est. 2013) | 1.4M bikes mid-2025 → ~1.78M by Jul 2026; ~17,800 recoveries; >$18.3M recovered value (2022); 1,780 partners | Free registration, free open API; donations (~$73k/2022, >50% of revenue) + partner integrations (Lightspeed POS, LeadsOnline data link) | ALIVE. The de-facto open standard; unbeatable at "free registry," unable to fund growth — a public good, not a business [E: bikeindex.org; Wikipedia; bikebounty.com] |
| **Project 529 / 529 Garage** (est. 2013 by J Allard) | >3.1M bikes; "largest searchable registry" | Free registration; revenue from ~$11–13 Shield decals + agency/city subscriptions (BC funded province-wide access); acquired NBR 2017; **acquired Apr 2024 by insurtech Two Three Bird** (with Sundays, Velosure, Hubtiger); 2025 Upway certified-resale partnership | ALIVE inside an insurer. The only city-scale documented theft reduction (Vancouver −35% yr 1; "~70% since 2015" is a looser multi-year claim — conflicting: CBC 2018 said 30%) [E: project529.substack; twothreebird.com; cbc.ca] |
| **BikeRegister/Selectamark** (UK) | >1.4M bikes; used by all UK police forces | Free registration; sells marking kits £13–30; police/council bulk kits; vendor claims "83% less likely stolen" (no methodology) | ALIVE. Moat = police standardization, first + free to police [E: bikeregister.com; securedbydesign.com] |
| **Immobilise/Recipero** (UK) | >34M items; NMPR searched by 40k+ officers "thousands of times daily"; CheckMEND: $18.5B of items checked in 2024, 5.7M searches/month | Free consumer registration; **paid trade/insurer checks (£1.99 consumer, ~£1 trade)**; inside TransUnion UK [I on ownership chain] | ALIVE. **The proven monetization architecture** — consumer is the data source, trade/police are the customers [E: immobilise.com; recipero.com; thenmpr.com] |
| **Datatag / MASTER** (UK) | MASTER: OEM-fitted on most >125cc motorcycles since 2012, industry-funded | One-time kits £24.99–34.49 (cycles); OEM embedding | ALIVE. **Strongest deterrence data anywhere: 0.18% vs 1.17% theft rate (6×), ~6× recovery** [E: masterscheme.org; datatag.co.uk] |
| **LeadsOnline** (US) | 5,500 agencies, 70k investigators, 22k+ reporting businesses | Businesses report free (often legally compelled); **police pay annual SaaS**; TA Associates growth investment 2022; acquired Forensic Technology Jan 2026 | ALIVE, consolidating. B2G property-data is PE-fundable [E: ta.com; leadsonline.com] |
| **BikeTagz** (LA, launched Mar 26, 2026) | Unknown (press-release stage) | NTAG 424 DNA chip + cryptographic registry; tap-to-verify, no app; identity-verified transfer invites; "VIN for e-bikes" framing | NEW DIRECT COMPETITOR. Validates the thesis and will spend the market-education dollars; no funding/pricing/partnerships found [E: natlawreview.com] |
| France FNUCI operators (Bicycode, Recobike, Paravol, Auvray, MFC, Decathlon) | ~7M bikes combined | €10–30 marking fees embedded in bike price [I], state-mandated demand | ALIVE. Mandate-created market; fragmented UX across six operators [E: vojomag.com; quechoisir.org] |

### 5.2 Hardware/tracking substitutes

- **Apple Find My ecosystem** — AirTag 2 $29 (2026), Chipolo/Pebblebee $30–34, **Knog Scout $59.95** (Find My + 85dB alarm, no subscription), Muc-Off hidden AirTag mounts $29–30. Commoditized "find my bike" [E: vendor pages].
- **Anti-stalking is the structural flaw**: Find My-certified devices *must* implement tracker alerts; since the Apple+Google DULT spec (May 2024) both iOS and Android warn a thief that a tag is moving with them, enabling find-and-discard. Covert crowd-network tracking of stolen goods is structurally compromised [E: apple.com newsroom; theregister forums; stolenride.co.uk analysis].
- **Cellular GPS**: AlterLock Gen3 ($4.99/mo), PowUnity BikeTrax (e-bike motor-powered, ~€40/yr), Invoxia (€149 incl. 3 yrs), Bosch ConnectModule ($224.95 + $59.99/yr, factory-integrated on many 2024+ Smart System e-bikes) [E: vendor/retailer pages]. Graveyard behind them: Sherlock (dead), Vodafone Curve (service killed Jul 31, 2024 — bricked customers' security), Spybike (zombie), Boomerang (niche) [E: road.cc; tracxn; trustpilot].
- **VanMoof** — the cautionary flagship: integrated tracking + "Bike Hunters" + hunt-or-replace guarantee (€290–348/3yrs); ~€80M losses in 2021 and again 2022 on ~$128M raised in 2021 (~$180M+ lifetime [I: widely reported, primary source blocked]); bankrupt July 2023; relaunched by LAVOIE/McLaren Applied without the guarantee [E: pragmaticengineer.com; malaymail; nltimes; bloomberg].

### 5.3 Adjacent-vertical registries (the pattern library)

- **Art Loss Register / Watch Register**: 700k+ items; registration £15/item; **5% location fee / 15–20% recovery commission**; sustained ~30 years because auction houses are a checking chokepoint at high item values [E: artloss.com; thewatchregister.com].
- **LoJack**: $130–140M/yr revenue for decades on police-integrated RF recovery; sold to CalAmp for just $134M (2016); US SVR business wound down by 2021 — commoditized by cheap GPS/OEM telematics [E: SEC filing; prnewswire]. Hardware moats erode; network/data moats persist [I].
- **Phones/GSMA IMEI + Activation Lock**: kill switch drove the largest measured theft drops anywhere (−25 to −50% city-level, 2013–15); yet London phone theft tripled 2020–24 as export/parts channels bypass blacklists [E: techcrunch; 9to5mac; met.police.uk]. Ceiling-setter for deterrence claims: **make the item unusable/unsellable, or accept recovery-only economics** [I].
- **Boats (HIN)**: mandatory federal ID since 1972 + NICB database — faster ID/recovery, no published theft reduction [E: nicb.org].

---

## 6. Why Past Registries Succeeded or Failed — the Six Lessons

1. **Consumers won't pay to register.** NBR charged for 33 years → ~400k records; free 529/Bike Index each passed millions. Registration is a data-capture step, not a product [E: Wikipedia NBR; bicycleretailer 2017].
2. **Free is the price of the registry; the money is adjacent.** Recipero (paid trade checks), Selectamark/Datatag (marking hardware), LeadsOnline (police SaaS), 529 (exit to insurer). No pure registry has ever reached venture scale [E: §5; I].
3. **Chokepoints beat marketing.** Every scaled system rode a mandatory or channel chokepoint: France (law), Denmark (insurer payout), Japan (police stops), NL (dealer register + buyer app), UK (all-forces police standard), Trek/Ascend (POS). Voluntary consumer sign-up alone produced the smallest, slowest registries [E/I: §4–5].
4. **Never warehouse theft risk on a startup P&L.** VanMoof's hunt-or-replace guarantee was an underpriced insurance liability that helped kill a $180M-funded company. Broker risk to insurers instead [E: §5.2].
5. **Never make the customer's security depend on your survival.** Vodafone Curve's shutdown bricked trackers; Sherlock's death orphaned buyers. Physical IDs + open/portable data outlive vendors; this argues for standards-based hardware (NTAG SUN, plain serials) and escrowed/exportable registry data as a trust feature [E: §5.2; I].
6. **Recovery sells to institutions; deterrence sells to consumers — and only recovery is proven.** Registries move recovery 3–4× off a tiny base; deterrence evidence exists only where marking is OEM-universal (MASTER 6×) or items become unusable (Activation Lock). Marketing that promises deterrence writes checks the data can't cash [E: §7].

---

## 7. The Deterrence Evidence Hierarchy (what actually works, ranked)

1. **Device-bound kill switch** — iPhone Activation Lock: −40% SF, −25% NYC, −50% London smartphone theft within ~1–2 years [E: techcrunch 2014; 9to5mac 2015]. Uneven across cities (Seattle +32%) and decays via export/parting [E: 9to5mac; Met Police 2025].
2. **OEM-universal forensic marking + registry** — UK MASTER: protected bikes 0.18% vs 1.17% annual theft (6×); ~6× recovery [E: masterscheme.org]. Fitted at manufacture, industry-funded — selection effects can't explain a 6× gap across 66k+ bikes but note it is scheme-published, not peer-reviewed [I].
3. **Community registry with police muscle** — Vancouver/529: −35% reported theft in year one; cumulative claims up to 70% (disputed; CBC said 30% at 3 years) [E: project529.substack; cbc.ca; vancouver.ca].
4. **Voluntary registration/marking alone** — recovery multiplier ~3–4× (France 7–10% vs 2–3%; 529 15.1% vs 4.8%; Calgary 12→21.5%) with **no demonstrated reduction in theft volume** (France +8% in 2024 despite 7M registered) [E: §2, §4].
5. **Covert trackers** — real anecdotal wins (Vail PD van bust via AirTags) but structurally undermined by mandatory anti-stalking alerts; GPS works better but costs subscriptions and dies with vendors [E: cyclingweekly; §5.2].
6. **Signage/awareness** — "We are watching" signs cut theft 62% at treated locations but displaced +65% to controls [E: PMC3520908, 2012].

Academic bottom line: UCL's problem-oriented-policing literature — interventions plentiful, **reliable evaluations scarce; the evidence base on "what works" is weak** [E: UCL JDiBrief; popcenter.asu.edu]. Sell recovery and provenance on evidence; sell deterrence only via the visible-ecosystem effect you can eventually measure [I].

---

## 8. Hardware: Identifier Options, Costs, and Tamper Reality

### 8.1 The menu (per-unit costs at volume, all [E] from supplier pages unless noted)

| Option | Cost @1k / @10k / @100k | What it buys | How it's defeated |
|---|---|---|---|
| Plain NTAG213 NFC sticker | $0.29–0.78 / ~$0.10–0.30 / $0.03–0.06 [I@100k] | Tap-to-URL convenience | Trivially cloned (it's just a URL); peeled |
| **NTAG 424 DNA** (AES-128 SUN — each tap emits a server-verifiable one-time cryptogram) | €0.77 / ~€0.50 [I] / €0.35–0.45 [I] | **Clone-proof digital verification**; works natively iPhone+Android, no app | Physical removal (razor/heat gun); chip can't be cloned but can be destroyed |
| NTAG 424 DNA **TagTamper** | ~2–4× base 424 [E: rfidlabel.com lot ranges] | Cryptographic *tamper evidence* — peeling permanently flips a status bit in the signed message | Careful extraction; or thief simply doesn't care that status shows tampered |
| On-metal variants (ferrite-backed; required on aluminum/steel frames and most skis) | +$0.15–0.50 premium; on-metal 424 DNA €0.88 @1k | Readability on metal; ~1–2cm read range | Same as above. **Carbon fiber also detunes NFC** — needs ferrite backing or an embedded resin window [E: tritiumelectronics; IEEE; USPTO 11001034] |
| Laser-etched anodized-aluminum QR/serial plate | ~$0.60 / $0.30 / $0.15 [I from converter economics; US market quote-driven] | Weatherproof human/scan-readable backup; visible deterrent | Pried off, ground; QR itself is freely clonable — authentication must never rest on the QR [E: ACM DocEng 2021] |
| Destructible VOID/eggshell serialized decal | $0.25 / $0.12 / $0.06 [I] | Cheap tamper evidence + deterrent signaling | Fragments on removal (that's the point); determined removal succeeds, leaves scar |
| Chemical/UV etch (BikeRegister-style) | kit component; £20 retail DIY | Permanent mark *in* the frame surface; survives sticker removal | Angle grinder, repaint; voids some carbon warranties [I — manufacturer positions vary] |
| **Forensic microdots/DNA** (DataDot, SelectaDNA, SmartWater; white-label via Selectamark OEM program) | est. $3–8/kit wholesale @10k+ [I from $49.95 retail & consumable norms] | Hundreds of coded dots in lacquer — effectively unremovable, court-grade linkage; UK police campaigns association with big burglary drops (vendor/police figures, not RCTs) | Invisible until police look; zero real-time function |
| AirTag/Find My tag | $29–60 retail | Crowd-network location for *lost* items; alarm variants | **Anti-stalking alerts tip off thieves (mandatory, cross-platform since May 2024)** |
| Cellular GPS module (own-brand) | BOM $16–21 @10k [E/I: Quectel BG95 $5.40 + BOM build-up]; connectivity $1–4.50/yr | Covert live tracking; recovery ops | Battery/maintenance; RF detection; $3–5/mo pricing carries 70–90% GM but sub fatigue is real [E: hubble.com; telnyx] |

### 8.2 Kit COGS (bottom-up, landed)

Reference kit = on-metal NTAG 424 DNA + etched QR plate + microdot vial + serialized VOID decal + packaging/kitting/freight:
- **≈$10.80 @1k / $6.93 @10k / $4.30 @100k** landed [I: line-item build in research file; anchors cited above].
- Without the microdot vial (sell as upsell): **≈$4.30 / $2.60 / $1.60**.
- Comparable retail: BikeRegister £13–30, Datatag £24.95, DataDot $49.95 → a $39–59 retail kit clears **70–85% gross margin at 10k+ units** [I].
- DTC pick/pack adds $3.00–5.50/order [E: 3PL rate cards].

### 8.3 The honest tamper-resistance statement (for the deck and the packaging)

No surface-applied identifier survives a determined attacker with a razor, heat gun, or grinder. What the layered stack actually buys, in order: (1) **verification** — NTAG 424 DNA cannot be cloned onto a counterfeit, so a live tag = authentic record; (2) **tamper evidence** — TagTamper/VOID/etch make removal *visible*, degrading resale value ("why is there a grinder scar where the ID was?"); (3) **permanence in adversarial recovery** — microdots survive nearly everything and convert a police stop into a provable ownership case; (4) **deterrent signaling** — the visible decal reprices the bike for a rational fence. Removal isn't the failure mode to design against; *clean-looking resale* is [I]. This framing also matches the NL counterfeit-sticker gang evidence — surface IDs get spoofed/covered, which is exactly why the crypto layer (can't fake a live tap) plus covert layer (can't find all the dots) is the right pairing [E: nltimes.nl 2023 smuggling report].

### 8.4 OEM embedding precedents

- **Colnago C68** ships NFC laminated into the frame with a MyLime blockchain-anchored "digital passport" (2022), plus a retrofit program for older frames [E: bikerumor; cyclingnews]. Proof that premium OEMs will embed identity hardware for provenance/authenticity, not only theft.
- **Trek**: every new bike sold at Trek retail auto-registered with 529 via Ascend POS reports [E: help.ascendrms.com]. **Specialized**: registration tied to lifetime warranty via Lightspeed integration [E: lightspeed support docs]. **Bosch**: ConnectModule + eBike Alarm factory-integrated across many 2024+ Smart System bikes [E: bosch-ebike.com].
- **Skis**: no consumer brand ships embedded RFID (NOT FOUND); rental fleets tag with RFID/barcodes (EM Micro/SKIDATA chip developed for rental ID) [E: secureidnews; rfidtagworld]. Ski serials are inconsistent or absent — an applied ID would be *creating* the identity layer, which is both the opportunity and the adoption burden [E: weekand.com; I].

---

## 9. Software Architecture (synthesis — [I] throughout, standards cited)

**Design principles derived from the evidence:** survive the vendor (Lesson 5, §6); make police work *smaller*, not bigger (§10.2); publish item status, never owner identity (§10.3); assume adversarial registration attempts (§11).

**Core data model:**
- `Item` — canonical ID (platform-minted, e.g., 7–9 char base32 like 529's shield IDs) ⇄ bindings: manufacturer serial(s), NTAG 424 DNA UID + key slot, QR plate ID, microdot PIN, photos, component fingerprints (fork/motor serials — partial chop-shop mitigation), category schema (bike/e-bike/ski-pair/board).
- `OwnershipRecord` — append-only event log (registered → transferred → reported-stolen → recovered → retired), each event carrying evidence attachments (receipt hash, police report #, ID-verification token). Event-sourced ledger in Postgres; **no blockchain** — every blockchain registry attempt died (RDW/IBM PoC included) because the hard problem is the physical-digital binding and institutional trust, not ledger immutability [E: §6; mediacenter.ibm.com].
- `Claim/Flag` — theft flags require a police report number OR a signed owner attestation with liability acknowledgment (defamation exposure management, §10.4), timestamped, jurisdictionally tagged, with a dispute lane and SLA.

**Verification plane:**
- NFC tap → NTAG 424 DNA SUN cryptogram → server validates CMAC + counter → returns status page (green "registered to a verified owner / not reported stolen", red "reported stolen — here's what to do", yellow "tamper flag / unverified"). No app install for checking (critical for marketplace buyers and police).
- QR plate → same status endpoint but explicitly *informational* (clonable); print "tap to cryptographically verify" on the plate.
- Public serial-search API mirroring Bike Index's open model (interop, not competition: cross-query Bike Index/529 public data where licensed).

**Transfer protocol:** seller initiates → buyer accepts via identity-verified invite (KYC-lite: Stripe Identity/Persona) → simultaneous re-key of the NFC record slot → new `OwnershipRecord` event. This is the anti-"thief-registers-first" and anti-laundering control: the *history* is the product (Carfax pattern), and gaps in history are themselves signal [I; BikeTagz claims the same design — E: natlawreview].

**Integration surfaces (each maps to a §12 revenue line):**
1. **POS webhook/API** (Lightspeed, Ascend-style scheduled reports, Shopify app) — serial + buyer email at checkout → pre-provisioned registration; ship-with-bike tag SKUs.
2. **Police portal** — free, CJIS-friendly: bulk serial search, evidence-packet export (ownership chain PDF + photos + report numbers), recovered-property matching queue; NCIC complement: platform ID qualifies as an Owner-Applied Number (OAN), giving unserialized items (skis!) an NCIC on-ramp [E: NCIC OAN field requirements — Utah/WSP NCIC manuals].
3. **Insurer API** — proof-of-registration + security-posture attestation (tag installed, lock class, GPS active) at bind/claim time; theft-flag webhook for claims triage; recovered-item subrogation alerts.
4. **Marketplace/recommerce API** — CheckMEND-style paid per-check: serial/tag status + provenance certificate with confidence tier (crypto-verified vs serial-match-only).
5. **Resort/venue module** — season-locker/valet tie-in, on-mountain scan station, "verified gear" lane; batch registration at rental/demo fleets (they already RFID-tag).

**Privacy/security posture:** owner PII segregated from item plane (public pages show item status only — Bike Index's stated design [E: bikeindex.org/help]); regional data residency (GDPR); right-to-erasure honored for identity while preserving anonymized theft flags under fraud-prevention exceptions [E: ICO guidance; CCPA exemptions]; the **Immobilise 2015 breach (up to 28M records exposed — "a burglar's shopping list")** is the canonical warning: sequential-ID enumeration of a registry is a physical-safety incident, not just a data one → non-enumerable IDs, aggressive rate-limiting, no address data on any item-linked surface, SOC 2 from year one [E: securityweek.com; sophos].

---

## 10. Privacy & Legal Analysis

### 10.1 Title law — why "clean title guarantee" is legally impossible
- **US:** a thief conveys *void* title; even a good-faith purchaser must surrender stolen goods, indefinitely. UCC 2-403's voidable-title/entrustment exceptions do not cure theft [E: UCC treatise sources].
- **Germany:** §935 BGB — no good-faith acquisition of stolen goods (until 10-year prescription); **France:** Art. 2276 — 3-year revendication window [E: legal commentary sources].
- [I] Product consequence: sell **"documented provenance / due diligence certificate"** (CheckMEND's framing), never "guaranteed clean title." A true guarantee is an insurance product requiring licensure/underwriting — offer it, if ever, through an insurance partner (buy-back guarantee priced on registry confidence), not as a software rep.

### 10.2 Police data-sharing and workload
- Sharing with police is lawful under GDPR/UK GDPR with documented crime-prevention basis [E: ICO]. US: NCIC Article File requires a serial or OAN and generally a $500 minimum; queries restricted to criminal-justice terminals [E: state NCIC manuals]. Clearance reality: US larceny clearance 17.3% (2024); police triage hard [E: FBI via beautifydata; Pew]. 529: 2,000+ agencies have searched it, yet registry checking is "far from standard in North American policing" [E: project529.com].
- [I] Design consequence: the platform must *reduce* per-case police effort (one scan → complete evidence packet) and must not require police budget to deliver consumer value (free portal; the LeadsOnline agency-pays model becomes viable only after density).

### 10.3 Privacy regime
- Lawful basis: legitimate interest (theft prevention) for item-status publication; consent for owner-directory features. Erasure: delete identity, retain de-identified theft flag (GDPR Art. 17 exceptions; CCPA fraud-prevention exemption) [E: ICO/statutory commentary]. California Delete Act analysis needed if any data is sold [E: ccpa commentary]. Registry data on stolen items shared cross-border (EU→US police) needs SCCs/DPF care [I].

### 10.4 Liability for false flags
- No lawsuit against a bike registry found (NOT FOUND — searched). The governing analogy is **Carfax**: dealers sued over erroneous damage/total-loss designations destroying resale value; claims for lost value from wrong reports are recognized [E: wardsauto; fwlaw.com]. A platform that *gates transactions* (marketplace blocks) carries more exposure than one that informs.
- [I] Mitigations: flags anchored to police report numbers or sworn attestations; "reported stolen" phrasing (statement of record, not fact); dispute SLA with human review; E&O coverage; marketplace contracts allocating decision authority to the marketplace.

---

## 11. Adversarial Threat Model (documented, not hypothetical)

| Threat | Evidence it happens | Mitigation (and honest residual risk) |
|---|---|---|
| Counterfeit/overlaid ID stickers | NL gangs place fake frame-number stickers over originals + forged consignment docs to move e-bikes cross-border [E: nltimes.nl Aug 2023] | Crypto tap-to-verify (fake sticker can't produce a valid SUN); covert microdots. Residual: buyer must actually tap |
| Serial grinding / defacement | Winnipeg bust: 21 of 30 frames had serials ground off [E: cbc.ca 2025]; defacement + knowing possession criminalized in many states (e.g., TX Penal §31.11) [E: statutes] | Multiple redundant IDs (etch + dots + chip in different locations); ground-off serial itself becomes probable-cause signal. Residual: labor-intensive for police |
| Chop-shop parting-out | Encampment chop shops documented Winnipeg/Hamilton/Portland/LA; **parts carry no serials** [E: multiple 2020–2025] | Component-serial capture (motor, fork) at registration; e-bike motors are the one part with OEM serials + pairing locks (Bosch). Residual: analog-bike parts unprotectable — accepted gap |
| Cross-border export | Thousands of stolen e-bikes/month NL→Eastern Europe [E: nltimes]; Bay Area→Jalisco fencing (federal charge) [E: justice.gov]; Casablanca warehouse of EU bikes [E: bikebiz] | Registry raises domestic fence friction; export is the accepted leak (same decay seen in phone blacklists [E: Met Police]). Be honest in claims |
| Thief registers item first / fake ownership proof | No litigated cases found (NOT FOUND); mechanic risk acknowledged by registries' receipt-checking advice [E: bikeindex.org/help] | POS-time registration (provenance from first sale beats after-market claims); ID-verified transfers; receipt hashing. Residual: pre-owned onboarding is weaker — tier the confidence labels |
| Tag cloning/replay | QR trivially cloned [E: ACM DocEng]; NTAG213 clonable | NTAG 424 DNA SUN (CMAC + counter) defeats replay/clone at data layer [E: NXP]. Residual: physical destruction always possible → tamper-evident + "missing tag = red flag" norms |
| Registry as burglary shopping list / stalking | **Immobilise 2015: up to 28M records enumerable** [E: securityweek] | Non-enumerable IDs, no addresses on item surfaces, rate limits, owner identity never public, SOC 2, breach-drilled. Residual: honeypot risk is permanent — a board-level control |
| Vigilante self-recovery harm | Police-documented confrontations; standard advice is police-mediated recovery [E: logistimatics; sgfcitizen case] | Product must *route* found-it moments to police workflows (evidence packet + report update), never to addresses/maps |
| Insurance fraud (fake theft of registered item) | Insurer-side concern generally; no registry-specific cases found | Registration ≠ possession proof; claims still insurer-adjudicated; scan-telemetry anomalies (item tapped after "theft") shared with insurer partners |

---

## 12. Business Model Options — who can actually pay?

Ranked by evidence strength that the payer exists:

### 12.1 Marking-hardware sales (proven, small)
Datatag (£24.95–34.49), BikeRegister (£13–30), DataDot ($49.95), 529 Shield (~$11–13) all sustain businesses on kit margin [E: §5]. At 70–85% GM (§8.2) this funds operations but plateaus: the entire visible UK marking-kit complex supports two mid-sized private companies, not a venture outcome [I].

### 12.2 Trade/insurer per-check fees — the Recipero model (proven at scale, in phones)
CheckMEND: £1.99 consumer / ~£1 trade per check; $18.5B of items checked in 2024; sustained for 20+ years inside a credit bureau [E: recipero.com; checkmend.com]. Precondition that bikes lack: universal IDs (IMEI) and legally compelled checking at trade chokepoints. [I] Achievable in recommerce first (Upway/buycycle/TPC need trust badges), then marketplaces if ever compelled.

### 12.3 Agency-pays SaaS — the LeadsOnline model (proven, gated by density + statute)
5,500 agencies pay annual subscriptions because *statutes force pawn/secondhand reporting* into it [E: leadsonline.com; pawn-software.com]. A bike/gear registry earns this only after achieving evidence-grade density in a jurisdiction; free-to-police is the only viable year-1–3 posture (529/Bike Index both concede this) [E/I].

### 12.4 Marketplace integration fees (unproven — 20 years of failure)
No major marketplace has ever integrated a stolen-goods registry check: eBay runs PROACT + LE portals but no listing-time serial checks; Facebook Marketplace is described by police as "the new fence"; OfferUp feeds LeadsOnline voluntarily [E: ebay.com policy pages; aimgroup.com; offerup]. BikeRegister has "long wanted" a marketplace bolt-on that never happened [E: stolenride.co.uk]. [I] Marketplaces avoid checks because knowledge creates duty (liability) and friction cuts GMV. The INFORM Act added seller-identity rails but no item-level checking; its first enforcement (Temu, $2M, Sept 2025) is about disclosures [E: FTC/gtlaw]. Treat marketplace revenue as upside, never base case.

### 12.5 Insurance-embedded distribution (the emerging winner)
The entire monetization frontier moved here in 2024–2026: Two Three Bird (insurtech) bought 529 and bundled Sundays/Velosure/Laka-style cycle insurance with registration + certified resale [E: bikebiz; twothreebird.com]. Underwriting requirements already monetize prevention in EU (ART locks NL — claims denied without; ADFC coding DE €15–20; MASTER UK; Velosure 10% discount for Datatag; Bikmo ~8.3% for BikeRegister) [E: §5]. Insurer math [I]: theft is the dominant priced peril at 5–8% of item value/yr; a *verifiable* 20–40% frequency reduction is worth ~$30–60/yr on a $3k e-bike policy — the realistic per-policy value share available to a prevention platform.

### 12.6 Compliance/white-label infrastructure (new, opened by NJ July 2026)
France's six licensed operators exist because the state created a marking market (€10–30/bike embedded in price, ~1.4M+/yr flow) [E/I: §4]. NJ now forces e-bike owners through DMV appointments — a process a state would plausibly outsource or streamline; more states considering [E: §4]. GovTech sales cycles are slow; contracts are real but PE-shaped [I].

### 12.7 Models to refuse
- **Consumer registration fees** (NBR's 33-year corpse) [E: §6.1].
- **Theft guarantees on own P&L** (VanMoof's €160M lesson) [E: §5.2].
- **Blockchain/token registries** (every attempt dead or scam-adjacent) [E: §6].
- **Pure GPS-subscription hardware** (Sherlock/Curve graveyard; AirTag price umbrella collapsed it) [E: §5.2].

**Chosen architecture [I]:** free registration (data layer) + hardware kit margin (cash engine) + insurance rev-share (scaling engine) + recommerce/marketplace checks (optionality) + compliance white-label (optionality) — explicitly the Recipero-plus-Datatag stack transplanted onto the e-bike wave.

---

## 13. Pricing (proposed, benchmarked)

| SKU | Price | Benchmark anchor |
|---|---|---|
| Secure ID kit (consumer retrofit) | **$39–49** one-time; $59–69 with microdot pack | Datatag £24.95–34.49; DataDot $49.95; kit COGS $4–7 @10k → 82–89% GM |
| OEM/POS embedded SKU (sold to brand/retailer) | **$8–14** per bike wholesale incl. registration rail | MASTER model (industry-funded, embedded in price); Colnago precedent |
| POS registration rail (no hardware) | **$1–3** per bike to brand/retailer | Value = warranty registration + fraud reduction + churn data; Trek/Ascend & Lightspeed/Bike Index prove the rail at $0, so price must ride added value (crypto ID + insurer discounts + transfer infra) |
| Premium owner subscription (optional) | **$29–39/yr**: concierge theft response (report filing, marketplace watch, evidence packet), insurance discounts, transfer credits | Bosch Flow+ $59.99/yr; AlterLock $49.95/yr — but note sub fatigue; must be optional, not core |
| Insurer program | **$20–45/policy/yr** rev-share or $3–6 per verified bind + claims-triage API | Derived from $30–60/yr insurer value share (§12.5); ART/MASTER as requirement precedents |
| Recommerce/marketplace check | **$0.50–1.99**/check; provenance certificate $4.99 | CheckMEND £1.99/£1.00 |
| Police | **Free** (portal, packets, training) until density; later optional analytics SaaS $3–10k/agency/yr | LeadsOnline agency-pays only post-density |
| Resort/venue pilot | **$10–25k/season** co-branded program (tags + valet integration + scan stations) | Priced as loss-prevention + NPS amenity; no comparable exists (white space) |

---

## 14. Unit Economics (illustrative, assumption-tagged)

**Consumer kit (DTC):** price $49 → COGS $6.93 @10k [I: §8.2] + pick/pack $4.25 + payment/support/returns ~$3.50 → **contribution ≈ $34 (69%)**. Blended CAC target ≤$30 (content/community/shop referral heavy; paid-social CAC for niche safety hardware realistically $40–80 [I — must be smoke-tested, §17-E1]). One-time-purchase LTV problem is real: LTV/CAC ≈ 1.1–1.7 on kit alone → **DTC kit cannot be the growth engine; channel and B2B2C attach must carry it** [I].

**POS-embedded (the intended engine):** $10 wholesale − $4.30 COGS @100k − $0.70 provisioning/support = **$5 contribution per bike, zero CAC** (channel-borne). 150k bikes/yr through partners = $750k contribution funding the free registry [I].

**Insurer line:** 25k active policies × $30 = $750k/yr at ~90% GM; requires ~2–4 quarters of loss-experience pilot data first [I].

**Recovery ops (cost center to bound):** concierge recovery labor ~1.5–3 hrs/case [I]; at 1,000 assisted cases/yr ≈ 0.75–1.5 FTE + tooling ≈ $120–220k — capped by making police-packet generation self-serve; never promise physical recovery (VanMoof) [E-lesson].

**Year-3 illustrative P&L (pivot wedge executed well) [I]:**
- 3 OEM/retail programs → 300k bikes/yr embedded @ ~$2.20 blended net = $660k
- 45k consumer kits (cumulative install base 90k) = $1.5M net contribution
- Insurer: 30k policies × $30 = $900k
- Recommerce checks: 600k × $0.90 = $540k
- Resorts/campuses/agencies: 60 accounts × $6k avg = $360k
- **≈$3.9M revenue, ~72% blended GM**, opex (team of 12–15 + ops) ≈ $3.2–3.8M → around breakeven. **Year-5 plausible range $8–25M revenue** [I]. This is the honest ceiling *without* either (a) mandate spread creating a compliance land-grab, or (b) becoming the MGA and capturing premium (§15.3).

---

## 15. TAM / SAM / SOM

**TAM — "annual spend on bicycle & gear theft mitigation, assurance, and identity" (US+EU):**
- Locks $1.2–1.5B global [E-directional] + bicycle insurance ~$3–4B (EU-dominant; NL alone €621M e-bike) [E: leva-eu; directional reports] + GPS/trackers $0.4–0.6B [E-directional] + marking/registration ~$0.1B [I] ≈ **$5–6.5B/yr**, growing with e-bike mix. (Theft *losses* — $1.4B US + ~€2B+ EU [I: NL €698M + DE + FR + UK] — are the pain proxy, not the revenue pool.)
- Registration/verification services have historically captured **<1%** of this pool [I: §5 revenue evidence] — the central TAM-quality caveat.

**SAM — the chosen wedge (North America e-bike identity, protection & compliance services, 2027–2030):**
- Flow: ~1.0–1.4M e-bikes/yr sold NA [E: PeopleForBikes 2024 + growth]; installed base heading to 8–12M [I].
- Attachable revenue pools [I]: POS/OEM identity rail ($1–14/bike on new sales) ≈ $15–35M/yr; consumer retrofit kits (2–4% of installed base/yr × $40) ≈ $10–30M/yr; insurance attach (US e-bike insurance is nascent; if US follows NL toward even 15–25% penetration on a 10M base at $150–200 premiums, the *premium pool* is $250–500M — platform share at $20–45/policy on the insured subset ≈ $30–90M/yr); recommerce checks ≈ $5–15M/yr; state compliance ≈ $5–25M/yr if 3–6 states mandate.
- **SAM ≈ $65–195M/yr**, midpoint ~$130M [I].

**SOM:** 3-year ≈ **$3–5M ARR**; 5-year **$8–25M ARR** at 10–15% share of realized SAM [I: §14]. 

**Venture-scale test [I]:** $100M+ ARR requires one of: (1) mandate spread across ≥10 US states/EU with the platform as dominant compliance rail; (2) MGA conversion — owning e-bike insurance premium (at $150–200 premiums, 500k–700k policies = $75–140M GWP; comps: Laka, Sundays, Qover, and Two Three Bird's whole strategy); (3) multi-category horizontal expansion (tools = bigger dollars, existing corporate buyers). None is the default outcome of the consumer-registry concept as specified — which is precisely why the recommendation is Pivot, not Build.

---

## 16. Network Effects, Partnerships & Defensibility

**Two-sided dynamics [I]:** registrations (supply of identity) ↔ checkers (police, buyers, marketplaces, insurers). Cold-start solved only via channel injection (POS auto-registration = supply without consumer effort; the Trek/529 and Lightspeed/Bike Index rails prove feasibility at $0 [E]) and via *checker* utility that works day one (serial lookup federated across existing open data — Bike Index's API is open [E]; complement, don't fight, the free incumbent).

**Moat inventory, honestly ranked [I]:**
1. **Channel contracts** (OEM/POS embedding, insurer requirements, state compliance) — the only moats that held historically (MASTER, Denmark, France operators).
2. **Outcome dataset** (theft/recovery event graph priced into insurance) — compounding, hard to copy, the Recipero/Carfax asset.
3. **Hardware-crypto binding** (NTAG 424 DNA provisioning + key custody) — real switching cost per tagged item; chips themselves are commodity.
4. Brand/trust with police — slow, real, non-contractual.
5. Registry software — **no moat** (open-source-equivalent exists).

**Partnership map (priority order):** Lightspeed/Ascend/Shopify POS; 2–3 DTC e-bike brands (Rad/Aventon/Lectric-class — high theft anxiety, no dealer network, already need warranty registration [I]) + 1 premium OEM (Colnago precedent [E]); specialty insurers (Markel/Velosurance/Sundays US; Laka/Bikmo if EU) and 1 renters-insurance innovator (Lemonade-class) for the deductible-gap segment [I]; recommerce (Upway is taken by 529 [E] — target buycycle US, TPC relaunch, REI Re/Supply); campuses (UC Davis mandate model [E]); 2 police departments (Denver PD is already 529-active [E]); 1–2 resorts for the winter pilot; PeopleForBikes/NBDA for an e-bike ID standards push [I].

**Competitive response scenarios [I]:** Two Three Bird bundles 529 free into insurance (most likely; blunts insurer wedge → move fast on US carriers they haven't signed); Recipero extends CheckMEND to bikes (capable, slow in US consumer); BikeTagz races consumer NFC (spends the education budget; differentiate on B2B rails); Bosch/OEM telematics absorb e-bike tracking (partner, don't fight — their ConnectModule lacks a cross-brand registry).

---

## 17. Customer Validation Experiments (run BEFORE building — 90 days, $30–60k)

| # | Experiment | Design | Pass gate (kill if missed) |
|---|---|---|---|
| E1 | Consumer WTP smoke test | 3 landing pages (A: "recovery kit $49" / B: "digital title for your e-bike" / C: "$120/yr insurance bundle w/ verified ID"), $6–10k paid traffic, preorder deposits | Deposit CVR ≥1.5% on any variant; implied CAC ≤$60 |
| E2 | IBD channel pull | 25 shop interviews + offer: free POS rail + $8/bike margin on kits | ≥10 signed LOIs; ≥5 agree to auto-registration at checkout |
| E3 | Insurer appetite | 5 structured discovery calls (Markel, Velosurance, Sundays, Laka, 1 renters carrier) with actuarial one-pager (GDV severity trend, 529/France recovery deltas) | ≥1 pilot term sheet: discount or requirement pilot on verified-ID bikes |
| E4 | Recommerce checks | buycycle/TPC/REI conversations; mock provenance certificate | ≥1 paid pilot ($0.50–1/check or flat pilot fee) |
| E5 | Used-buyer demand | Intercept n≈100 FB Marketplace/Craigslist bike buyers; offer $1.99 check | ≥25% try it when free; ≥8% pay $1.99 |
| E6 | Resort + police reality check | 3 mountain-ops + 2 PD property-room interviews; scope $10–15k winter pilot & evidence-packet workflow | ≥1 resort verbal for paid pilot; PDs confirm packet format usable |

[I] Rationale: E1 tests the graveyard hypothesis directly (consumer apathy); E2–E4 test whether the *actual* payers (channel, insurer, recommerce) move on realistic terms; E5 tests the CheckMEND transplant; E6 prices the ski experiment before any ski investment. Total spend is <3% of a seed round for the answer to the only question that matters: who signs.

---

## 18. MVP Design (post-validation, ~4–5 months)

**In scope:**
1. Registry core: item/ownership event ledger, serial + photo + receipt-hash capture, theft flag with police-report anchoring, transfer via ID-verified invite (§9).
2. NTAG 424 DNA provisioning + tap-to-verify status pages (no app; web NFC/iOS background tag reading).
3. Kit v1: on-metal 424 DNA tag + etched QR plate + VOID decal (microdots as upsell SKU) — 5k units (~$35k landed [I: §8.2]).
4. Lightspeed POS app (auto-registration at checkout) + CSV/API for DTC brands.
5. Police portal v1: bulk serial search, one-click evidence packet (PDF: chain of ownership, photos, report numbers), recovered-item match queue.
6. Insurer pilot surface: verification API + monthly bordereau export.
7. Public free serial check (federating open Bike Index data where licensed) — the day-one checker utility.

**Explicitly out:** GPS hardware; marketplace scraping/auto-matching; ski module; native apps; blockchain; any recovery guarantee; international.

**MVP success metrics (month 6–9):** ≥12k items registered (≥60% via POS, proving the rail); ≥400 verified transfers (the title loop working); ≥30 theft flags with ≥6 assisted recoveries documented (case studies); insurer pilot live on ≥1k policies; kit sell-through ≥25% at pilot shops.

---

## 19. Go-to-Market

**Phase 1 — one-metro density flywheel (copy the only playbook with documented results — Vancouver/529 [E]):** pick Denver or Portland (high theft, 529/Bike Index familiarity, e-bike incentives, engaged PDs [E: Denver PD launched 529; Portland FAQ]). Assemble in order: campus mandate partner (UC-Davis-model [E]) → PD property-room integration (free, packet-driven) → 15–25 IBDs on POS rail → city/BID co-marketing ("register at purchase" norm) → measure recovery delta vs baseline for the insurer dossier.

**Phase 2 — vertical channel (e-bike DTC brands):** brands ship the tag factory-installed + registration pre-provisioned (MASTER playbook, $8–14/bike); their support teams get theft-response tooling (they currently improvise it); co-marketed "protected by" badge. Target 2 brands ≈ 100–250k bikes/yr [I].

**Phase 3 — monetization layers:** insurer program GA (discounts→requirements), recommerce checks, second metro, NJ compliance product exploration (white-label registration assist while DMV appointments frustrate owners [E: process friction documented]).

**Ski experiment (winter, parallel, capped at $40k):** one resort co-branded pilot — valet/locker tie-in + tagged-gear lane + base-area scan station; success = renewal + one more resort + measurable claims/NPS story, else shelve the vertical [I].

**Positioning:** to consumers, "get it back + prove it's yours + sell it for more" (never "theft-proof"); to channel, "warranty registration that also fights theft"; to insurers, "underwritable security posture"; to police, "less work per case."

---

## 20. 12-Month Roadmap

| Quarter | Build | Commercial | Gate at quarter end |
|---|---|---|---|
| Q1 | Registry core + provisioning pipeline; kit DFM; E1–E6 experiments | 10 IBD LOIs; insurer term sheet; metro + campus selection | **Go/kill on §17 gates** |
| Q2 | MVP live (§18); Lightspeed app; police portal v1; 5k kits landed | Metro launch: campus + 15 IBDs + 1 PD; DTC-brand pilot signed | ≥5k registrations, ≥50% via POS |
| Q3 | Insurer API + bordereaux; transfer/resale certificate v1; recommerce check API | Insurer pilot live (≥1k policies); brand factory-install PO; resort pilot contracted | ≥1 revenue line beyond kits invoicing |
| Q4 | Hardening + SOC 2 start; evidence-packet automation; ski pilot tooling | 2nd metro prep; resort pilot live (Dec); NJ compliance scoping; publish year-1 recovery data | **Milestone review vs §22 kill/scale gates → seed extension or Series A narrative** |

---

## 21. Funding Requirements

**Pre-seed/seed for the wedge: $1.5–2.5M, 15–18 months** [I]:
- Team (4→7: 2 eng, 1 design/product, founder-sales, ops/recovery lead, +2 by Q3) ≈ $1.1–1.6M
- Hardware NRE + 3 kit runs (5k/10k/10k) ≈ $150–250k
- GTM (metro program, pilots, content) ≈ $200–300k
- Legal (privacy, insurer contracts, E&O), SOC 2, contingency ≈ $150–250k

**Series A trigger (18–24 mo):** ≥$1.5M ARR run-rate with ≥40% from non-kit lines, OR a state compliance contract, OR insurer program >25k policies — sized $6–10M to fund multi-state/EU-entry or MGA conversion [I]. **Honesty clause:** if Year-2 evidence caps this at the $10–30M-revenue trajectory of §14, the right capital is angel/strategic/PE-flavored, not venture — say so before taking VC money, because the exit comps (529→insurtech, LoJack $134M, NBR absorbed) are modest [E: §5].

---

## 22. Key Risks (ranked) & Kill/Scale Gates

1. **Consumer apathy / attach-rate failure** (the graveyard's cause of death). Mitigation: POS/OEM channel carries adoption; E1/E2 gates before build. *Kill gate: <8% kit attach at pilot shops after 2 quarters.*
2. **Free incumbents + insurtech bundling** (Bike Index free API; Two Three Bird bundles 529 into policies). Mitigation: federate with free data; win US carriers first; crypto-hardware layer free registries lack. *Watch: any US carrier launching bundled 529 registration → accelerate or partner.*
3. **State disintermediation** (NJ runs its own DMV process; France capped operators' economics). Mitigation: build to be the outsourced rail (white-label posture), not the competitor. 
4. **Marketplace refusal persists** (20-year base rate). Mitigation: never base-case it; recommerce first. 
5. **Recovery outcomes underwhelm** (registration ≈ 7–21% recovery, not 50%+): overclaiming invites churn + FTC scrutiny. Mitigation: publish honest metrics; sell provenance/transfer value alongside recovery.
6. **Breach/false-flag liability** (Immobilise 28M-record exposure; Carfax suits). Mitigation: §9 security architecture; police-anchored flags; E&O; SOC 2.
7. **Competitive timing** — BikeTagz (Mar 2026) and any fast follower. Mitigation: they educate the consumer market; win the B2B rails they lack; watch their funding.
8. **Regulatory slowness** (UK Act: 2.5+ years, no SIs). Don't staff for mandates that haven't landed.
9. **Ski distraction** — seasonal, tiny, serial-less. Capped $40k experiment, hard shelf decision.
10. **Founder-market fit** — this is channel/insurance/govtech selling, not consumer-app building. If the founding team won't enjoy 18 months of IBD, carrier, and city meetings, pass now.

---

## 23. Final Recommendation: **PIVOT** (conditional build of the narrow wedge; pass on the concept as specified)

**Pass** on: a horizontal consumer theft-registry startup covering bikes *and* skis, monetized via consumer registration/kits and aspiring to universal-registry status. Every element of that sentence has been directly falsified by 40 years of evidence: consumers don't pay to register [E: NBR], the registry layer is free [E: Bike Index/529], deterrence claims outrun data [E: §7], marketplaces won't integrate [E: §12.4], and ski theft is 2–3 orders of magnitude too small to co-headline [E/I: §2.4].

**Pivot** to: **the e-bike digital-title and protection rail** — secure NFC identity embedded at point of sale through OEM/retail/POS partners; free registration as the data layer; revenue from hardware margin now, insurance partnerships as the scaling engine, recommerce verification and (if mandates spread) state compliance as optionality. This is the configuration for which affirmative evidence exists: MASTER (OEM embedding works, 6× differential), Recipero/CheckMEND (checkers pay), Two Three Bird×529×Upway (insurance+registry+resale consolidation is happening *right now*), Trek/Lightspeed rails (POS auto-registration is a solved integration), GDV severity trend + NL insurance penetration (the payer's problem is growing), NJ (US regulation has begun), BikeTagz (independent teams reached the same thesis this year).

**Build** only after the §17 gates pass (90 days, <$60k), fund $1.5–2.5M against the §20 roadmap, and hold the §22 kill gates without sentiment.

**Upgrade to full Build conviction if** (any two): a second and third US state mandates e-bike registration; an insurer converts discount→requirement on verified IDs (the ART/Denmark mechanism) at >25k policies; a top-5 e-bike brand signs factory embedding; recommerce check volume clears 100k/quarter paid.

**Downgrade to full Pass if:** E1–E3 all miss; or Two Three Bird/BikeTagz locks the two or three US carriers and top DTC brands first; or 12-month revenue mix remains >70% one-time kits — at that point this is a nice $5–15M lifestyle/PE business someone else should run.

**Expected-value framing for an investor [I]:** P(reaches $8–25M ARR infrastructure business) ≈ 35–45% conditional on gates passing; P(venture outcome ≥$100M ARR) ≈ 5–10%, requiring mandate spread or MGA conversion; P(zero) ≈ 50%+ if built as specified without the pivot. The pivot converts a low-probability consumer bet into a moderate-probability infrastructure bet with two embedded call options (regulation, insurance) that 2023–2026 events have made meaningfully more likely.

---

## 24. Consolidated Sources (deduplicated, grouped)

**Theft incidence & magnitude:** findingspress.org/article/127974 (UC Davis/UCSB/Bike Index/YouGov, Jan 2025) · bikeindex.org/news/2025-bicycle-theft-stats-what-you-need-to-know-to-protect-your-bike · bikeindex.org/news/bike-indexs-2025-annual-bike-theft-report · bicycleretailer.com/studies-reports/2025/01/29/bike-index-annual-report-shows-bike-thefts-rising · join.cc/cycling-tips/bike-theft-by-state · bikebounty.com/blog/bicycle-theft-statistics-usa · thebestbikelock.com/bike-theft-statistics-us · logistimatics.com/blogs/guides/how-police-recover-stolen-bikes · sundaysinsurance.com/journal/grand-theft-bicycle-the-top-5-states-bike-theft-stats-and-recovery-insights · ons.gov.uk (overview of bicycle theft) · statista.com/statistics/303562 · crimerate.co.uk/bicycle-theft · itv.com/news/london/2026-02-17 (2% of London's 40k recovered) · cyclingweekly.com (1% charged) · dutchnews.nl (2024-12 & 2025-03 CBS/police pieces) · nltimes.nl/2024/12/05 · gdv.de (Fahrraddiebstahl 2024 Medieninformation & Statistik) · zdfheute.de (PKS 2024) · bicytrust.fr/blog (France 2025 stats) · planetoscope.com/Criminalite/1462 · fub.fr/moi-velo/services/lutte-contre-vol · cyclassur.fr (80k quit) · popcenter.asu.edu/content/bicycle-theft-0 · UCL JDiBrief bicycle theft PDF.

**Victim behavior & demand:** ucits.org (Estimating Magnitude & Impacts of Bike Theft) · tandfonline.com/doi/full/10.1080/15568318.2024.2350946 · mcgill.ca newsroom + tram.mcgill.ca (van Lierop) · gbnews.com (stolen-bikes.co.uk survey) · lcc.org.uk/news/cycle-theft-launch · ecf.com Analysis_Paper_Bike_Theft_June_2023 · citylabbcn.org · sciencedirect.com/science/article/pii/S1361920924004760 · leva-eu.com (NL e-bike insurance €621M; 62%) · markel.com (bike insurance costs) · velosurance.com/faq/policy-cost · nltimes.nl/2024/05/25 & 2024/05/05 (premiums, penetration).

**Market sizing:** peopleforbikes.org (e-bike market insights 2024; "bigger than numbers show") · ebikes-international.com (2024 US units) · bicycleretailer.com (Vosper, 7,700 shops) · conebi.eu & cyclingindustry.news (EU 2024) · xmacey.com (EU e-bike data 2024) · dutchnews.nl/2025/03 (NL 858k bikes, ASPs) · forbes.com/carltonreid (UK 1.45M) · road.cc (UK sales) · saminfo.com (61.5M skier visits 2024-25) · coloradosun.com (492 areas) · shop-eat-surf-outdoor.com & snowindustrynews.com (SIA participation) · grandviewresearch.com (US ski market $5.53B) · skiresort.info (Europe counts) · businessresearchinsights/cognitivemarketresearch/dataintelo (locks — directional) · verifiedmarketreports/dataintelo (GPS trackers — directional).

**Ski theft:** vaildaily.com & summitdaily.com (Breckenridge spike series) · snowboarder.com (Summit Co. warnings) · townlift.com (Park City arrest 2025) · kpcw.org (Deer Valley 2025) · theunion.com (Boreal 2024) · cbc.ca (Whistler rental-fraud ring) · whistler.ca police page · fox13now.com (Snowbird $11–13k recovery) · travelmole.com & ipsos.com (holidaymaker theft rates) · gravirax.com (odds analysis) · deseret.com 2006 (Utah NCIC ski registry) · skiboardregistry.com · skikey.com · bigwhite.com theft-prevention · unofficialnetworks.com (serials advice) · weekand.com (ski serials).

**Registries & competitors:** bikeindex.org/about, /news (2022 review; who-we-are), /lightspeed, /ucdavis, /help · en.wikipedia.org/wiki/Bike_Index & National_Bike_Registry & Bike_registry · bikebounty.com/tools/serial-checker · project529.com/garage (+ /law_enforcement, /enterprise, /press) · project529.substack.com (Vancouver) · blog.project529.com · geekwire.com (2017 NBR acquisition) · bicycleretailer.com (2017 NBR; 2022 800k; 2024 Two Three Bird) · bikebiz.com (Two Three Bird acquires 529) · twothreebird.com/news (529 acquisition; Upway partnership) · vancouver.ca & vancouverpolicefoundation.org & cbc.ca/lite/story/1.4883250 (Vancouver numbers conflict) · cbsnews.com/colorado (Denver 529) · bikeregister.com (+ /bike-checker, /advice, /partnerships) · securedbydesign.com (1M registrations) · scotland.police.uk (Pedal Protect) · halfords.com (marking kit) · datatag.co.uk & datatag.shop & masterscheme.org (MASTER stats) · immobilise.com · thenmpr.com · checkmend.com · recipero.com · uk.linkedin.com/showcase/recipero-nmpr (5.7M searches/mo) · leadsonline.com & ta.com (TA investment; Forensic Technology 2026) & police1.com & pawn-software.com · natlawreview.com (BikeTagz PR, Mar 26 2026) · biketag.com · projectcatalyst.io (BikeID/Cardano) · skiboardregistry.com.

**Failures & postmortems:** techcrunch.com/2023/07/18 (VanMoof bankruptcy) · newsletter.pragmaticengineer.com (FD loss figures) · malaymail.com (bankruptcy; $128M) · fastcompany.com/40431482 (Bike Hunters economics) · vanmoof.com peace-of-mind pages · nltimes.nl & bloomberg.com (LAVOIE acquisition) · dyucycle.com (S6 relaunch) · road.cc/194576 (Sherlock crowdfunding fail) · tracxn.com (Sherlock defunct) · trustpilot.com/review/sherlock.bike · ebike24.com & road.cc forum (Vodafone Curve shutdown 7/2024) · forum.cyclinguk.org (Spybike) · boomerangbike.com · mediacenter.ibm.com (RDW/IBM blockchain PoC) · dappradar.com (VeloChain scam) · businessden.com (TPC shutdown after $90M) · bikerumor.com (TPC relaunch) · news.crunchbase.com (TPC $12M) · theproscloset.com (Bike Index screening).

**Mandates & national systems:** ecologie.gouv.fr & interieur.gouv.fr (French marking law) · vojomag.com & quechoisir.org (operators) · veloessentiel.fr (7M registered; +8% thefts) · echoduvelo.com (Bicycode guide) · government.nl (RDW register) · stopheling.nl & innovattic.com & business.gov.nl (DOR) · en.wikipedia.org/wiki/Danish_bicycle_VIN-system · thelocal.dk · mailmate.jp & expatsguide.jp & nippon.com (Japan bōhan tōroku) · be.brussels & vrt.be (MyBike national 2024) · legislation.gov.uk/ukpga/2023/34 & gov.uk call-for-evidence & gregsmith.co.uk (UK Equipment Theft Act status) · nj.gov/mvc (e-bike registration; 062326 press) · njbwc.org · oslaw.com (grace period ends Jul 19 2026) · fsresidential.com · gottheimer.house.gov · arielrider.com & velosurance.com & ebikeoracle.com (NJ guides) · getvinverification.com (CA eMoto) · ftc.gov (INFORM) · gtlaw.com & wiley.law (Temu enforcement) · durbin.senate.gov · retaildive.com.

**Police & marketplaces:** Utah/WSP NCIC Article File manuals (site.utah.gov; wsp.wa.gov) · irp.fas.org (NCIC overview) · beautifydata.com & pewresearch.org (clearance rates) · portland.gov bike-theft FAQ · family1st.io (48%/5% figures — directional) · cbc.ca & countryherald.com (Winnipeg chop shops) · cyclingmagazine.ca (Hamilton) · bikeportland.org · foxla.com · ebay.com stolen-property policy & ebaymainstreet.com (PROACT) · aimgroup.com ("the new fence") · cnbc.com (2022 stolen goods) · about.offerup.com & help.offerup.com & police1.com (OfferUp/LeadsOnline) · stolenride.co.uk (marketplace lobbying) · sgfcitizen.org (jurisdiction friction) · geekwire.com/2024 (online fencing) · justice.gov/usao-ndca (Jalisco pipeline) · bikebiz.com (Casablanca warehouse) · nltimes.nl/2023/08/21 (NL→E.Europe; counterfeit stickers).

**Insurance mechanics:** stichtingart.nl (ART requirement) · dutchreview.com & lynxcle.com (NL insurer conditions; ANWB 48h recover-or-replace) · adfc.de & adac.de (German coding €15–20) · how-to-germany.com · bikmo.com/uk/partners/bikeregister · datatag.co.uk/news_103 (Velosure 10%) · velosurance.com & bikeinsure.com & sundaysinsurance.com (US pricing) · insure.com & insurify.com & progressive.com (renters deductibles/sublimits) · americanlegendrider.com & daeryunlaw.com (subrogation/salvage) · marketgrowthreports & verifiedmarketreports & thebusinessresearchcompany (e-bike insurance sizing — conflicting, directional).

**Hardware & identifiers:** shopnfc.com (NTAG213/424 DNA/on-metal tiers) · store.gototags.com (printed/on-metal pricing) · alibaba.com (wet inlays $0.07–0.48) · nxp.com (NTAG 424 DNA / TagTamper) · rfidlabel.com (424 DNA & TagTamper lots) · azcus.digikey.com (NT3H2211 tiers) · seritag.com · tritiumelectronics.com & ieeexplore (10065256) & USPTO 11001034 (carbon fiber) · unirfid.com (anti-metal) · dl.acm.org/10.1145/3469096.3474924 (QR cloning) · scantrust.com & uniqode.com (secure QR) · camcode.com & etchcraftlaser.com & sbedirect.com (metal plates) · myassettag.com & asaslabel.com & emedco.com & fccprint.com (destructible vinyl) · selectadna.co.uk (+ burglary claims) · securitybuyer.com & securedbydesign.com (Cheshire 19%) · schneier.com (2005 skepticism) · smartwater.com & slocounty.ca.gov (CSI kits <$60) · rideonmagazine.com.au & bicyclesouth.co.za & motorbiscuit.com (DataDot pricing) · selectamark.co.uk/oem (white-label) · microdot.world · redstagfulfillment.com & rushorder.com (3PL costs).

**Trackers & OEM:** apple.com/newsroom (Find My 3rd-party, 2021) · mfi.apple.com · us.knog.com/products/scout & bikeradar & the-gadgeteer (Scout reviews) · us.muc-off.com & road.cc (AirTag mounts) · en.wikipedia.org/wiki/AirTag · hotairtag.com (AirTag 2/SmartTag2/Moto Tag 2, 2026) · 9to5google.com/2026/06/30 (Moto Tag 2) · techtimes.com (Pixel Tag, Jul 2026) · androidpolice.com (Chipolo/Pebblebee) · stolenride.co.uk & powunity.com & alterlock.net (anti-stalking analyses) · forums.theregister.com (DULT spec 5/2024) · powunity.com & clevercycles.com (BikeTrax) · bikerumor.com & road.cc (AlterLock Gen3 pricing) · invoxia.com & amazon.com (Invoxia) · bikeindex.org/news (CycloTrac review) & shop.boomerangbike.com · hubble.com & telnyx.com & quectel.com (IoT cost floor) · bikerumor.com & cyclingnews.com & my-lime.com (Colnago C68; retrofitting) · help.ascendrms.com & trekbicyclekingston.com & parkingday.org (Trek/529 POS) · lightspeed support docs (serialized inventory; Specialized integration) · support.specialized.com (90-day warranty registration) · curbsidecycle.com & ebike-mtb.com & bosch-ebike.com (ConnectModule/Flow+) · help.vanmoof.com (tracking tech) · stromerbike.com (OMNI 4G) · rfidtagworld.com & secureidnews.com & pongee.com & housecar.life (rental RFID) · kryptonitelock.com (ATPO $5k) · bikelockwiki.com (lock registration) · cyclingelectric.com & discerningcyclist.com (tracker guides).

**Legal & privacy:** saylordotorg (UCC void title) · lexplug.com (2-403) · dolcelauda.com & lexology.com (§935 BGB) · french-business-law.com (Art. 2276) · ico.org.uk (LE data sharing) · grcsolutions.io (Art. 17) · clarip.com & securiti.ai (CCPA deletion exceptions) · wardsauto.com & legalbrains.com & fwlaw.com & findlaw.com (Carfax litigation analogies) · ncleg.gov & codes.findlaw.com (TX §31.11) & law.justia.com (OK) & thelawman.net (FL) (serial-defacement statutes) · securityweek.com & news.sophos.com (Immobilise 2015 exposure) · cyclehoop.rentals (83% claim caveat).

**Deterrence natural experiments:** techcrunch.com/2014/06/19 & 9to5mac.com/2015/02/11 & /2015/07/27 (Activation Lock) · gsma.com (IMEI registry) · met.police.uk FOI (London phone theft 2019–2025) · en.wikipedia.org/wiki/LoJack & sec.gov (CalAmp merger) & prnewswire.com (Spireon 2021) · nicb.org & nmma.org (HIN) · lockdownyourcar.colorado.gov & bar.ca.gov & prestigemotorsca.com (cat-converter etching) · ncbi.nlm.nih.gov/pmc/articles/PMC3520908 (watching-eyes signage) · artloss.com & thewatchregister.com (paid search/recovery fees).

*Report compiled August 1, 2026. Statistics carry the year of the underlying data, not the access date. Conflicting figures are presented side-by-side wherever found; second-tier market-research numbers are labeled directional; vendor effectiveness claims are labeled as vendor claims.*
