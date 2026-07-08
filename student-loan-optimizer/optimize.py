#!/usr/bin/env python3
"""Student loan repayment optimizer.

Parses an NSLDS "MyStudentData" export (the .txt file downloaded from
studentaid.gov) and simulates repayment strategies so you can compare
total interest paid and payoff dates at different monthly budgets.

Usage:
    python3 optimize.py MyStudentData.txt                      # portfolio summary
    python3 optimize.py MyStudentData.txt --budget 3000        # compare strategies
    python3 optimize.py MyStudentData.txt --budget 3000 --strategy avalanche --schedule
    python3 optimize.py MyStudentData.txt --budgets 2000,3000,4000
    python3 optimize.py MyStudentData.txt --report report.md   # write markdown report

No dependencies, nothing leaves your machine. Federal loans use simple
daily interest; this model accrues interest monthly on principal only and
never capitalizes it (unpaid interest is tracked separately and paid first),
which matches how Direct Loan payments are applied.

This is a planning calculator, not financial advice. IDR plans, forgiveness
programs, and forbearance rules change - confirm anything consequential at
studentaid.gov before acting.
"""

import argparse
import re
import sys
from datetime import date

MAX_MONTHS = 40 * 12  # simulation cap

# ---------------------------------------------------------------- parsing


def _money(s):
    s = (s or "").strip().replace("$", "").replace(",", "")
    try:
        return float(s)
    except ValueError:
        return 0.0


def _pct(s):
    s = (s or "").strip().rstrip("%")
    try:
        return float(s) / 100.0
    except ValueError:
        return 0.0


def parse_nslds(path):
    """Parse an NSLDS MyStudentData text export into a list of loan dicts."""
    loans = []
    cur = None
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            if ":" not in line:
                continue
            key, _, val = line.partition(":")
            key, val = key.strip(), val.strip()
            if key == "Loan Type Code":
                # "Loan Type Code" starts a new loan record; the bare
                # "Type Code" lines earlier are portfolio-level summaries.
                if cur:
                    loans.append(cur)
                cur = {"type_code": val}
            elif cur is not None:
                if key == "Loan Type Description":
                    cur.setdefault("type", val)
                elif key == "Loan Award ID":
                    cur.setdefault("award_id", val)
                elif key == "Loan Date":
                    cur.setdefault("loan_date", val)
                elif key == "Loan Outstanding Principal Balance":
                    cur.setdefault("principal", _money(val))
                elif key == "Loan Outstanding Interest Balance":
                    cur.setdefault("accrued", _money(val))
                elif key == "Loan Interest Rate":
                    cur.setdefault("rate", _pct(val))
                elif key == "Loan Repayment Plan Type Code Description":
                    cur.setdefault("plan", val)
                elif key == "Loan Repayment Plan Scheduled Amount":
                    cur.setdefault("scheduled", _money(val))
                elif key == "Current Loan Status Description":
                    cur.setdefault("status", val)
                elif key == "Capitalized Interest":
                    cur.setdefault("capitalized", _money(val))
    if cur:
        loans.append(cur)

    for i, ln in enumerate(loans):
        ln.setdefault("type", "?")
        ln.setdefault("award_id", f"loan-{i}")
        ln.setdefault("principal", 0.0)
        ln.setdefault("accrued", 0.0)
        ln.setdefault("rate", 0.0)
        ln.setdefault("scheduled", 0.0)
        ln.setdefault("status", "?")
        ln["id"] = short_id(ln, i)

    # uniquify labels (award-ID tails can collide across loans)
    seen = {}
    for ln in loans:
        n = seen.get(ln["id"], 0)
        seen[ln["id"]] = n + 1
        if n:
            ln["id"] = f"{ln['id']}{chr(ord('a') + n)}"
    return loans


def short_id(ln, i):
    """Human-friendly label: type abbreviation + award year + sequence."""
    abbrev = {
        "DIRECT PLUS GRADUATE": "GradPLUS",
        "DIRECT STAFFORD UNSUBSIDIZED": "Unsub",
        "DIRECT STAFFORD SUBSIDIZED": "Sub",
        "FEDERAL PERKINS": "Perkins",
    }.get(ln.get("type", ""), ln.get("type", "?")[:8])
    m = re.search(r"[A-Z](\d{2})[A-Z]\d{6,}?(\d{2})$", ln.get("award_id", ""))
    if m:
        return f"{abbrev}-{m.group(1)}-{m.group(2)}"
    tail = re.sub(r"\W", "", ln.get("award_id", ""))[-5:] or str(i)
    return f"{abbrev}-{tail}"


