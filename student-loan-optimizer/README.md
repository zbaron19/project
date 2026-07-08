# Student Loan Optimizer

A dependency-free Python tool that parses the loan data file you download
from [studentaid.gov](https://studentaid.gov/) (NSLDS "MyStudentData" .txt
export) and simulates repayment strategies so you can compare payoff dates
and total interest at different monthly budgets.

Everything runs locally — your loan data never leaves your machine, and the
`data/` folder is git-ignored so the export can't be committed by accident.

## Getting your data file

studentaid.gov → log in → "My Aid" → **Download My Aid Data**. Save the
`.txt` file into `student-loan-optimizer/data/`.

## Usage

```bash
# Portfolio summary: every active loan, sorted by rate, plus the
# break-even payment (monthly interest accrual)
python3 optimize.py data/MyStudentData.txt

# Compare avalanche / snowball / proportional at one budget
python3 optimize.py data/MyStudentData.txt --budget 3000

# Sweep several budgets to see the marginal value of each extra dollar
python3 optimize.py data/MyStudentData.txt --budgets 2000,3000,4000

# Show the loan-by-loan payoff order for a chosen strategy
python3 optimize.py data/MyStudentData.txt --budget 3000 --strategy avalanche --schedule

# Write the whole thing to a markdown report
python3 optimize.py data/MyStudentData.txt --budgets 2000,3000,4000 --report report.md
```

## Strategies

- **avalanche** — extra money goes to the highest-rate loan first.
  Mathematically optimal: always the least total interest.
- **snowball** — extra money goes to the smallest balance first. Costs more
  in interest but retires individual loans sooner, which some people find
  easier to stick with.
- **proportional** — spreads extra money across all loans by balance
  (roughly what happens if you just pay "more" without targeting).
  Included as a baseline to show what targeting is worth.

## How the model works

- Federal loans accrue **simple interest on principal only**; the model
  accrues monthly (`principal x rate / 12`) and never capitalizes.
- Payments are applied to accrued interest first, then principal — the
  same order servicers use.
- The full budget is paid every month until the last loan is gone.
- If the budget is below the monthly interest accrual, the balance grows;
  the simulation caps at 40 years and reports the ending balance instead.

## What it deliberately does not model

- **IDR plans / forgiveness** (SAVE, IBR, RAP, PSLF): payment amounts there
  depend on income and family size, and the rules have been changing
  rapidly. If you expect loan forgiveness, minimizing your monthly payment
  can beat aggressive repayment — this tool only answers the
  "pay it off myself" question.
- **Refinancing**: private refis can cut Grad PLUS rates, but you
  permanently give up federal protections (IDR, forgiveness, generous
  forbearance). Compare rates with your eyes open.
- **Taxes** (student loan interest deduction phases out at higher incomes).

Not financial advice — a planning calculator. Verify anything consequential
at studentaid.gov or with a financial advisor.
