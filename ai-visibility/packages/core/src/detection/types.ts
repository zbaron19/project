// Contracts for mention/citation detection (the hard part — see mention.ts).

export interface Business {
  name: string; // "Joe's Plumbing LLC"
  website?: string; // "joesplumbing.com"
  city?: string;
}

export interface MentionFinding {
  engine: string;
  prompt: string;
  named: boolean; // business name appeared in answer text
  cited: boolean; // business website appeared in citations
  competitorsCited: string[]; // other domains cited (intel for the user)
  confidence: number; // 0–1, how sure we are `named` is real
}