def active_loans(loans):
    return [
        ln for ln in loans
        if ln["principal"] + ln["accrued"] > 0.005
        and "CANCEL" not in ln["status"].upper()
        and "PAID" not in ln["status"].upper()
    ]


# ------------------------------------------------------------- simulation

STRATEGIES = ("avalanche", "snowball", "proportional")


def simulate(loans, budget, strategy, start=None):
    """Simulate monthly repayment. Returns dict with totals and schedule.

    Each month: interest accrues on principal only (simple interest, no
    capitalization). Payments hit accrued interest first, then principal.
    The whole budget is applied every month; 'strategy' decides which loan
    the money targets first once every loan's accrued interest is covered.
    """
    state = [
        {"id": ln["id"], "rate": ln["rate"], "p": ln["principal"], "a": ln["accrued"]}
        for ln in loans
    ]
    start = start or date.today()
    total_paid = 0.0
    total_interest = 0.0
    payoffs = []  # (month_index, id)
    months = 0

    def order(sts):
        if strategy == "avalanche":
            # ties on rate: smallest balance first (same total interest,
            # but individual loans close out sooner)
            return sorted(sts, key=lambda s: (-s["rate"], s["p"] + s["a"]))
        if strategy == "snowball":
            return sorted(sts, key=lambda s: (s["p"] + s["a"], -s["rate"]))
        return sts  # proportional handles its own split

    while any(s["p"] + s["a"] > 0.005 for s in state) and months < MAX_MONTHS:
        months += 1
        for s in state:
            i = s["p"] * s["rate"] / 12.0
            s["a"] += i
            total_interest += i

        remaining = budget

        # Interest first across the board (matches federal payment application
        # and prevents any strategy from letting accrued interest snowball).
        for s in order(state):
            pay = min(remaining, s["a"])
            s["a"] -= pay
            remaining -= pay

        if strategy == "proportional":
            open_loans = [s for s in state if s["p"] > 0.005]
            total_p = sum(s["p"] for s in open_loans)
            share = remaining
            for s in open_loans:
                pay = min(s["p"], share * s["p"] / total_p) if total_p else 0.0
                s["p"] -= pay
                remaining -= pay
            # leftover from loans that finished mid-split goes to the largest
            for s in sorted(open_loans, key=lambda s: -s["p"]):
                if remaining <= 0:
                    break
                pay = min(remaining, s["p"])
                s["p"] -= pay
                remaining -= pay
        else:
            for s in order(state):
                if remaining <= 0:
                    break
                pay = min(remaining, s["p"])
                s["p"] -= pay
                remaining -= pay

        total_paid += budget - max(remaining, 0.0)

        for s in state:
            if s["p"] + s["a"] <= 0.005 and s["id"] not in (p[1] for p in payoffs):
                payoffs.append((months, s["id"]))

    finished = all(s["p"] + s["a"] <= 0.005 for s in state)
    end_balance = sum(s["p"] + s["a"] for s in state)
    return {
        "strategy": strategy,
        "budget": budget,
        "months": months,
        "finished": finished,
        "total_paid": round(total_paid, 2),
        "total_interest": round(total_interest, 2),
        "end_balance": round(end_balance, 2),
        "payoffs": payoffs,
        "payoff_date": add_months(start, months) if finished else None,
    }


def add_months(d, n):
    y, m = divmod(d.month - 1 + n, 12)
    return date(d.year + y, m + 1, 1)


def minimum_budget(loans):
    """Monthly interest accrual - the floor below which the balance grows."""
    return sum(ln["principal"] * ln["rate"] / 12.0 for ln in loans)


# --------------------------------------------------------------- reports


def fmt(x):
    return f"${x:,.2f}"


