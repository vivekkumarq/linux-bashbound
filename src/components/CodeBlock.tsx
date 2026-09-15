import { useState } from "react";

export function CodeBlock({
  code,
  label = "bash",
  onTry,
}: {
  code: string;
  label?: string;
  onTry?: (code: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="codeblock">
      <div className="codeblock-head">
        <span>{label}</span>
        <span className="row">
          {onTry ? (
            <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => onTry(code)}>
              Try in Terminal
            </button>
          ) : null}
          <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </button>
        </span>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}
