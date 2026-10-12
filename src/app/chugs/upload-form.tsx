"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { chugPathname, extensionFor } from "@/lib/chugs";

interface Props {
  season: number;
  teams: { teamId: string; owner: string }[];
  defaultWeek: number;
}

const field = "block w-full border-2 border-ink bg-paper px-3 py-2 text-base";
const label = "block pb-1 text-sm font-medium text-steel";

export function UploadForm({ season, teams, defaultWeek }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [teamId, setTeamId] = useState(teams[0]?.teamId ?? "");
  const [week, setWeek] = useState(defaultWeek);
  const [passcode, setPasscode] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Pick a video first.");
      return;
    }
    setProgress(0);
    try {
      await upload(chugPathname(season, week, teamId, extensionFor(file)), file, {
        access: "public",
        handleUploadUrl: "/api/chugs/upload",
        clientPayload: JSON.stringify({ passcode }),
        multipart: true,
        onUploadProgress: (p) => setProgress(p.percentage),
      });
      setDone(true);
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      setProgress(null);
      setError(err instanceof Error ? err.message.replace(/^Vercel Blob: /, "") : "Upload failed.");
    }
  }

  return (
    <form onSubmit={submit} className="border-2 border-ink p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="chug-team" className={label}>
            Who chugged
          </label>
          <select id="chug-team" className={field} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            {teams.map((t) => (
              <option key={t.teamId} value={t.teamId}>
                {t.owner}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="chug-week" className={label}>
            For week
          </label>
          <select id="chug-week" className={field} value={week} onChange={(e) => setWeek(Number(e.target.value))}>
            {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="chug-pass" className={label}>
            League passcode
          </label>
          <input
            id="chug-pass"
            className={field}
            type="password"
            autoComplete="off"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="chug-file" className={label}>
            The video
          </label>
          <input id="chug-file" ref={fileRef} className={`${field} file:mr-3 file:border-0 file:bg-ink file:px-3 file:py-1 file:text-paper`} type="file" accept="video/*" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={progress !== null}
          className="border-2 border-orange bg-orange px-4 py-2 font-display text-lg font-bold text-paper hover:border-ink hover:bg-ink disabled:opacity-60"
        >
          {progress === null ? "Upload the evidence" : `Uploading ${Math.round(progress)}%`}
        </button>
        {progress !== null && (
          <span className="h-2 grow bg-mist" aria-hidden>
            <span className="block h-2 bg-orange" style={{ width: `${progress}%` }} />
          </span>
        )}
        {done && <span className="text-sm font-medium">Posted. The chat has been notified in spirit.</span>}
        {error && <span className="text-sm font-medium text-orange">{error}</span>}
      </div>
    </form>
  );
}
