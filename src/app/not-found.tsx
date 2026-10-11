import Link from "next/link";
import { Masthead } from "@/components/masthead";

export default function NotFound() {
  return (
    <>
      <Masthead />
      <main className="mx-auto max-w-[42rem] px-5 py-16">
        <h1 className="font-display text-5xl font-bold leading-none">No issue here.</h1>
        <p className="mt-4 max-w-[36rem]">
          Either that week has not been written up yet or you typed the address the way you set
          your lineup.{" "}
          <Link href="/" className="text-orange underline underline-offset-4">
            Back to the latest issue.
          </Link>
        </p>
      </main>
    </>
  );
}
