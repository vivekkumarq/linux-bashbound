import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Terminal } from "../components/Terminal";

export function TerminalPage() {
  const [params] = useSearchParams();
  const cmd = params.get("cmd");
  useEffect(() => {
    document.title = "Simulation Terminal · Linux BashBound";
  }, []);
  return (
    <div>
      <p className="kicker">Interactive terminal</p>
      <h1>Simulation Mode</h1>
      <p className="muted">
        Frontend-only filesystem. Type help. Reset anytime. Suggested from explorer: {cmd || "ls -l"}
      </p>
      <Terminal />
    </div>
  );
}
