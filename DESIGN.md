---
version: alpha
name: Daddy Issues
description: Weekly roast newsletter site for a 14-team fantasy football league, read on phones on Tuesday morning.
colors:
  paper: "#FFFFFF"
  ink: "#000000"
  orange: "#FB4F14"
  navy: "#0C2340"
  steel: "#6E6E73"
  mist: "#E6E6E6"
typography:
  masthead:
    fontFamily: Big Shoulders Display Variable
    fontSize: 11rem
    fontWeight: 900
    lineHeight: 0.8
    letterSpacing: -0.02em
  headline:
    fontFamily: Big Shoulders Display Variable
    fontSize: 3.5rem
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: -0.01em
  section:
    fontFamily: Big Shoulders Display Variable
    fontSize: 2rem
    fontWeight: 700
    lineHeight: 1
  score:
    fontFamily: Big Shoulders Display Variable
    fontSize: 3rem
    fontWeight: 900
    lineHeight: 1
  body:
    fontFamily: Archivo Variable
    fontSize: 1.0625rem
    fontWeight: 400
    lineHeight: 1.6
  meta:
    fontFamily: Archivo Variable
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.4
rounded:
  none: 0px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
components:
  scoreboard:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
  rule-heavy:
    borderColor: "{colors.ink}"
  rule-accent:
    borderColor: "{colors.orange}"
  link:
    textColor: "{colors.orange}"
---

## Overview

A sports-bar back page, not a tech newsletter. The site exists to deliver one long roast a week and make it feel like an event. Two elements are loud: the nameplate at the top and the scoreboard ledger. Everything else is plain black text on white with heavy rules, so the writing carries the page. No cards, no shadows, no rounded corners, no gradients, no dark mode.

## Colors

- **Paper (#FFFFFF)** is the page. Pure white, not cream.
- **Ink (#000000)** is text and structural rules. Pure black, not a tinted near-black.
- **Orange (#FB4F14)** is the only accent, borrowed from Mile High. It marks the issue rule under the nameplate, links, and nothing else.
- **Navy (#0C2340)** appears exactly once per page, as the full-bleed scoreboard band. It is a band, not a theme.
- **Steel (#6E6E73)** carries metadata: dates, captions, small table text.
- **Mist (#E6E6E6)** is the hairline inside tables only.

## Typography

Two families. Big Shoulders Display carries every piece of display type: nameplate, headline, section heads, scores, and table numerals. It is a condensed variable face, so weight does the hierarchy: 900 for the nameplate and scores, 700 for headlines and sections. Archivo carries body and metadata and never appears above 1.0625rem. Numerals use tabular figures everywhere. No all-caps labels except the nameplate itself, which is a nameplate. No eyebrows above headings.

Body measure is 36rem. Section headings sit directly on a 2px ink rule with a short orange tab at the left, so the rule is the hierarchy, not extra spacing.

## Layout

Single column, left-aligned, 42rem container with 20px side padding. The nameplate overflows its container on purpose: it is set at 19vw, cropped by the top edge, and sits on a 4px ink rule. The scoreboard breaks out of the column to full viewport width. Prose returns to the column. The standings table and the archive run at full container width with ruled rows. Section heights vary; nothing is equalized.

## Elevation & Depth

None. Separation is done with rules: 4px ink under the nameplate, 2px ink under section heads, 1px mist between table rows. The navy band is a flat fill.

## Shapes

Everything is square. No border radius anywhere, including buttons on the review page.

## Components

- **Scoreboard row:** winner name top-left, loser name top-right, then two scores side by side. The winner's score is solid white at weight 900; the loser's is hollow (white text-stroke, transparent fill). The matchup's top scorer runs in a steel caption under the scores.
- **Section head:** level-two headings from the issue markdown, Big Shoulders 700 at 2rem, on a 2px rule with a 2rem orange tab.
- **Standings table:** rank, team, record, points, streak, playoff odds. Numerals right-aligned and tabular.
- **Archive list:** week number as a display numeral, headline beside it, date in steel.
- **Review page buttons:** square, 2px ink border, ink fill on hover. Publish is filled orange.

## Do's and Don'ts

- Do let the writing be the page. If a layout idea competes with the prose, drop it.
- Do use the orange sparingly. If more than three orange elements are visible at once, something is wrong.
- Don't add cards, shadows, gradients, icons, badges, or emoji.
- Don't animate anything on load. The only motion is hover and focus states.
- Don't add a dark mode. The navy band is the dark moment.
- Don't center text except inside the scoreboard scores.
