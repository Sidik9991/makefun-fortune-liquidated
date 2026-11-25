// Fortune Cookie for the Liquidated Trader — make.fun entry program
// (u-clever-harbor-75-fortune-cookie-for-the-liquidated-38fd239c).
//
// Writes the winning one-line fortune for a freshly liquidated crypto
// trader to /output/entry.txt. Ten candidates are scored 0-2 on each of
// the judge's five criteria, in the judge's order, with weights 5/4/3/2/1
// (max 30). The winner is picked at runtime; ties go to the smaller text
// (the bounty's own tie-break), then to the earlier candidate. The output
// is re-read and gate-checked before exit.
//
// Gate (RULES.txt): /output/entry.txt is UTF-8 text of 1-160 characters,
// not only white space. Our own stricter shape: exactly one line, at most
// 20 words, no trailing newline.
//
// Pass 1: seven candidates (C1-C7). Pass 2 added three challengers (C8-C10).
// Verified at runtime by the parent session 2026-11-25: winner "Already Spent",
// 61 bytes / 61 chars, 11 words, 30/30, gate OK; output byte-identical to the winning line.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// Judge criteria, most important first (RULES.txt "The judge"):
const CRITERIA = [
  "C1 reads as a fortune-cookie message for a liquidated crypto trader, cookie voice AND trading loss both in it",
  "C2 makes the trader laugh rather than cry: rueful and warm, never cruel, never smug",
  "C3 one line, at most 20 words, reads whole in a single breath like a real fortune",
  "C4 fresh: a turn, a double meaning or a surprising last word, not the obvious liquidation pun",
  "C5 keeps the fortune voice: small, oracular, slightly formal phrasing that the punchline then breaks",
] as const;
const WEIGHTS = [5, 4, 3, 2, 1]; // max total 2*(5+4+3+2+1) = 30

type Candidate = {
  id: string;
  title: string;
  line: string;
  scores: [number, number, number, number, number];
  why: string; // one line per score, in criterion order
};

const CANDIDATES: Candidate[] = [
  {
    id: "C1",
    title: "Already Spent",
    line: "A great fortune awaits you; it has simply already been spent.",
    scores: [2, 2, 2, 2, 2],
    why: "fortune voice (awaits you) + loss (fortune already spent); rueful, warm; 11 words, one breath; 'fortune' is money AND fate, last word 'spent' is the surprise; oracular opening broken by the punchline",
  },
  {
    id: "C2",
    title: "Lucky Numbers",
    line: "Your lucky numbers are the ones your exchange will not return.",
    scores: [2, 2, 2, 2, 2],
    why: "classic cookie trope (lucky numbers) + loss (exchange will not return); rueful, warm; 11 words, one breath; the trope itself turns against the trader; oracular opening broken by 'will not return'",
  },
  {
    id: "C3",
    title: "Worked Perfectly",
    line: "Your stop-loss worked perfectly; it stopped the loss by taking everything.",
    scores: [2, 1, 2, 2, 2],
    why: "stop-loss + loss both in it; the laugh is on the tool betraying the trader, colder than rueful-warm; 11 words, one breath; 'worked perfectly' is a sharp double meaning; formal declaration broken by the punchline",
  },
  {
    id: "C4",
    title: "Introduction",
    line: "At 3 a.m. your empty wallet will introduce you to your sense of humour.",
    scores: [2, 2, 2, 1, 2],
    why: "the brief's exact scene (3 a.m., empty wallet); warm, laughing with the trader; 14 words, one breath; the turn is gentle, the surprise mild; oracular opening broken gently",
  },
  {
    id: "C5",
    title: "Better Every Year",
    line: "The coins you lost will return as a story you tell better every year.",
    scores: [2, 2, 2, 1, 2],
    why: "coins lost, fortune voice; warm, the loss becomes a story; 14 words, one breath; 'return' doubles (coins / story) but the last word is not surprising; oracular opening broken gently",
  },
  {
    id: "C6",
    title: "Perfect Timing",
    line: "Your margin is gone, but your timing remains perfect, one trade too late.",
    scores: [2, 2, 2, 2, 2],
    why: "margin gone, fortune voice; rueful irony, laughing with the trader; 13 words, one breath; 'perfect, one trade too late' inverts the praise; formal claim broken by the closer",
  },
  {
    id: "C7",
    title: "Hindsight",
    line: "You will be rich again, in hindsight, which pays nothing and arrives daily.",
    scores: [1, 2, 2, 2, 2],
    why: "loss only implied (rich again = not rich now), no trader or loss named; warm and rueful; 13 words, one breath; 'pays nothing and arrives daily' is a fresh turn on hindsight; oracular opening broken by the punchline",
  },
  // Pass 2 challengers (C8-C10).
  {
    id: "C8",
    title: "Bottom of the Wallet",
    line: "You will find, at the bottom of your wallet, a joke worth more than the coins.",
    scores: [2, 2, 2, 2, 2],
    why: "wallet + coins, fortune voice; warm, the joke outvalues the loss; 16 words, one breath; the punchline is the joke itself, last word 'coins'; oracular opening broken by 'a joke'",
  },
  {
    id: "C9",
    title: "Funnier at Parties",
    line: "You will rise again, slightly poorer and considerably funnier at parties.",
    scores: [1, 2, 2, 2, 2],
    why: "loss only implied (slightly poorer), no trader or trade named; warm, a gentle laugh; 11 words, one breath; money traded for humour, last word 'parties' surprises; oracular opening broken by the closer",
  },
  {
    id: "C10",
    title: "Late Stars",
    line: "The stars say hold; your liquidation says the stars were late.",
    scores: [2, 2, 2, 2, 2],
    why: "liquidation named outright + hold/stars; rueful, the stars take the blame; 11 words, one breath; 'the stars were late' is a fresh turn, last word 'late'; oracular opening broken by the loss talking back",
  },
];

