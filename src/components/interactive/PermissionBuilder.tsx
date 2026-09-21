import { useMemo, useState } from "react";

/**
 * Interactive permission explainer.
 *
 * Toggle any bit and the mode string, the octal value and the chmod command
 * all update together — the point is to make the three representations
 * visibly the same thing rather than three facts to memorise separately.
 */

type Who = "owner" | "group" | "other";
type Bit = "r" | "w" | "x";

const WHO: { id: Who; label: string; symbol: string }[] = [
  { id: "owner", label: "Owner", symbol: "u" },
  { id: "group", label: "Group", symbol: "g" },
  { id: "other", label: "Others", symbol: "o" },
];

const BITS: { id: Bit; label: string; value: number }[] = [
  { id: "r", label: "read", value: 4 },
  { id: "w", label: "write", value: 2 },
  { id: "x", label: "execute", value: 1 },
];

const FILE_MEANING: Record<Bit, string> = {
  r: "Open the file and read its contents.",
  w: "Modify the file's contents. Note that deleting it depends on the directory, not the file.",
  x: "Run the file as a program. For a script the interpreter on the shebang line must also be readable.",
};

const DIR_MEANING: Record<Bit, string> = {
  r: "List the names inside the directory. Without x you can see names but not stat or open them.",
  w: "Create, rename and delete entries inside the directory — this is what controls deletion.",
  x: "Traverse into the directory and access a known path through it. Also called the search bit.",
};

const SPECIAL = [
  {
    id: "setuid" as const,
    octal: 0o4000,
    label: "setuid",
    body: "On an executable, the process runs as the file's owner rather than the caller. This is how passwd can write to /etc/shadow. Ignored on directories on Linux, and ignored on scripts.",
  },
  {
    id: "setgid" as const,
    octal: 0o2000,
    label: "setgid",
    body: "On an executable, run with the file's group. On a directory, new entries inherit the directory's group — the usual way to make a shared project folder work.",
  },
  {
    id: "sticky" as const,
    octal: 0o1000,
    label: "sticky",
    body: "On a world-writable directory such as /tmp, only a file's owner (or root) may delete it. Without this, any user could remove any other user's files.",
  },
];

type Perms = Record<Who, Record<Bit, boolean>>;

const START: Perms = {
  owner: { r: true, w: true, x: true },
  group: { r: true, w: false, x: true },
  other: { r: true, w: false, x: false },
};

