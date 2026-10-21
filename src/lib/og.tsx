import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { league } from "@/config/league";
import type { Issue } from "@/lib/issues/store";

export const OG_SIZE = { width: 1200, height: 630 };

const PAPER = "#ffffff";
const INK = "#000000";
const ORANGE = "#fb4f14";
const NAVY = "#0c2340";
const STEEL = "#6e6e73";

async function fonts() {
  const dir = path.join(process.cwd(), "src", "app", "og-fonts");
  const [display, body] = await Promise.all([
    readFile(path.join(dir, "big-shoulders-display-900.ttf")),
    readFile(path.join(dir, "archivo-500.ttf")),
  ]);
  return [
    { name: "Display", data: display, weight: 900 as const, style: "normal" as const },
    { name: "Body", data: body, weight: 500 as const, style: "normal" as const },
  ];
}

function story(issue: Issue) {
  const [r] = issue.facts.results ?? [];
  if (!r) return null;
  return {
    winner: r.winner.owner,
    loser: r.loser.owner,
    winnerPoints: r.winner.points.toFixed(2),
    loserPoints: r.loser.points.toFixed(2),
  };
}

export async function issueCard(issue: Issue | null): Promise<ImageResponse> {
  const name = league.newsletter.name.toUpperCase();
  const lead = issue ? story(issue) : null;
  const headline = issue?.headline ?? league.newsletter.tagline;
  const size = headline.length > 60 ? 56 : headline.length > 36 ? 72 : 92;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: PAPER,
          color: INK,
          fontFamily: "Body",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            background: INK,
            color: PAPER,
            padding: "28px 56px 18px",
          }}
        >
          <div style={{ fontFamily: "Display", fontSize: 128, lineHeight: 0.82, letterSpacing: -3 }}>{name}</div>
        </div>
        <div style={{ display: "flex", height: 6, background: ORANGE, margin: "0 56px" }} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flexGrow: 1,
            padding: "0 56px 40px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Painted after the band and rule so it sits over both, like the site's week tag. */}
            <div style={{ display: "flex", justifyContent: "flex-end", height: 36 }}>
              {issue && (
                <div
                  style={{
                    display: "flex",
                    background: ORANGE,
                    color: PAPER,
                    fontFamily: "Display",
                    fontSize: 44,
                    lineHeight: 1,
                    padding: "12px 20px 8px",
                    marginTop: -34,
                  }}
                >
                  WEEK {issue.week}
                </div>
              )}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 24,
                fontFamily: "Display",
                fontSize: size,
                lineHeight: 0.95,
                letterSpacing: -1,
                maxWidth: 1000,
              }}
            >
              {headline}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            {lead ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 18,
                  background: NAVY,
                  color: PAPER,
                  padding: "14px 24px 10px",
                  fontFamily: "Display",
                  fontSize: 40,
                  lineHeight: 1,
                }}
              >
                <span>{lead.winner}</span>
                <span>{lead.winnerPoints}</span>
                <span style={{ color: ORANGE }}>{lead.loserPoints}</span>
                <span style={{ color: "#9aa3b5" }}>{lead.loser}</span>
              </div>
            ) : (
              <div />
            )}
            <div style={{ display: "flex", fontSize: 22, color: STEEL }}>{league.newsletter.tagline}</div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts() },
  );
}
