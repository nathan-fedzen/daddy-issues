import Anthropic from "@anthropic-ai/sdk";
import type { Facts } from "@/lib/facts";
import { systemPrompt, userPrompt } from "./prompt";

export interface Draft {
  headline: string;
  markdown: string;
  model: string;
}

export interface Writer {
  write(facts: Facts): Promise<Draft>;
}

const DEFAULT_MODEL = "claude-opus-5";

export class ClaudeWriter implements Writer {
  private readonly client = new Anthropic();
  constructor(private readonly model = process.env.ROAST_MODEL ?? DEFAULT_MODEL) {}

  async write(facts: Facts): Promise<Draft> {
    const message = await this.client.messages
      .stream({
        model: this.model,
        max_tokens: 16000,
        system: [{ type: "text", text: systemPrompt(), cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userPrompt(facts) }],
      })
      .finalMessage();

    if (message.stop_reason === "refusal") {
      throw new Error(`Writer refused: ${message.stop_details?.explanation ?? "no explanation"}`);
    }
    if (message.stop_reason === "max_tokens") {
      throw new Error("Writer hit max_tokens before finishing the issue.");
    }
    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return splitHeadline(text, message.model);
  }
}

// Lets the whole pipeline run without an API key, which is how the facts
// engine and site get exercised locally.
export class StubWriter implements Writer {
  async write(facts: Facts): Promise<Draft> {
    const lines = facts.results.map(
      (r) => `**${r.winner.owner} ${r.winner.points}, ${r.loser.owner} ${r.loser.points}.** Margin ${r.margin}.`,
    );
    return splitHeadline(`# Week ${facts.week} stub issue\n\n## Scoreboard\n\n${lines.join("\n\n")}`, "stub");
  }
}

export function splitHeadline(markdown: string, model: string): Draft {
  const match = markdown.match(/^#\s+(.+)$/m);
  const headline = match?.[1]?.trim() ?? `Week issue`;
  const body = match ? markdown.replace(match[0], "").trim() : markdown;
  return { headline, markdown: body, model };
}

export function writerFromEnv(): Writer {
  return process.env.ROAST_WRITER === "stub" ? new StubWriter() : new ClaudeWriter();
}