export function PermissionBuilder() {
  const [perms, setPerms] = useState<Perms>(START);
  const [isDir, setIsDir] = useState(false);
  const [special, setSpecial] = useState({ setuid: false, setgid: false, sticky: false });
  const [selected, setSelected] = useState<{ who: Who; bit: Bit } | null>(null);
  const [copied, setCopied] = useState(false);

  const octal = useMemo(() => {
    const digits = WHO.map(({ id }) => BITS.reduce((sum, b) => sum + (perms[id][b.id] ? b.value : 0), 0)).join("");
    const head = (special.setuid ? 4 : 0) + (special.setgid ? 2 : 0) + (special.sticky ? 1 : 0);
    return head ? `${head}${digits}` : digits;
  }, [perms, special]);

  // The ls -l string, including the way special bits replace the execute
  // character (and uppercase it when execute is absent).
  const modeString = useMemo(() => {
    const chars: string[] = WHO.flatMap(({ id }) => BITS.map((b) => (perms[id][b.id] ? b.id : "-")));
    if (special.setuid) chars[2] = perms.owner.x ? "s" : "S";
    if (special.setgid) chars[5] = perms.group.x ? "s" : "S";
    if (special.sticky) chars[8] = perms.other.x ? "t" : "T";
    return (isDir ? "d" : "-") + chars.join("");
  }, [perms, special, isDir]);

  const target = isDir ? "project/" : "deploy.sh";
  const command = `chmod ${octal} ${target}`;

  function toggle(who: Who, bit: Bit) {
    setPerms((p) => ({ ...p, [who]: { ...p[who], [bit]: !p[who][bit] } }));
    setSelected({ who, bit });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  const meaning = isDir ? DIR_MEANING : FILE_MEANING;
  const risky = perms.other.w;

  return (
    <section className="perm-builder" aria-label="Interactive permission builder">
      <header className="pb-head">
        <div>
          <p className="kicker">Interactive</p>
          <h3>Build a permission</h3>
        </div>
        <div className="pb-type" role="group" aria-label="Target type">
          <button type="button" aria-pressed={!isDir} onClick={() => setIsDir(false)}>
            File
          </button>
          <button type="button" aria-pressed={isDir} onClick={() => setIsDir(true)}>
            Directory
          </button>
        </div>
      </header>

      {/* The mode string, character by character. Each cell is the same state
          as the checkbox grid below it. */}
      <div className="pb-string" aria-hidden="true">
        {modeString.split("").map((ch, i) => (
          <span key={i} className={`pb-char${ch === "-" ? " is-off" : ""}${i === 0 ? " is-type" : ""}`}>
            {ch}
          </span>
        ))}
        <span className="pb-octal">{octal}</span>
      </div>

      <div className="pb-grid">
        {WHO.map((who) => (
          <div key={who.id} className="pb-col">
            <p className="pb-col-head">
              {who.label} <code>{who.symbol}</code>
            </p>
            {BITS.map((bit) => {
              const on = perms[who.id][bit.id];
              const isSelected = selected?.who === who.id && selected?.bit === bit.id;
              return (
                <button
                  key={bit.id}
                  type="button"
                  className={`pb-bit${on ? " is-on" : ""}${isSelected ? " is-selected" : ""}`}
                  aria-pressed={on}
                  onClick={() => toggle(who.id, bit.id)}
                >
                  <span className="pb-bit-letter">{bit.id}</span>
                  <span className="pb-bit-label">{bit.label}</span>
                  <span className="pb-bit-value">{on ? bit.value : 0}</span>
                </button>
              );
            })}
            <p className="pb-col-total">
              = {BITS.reduce((sum, b) => sum + (perms[who.id][b.id] ? b.value : 0), 0)}
            </p>
          </div>
        ))}
      </div>

      <div className="pb-special" role="group" aria-label="Special bits">
        {SPECIAL.map((s) => (
          <label key={s.id} className={`pb-chip${special[s.id] ? " is-on" : ""}`}>
            <input
              type="checkbox"
              checked={special[s.id]}
              onChange={() => setSpecial((v) => ({ ...v, [s.id]: !v[s.id] }))}
            />
            {s.label}
          </label>
        ))}
      </div>

      <div className="pb-explain" aria-live="polite">
        {selected ? (
          <p>
            <strong>
              {WHO.find((w) => w.id === selected.who)?.label} · {selected.bit}
            </strong>{" "}
            on a {isDir ? "directory" : "file"}: {meaning[selected.bit]}
          </p>
        ) : (
          <p className="muted">Click any bit above to see exactly what it permits on a {isDir ? "directory" : "file"}.</p>
        )}

        {SPECIAL.filter((s) => special[s.id]).map((s) => (
          <p key={s.id}>
            <strong>{s.label}:</strong> {s.body}
          </p>
        ))}
      </div>

      {risky ? (
        <p className="callout danger pb-warning">
          World-writable. Any account on the host can modify this {isDir ? "directory" : "file"}. If a service cannot
          read something, fix the owner or group instead of widening permissions to everyone.
        </p>
      ) : null}

      <div className="pb-command">
        <code>{command}</code>
        <button type="button" className="btn btn-ghost btn-compact" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <p className="muted pb-foot">
        Equivalent symbolic form:{" "}
        <code>
          chmod {WHO.map((w) => `${w.symbol}=${BITS.filter((b) => perms[w.id][b.id]).map((b) => b.id).join("") || "-"}`).join(",")}{" "}
          {target}
        </code>
      </p>
    </section>
  );
}
