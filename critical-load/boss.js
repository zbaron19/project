/* CRITICAL LOAD — E10 boss fight */
window.BOSS = {
  id: "e10", num: 10, icon: "👹", title: "The Redline Gauntlet", boss: true,
  tagline: "Marcus sends five clauses, each with a buried trap from the campaign. Priya grades.",
  intro: [
    "“Counsel. Execution drafts attached. My deal team has, in a spirit of compromise, accepted the overwhelming majority of your positions, and we’ve consolidated the few remaining clarifications, all of them ministerial, into the five sections below. Signing is scheduled for Friday. I trust nothing here will detain you.”",
    "Priya, cc’d, replies one line: “I read these on the plane. Five sections, five problems, one each. Mark them up, counsel. I’ll grade.”"
  ],
  clauses: [
    {
      title: "Capacity",
      clause: "Operator shall make available to Customer 36 MW of Critical IT Load, measured at the output of the UPS systems serving the Premises. For purposes of measurement and billing, Customer’s consumption shall be determined at the Facility’s medium voltage distribution boards, with the resulting values deemed equivalent to consumption at the UPS output.",
      q: "Where is the trap?",
      options: [
        "The grant and the meter are at different points: capacity is promised at the UPS output, but billing is measured upstream at medium voltage with a “deemed equivalent” bridge, so Customer pays for distribution and conversion losses on every kWh.",
        "Critical IT Load cannot be measured at a UPS output as a matter of metering physics.",
        "Medium voltage boards are more accurate than downstream meters, which advantages the customer.",
        "The clause fails because 36 MW exceeds the capacity of any single UPS system."
      ],
      correct: 0,
      priya: "Correct diagnosis is the split: they gave you the E1 capacity definition you fought for, then moved the cash register upstream. Between the medium voltage boards and the UPS output sit transformer and conversion losses, several percent of 36MW, every hour, billed as your consumption under a “deemed equivalent” fiction that equates two physically different numbers. The fix is one sentence: measurement and billing occur at the same defined point as the capacity grant. Watch for grant-meter splits in every power section you ever read."
    },
    {
      title: "Redundancy",
      clause: "The Facility shall be concurrently maintainable, such that any single component of the electrical or mechanical infrastructure may be removed from service on a planned basis without interruption of Critical IT Load. Operator may temporarily operate the Facility in alternative configurations as reasonably necessary to perform maintenance, repairs, or upgrades, and operation in such configurations shall not constitute a breach of this Section.",
      q: "Where is the trap?",
      options: [
        "The second sentence swallows the first: “alternative configurations” during maintenance is exactly when concurrent maintainability matters, so the covenant excuses itself at the only moment it operates.",
        "Concurrent maintainability is a Tier IV requirement and therefore overpromises.",
        "“Single component” should read “single system” to widen the protection.",
        "The clause is fine, since maintenance flexibility and concurrent maintainability are unrelated."
      ],
      correct: 0,
      priya: "Yes. Sentence one is your E2 covenant, verbatim and lovely. Sentence two is a trapdoor under it: concurrent maintainability IS a constraint on maintenance configurations, so a safe harbor for “alternative configurations as reasonably necessary” during maintenance un-promises the promise precisely when it applies. A facility single-threaded for an upgrade is in an “alternative configuration.” Strike the safe harbor, or bound it: alternative configurations permitted only if the Facility remains concurrently maintainable and redundancy is not reduced below Exhibit C. A covenant with a self-exception is a press release."
    },
    {
      title: "Availability",
      clause: "Operator guarantees 100% Availability to the Premises, measured monthly. A “Service Interruption” means any unplanned loss of power to Customer’s equipment, with no minimum duration, provided that no Service Interruption shall be deemed to occur to the extent Customer’s equipment remained capable of operating on its alternate power path. Service credits shall be calculated as set forth in Schedule 2.",
      q: "Where is the trap?",
      options: [
        "The “alternate path” proviso converts the dual-path architecture into an SLA defense: any single-path failure is deemed no interruption because the other path existed, even when the failure actually dropped customer load.",
        "100% availability is a marketing impossibility, which voids the schedule of credits.",
        "“No minimum duration” exposes the operator excessively and will be renegotiated.",
        "Monthly measurement is the trap, since annual measurement favors the customer."
      ],
      correct: 0,
      priya: "Correct, and this one is subtle, because they conceded everything you asked for in E6: 100%, monthly, no duration floor. Then the proviso: no interruption is “deemed to occur” if equipment “remained capable” of running on the alternate path. Capable is a counterfactual, not an outcome. The Texas pattern, a sick static switch dropping one path while a misconfigured transfer crashes real load, is now definitionally invisible: the B path was “capable,” therefore nothing happened, therefore zero credits while your training runs die. The customer definition keys to what occurred at the load, not what some path was theoretically capable of. Deemed-no-occurrence provisos are where conceded SLAs go to be unconceded."
    },
    {
      title: "Delivery",
      clause: "Each Capacity Block shall achieve Ready for Service upon completion of Level 5 integrated systems testing and delivery of the Commissioning Agent’s certificate. Level 5 testing shall be performed at not less than seventy percent of design load, which the parties acknowledge is consistent with prudent industry practice in light of load bank availability and schedule considerations.",
      q: "Where is the trap?",
      options: [
        "IST at seventy percent of design load never proves the facility at the load Customer bought: failure response, thermal performance, and generator step-loading at 36MW are exactly what 70% testing cannot demonstrate.",
        "Load banks are incapable of simulating more than fifty percent of design load, so the clause overcommits.",
        "The commissioning agent’s certificate is the trap, since operators may not delegate certification.",
        "Seventy percent is conservative, since facilities never operate above sixty percent utilization."
      ],
      correct: 0,
      priya: "This is my favorite, professionally speaking. They gave you the E7 structure entire: Level 5, my certificate, RFS gated on both. Then they derated the exam. A facility that has only ever carried 25MW of load banks has never demonstrated what happens at 36: UPS thermal margins, generator block-loading at full step, chilled water at design flow, bus loadings, all unproven in the top thirty percent, which is the region your client actually paid for and the region where weak components reveal themselves. “Prudent industry practice” is doing a lot of acknowledging there: partial-load IST happens, but as a schedule failure, not a standard. One hundred percent of design load, in the definition, in numerals. I do not sign certificates for buildings tested at seventy percent, and your RFS should not start on one."
    },
    {
      title: "Power charges",
      clause: "Customer shall pay Power Charges equal to metered IT consumption multiplied by the Actual PUE, capped at the Guaranteed PUE of 1.30, multiplied by the utility rate passed through at cost. Operator shall deliver supporting utility invoices with each monthly statement. Amounts not disputed in writing within sixty days of the applicable statement shall be deemed final and conclusive, and audit inquiries shall be limited to statements within such period.",
      q: "Where is the trap?",
      options: [
        "The sixty-day deemed-final clause guts the audit machinery: pass-through errors surface in patterns across seasons and rate cycles, so a sixty-day per-statement window plus an audit limited to that window makes the annual true-up unenforceable.",
        "A Guaranteed PUE of 1.30 is unachievably low, so the cap will be breached immediately.",
        "Delivering utility invoices monthly violates utility tariff confidentiality rules.",
        "Passing the utility rate through at cost is itself improper, since operators may lawfully add margin."
      ],
      correct: 0,
      priya: "Correct. They handed you the entire E8 structure, actual PUE, the 1.30 cap, invoices at cost, and then shrank the statute of limitations to sixty days per statement with audit scope locked to it. Metering drift, misallocated demand charges, and PUE input errors do not announce themselves inside sixty days: they emerge from year-over-year comparison, seasonal patterns, and rate case true-ups, which is why you negotiated an annual independent audit. Under this clause, every statement older than two months is beyond review, forever. The fix: disputes within a reasonable period after discovery, audit lookback of at least twenty-four months, and the annual true-up surviving the finality language. A right you cannot exercise on the timescale where the errors live is decoration."
    }
  ],
  outro: {
    A: "Five for five, or close to it. I have been doing this for nineteen years and I will tell you what I tell maybe one legal team a year: you read the documents the way I read the building, as a system that fails at its interfaces. Marcus’s drafts conceded every headline and rigged every mechanism, and you caught the mechanisms. Sign Friday. Helios is in good hands.",
    B: "Solid gauntlet. You caught most of the machinery, and the ones you missed, you missed the way good lawyers miss things: the concession up front bought your trust for the proviso in back. Remember the pattern, because it IS a pattern: give the definition, move the meter. Give the covenant, add the safe harbor. Give the SLA, deem the outage unoccurred. Re-read the ones you missed before Friday.",
    C: "You caught some. Not enough for a 36MW deal. Notice what beat you: not technical vocabulary, which you now have, but structure, the trap placed one sentence after the concession. Marcus’s entire craft is making the second sentence sound like implementation of the first. Walk the campaign again, episode by episode, and reread each trap clause asking one question: which sentence takes back the other?",
    D: "We are not signing Friday. I will be blunt, because the load banks are rented by the day: you have the vocabulary now, but the drafts beat you, and they beat you with techniques this campaign taught. Go back through the episodes. The building will still be here. So will Marcus.",
    F: "We are not signing Friday. I will be blunt, because the load banks are rented by the day: you have the vocabulary now, but the drafts beat you, and they beat you with techniques this campaign taught. Go back through the episodes. The building will still be here. So will Marcus."
  }
};
