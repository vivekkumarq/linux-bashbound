/**
 * Step-by-step flows rendered by <FlowDiagram>.
 *
 * Content lives here rather than inside the component so a new "under the
 * hood" explainer is a data entry, not a new React file.
 */

export interface FlowStep {
  id: string;
  label: string;
  /** One line shown under the label in the rail. */
  caption: string;
  /** The full explanation, revealed when the step is selected. */
  detail: string;
  /** Optional command or code that belongs to this step. */
  code?: string;
}

export interface Flow {
  id: string;
  title: string;
  intro: string;
  steps: FlowStep[];
  /** Shown under the diagram — the point the flow is making. */
  takeaway: string;
}

export const flows: Record<string, Flow> = {
  "ls-execution": {
    id: "ls-execution",
    title: "What happens when you type ls",
    intro:
      "Six layers sit between your keystroke and the list of filenames. Every one of them can be the reason a command fails.",
    takeaway:
      "Nothing in this chain is magic, and each layer fails differently: “command not found” is the shell, “permission denied” is the kernel, and an empty listing is the filesystem telling the truth.",
    steps: [
      {
        id: "you",
        label: "You",
        caption: "press Enter",
        detail:
          "The terminal emulator receives the keystrokes and hands the finished line to the shell over a pseudo-terminal. The terminal draws characters; it does not understand commands.",
      },
      {
        id: "shell",
        label: "Bash",
        caption: "parse, expand, resolve",
        detail:
          "The shell splits the line into words, applies expansions (globs, variables, quotes), then looks for the program. It checks builtins and aliases first, then walks PATH directory by directory. Failure here is “command not found” — the kernel was never involved.",
        code: "type -a ls",
      },
      {
        id: "fork",
        label: "fork + execve",
        caption: "become the program",
        detail:
          "Bash clones itself with fork(), and the child calls execve() to replace its memory image with /usr/bin/ls. The parent shell waits. This is why a command cannot change your shell's working directory — it is a different process.",
        code: "strace -f -e trace=execve ls",
      },
      {
        id: "syscall",
        label: "System calls",
        caption: "openat, getdents64",
        detail:
          "ls asks the kernel to open the directory and read its entries with getdents64(), then stat()s each one for the details -l prints. Each call crosses from user mode into kernel mode and back.",
        code: "strace -e trace=openat,getdents64 ls",
      },
      {
        id: "vfs",
        label: "Kernel VFS",
        caption: "permission check, dispatch",
        detail:
          "The virtual filesystem layer checks your credentials against the directory's mode bits — this is where “Permission denied” is decided — then dispatches to the specific filesystem driver (ext4, XFS, Btrfs, overlayfs).",
      },
      {
        id: "storage",
        label: "Filesystem",
        caption: "directory entries",
        detail:
          "The driver reads directory entries, usually from the page cache rather than the disk. Each entry is a name plus an inode number; the metadata ls prints lives in the inode, not in the name.",
        code: "ls -li",
      },
      {
        id: "out",
        label: "Your terminal",
        caption: "bytes on fd 1",
        detail:
          "ls writes to file descriptor 1. If that is a terminal it columnises and may colourise; if it is a pipe it writes one name per line instead. That is why `ls | cat` looks different from `ls`.",
        code: "ls | cat",
      },
    ],
  },

  "dns-request": {
    id: "dns-request",
    title: "What happens when you open a URL",
    intro:
      "A single request touches name resolution, routing, a TCP handshake, a TLS handshake and only then HTTP. Knowing the order tells you which tool to reach for.",
    takeaway:
      "Work the layers in order. ping proves routing, dig proves resolution, `openssl s_client` proves TLS, curl proves HTTP — each one clears a layer so the next failure is unambiguous.",
    steps: [
      {
        id: "resolve",
        label: "Name resolution",
        caption: "nsswitch, /etc/hosts, DNS",
        detail:
          "glibc consults /etc/nsswitch.conf, which usually checks /etc/hosts before DNS. On systemd hosts the query often goes to systemd-resolved on 127.0.0.53 rather than straight to the nameserver in /etc/resolv.conf. Note that dig bypasses nsswitch entirely, which is why dig can succeed while the application still fails.",
        code: "resolvectl query example.com",
      },
      {
        id: "route",
        label: "Routing decision",
        caption: "which interface, which gateway",
        detail:
          "The kernel picks a route by longest prefix match, then source address and metric. `ip route get` asks it to show the decision it would make for one destination instead of making you read the whole table.",
        code: "ip route get 93.184.216.34",
      },
      {
        id: "tcp",
        label: "TCP handshake",
        caption: "SYN, SYN-ACK, ACK",
        detail:
          "Three packets establish the connection. A hang here means a firewall is dropping (rather than rejecting) traffic; an immediate “connection refused” means the host answered with RST — it is reachable but nothing is listening on that port.",
        code: "ss -tan state syn-sent",
      },
      {
        id: "tls",
        label: "TLS handshake",
        caption: "certificate, cipher, SNI",
        detail:
          "The client sends the hostname in SNI, the server presents a certificate chain, and both agree a cipher. Certificate errors, clock skew and a missing intermediate all fail here — after TCP succeeded, which is why curl can report a TLS error on a port that is clearly open.",
        code: "openssl s_client -connect example.com:443 -servername example.com",
      },
      {
        id: "http",
        label: "HTTP request",
        caption: "method, headers, body",
        detail:
          "Only now does an HTTP verb travel. A 502 or 504 here is the server's own upstream problem, not a network one — the connection plainly worked or you would not have a status code at all.",
        code: "curl -sS -o /dev/null -w '%{http_code} %{time_total}s\\n' https://example.com",
      },
    ],
  },

  "process-lifecycle": {
    id: "process-lifecycle",
    title: "The life of a process",
    intro:
      "Every process on the machine except PID 1 was created by this sequence, and every one of them ends by being collected by its parent.",
    takeaway:
      "A zombie is not a running process — it is an exit status nobody has collected. The fix is always the parent, never a bigger signal.",
    steps: [
      {
        id: "fork",
        label: "fork()",
        caption: "one process becomes two",
        detail:
          "The kernel duplicates the calling process. Both continue from the same line; fork() returns 0 in the child and the child's PID in the parent. Memory is shared copy-on-write, so the duplication is cheap until one side writes.",
        code: "ps -ef --forest | head",
      },
      {
        id: "exec",
        label: "execve()",
        caption: "replace the program",
        detail:
          "The child replaces its memory image with a new program, keeping its PID and its open file descriptors. That descriptor inheritance is exactly how the shell wires up redirection and pipes before the program even starts.",
      },
      {
        id: "run",
        label: "Running",
        caption: "R, S, D, T",
        detail:
          "R is runnable, S is an interruptible sleep (most idle processes), D is an uninterruptible sleep — usually blocked on storage, and the reason a process can ignore even SIGKILL — and T is stopped.",
        code: "ps -eo pid,stat,comm | awk '$2 ~ /^D/'",
      },
      {
        id: "signal",
        label: "Signals",
        caption: "TERM, INT, KILL",
        detail:
          "SIGTERM asks a process to shut down and can be handled, which is how services flush state. SIGKILL and SIGSTOP are enforced by the kernel and never reach the process, so no cleanup runs.",
        code: "kill -TERM 4821",
      },
      {
        id: "exit",
        label: "exit()",
        caption: "becomes a zombie",
        detail:
          "The process releases its memory and descriptors but its entry stays in the process table holding the exit status. In ps this is state Z. It consumes a PID slot and nothing else.",
      },
      {
        id: "wait",
        label: "wait()",
        caption: "parent reaps it",
        detail:
          "The parent collects the status and the entry disappears. If the parent exited first, the child was re-parented to PID 1 (or the nearest subreaper), which reaps it automatically — that is why orphans are harmless and zombies are a bug in the parent.",
        code: "ps -eo pid,ppid,stat,comm | awk '$3 ~ /Z/'",
      },
    ],
  },

  "pipe-flow": {
    id: "pipe-flow",
    title: "How a pipeline is wired",
    intro:
      "A pipe is a kernel buffer with two ends. The shell builds the plumbing before any of the programs start running.",
    takeaway:
      "Every stage starts at the same time and they run concurrently — a pipeline is not a sequence of completed steps, which is why `head` can stop a long-running producer early.",
    steps: [
      {
        id: "pipe",
        label: "pipe()",
        caption: "kernel buffer, two fds",
        detail:
          "The shell asks the kernel for a pipe and gets back a read end and a write end. The buffer is typically 64 KB; when it fills, the writer blocks until the reader drains it. That back-pressure is the whole flow-control mechanism.",
      },
      {
        id: "wire",
        label: "dup2()",
        caption: "rewire stdout and stdin",
        detail:
          "In each forked child the shell points fd 1 of the left-hand command at the write end and fd 0 of the right-hand command at the read end, then closes the originals. The programs themselves know nothing about pipes — they just read stdin and write stdout.",
      },
      {
        id: "run",
        label: "Both run at once",
        caption: "concurrently, not in turn",
        detail:
          "All stages are started together. `grep` begins matching while `cat` is still reading. This is why `yes | head -1` terminates instead of running forever.",
        code: "ps -f | cat",
      },
      {
        id: "stderr",
        label: "stderr bypasses it",
        caption: "fd 2 is untouched",
        detail:
          "A pipe only moves fd 1. Errors still go straight to the terminal, which is why `make | grep error` can show nothing while errors scroll past. Merge them with 2>&1 placed after the redirection you want it to follow.",
        code: "make 2>&1 | grep -i error",
      },
      {
        id: "status",
        label: "Exit status",
        caption: "the last one wins",
        detail:
          "A pipeline reports only the final command's status, so `false | true` succeeds. `set -o pipefail` makes it report the first failure instead, and ${PIPESTATUS[@]} holds every stage's status in bash.",
        code: "set -o pipefail",
      },
    ],
  },
};

export const flowIds = Object.keys(flows);