function total(c: Candidate): number {
  return c.scores.reduce((sum, s, i) => sum + s * WEIGHTS[i], 0);
}

function charCount(s: string): number {
  return [...s].length;
}

function byteCount(s: string): number {
  return Buffer.byteLength(s, "utf8");
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).length;
}

// Gate + shape validation. Throws on any failure (fail loudly).
function validate(text: string, label: string): void {
  const chars = charCount(text);
  if (chars < 1 || chars > 160) {
    throw new Error(`${label}: ${chars} chars, gate requires 1-160`);
  }
  if (text.trim().length === 0) {
    throw new Error(`${label}: only white space`);
  }
  if (text.includes("\n")) {
    throw new Error(`${label}: more than one line, gate shape requires exactly one line`);
  }
  const words = wordCount(text);
  if (words > 20) {
    throw new Error(`${label}: ${words} words, brief allows at most 20`);
  }
}

function main(): void {
  // Every candidate must pass the gate on its own; a broken candidate is a bug.
  for (const c of CANDIDATES) validate(c.line, c.id);

  // Score every candidate, print the table, pick the winner.
  const ranked = [...CANDIDATES]
    .map((c) => ({ c, total: total(c), bytes: byteCount(c.line) }))
    .sort((a, b) => b.total - a.total || a.bytes - b.bytes || (a.c.id < b.c.id ? -1 : 1));
  console.log("candidate | title            | C1 C2 C3 C4 C5 | total/30 | bytes | chars | words");
  for (const { c, total: t, bytes } of ranked) {
    console.log(
      `${c.id.padEnd(9)} | ${c.title.padEnd(16)} | ${c.scores.join("  ")} | ${String(t).padStart(5)}    | ${String(bytes).padStart(5)} | ${charCount(c.line)} | ${wordCount(c.line)}`,
    );
  }
  for (const { c } of ranked) console.log(`${c.id} ${c.title}: ${c.why}`);
  const winner = ranked[0];
  console.log(`winner: ${winner.c.id} "${winner.c.title}" total ${winner.total}/30, ${winner.bytes} bytes`);

  const text = winner.c.line;
  validate(text, "winner");
  const outDir = process.env.OUTPUT_DIR ?? "/output";
  const outPath = `${outDir}/entry.txt`;
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, text, "utf8");

  // Re-read and verify: byte-identical to the chosen entry, gate still passes.
  const back = readFileSync(outPath);
  if (!back.equals(Buffer.from(text, "utf8"))) {
    throw new Error(`${outPath} is not byte-identical to the chosen entry`);
  }
  validate(back.toString("utf8"), "re-read");
  console.log(`wrote ${outPath}: ${winner.bytes} bytes, ${charCount(text)} chars, ${wordCount(text)} words, gate OK`);
  console.log("--- entry ---");
  console.log(text);
}

main();
