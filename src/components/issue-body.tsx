import ReactMarkdown from "react-markdown";

export function IssueBody({ markdown }: { markdown: string }) {
  return (
    <div className="issue-body">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}
