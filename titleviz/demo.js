/* TitleViz sample report — entirely fictional commitment, used for the
 * "See a sample review" demo so the product works with no API key. */

window.TITLEVIZ_DEMO = {
  summary: {
    property_description: "Cedarbrook Flats — 612 NE Marlowe Ave, Vancouver, WA (84-unit multifamily)",
    commitment_date: "May 28, 2026",
    underwriter: "Cascadia Title Insurance Company, through Klickwood Title & Escrow",
    proposed_insured: "Marlowe Residential Partners LLC",
    policy_amount: "$14,250,000 (ALTA Owner's Policy, Extended Coverage)",
    estate_or_interest: "Fee simple",
    overall_risk: "medium",
    headline:
      "This is a generally clean commitment for a 1970s multifamily asset, but two items need attention well before closing: an unreleased 2014 deed of trust that does not match the payoff lender named in Schedule B-I, and a recorded parking license in favor of the neighboring church that burdens 22 of the 96 stalls. Start the conversation on both this week — everything else is routine or curable with the survey and the standard owner's affidavit.",
  },
  priority_items: [
    "Reconcile the unreleased 2014 Quarry Point Capital deed of trust (B-II 9) against the payoff requirement in B-I 5 — the named lenders do not match, which usually means a missed assignment or an unreleased refinanced loan.",
    "Pull and review the 1998 Parking License Agreement (B-II 11): 22 stalls licensed to Grace Hill Church could break the parking ratio assumed in underwriting.",
    "Order the ALTA survey now so the general survey exception (B-II 3) and the unlocatable 1962 utility easement (B-II 7) can be resolved or endorsed before the objection deadline.",
    "Confirm the 2025-2026 second-half general taxes (B-II 1) are prorated in escrow and that the senior-exemption flag on the tax parcel is cleared at closing.",
    "Request deletion of the standard exceptions (B-II 2-5) via extended coverage and the seller's owner's affidavit — the commitment already contemplates extended coverage.",
  ],
  exceptions: [
    {
      number: "1",
      title: "General taxes, 2nd half 2025-2026, not yet due",
      plain_english:
        "Property taxes for the second half of the current tax year are a lien but are not delinquent. The parcel also carries a note that a prior owner claimed a senior exemption, which can cause a recapture assessment when the property transfers.",
      risk: "low",
      perspective_concerns:
        "Routine for a buyer — taxes get prorated in escrow. The senior-exemption note is the only wrinkle: a recapture, if assessed, should be the seller's cost.",
      recommended_action:
        "Have escrow prorate as usual and add a line to the closing instructions making any exemption recapture a seller charge. Ask the title officer to confirm the current-year amounts.",
      removal_outlook: "stays_on_policy",
      suggested_endorsements: [],
    },
    {
      number: "2",
      title: "Rights of parties in possession (standard exception)",
      plain_english:
        "The policy won't cover claims by people occupying the property under unrecorded rights — which, for an apartment building, is every tenant.",
      risk: "low",
      perspective_concerns:
        "For a multifamily buyer this is expected; you are buying subject to the residential leases. The real protection is the rent roll certification and estoppel-style seller reps, not the title policy.",
      recommended_action:
        "Accept as to residential tenants under the rent roll, but ask title to limit the exception to 'tenants in possession under unrecorded residential leases, as tenants only' once the seller delivers the certified rent roll and owner's affidavit.",
      removal_outlook: "possibly_removable",
      suggested_endorsements: [],
    },
    {
      number: "3",
      title: "Survey matters (standard exception)",
      plain_english:
        "Anything an accurate survey would show — encroachments, boundary issues, unrecorded easements — is excluded until a survey is provided.",
      risk: "medium",
      perspective_concerns:
        "You're paying for extended coverage, so leaving this in place gives away coverage you've already bought. The carport along the east line is exactly the kind of thing this exception would otherwise swallow.",
      recommended_action:
        "Order the ALTA/NSPS survey immediately and ask title to delete this exception (or replace it with specific survey-shown matters) on receipt.",
      removal_outlook: "likely_removable",
      suggested_endorsements: ["ALTA 25-06 — same as survey"],
    },
    {
      number: "4",
      title: "Easements not of record (standard exception)",
      plain_english: "Unrecorded easements — utility lines, access paths, drainage — are excluded from coverage.",
      risk: "low",
      perspective_concerns:
        "Standard. The survey plus the seller's affidavit about unrecorded agreements is the cure.",
      recommended_action: "Request deletion with extended coverage based on the survey and owner's affidavit.",
      removal_outlook: "likely_removable",
      suggested_endorsements: [],
    },
    {
      number: "5",
      title: "Mechanics' and materialmen's liens not of record (standard exception)",
      plain_english:
        "Work done on the property in the months before closing could ripen into liens that relate back before your deed, even if nothing is recorded yet.",
      risk: "low",
      perspective_concerns:
        "The seller completed a roof replacement in March 2026 per the deal context, so this is worth a real look rather than a reflexive waiver — lien periods may still be open.",
      recommended_action:
        "Have the seller provide lien waivers from the roofing contractor and an indemnity in the owner's affidavit; title should then delete the exception under extended coverage.",
      removal_outlook: "likely_removable",
      suggested_endorsements: [],
    },
    {
      number: "6",
      title: "City of Vancouver utility easement (1958)",
      plain_english:
        "A recorded 10-foot easement along the south boundary for water and sewer mains. The city can enter to maintain its lines, and you can't build permanent structures over the strip.",
      risk: "low",
      perspective_concerns:
        "Typical perimeter utility easement; buildings appear to predate it without conflict. Only matters if your capital plan adds structures along the south line.",
      recommended_action: "Confirm on the survey that no improvements encroach into the strip; otherwise accept.",
      removal_outlook: "stays_on_policy",
      suggested_endorsements: [],
    },
    {
      number: "7",
      title: "Pacific Power transmission easement (1962) — location not disclosed",
      plain_english:
        "A recorded easement for electrical facilities whose legal description is a 'blanket' over the whole parcel — the document does not pin it to a specific strip. Blanket easements cloud the entire property because the holder could claim rights anywhere on it.",
      risk: "medium",
      perspective_concerns:
        "A blanket utility easement on a development or refinance can spook future lenders even when the actual line sits harmlessly along the street. Worth fixing now while you have leverage.",
      recommended_action:
        "Locate the actual facilities on the survey, then ask title for an endorsement insuring against forced removal of improvements (ALTA 28-series) or get the utility to execute a partial release / location agreement.",
      removal_outlook: "possibly_removable",
      suggested_endorsements: ["ALTA 28.1-06 — encroachments over easements (forced-removal coverage)"],
    },
    {
      number: "8",
      title: "Declaration of covenants from 1979 plat (no reverter)",
      plain_english:
        "Recorded covenants from the original plat: residential use, 35-foot height limit, and maintenance of the shared storm detention pond with the parcel to the north. No forfeiture or reverter clause — violations are enforced by injunction, not loss of title.",
      risk: "medium",
      perspective_concerns:
        "An 84-unit building already conforms, so day-one risk is low; the live issue is the shared detention pond — confirm the cost-sharing mechanics and whether the neighbor is current.",
      recommended_action:
        "Obtain and read the declaration. Confirm the height limit doesn't constrain the planned rooftop amenity, and get an estoppel from the northern parcel owner on pond cost-sharing if the documents provide for one.",
      removal_outlook: "stays_on_policy",
      suggested_endorsements: ["ALTA 9.1-06 — covenants, conditions and restrictions (owner's)"],
    },
    {
      number: "9",
      title: "Deed of trust — Quarry Point Capital ($6.1M, 2014) — apparently unreleased",
      plain_english:
        "A 2014 loan against the property still shows as an open lien. Schedule B-I requires payoff of a different lender (Meridian Bank, 2019). Either the 2014 loan was refinanced and the release was never recorded, or the loan was assigned and the chain of assignments is incomplete. Until resolved, there is a $6.1M cloud on title.",
      risk: "high",
      perspective_concerns:
        "This must be released at or before closing — a buyer cannot take subject to a possibly-live prior deed of trust. The mismatch between B-II 9 and B-I 5 is the single biggest item in this commitment.",
      recommended_action:
        "Demand the seller and title company trace the 2014 loan now: payoff letter, recorded release, or recorded assignment chain into Meridian. If it was paid off in the 2019 refinance, the original lender records a release; do not waive this or accept an indemnity from the seller alone without title's sign-off.",
      removal_outlook: "likely_removable",
      suggested_endorsements: [],
    },
    {
      number: "10",
      title: "Assignment of leases and rents securing B-II 9",
      plain_english:
        "The companion assignment of rents recorded with the 2014 deed of trust. It lives and dies with the loan above.",
      risk: "high",
      perspective_concerns: "Same issue as B-II 9 — it must be released together with the deed of trust.",
      recommended_action: "Include this instrument expressly in the payoff/release demand so it isn't orphaned.",
      removal_outlook: "likely_removable",
      suggested_endorsements: [],
    },
    {
      number: "11",
      title: "Parking License Agreement — Grace Hill Church (1998)",
      plain_english:
        "A recorded agreement licensing 22 parking stalls on the property to the church next door on Sundays and religious holidays, running with the land, terminable only for non-payment of the $400/year fee.",
      risk: "high",
      perspective_concerns:
        "If your underwriting assumed all 96 stalls (roughly 1.14 per unit), losing 22 stalls on weekends changes the parking story for tenants and may matter to the city if parking was counted toward code minimums. This is a price/structure issue, not just a title issue.",
      recommended_action:
        "Obtain and read the full agreement — confirm the days, stall locations, and termination rights. Quantify the impact on the parking ratio, then decide: negotiate a termination with the church before closing, or reprice. Ask the city whether the licensed stalls were counted in any parking covenant.",
      removal_outlook: "stays_on_policy",
      suggested_endorsements: [],
    },
    {
      number: "12",
      title: "Memorandum of laundry-room lease — Spin Cycle Services (2021, 7-year term)",
      plain_english:
        "A recorded memorandum of a commercial laundry equipment lease running to 2028, with an exclusive on laundry services at the property.",
      risk: "medium",
      perspective_concerns:
        "These leases are commonly above-market and the exclusivity blocks an in-unit washer/dryer retrofit program until 2028 unless bought out. Buyers routinely miss these until after closing.",
      recommended_action:
        "Get the underlying lease, check the termination-on-sale and buyout provisions, and price the buyout into the deal if your plan includes in-unit laundry.",
      removal_outlook: "stays_on_policy",
      suggested_endorsements: [],
    },
  ],
  requirements: [
    {
      number: "1",
      plain_english: "Pay the premiums, fees, and charges for the policy.",
      responsible_party: "Buyer/seller per the purchase agreement, through escrow",
      flag: "",
    },
    {
      number: "2",
      plain_english:
        "Record a statutory warranty deed from Cedarbrook Flats LLC to the proposed insured.",
      responsible_party: "Seller, through escrow",
      flag: "",
    },
    {
      number: "3",
      plain_english:
        "Provide the LLC formation documents and evidence of authority for both seller and buyer entities (certificates of formation, operating agreements, resolutions).",
      responsible_party: "Both parties' counsel",
      flag: "",
    },
    {
      number: "4",
      plain_english:
        "Pay and clear the 2024 stormwater utility delinquency noted on the tax account ($3,118 plus interest).",
      responsible_party: "Seller, through escrow",
      flag: "Small but easy to miss — confirm it appears on the settlement statement",
    },
    {
      number: "5",
      plain_english:
        "Obtain payoff and reconveyance of the Meridian Bank deed of trust recorded 2019.",
      responsible_party: "Seller and escrow",
      flag: "Does not reference the 2014 Quarry Point deed of trust shown at B-II 9 — the two must be reconciled",
    },
    {
      number: "6",
      plain_english:
        "Furnish the owner's affidavit and indemnity required for extended coverage, plus the certified rent roll.",
      responsible_party: "Seller",
      flag: "",
    },
    {
      number: "7",
      plain_english:
        "Provide the ALTA/NSPS survey acceptable to the company for extended coverage and survey-related endorsements.",
      responsible_party: "Buyer (typically), per the purchase agreement",
      flag: "",
    },
  ],
  questions_for_title: [
    "B-II 9 shows a 2014 deed of trust to Quarry Point Capital as unreleased, but B-I 5 only requires payoff of the 2019 Meridian Bank loan. Can you confirm whether the 2014 loan was reconveyed (and provide the recording number) or whether an assignment chain into Meridian exists?",
    "Will the company delete standard exceptions 2 through 5 upon receipt of the owner's affidavit, certified rent roll, and ALTA survey, consistent with the extended-coverage commitment?",
    "For the 1962 Pacific Power blanket easement (B-II 7), will the company issue an ALTA 28.1 endorsement insuring against forced removal of existing improvements once the survey locates the facilities?",
    "Can you provide legible copies of the recorded documents underlying B-II 8 (1979 declaration), B-II 11 (1998 parking license), and B-II 12 (2021 laundry lease memorandum)?",
    "Is the company aware of any pending special assessments or LID/ULID charges affecting the parcel that are not yet reflected on the tax account?",
  ],
};
