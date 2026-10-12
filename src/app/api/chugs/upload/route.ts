import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { league } from "@/config/league";
import { CHUG_CONTENT_TYPES, CHUG_MAX_BYTES, chugToken, parseChugPathname } from "@/lib/chugs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = chugToken();
  if (!token) return NextResponse.json({ error: "Chug store is not configured." }, { status: 500 });
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      token,
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const expected = process.env.LEAGUE_PASSCODE;
        const given = clientPayload ? (JSON.parse(clientPayload) as { passcode?: string }).passcode : undefined;
        if (!expected || given?.trim() !== expected) throw new Error("Wrong passcode.");
        const ref = parseChugPathname(pathname);
        if (!ref || ref.season !== league.season || !league.teams[ref.teamId] || ref.week < 1 || ref.week > 18) {
          throw new Error("That upload does not look like a chug video.");
        }
        return {
          allowedContentTypes: CHUG_CONTENT_TYPES,
          maximumSizeInBytes: CHUG_MAX_BYTES,
          addRandomSuffix: true,
          validUntil: Date.now() + 60 * 60 * 1000,
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message === "Wrong passcode." ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
