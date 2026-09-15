import { useState } from "react";

const layers = [
  { id: "apps", title: "Applications", text: "Editors, servers, browsers, your scripts. They run in user space." },
  { id: "shell", title: "Shell", text: "Bash/Zsh parse command lines and start processes. Still a user program." },
  { id: "libc", title: "System calls (via libc)", text: "open, read, write, fork, execve, mmap, socket… the contract with the kernel." },
  { id: "kernel", title: "Linux kernel", text: "Scheduler, VM, VFS, networking, drivers. Privileged." },
  { id: "hw", title: "Hardware", text: "CPU, RAM, disks, NICs. The kernel owns them." },
];

export function ArchDiagram() {
  const [id, setId] = useState("shell");
  const cur = layers.find((l) => l.id === id)!;
  return (
    <div className="diagram">
      <p className="kicker">Interactive</p>
      <h3>Linux architecture</h3>
      <div className="stack">
        {layers.map((l) => (
          <button key={l.id} className="node" onClick={() => setId(l.id)} aria-pressed={id === l.id}>
            {l.title}
          </button>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 12 }}>
        {cur.text}
      </p>
    </div>
  );
}

export function FdDiagram() {
  return (
    <div className="diagram">
      <h3>Standard file descriptors</h3>
      <div className="grid-3">
        <div className="card">stdin → 0</div>
        <div className="card">stdout → 1</div>
        <div className="card">stderr → 2</div>
      </div>
      <p className="muted">Pipes connect command A stdout to command B stdin. 2&gt;&amp;1 merges stderr onto stdout.</p>
    </div>
  );
}

export function PermDiagram() {
  const [sel, setSel] = useState(0);
  const bits = "-rwxr-xr--".split("");
  const explain = [
    "File type: - regular file, d directory, l symlink.",
    "Owner read",
    "Owner write",
    "Owner execute",
    "Group read",
    "Group write (absent)",
    "Group execute",
    "Others read",
    "Others write (absent)",
    "Others execute (absent)",
  ];
  return (
    <div className="diagram">
      <h3>Permission string</h3>
      <div className="perm-grid">
        {bits.map((b, i) => (
          <button key={i} className={`perm-cell ${sel === i ? "active" : ""}`} onClick={() => setSel(i)}>
            {b}
          </button>
        ))}
      </div>
      <p style={{ marginTop: 12 }}>{explain[sel]}</p>
      <p className="muted">owner | group | others — each triplet is rwx as bits 4 2 1 (7=rwx).</p>
    </div>
  );
}

export function ProcessDiagram() {
  const steps = [
    { t: "fork", d: "Parent clones. Child gets a new PID, copy-on-write memory." },
    { t: "exec", d: "Child replaces its image with ls, grep, nginx, …" },
    { t: "run", d: "Scheduler runs the task. States: R, S, D, T…" },
    { t: "exit", d: "Process exits; becomes Z until the parent wait()s." },
    { t: "reap", d: "Parent collects status. If parent is gone, init/subreaper reaps." },
  ];
  const [i, setI] = useState(0);
  return (
    <div className="diagram">
      <h3>Process lifecycle</h3>
      <div className="row">
        {steps.map((s, idx) => (
          <button key={s.t} className="node" onClick={() => setI(idx)}>
            {s.t}
          </button>
        ))}
      </div>
      <p>{steps[i].d}</p>
    </div>
  );
}

export function TcpDiagram() {
  const steps = [
    { t: "SYN", d: "Client proposes a connection." },
    { t: "SYN-ACK", d: "Server accepts and acknowledges." },
    { t: "ACK", d: "Client acknowledges. ESTABLISHED." },
    { t: "data", d: "Bytes flow both ways with sequence numbers." },
    { t: "FIN/RST", d: "Orderly close or abort. TIME-WAIT may follow." },
  ];
  const [i, setI] = useState(0);
  return (
    <div className="diagram">
      <h3>TCP connection</h3>
      <div className="row">
        {steps.map((s, idx) => (
          <button key={s.t} className="node" onClick={() => setI(idx)}>
            {s.t}
          </button>
        ))}
      </div>
      <p>{steps[i].d}</p>
    </div>
  );
}

export function UnixCompare() {
  const rows = [
    ["History", "Unix lineage from Bell Labs, BSD, SysV", "Unix-like kernel started 1991 by Linus Torvalds"],
    ["Kernel", "Various (XNU, BSD, SysV descendants)", "Linux kernel (GPLv2)"],
    ["Licensing", "Mixed proprietary and BSD-style", "Kernel GPL; userland mixed"],
    ["POSIX", "Many certified UNIX systems", "Strong compatibility, typical distros not UNIX-branded"],
    ["Commands", "Often BSD userland (macOS)", "Often GNU coreutils + systemd"],
    ["Examples", "macOS, FreeBSD, AIX, Solaris", "Debian, RHEL, Ubuntu, Fedora, Arch"],
  ];
  return (
    <div className="diagram">
      <h3>Linux vs Unix</h3>
      <div className="stack">
        {rows.map((r) => (
          <div key={r[0]} className="grid-3">
            <strong>{r[0]}</strong>
            <span className="muted">{r[1]}</span>
            <span>{r[2]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
