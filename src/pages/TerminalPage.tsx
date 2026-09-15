import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Terminal } from "../components/Terminal";
import { usePalette } from "../lib/paletteContext";

export function TerminalPage() {
  const [params] = useSearchParams();
  const cmd = params.get("cmd");
  const pal = usePalette();
  useEffect(() => {
    document.title = "Simulation Terminal · Linux BashBound";
  }, []);
  return (
    <div>
      <p className="kicker">Interactive terminal</p>
      <h1>Simulation Mode</h1>
      <p className="muted">
        In-browser lab filesystem. Type <code>help</code>. Nothing runs on the host. Press Ctrl+` from any page.
      </p>
      <div className="row" style={{ margin: "12px 0 16px" }}>
        <button type="button" className="btn btn-primary" onClick={() => pal.openBash(cmd || "help")}>
          Open live palette
        </button>
      </div>
      <Terminal seed={cmd || undefined} />
    </div>
  );
}
