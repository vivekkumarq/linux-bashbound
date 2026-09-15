import type { Lab } from "../types";

export const labs: Lab[] = [
  {
    id: "disk-full",
    title: "Disk usage 98%",
    alert: "SERVER ALERT — / is 98% full on api-01",
    symptom: "Deploys fail with 'No space left on device'. SSH still works.",
    goal: "Identify the mount, the directory, and a safe next action.",
    start: "choose-first",
    resolution:
      "You confirmed the mount with df, stayed on that filesystem with du -x, checked inodes, then looked for deleted-open files if numbers disagreed. That is the professional order: measure, localize, then delete or truncate with intent.",
    steps: {
      "choose-first": {
        id: "choose-first",
        prompt: "What do you run first?",
        options: [
          { id: "df", label: "df -hT && df -i", next: "after-df", note: "Correct. Identify the mount and inode pressure before deleting anything." },
          { id: "rm", label: "sudo rm -rf /var/log/*", next: "bad-rm", note: "Dangerous and premature. You do not even know which filesystem is full." },
          { id: "reboot", label: "sudo reboot", next: "bad-reboot", note: "A reboot may free deleted-open files, but you lose evidence and availability." },
        ],
      },
      "after-df": {
        id: "after-df",
        prompt: "/ is 98% on ext4; inodes are 12% used. Next?",
        options: [
          { id: "du", label: "sudo du -xhd1 / | sort -h", next: "after-du", note: "Stay on one filesystem (-x) and find the heaviest top-level dir." },
          { id: "find-root", label: "sudo find / -size +1G", next: "after-du", note: "Works but slow and crosses mounts. Prefer du -x first." },
        ],
      },
      "after-du": {
        id: "after-du",
        prompt: "/var is 40G. You drill to /var/log. df still high after deleting rotated logs. Next?",
        options: [
          { id: "lsof", label: "sudo lsof +L1 | grep /var/log", next: "resolved", note: "A daemon still holds a deleted log; truncate the fd or restart after confirming." },
          { id: "chmod", label: "chmod -R 777 /var", next: "bad-rm", note: "Permissions will not free space and will create a security incident." },
        ],
      },
      "bad-rm": {
        id: "bad-rm",
        prompt: "That action is unsafe. Recover the investigation.",
        options: [{ id: "back", label: "Go back to df -hT && df -i", next: "after-df", note: "Measure first." }],
      },
      "bad-reboot": {
        id: "bad-reboot",
        prompt: "The host is down for a few minutes. The disk is still full after boot. Try a better first command.",
        options: [{ id: "back", label: "Run df -hT && df -i", next: "after-df", note: "Reboot was not the diagnosis." }],
      },
      resolved: {
        id: "resolved",
        prompt: "Incident contained. Review the resolution, then try another lab.",
        options: [],
      },
    },
  },
  {
    id: "high-cpu",
    title: "High CPU",
    alert: "ALERT — CPU 95% on worker-07",
    symptom: "Latency is up. Load average is 18 on 4 vCPUs.",
    goal: "Separate CPU-bound from I/O-wait and identify the PID.",
    start: "first",
    resolution: "Load 18 on 4 CPUs is saturation. vmstat splits user/system/iowait; top names the PID. Only then niceness, cgroup limits, or a restart.",
    steps: {
      first: {
        id: "first",
        prompt: "First look?",
        options: [
          { id: "vm", label: "uptime; vmstat 1 5", next: "vm", note: "Load and run queue vs iowait." },
          { id: "kill", label: "kill -9 -1", next: "bad", note: "That can kill your session and unrelated processes. Never." },
        ],
      },
      vm: {
        id: "vm",
        prompt: "r is 20, wa is 1%, us is 90%. Next?",
        options: [
          { id: "top", label: "ps -eo pid,pcpu,comm --sort=-pcpu | head", next: "done", note: "CPU-bound. Identify the process, then thread dumps or perf if it is yours." },
          { id: "iostat", label: "iostat -xz 1 3", next: "done", note: "Not wrong, but wa is already low — CPU is the bottleneck." },
        ],
      },
      bad: {
        id: "bad",
        prompt: "Do not broadcast SIGKILL.",
        options: [{ id: "u", label: "uptime; vmstat 1 5", next: "vm", note: "Measure." }],
      },
      done: {
        id: "done",
        prompt: "You have a PID and a bottleneck class. Mitigation is restart/scale/fix code — not random sysctl.",
        options: [],
      },
    },
  },
  {
    id: "oom",
    title: "Out of memory",
    alert: "Kernel OOM killer invoked",
    symptom: "A JVM disappeared. dmesg mentions Killed process.",
    goal: "Confirm OOM and decide memory vs leak vs limit.",
    start: "s",
    resolution: "Read the OOM trace, check cgroup memory.max vs RSS, then add limits, fix leaks, or resize. Do not disable overcommit blindly.",
    steps: {
      s: {
        id: "s",
        prompt: "Where do you look?",
        options: [
          { id: "dmesg", label: "sudo dmesg -T | grep -i 'killed process'", next: "m", note: "Kernel truth." },
          { id: "rm", label: "rm -rf /tmp", next: "m", note: "Unrelated unless /tmp was tmpfs filling memory — still look at dmesg first." },
        ],
      },
      m: {
        id: "m",
        prompt: "OOM killed java. Next evidence?",
        options: [
          { id: "free", label: "free -h; cat /sys/fs/cgroup/memory.max 2>/dev/null", next: "end", note: "Host vs container limit." },
          { id: "chmod", label: "chmod 777 /opt/app", next: "end", note: "Permissions did not cause OOM." },
        ],
      },
      end: {
        id: "end",
        prompt: "You can now talk about RSS, heap, and cgroup limits with evidence.",
        options: [],
      },
    },
  },
  {
    id: "service-down",
    title: "Service unavailable",
    alert: "nginx.service failed",
    symptom: "HTTP 502 from the load balancer. Host is up.",
    goal: "Use systemd and listen checks before editing configs blindly.",
    start: "a",
    resolution: "status + journal + config test + ss. Fix the error the unit printed, then restart once.",
    steps: {
      a: {
        id: "a",
        prompt: "First command?",
        options: [
          { id: "st", label: "systemctl status nginx --no-pager", next: "b", note: "Includes recent logs and the Main PID." },
          { id: "re", label: "systemctl restart nginx in a loop", next: "b", note: "You will hammer a crashing unit. Read first." },
        ],
      },
      b: {
        id: "b",
        prompt: "status shows failed. Next?",
        options: [
          { id: "j", label: "journalctl -u nginx -b --no-pager | tail -n 50", next: "c", note: "The bind error or config path is usually here." },
          { id: "77", label: "chmod -R 777 /etc/nginx", next: "c", note: "Creates a vulnerability and rarely fixes a bind error." },
        ],
      },
      c: {
        id: "c",
        prompt: "Journal: bind() to 0.0.0.0:80 failed. Next?",
        options: [
          { id: "ss", label: "ss -tlnp | grep ':80'", next: "z", note: "Another process owns 80, or you are not root and cannot bind." },
          { id: "ipt", label: "iptables -F", next: "z", note: "Flushing filters does not free a bound port." },
        ],
      },
      z: {
        id: "z",
        prompt: "Port owner identified. Stop the conflict or change the listen port with a tested config (nginx -t).",
        options: [],
      },
    },
  },
  {
    id: "port-closed",
    title: "Port not reachable",
    alert: "Cannot connect to 10.0.2.15:5432",
    symptom: "Developers report timeout from laptops. The DB VM pings.",
    goal: "Distinguish listen address, local firewall, and security group.",
    start: "p",
    resolution: "Ping ≠ TCP. ss shows bind. timeout vs refused tells filter vs closed.",
    steps: {
      p: {
        id: "p",
        prompt: "On the DB host, first?",
        options: [
          { id: "ss", label: "ss -tlnp | grep 5432", next: "q", note: "Is it listening, and on which address?" },
          { id: "ping", label: "ping the developer laptop", next: "q", note: "Asymmetric and not the app path. Still look at ss." },
        ],
      },
      q: {
        id: "q",
        prompt: "Listen is 127.0.0.1:5432. What is the issue?",
        options: [
          { id: "bind", label: "The database is bound to loopback only", next: "r", note: "Remote clients cannot connect until listen_addresses and firewall are corrected — carefully." },
          { id: "dns", label: "It must be DNS", next: "r", note: "You already have an IP. Bind address is the smoking gun." },
        ],
      },
      r: {
        id: "r",
        prompt: "After binding to the private interface, still timeout from outside. Next layer?",
        options: [
          { id: "fw", label: "nft/iptables/security group for 5432", next: "e", note: "Timeout after a correct listen usually means a filter." },
          { id: "chmod", label: "chmod 777 the data dir", next: "e", note: "Unrelated to TCP reachability." },
        ],
      },
      e: {
        id: "e",
        prompt: "You now have a layered network diagnosis.",
        options: [],
      },
    },
  },
  {
    id: "dns-fail",
    title: "DNS failure",
    alert: "curl: Could not resolve host",
    symptom: "ping 8.8.8.8 works. curl https://example.com fails.",
    goal: "Separate ICMP, NSS, and DNS.",
    start: "d",
    resolution: "IP works, names fail → resolver. Compare getent vs dig @server.",
    steps: {
      d: {
        id: "d",
        prompt: "Best pair of checks?",
        options: [
          { id: "g", label: "getent hosts example.com; dig example.com +short", next: "e", note: "NSS vs direct DNS." },
          { id: "r", label: "reboot networking blindly", next: "e", note: "You skip evidence." },
        ],
      },
      e: {
        id: "e",
        prompt: "dig @1.1.1.1 works, getent fails. Next file?",
        options: [
          { id: "n", label: "nsswitch.conf, resolv.conf, resolvectl status", next: "f", note: "Stub resolver or search domain issue." },
          { id: "hosts", label: "Only /etc/hosts for example.com in production", next: "f", note: "A hack, not a resolver fix." },
        ],
      },
      f: {
        id: "f",
        prompt: "Fix the stub or resolv.conf using the distro's supported tool (resolvectl, nmcli), not a fight with a rewritten file.",
        options: [],
      },
    },
  },
  {
    id: "eacces",
    title: "Permission denied",
    alert: "deploy.sh: Permission denied",
    symptom: "User deploy owns the file. Mode 644. Mount is ext4.",
    goal: "Execute bit vs noexec vs interpreter.",
    start: "x",
    resolution: "Need +x for ./script, or invoke bash script. Check noexec and CRLF shebang.",
    steps: {
      x: {
        id: "x",
        prompt: "First stat?",
        options: [
          { id: "ls", label: "ls -l deploy.sh && findmnt -T deploy.sh", next: "y", note: "Mode and mount options." },
          { id: "777", label: "chmod 777 deploy.sh", next: "y", note: "May make it run but teaches a bad default. Prefer u+x." },
        ],
      },
      y: {
        id: "y",
        prompt: "Mode 644, mount has noexec. Next?",
        options: [
          { id: "bash", label: "bash deploy.sh (or remount without noexec if policy allows)", next: "z", note: "noexec blocks execve of the script, not bash reading it." },
          { id: "root", label: "sudo -i and hope", next: "z", note: "Root still cannot exec on noexec mounts." },
        ],
      },
      z: {
        id: "z",
        prompt: "You distinguished DAC mode from mount flags.",
        options: [],
      },
    },
  },
  {
    id: "ssh-fail",
    title: "SSH failure",
    alert: "Permission denied (publickey)",
    symptom: "Key works on staging. Production refuses.",
    goal: "sshd strict modes and authorized_keys.",
    start: "h",
    resolution: "Client -vvv plus server auth logs. Check ~/.ssh 700, key 600, authorized_keys content and ownership.",
    steps: {
      h: {
        id: "h",
        prompt: "Client next step?",
        options: [
          { id: "vvv", label: "ssh -vvv -i key user@prod", next: "i", note: "See which key is offered." },
          { id: "off", label: "StrictHostKeyChecking=no IdentitiesOnly=no spray all keys", next: "i", note: "Noisy and unsafe." },
        ],
      },
      i: {
        id: "i",
        prompt: "Server log: Authentication refused: bad ownership. Fix?",
        options: [
          { id: "perm", label: "chown user:user ~ ~./.ssh; chmod 700 ~/.ssh; chmod 600 authorized_keys", next: "j", note: "sshd StrictModes." },
          { id: "777", label: "chmod -R 777 ~", next: "j", note: "Makes sshd even more likely to refuse." },
        ],
      },
      j: {
        id: "j",
        prompt: "Permissions corrected; still denied. Compare authorized_keys to the public half of the client key.",
        options: [],
      },
    },
  },
  {
    id: "zombies",
    title: "Zombie processes",
    alert: "Hundreds of Z state tasks",
    symptom: "CPU is idle. pstree shows defunct children under app.",
    goal: "Reap, do not SIGKILL the zombies.",
    start: "k",
    resolution: "Zombies are dead. Restart or fix the parent so it wait()s. PID 1 reaps if the parent dies.",
    steps: {
      k: {
        id: "k",
        prompt: "First accurate statement?",
        options: [
          { id: "dead", label: "They are already exited; kill -9 on the zombie PID is useless", next: "l", note: "Correct." },
          { id: "killz", label: "kill -9 every Z PID", next: "l", note: "No effect. Look at PPID." },
        ],
      },
      l: {
        id: "l",
        prompt: "How to clear them?",
        options: [
          { id: "parent", label: "Fix/restart the parent (PPID) so it reaps, or stop it and let init reap", next: "m", note: "The only real fix." },
          { id: "sysctl", label: "sysctl vm.swappiness=0", next: "m", note: "Unrelated." },
        ],
      },
      m: {
        id: "m",
        prompt: "If this is a container, PID 1 may be the app — it must reap or use a tiny init.",
        options: [],
      },
    },
  },
];
