# Reader profile — data center news brief

This file is the brief's editorial standard. `scripts/editorial.py` reads it to
decide what gets promoted, what gets buried, and what "why this matters to you"
means on any given morning. Edit it in plain English; the parser only cares
about the `##` headings and the `-` bullets under them.

> **Confidentiality.** This file is committed to GitHub and its text is sent to
> the Anthropic API on every editorial run. Describe matters generically — deal
> type, geography, the issue you're watching. **No client names, no party names,
> no counterparties.** "Powered shell lease, Northern Virginia" is right;
> naming the tenant is not.

**Who's reading:** a transactional real estate attorney negotiating data center
deals — colocation, powered shell, build-to-suit — who is deliberately building
the engineering fluency to negotiate them with precision. The brief should read
like it was written by someone who knows that, not like a wire feed.

**Format bullets are `label — keyword, keyword, keyword`.** Keywords are matched
case-insensitively against each story's headline and summary.

## Beats

- Site selection, zoning & land use — moratorium, rezoning, special exception, conditional use, comprehensive plan, by-right, setback, siting, planning commission, board of supervisors, ordinance
- Power, utility & grid — interconnection, tariff, rate case, ratepayer, behind-the-meter, substation, transmission, curtailment, PPA, power purchase, capacity, PJM, ERCOT, MISO, load
- Leasing, M&A & capital markets — lease, pre-lease, build-to-suit, powered shell, colocation, REIT, joint venture, financing, sale-leaseback, ground lease
- Tax incentives & economic development — sales tax exemption, abatement, PILOT, clawback, economic development agreement, assessment
- Regulation & litigation — lawsuit, nuisance, noise ordinance, injunction, environmental review, NEPA, attorney general, appeal, ruling
- Contract-relevant engineering — cooling, chiller, immersion, liquid cooling, generator, UPS, switchgear, redundancy, N+1, 2N, commissioning, SLA, uptime, megawatt, gigawatt

## Matters

Keywords here carry the most weight, so keep them to terms that only appear
when the story is genuinely about the matter. A bare place name is too broad —
"Ohio" matches every hyperscaler press release; "annexation" doesn't.

- Powered shell / build-to-suit, Northern Virginia — powered shell, build-to-suit, by-right, moratorium, interconnection, loudoun, prince william
- Colocation negotiations — colocation, co-location, SLA, uptime, redundancy, N+1, expansion right, right of first refusal
- Site diligence, secondary markets — site selection, greenfield, land assemblage, annexation, option agreement, rezoning application, permit application, special exception

## Learning

- The power chain end to end — utility feed, substation, switchgear, generators, UPS, distribution
- Cooling systems and how they show up in contract obligations
- Interconnection queues and how utilities price large loads
- How rate cases and ratepayer-protection deals allocate cost to hyperscale load

## Boost

- Loudoun County
- Prince William
- Northern Virginia
- moratorium
- interconnection queue
- ratepayer
- noise ordinance
- powered shell
- build-to-suit

## Mute

- stock picks
- stocks
- shares of
- best AI stocks
- ETF
- price target
- analyst rating
- earnings preview
- chip benchmark
- GPU benchmark
- crypto mining
- new zealand
- australia
- european union
- united kingdom
