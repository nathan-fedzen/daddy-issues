import { unstable_cache } from "next/cache";
import { PICKS_TAG, pickStoreFromEnv, type PickSheet } from "./store";

// Same shape as the issue and letter queries: cached against Blob, live
// against the file store. Submitting a ballot revalidates the tag.
export const listPicks: (season: number) => Promise<PickSheet[]> = process.env.BLOB_READ_WRITE_TOKEN
  ? unstable_cache((season: number) => pickStoreFromEnv().list(season), ["picks-list"], {
      tags: [PICKS_TAG],
      revalidate: 300,
    })
  : (season) => pickStoreFromEnv().list(season);
