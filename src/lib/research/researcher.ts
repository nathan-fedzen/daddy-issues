import Anthropic from "@anthropic-ai/sdk";
import type { Facts, ResearchNote } from "@/lib/facts";
import { DEFAULT_MODEL } from "@/lib/writer/writer";
import { researchLeads, type Lead } from "./leads";

export interface Researcher {
  research(facts: Facts): Promise<ResearchNote[]>;
}

// Leads are researched in parallel batches so the cron stays inside its
// window; each batch is one conversation with its own search budget.
const LEADS_PER_BATCH = 8;
const SEARCHES_PER_BATCH = 12;
// A web-search turn can stop with pause_turn before the model is done; the
// conversation is resumed with the partial content appended.
const MAX_TURNS = 6;

const SYSTEM = `You are the research desk for a fantasy football newsletter. The writer gets ESPN fantasy points and nothing else, so he cannot tell a player who was inactive from one who got hurt on the first snap, or a benching from a blowout. Your job is to find out what actually happened in each lead's NFL game and report it plainly.

For every lead, search the web and establish:
- Did he play? If he left early, when and why. If he was inactive, why (injury, suspension, healthy scratch, bye week).
- If he got hurt: the injury, when in the game it happened, and the reported timeline.
- Why the number was what it was: game script, blowout, weather, benching, snap or target share, a backup taking over, a goal-line vulture, a garbage-time score.
- Anything a group chat would bring up: a drop, a fumble, a missed kick, a coach quote.

Rules:
- Facts only, from what you find. If you cannot confirm something, write "unconfirmed" rather than guess.
- Concrete and short: two or three sentences per lead, with the numbers (snaps, targets, yards, the quarter he left in).
- Cover every lead. A lead you could not find anything on gets a note saying so.
- The season and week are given. Make sure you are reading about that week's game, not an earlier one.

When you are done, output the notes as a JSON array inside <notes></notes> tags and nothing after it. Each note is {"player": string, "owner": string, "what": string, "source": url string or null}. Copy player and owner exactly as given in the lead.`;

export function researchPrompt(facts: Facts, leads: Lead[]): string {
  return `NFL ${facts.season} season, Week ${facts.week}. This was generated at ${facts.generatedAt}; the games were played in the days before that. Points are ESPN fantasy points; "line" is the ESPN stat line and "played" says whether ESPN recorded him as having played.

LEADS
${JSON.stringify(leads, null, 1)}`;
}

export class ClaudeResearcher implements Researcher {
  private readonly client = new Anthropic();
  constructor(
    private readonly model = process.env.ROAST_RESEARCH_MODEL ?? process.env.ROAST_MODEL ?? DEFAULT_MODEL,
  ) {}

  async research(facts: Facts): Promise<ResearchNote[]> {
    const leads = researchLeads(facts);
    const batches: Lead[][] = [];
    for (let i = 0; i < leads.length; i += LEADS_PER_BATCH) batches.push(leads.slice(i, i + LEADS_PER_BATCH));
    const notes = await Promise.all(batches.map((batch) => this.researchBatch(facts, batch)));
    return notes.flat();
  }

  private async researchBatch(facts: Facts, leads: Lead[]): Promise<ResearchNote[]> {
    const messages: Anthropic.MessageParam[] = [{ role: "user", content: researchPrompt(facts, leads) }];
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const message = await this.client.messages
        .stream({
          model: this.model,
          max_tokens: 16000,
          system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
          tools: [{ type: "web_search_20260209", name: "web_search", max_uses: SEARCHES_PER_BATCH }],
          // Search-bound, not reasoning-bound; medium keeps it inside the cron's window.
          output_config: { effort: "medium" },
          messages,
        })
        .finalMessage();

      if (message.stop_reason === "refusal") {
        throw new Error(`Researcher refused: ${message.stop_details?.explanation ?? "no explanation"}`);
      }
      if (message.stop_reason === "max_tokens") {
        throw new Error("Researcher hit max_tokens before finishing.");
      }
      if (message.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: message.content });
        continue;
      }
      const text = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      const notes = parseNotes(text);
      if (notes.length === 0) throw new Error(`Researcher returned no notes for ${leads.map((l) => l.player).join(", ")}.`);
      return notes;
    }
    throw new Error(`Researcher did not finish within ${MAX_TURNS} turns.`);
  }
}

// Runs the pipeline without an API key or a web search per lead.
export class StubResearcher implements Researcher {
  async research(facts: Facts): Promise<ResearchNote[]> {
    return researchLeads(facts).map((l) => ({
      player: l.player,
      owner: l.owner,
      what: `Stub research (${l.reasons.join(", ")}).`,
    }));
  }
}

function isNote(value: unknown): value is { player: string; owner: string; what: string; source?: unknown } {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.player === "string" && typeof v.owner === "string" && typeof v.what === "string";
}

export function parseNotes(text: string): ResearchNote[] {
  const tagged = text.match(/<notes>([\s\S]*?)<\/notes>/i)?.[1];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1];
  const raw = tagged ?? fenced ?? text;
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start < 0 || end <= start) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isNote).map((n) => ({
    player: n.player.trim(),
    owner: n.owner.trim(),
    what: n.what.trim(),
    ...(typeof n.source === "string" && n.source.trim() ? { source: n.source.trim() } : {}),
  }));
}

export function researcherFromEnv(): Researcher | null {
  if (process.env.ROAST_RESEARCH === "off") return null;
  return process.env.ROAST_WRITER === "stub" ? new StubResearcher() : new ClaudeResearcher();
}
