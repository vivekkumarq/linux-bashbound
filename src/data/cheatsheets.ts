import type { CheatSheet } from "../types";

export const cheatSheets: CheatSheet[] = [
  {
    slug: "linux-commands",
    title: "Linux command cheat sheet",
    description: "High-frequency commands for navigation, inspection, and files.",
    groups: [
      {
        heading: "Orientation",
        rows: [
          { item: "pwd", meaning: "Print working directory" },
          { item: "ls -lah", meaning: "Long listing, all, human sizes (GNU)" },
          { item: "cd -", meaning: "Previous directory" },
          { item: "man 1 cmd", meaning: "Command manual" },
          { item: "type name", meaning: "How the shell resolves a name" },
        ],
      },
      {
        heading: "Files",
        rows: [
          { item: "cp -a src dest", meaning: "Archive copy (GNU)" },
          { item: "mv old new", meaning: "Rename/move" },
          { item: "mkdir -p a/b", meaning: "Parents, idempotent" },
          { item: "rm -r dir", meaning: "Recursive delete — confirm path" },
          { item: "ln -s t l", meaning: "Symbolic link" },
        ],
      },
    ],
  },
  {
    slug: "bash",
    title: "Bash cheat sheet",
    description: "Quoting, tests, loops, and useful set flags.",
    groups: [
      {
        heading: "Quoting",
        rows: [
          { item: "'$x'", meaning: "Literal, no expansion" },
          { item: "\"$x\"", meaning: "Expand, no split/glob" },
          { item: "$(cmd)", meaning: "Command substitution" },
          { item: "$((1+1))", meaning: "Arithmetic" },
        ],
      },
      {
        heading: "Control",
        rows: [
          { item: "[[ -d $d ]]", meaning: "Bash test (quote $d)" },
          { item: "cmd && x || y", meaning: "Careful: y runs if x fails too" },
          { item: "for f in *; do ...; done", meaning: "Glob loop" },
          { item: "set -euo pipefail", meaning: "Stricter scripts" },
        ],
      },
    ],
  },
  {
    slug: "networking",
    title: "Networking commands",
    description: "iproute2-first toolkit.",
    groups: [
      {
        heading: "Stack",
        rows: [
          { item: "ip -br a", meaning: "Brief addresses" },
          { item: "ip r", meaning: "Routes" },
          { item: "ss -tulpn", meaning: "Listeners" },
          { item: "ping -c 4 host", meaning: "ICMP reachability" },
          { item: "dig +short name", meaning: "DNS (direct)" },
          { item: "curl -I url", meaning: "HTTP headers" },
        ],
      },
    ],
  },
  {
    slug: "processes",
    title: "Process commands",
    description: "Snapshots, signals, priority.",
    groups: [
      {
        heading: "Inspect",
        rows: [
          { item: "ps aux", meaning: "BSD-style snapshot" },
          { item: "ps -ef", meaning: "UNIX-style snapshot" },
          { item: "top / htop", meaning: "Interactive" },
          { item: "pgrep -a name", meaning: "Find by name" },
          { item: "kill -TERM pid", meaning: "Graceful stop" },
          { item: "nice -n 10 cmd", meaning: "Start nicer" },
        ],
      },
    ],
  },
  {
    slug: "filesystem",
    title: "Filesystem commands",
    description: "Space, mounts, identity of files.",
    groups: [
      {
        heading: "Space & mounts",
        rows: [
          { item: "df -hT", meaning: "Capacity by mount" },
          { item: "df -i", meaning: "Inodes" },
          { item: "du -xhd1 dir", meaning: "One-level usage" },
          { item: "findmnt", meaning: "Mount table" },
          { item: "lsblk -f", meaning: "Block devices" },
          { item: "stat file", meaning: "Inode metadata" },
        ],
      },
    ],
  },
  {
    slug: "permissions",
    title: "Permissions cheat sheet",
    description: "Modes, special bits, identity.",
    groups: [
      {
        heading: "Modes",
        rows: [
          { item: "644", meaning: "rw-r--r--" },
          { item: "755", meaning: "rwxr-xr-x" },
          { item: "600", meaning: "rw------- secrets/keys" },
          { item: "chmod u+x", meaning: "Add owner execute" },
          { item: "2775", meaning: "setgid directory + rwxrwxr-x" },
          { item: "1777", meaning: "sticky world-writable (like /tmp)" },
        ],
      },
    ],
  },
  {
    slug: "git-linux",
    title: "Git + Linux",
    description: "Common operator patterns on a Linux workstation.",
    groups: [
      {
        heading: "Repo hygiene",
        rows: [
          { item: "git status", meaning: "What changed" },
          { item: "git diff", meaning: "Unstaged patch" },
          { item: "chmod 600 ~/.ssh/id_ed25519", meaning: "Git SSH key mode" },
          { item: "less -F file", meaning: "Page Git output nicely" },
        ],
      },
    ],
  },
  {
    slug: "ssh",
    title: "SSH cheat sheet",
    description: "Client, keys, tunnels.",
    groups: [
      {
        heading: "Daily",
        rows: [
          { item: "ssh -i key user@host", meaning: "Identity file" },
          { item: "ssh -p 2222 host", meaning: "Port" },
          { item: "scp -P 2222 f host:", meaning: "Capital P for scp" },
          { item: "ssh -L 8080:127.0.0.1:80 host", meaning: "Local tunnel" },
          { item: "ssh -J jump target", meaning: "ProxyJump" },
          { item: "sshd -t", meaning: "Test server config" },
        ],
      },
    ],
  },
  {
    slug: "systemd",
    title: "systemd cheat sheet",
    description: "Units, logs, timers.",
    groups: [
      {
        heading: "Control",
        rows: [
          { item: "systemctl status u", meaning: "State + recent logs" },
          { item: "systemctl restart u", meaning: "Restart" },
          { item: "systemctl enable --now u", meaning: "Now + boot" },
          { item: "systemctl edit u", meaning: "Drop-in override" },
          { item: "journalctl -u u -f", meaning: "Follow" },
          { item: "systemctl list-timers", meaning: "Scheduled timers" },
        ],
      },
    ],
  },
  {
    slug: "vim",
    title: "Vim cheat sheet",
    description: "Enough to edit on a server and leave.",
    groups: [
      {
        heading: "Survive",
        rows: [
          { item: "i", meaning: "Insert mode" },
          { item: "Esc", meaning: "Normal mode" },
          { item: ":w", meaning: "Write" },
          { item: ":q", meaning: "Quit" },
          { item: ":wq", meaning: "Write and quit" },
          { item: ":q!", meaning: "Quit discarding" },
          { item: "/pat", meaning: "Search" },
          { item: "dd", meaning: "Delete line" },
        ],
      },
    ],
  },
  {
    slug: "regex",
    title: "Regex cheat sheet",
    description: "POSIX BRE vs ERE as used by grep/sed.",
    groups: [
      {
        heading: "grep",
        rows: [
          { item: ".", meaning: "Any character (not always newline)" },
          { item: "^ $", meaning: "Start / end of line" },
          { item: "grep -E", meaning: "Extended regex +, ?, |" },
          { item: "grep -F", meaning: "Literal string" },
          { item: "[0-9]\\+", meaning: "One or more digits in ERE" },
          { item: "\\b", meaning: "Word boundary (GNU)" },
        ],
      },
    ],
  },
];