def summary_table(loans):
    rows = []
    for ln in sorted(loans, key=lambda l: -l["rate"]):
        rows.append(
            f"| {ln['id']} | {ln['rate'] * 100:.2f}% | {fmt(ln['principal'])} "
            f"| {fmt(ln['accrued'])} | {ln['status'].title()} | {ln.get('plan') or '-'} |"
        )
    total_p = sum(l["principal"] for l in loans)
    total_a = sum(l["accrued"] for l in loans)
    w_rate = (
        sum(l["principal"] * l["rate"] for l in loans) / total_p if total_p else 0.0
    )
    head = (
        "| Loan | Rate | Principal | Accrued interest | Status | Plan |\n"
        "|---|---|---|---|---|---|\n"
    )
    foot = (
        f"| **Total ({len(loans)} loans)** | **{w_rate * 100:.2f}% wtd** "
        f"| **{fmt(total_p)}** | **{fmt(total_a)}** | | |"
    )
    return head + "\n".join(rows) + "\n" + foot, total_p, total_a, w_rate


def compare_report(loans, budgets, start):
    lines = []
    floor = minimum_budget(loans)
    lines.append(
        f"Interest accrues at about **{fmt(floor)}/month** on the current "
        f"principal - any budget below that and the balance grows.\n"
    )
    lines.append("| Budget | Strategy | Payoff | Months | Total paid | Total interest |")
    lines.append("|---|---|---|---|---|---|")
    for b in budgets:
        for strat in STRATEGIES:
            r = simulate(loans, b, strat, start)
            if r["finished"]:
                lines.append(
                    f"| {fmt(b)} | {strat} | {r['payoff_date'].strftime('%b %Y')} "
                    f"| {r['months']} | {fmt(r['total_paid'])} | {fmt(r['total_interest'])} |"
                )
            else:
                lines.append(
                    f"| {fmt(b)} | {strat} | not within 40 yrs | - | - "
                    f"| balance {fmt(r['end_balance'])} |"
                )
    return "\n".join(lines)


def schedule_report(loans, budget, strategy, start):
    r = simulate(loans, budget, strategy, start)
    lines = [
        f"Payoff order at {fmt(budget)}/month ({strategy}):\n",
        "| # | Loan | Paid off |",
        "|---|---|---|",
    ]
    for n, (m, lid) in enumerate(r["payoffs"], 1):
        lines.append(f"| {n} | {lid} | {add_months(start, m).strftime('%b %Y')} |")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("file", help="NSLDS MyStudentData .txt export")
    ap.add_argument("--budget", type=float, help="monthly budget to compare strategies at")
    ap.add_argument("--budgets", help="comma-separated budgets, e.g. 2000,3000,4000")
    ap.add_argument("--strategy", choices=STRATEGIES, default="avalanche")
    ap.add_argument("--schedule", action="store_true", help="show per-loan payoff order")
    ap.add_argument("--report", help="write full markdown report to this path")
    args = ap.parse_args()

    loans = active_loans(parse_nslds(args.file))
    if not loans:
        sys.exit("No active loans found - is this an NSLDS MyStudentData export?")

    start = date.today()
    table, total_p, total_a, w_rate = summary_table(loans)

    out = ["# Student loan portfolio\n", table, ""]
    out.append(
        f"\nTotal owed: **{fmt(total_p + total_a)}** "
        f"({fmt(total_p)} principal + {fmt(total_a)} accrued interest), "
        f"weighted average rate **{w_rate * 100:.2f}%**."
    )
    out.append(
        f"Monthly interest accrual: **{fmt(minimum_budget(loans))}** - "
        "that's the break-even payment.\n"
    )

    budgets = []
    if args.budgets:
        budgets = [float(b) for b in args.budgets.split(",")]
    if args.budget and args.budget not in budgets:
        budgets.append(args.budget)
        budgets.sort()

    if budgets:
        out.append("## Strategy comparison\n")
        out.append(compare_report(loans, budgets, start))
        out.append("")
        if args.schedule:
            sched_budget = args.budget or budgets[0]
            out.append("## Payoff schedule\n")
            out.append(schedule_report(loans, sched_budget, args.strategy, start))
            out.append("")

    text = "\n".join(out)
    print(text)
    if args.report:
        with open(args.report, "w", encoding="utf-8") as f:
            f.write(text + "\n")
        print(f"\n[report written to {args.report}]", file=sys.stderr)


if __name__ == "__main__":
    main()
