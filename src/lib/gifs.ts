const CUE = /^\{\{\s*gif:\s*(.+?)\s*\}\}\s*$/gm;
const MAX_GIFS = 3;

export interface GifHit {
  url: string;
  title: string;
}

export type GifSearch = (phrase: string) => Promise<GifHit[]>;

export function giphySearch(apiKey: string): GifSearch {
  return async (phrase) => {
    const params = new URLSearchParams({
      api_key: apiKey,
      q: phrase,
      limit: "10",
      rating: "pg-13",
      lang: "en",
    });
    const res = await fetch(`https://api.giphy.com/v1/gifs/search?${params}`);
    if (!res.ok) throw new Error(`Giphy ${res.status} for "${phrase}"`);
    const data = (await res.json()) as {
      data: { title: string; images: { downsized_medium?: { url: string }; original: { url: string } } }[];
    };
    return data.data.map((g) => ({
      url: g.images.downsized_medium?.url ?? g.images.original.url,
      title: g.title,
    }));
  };
}

export function gifCues(markdown: string): string[] {
  return [...markdown.matchAll(CUE)].map((m) => m[1]);
}

// Picks a stable result per (seed, phrase) so regenerating the page never
// swaps the GIF; the seed is the issue's season+week.
function pick<T>(items: T[], seed: string): T | undefined {
  if (items.length === 0) return undefined;
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return items[h % items.length];
}

const STOPWORDS = new Set([
  "a", "an", "the", "into", "over", "at", "of", "in", "on", "up", "off", "to", "with", "and",
  "guy", "girl", "man", "woman", "person", "someone", "blankly", "slowly", "very",
]);

// Giphy ANDs every term, so a five-word phrase usually matches nothing.
// Try the phrase, then it minus filler words, then its first two words.
export function queryLadder(phrase: string): string[] {
  const words = phrase.toLowerCase().split(/\s+/).filter(Boolean);
  const content = words.filter((w) => !STOPWORDS.has(w));
  const candidates = [words.join(" "), content.join(" "), content.slice(0, 2).join(" "), content[0] ?? ""];
  return [...new Set(candidates.filter(Boolean))];
}

export async function resolveGifs(
  markdown: string,
  seed: string,
  search: GifSearch | null,
): Promise<string> {
  let used = 0;
  const cues = [...markdown.matchAll(CUE)];
  let out = markdown;
  for (const cue of cues) {
    const phrase = cue[1];
    let replacement = "";
    if (search && used < MAX_GIFS) {
      try {
        let hits: GifHit[] = [];
        for (const q of queryLadder(phrase)) {
          hits = await search(q);
          if (hits.length > 0) break;
        }
        const hit = pick(hits, `${seed}:${phrase}`);
        if (hit) {
          replacement = `![${hit.title || phrase}](${hit.url})`;
          used++;
        }
      } catch (err) {
        console.warn(`gif lookup failed for "${phrase}": ${err instanceof Error ? err.message : err}`);
      }
    }
    out = out.replace(cue[0], replacement);
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

export function gifSearchFromEnv(): GifSearch | null {
  const key = process.env.GIPHY_API_KEY;
  return key ? giphySearch(key) : null;
}
