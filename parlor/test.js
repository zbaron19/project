// Regression check for the Parlor engine: generate two years of daily
// puzzles and assert each one is uniquely solvable, minimal-ish, and that
// the unique solution the solver finds matches the generated one.
const Parlor = require("./puzzle.js");

const DAYS = 730;
const start = Date.parse(Parlor.EPOCH + "T00:00:00Z");
let clueCounts = [];
let failures = 0;

for (let i = 0; i < DAYS; i++) {
  const d = new Date(start + i * 86400000);
  const dateStr = d.toISOString().slice(0, 10);
  const p = Parlor.generate(dateStr);

  const res = Parlor.countSolutions(p.clues);
  if (res.count !== 1) {
    console.error(`FAIL ${dateStr}: ${res.count} solutions`);
    failures++;
    continue;
  }
  const sameW = res.found.W.every((v, j) => v === p.solution.W[j]);
  const sameR = res.found.R.every((v, j) => v === p.solution.R[j]);
  if (!sameW || !sameR) {
    console.error(`FAIL ${dateStr}: solver solution differs from generated one`);
    failures++;
    continue;
  }
  // The guilty suspect must be derivable: exactly one suspect in the crime room.
  if (p.solution.R[p.solution.guilty] !== p.crimeRoom) {
    console.error(`FAIL ${dateStr}: crime room does not match guilty suspect`);
    failures++;
    continue;
  }
  // Determinism: same date must regenerate the identical puzzle.
  const p2 = Parlor.generate(dateStr);
  if (JSON.stringify(p2.clues) !== JSON.stringify(p.clues)) {
    console.error(`FAIL ${dateStr}: generation is not deterministic`);
    failures++;
    continue;
  }
  clueCounts.push(p.clues.length);
}

clueCounts.sort((a, b) => a - b);
const min = clueCounts[0];
const max = clueCounts[clueCounts.length - 1];
const avg = (clueCounts.reduce((a, b) => a + b, 0) / clueCounts.length).toFixed(1);
const median = clueCounts[Math.floor(clueCounts.length / 2)];

console.log(`${DAYS - failures}/${DAYS} puzzles OK`);
console.log(`clues per puzzle — min ${min}, median ${median}, avg ${avg}, max ${max}`);

// Spot-check day 1 renders sensibly.
const p1 = Parlor.generate(Parlor.EPOCH);
console.log(`\nParlor No. ${p1.number} — ${Parlor.todayStr(new Date(start))}`);
console.log(Parlor.story(p1));
console.log(Parlor.coroner(p1));
p1.clues.forEach((c, i) => console.log(`  ${i + 1}. ${Parlor.clueText(p1, c)}`));
const g = p1.solution.guilty;
console.log(`\n[spoiler] ${p1.suspects[g].name} with ${p1.weapons[p1.solution.W[g]].name} in the ${p1.rooms[p1.solution.R[g]].name}`);

process.exit(failures ? 1 : 0);
