import type { Concept } from "../types";
import { extraConceptsMore } from "./extraConceptsMore";

function cx(p: {
  id: string;
  title: string;
  simple: string;
  technical: string;
  analogy: string;
  command: string;
  output: string;
  explanation: string;
  mistakes: string[];
  practices: string[];
  prompt: string;
  solution: string;
  q: string;
  a: string;
  related: string[];
  takeaway: string;
  whereUsed?: string[];
}): Concept {
  return {
    id: p.id,
    title: p.title,
    simple: p.simple,
    technical: p.technical,
    analogy: p.analogy,
    example: { command: p.command, output: p.output, explanation: p.explanation },
    mistakes: p.mistakes,
    practices: p.practices,
    exercise: { prompt: p.prompt, solution: p.solution },
    interview: { question: p.q, answer: p.a },
    related: p.related,
    takeaway: p.takeaway,
    whereUsed: p.whereUsed,
  };
}

/** Extra lessons merged into every module: plain-language + interview-grade. */
export const extraConcepts: Record<string, Concept[]> = {
  ...extraConceptsMore,
  "what-is-linux": [
    cx({
      id: "kernel-vs-userspace-plain",
      title: "How a keystroke becomes work",
      simple: "You type a command. The shell is just a program. It asks the kernel to start another program. The kernel is the only piece allowed to talk to the CPU, disk, and network on behalf of everyone.",
      technical: "The shell calls fork and execve. Those are system calls: a controlled door into kernel mode. Device drivers and the scheduler live on the other side of that door. Android, Ubuntu, and a Raspberry Pi image all share this split.",
      analogy: "The kernel is air traffic control. Apps are planes. They file a flight plan (a syscall); they do not taxi across the runway whenever they like.",
      command: "strace -e trace=process ls >/dev/null",
      output: "execve(\"/usr/bin/ls\", [\"ls\"], ...) = 0",
      explanation: "strace shows the syscalls. You do not need to memorize them yet — only that every useful action eventually becomes one.",
      mistakes: ["Thinking the desktop (GNOME, KDE) is Linux.", "Thinking Bash is the operating system."],
      practices: ["Say kernel, shell, and distro as three different words.", "When something fails, ask: is it the program, the shell, or the kernel saying no?"],
      prompt: "In one sentence, who starts the ls binary when you type ls?",
      solution: "The shell asks the kernel (via fork/exec) to load /usr/bin/ls as a new process.",
      q: "What happens when a user program needs to read a file?",
      a: "It calls a library function such as read(), which issues the read syscall. The kernel checks permissions, talks to the filesystem, copies bytes into the process, and returns.",
      related: ["architecture", "bash-basics"],
      takeaway: "Linux the kernel is the referee. Everything you type is a user program asking the referee for help.",
    }),
    cx({
      id: "why-servers-love-linux",
      title: "Why servers, phones, and clouds run it",
      simple: "Linux is free to copy, runs on tiny boards and huge machines, and can run for years without a reboot. That combination made it the default in data centers and on Android.",
      technical: "The kernel is GPLv2. Hardware vendors ship drivers as modules. Cloud images are just a kernel, an init system, and a package set. Containers share one kernel, which is why Linux hosts almost all container platforms.",
      analogy: "A public highway standard: many car brands (distros), one road code (syscalls), and you can pave it on a dirt lot or a city.",
      command: "cat /proc/version",
      output: "Linux version 6.8.0 ... (gcc ...) #1 SMP ...",
      explanation: "/proc/version is the kernel introducing itself. The distro name is a separate file: /etc/os-release.",
      mistakes: ["Assuming 'Linux' means Ubuntu.", "Assuming a GUI is required for a 'real' Linux."],
      practices: ["Read /etc/os-release on every new host.", "Treat cloud VMs as Linux first, vendor console second."],
      prompt: "Name two places Linux runs that are not a laptop desktop.",
      solution: "Android phones; AWS/GCP/Azure VMs; routers; Kubernetes nodes; supercomputers; TVs; cars.",
      q: "Why do containers usually require a Linux kernel (or a Linux VM)?",
      a: "Containers isolate processes with Linux namespaces and cgroups. They are not a second kernel. On macOS or Windows, Docker runs a Linux VM to provide those features.",
      related: ["namespaces-cgroups", "distributions"],
      takeaway: "If you learn Linux well, you can work on phones, clouds, and clusters — not only desktops.",
      whereUsed: ["Public cloud, Android, networking gear, HPC, cars, TVs."],
    }),
  ],
  "linux-vs-unix": [
    cx({
      id: "posix-in-plain-words",
      title: "POSIX in plain words",
      simple: "POSIX is a promise: 'this command and this C function should behave the same on many Unix-like systems.' Linux mostly keeps that promise, then adds extra flags.",
      technical: "POSIX.1 covers the shell language, utilities (ls, cp, sh), and syscalls. GNU coreutils extend POSIX (ls --color). BSD tools extend it differently. Portable scripts stick to POSIX sh and POSIX options.",
      analogy: "POSIX is a recipe that says 'use salt.' GNU says 'use Himalayan pink salt, toasted.' Both cook; only one travels.",
      command: "man 1p printf 2>/dev/null | head -n 4 || echo 'Install manpages-posix to see POSIX pages'",
      output: "PRINTF(1P)  POSIX Programmer's Manual",
      explanation: "Section 1p is the POSIX command, not the GNU extras. On Debian/Ubuntu: apt install manpages-posix.",
      mistakes: ["Copying a Stack Overflow GNU one-liner onto macOS and calling it 'Unix'.", "Writing #!/bin/bash for a script labeled portable."],
      practices: ["If it must run on Alpine, macOS, and Ubuntu, test with dash or busybox sh.", "Document GNU-only flags in comments."],
      prompt: "Is ls --color POSIX?",
      solution: "No. Color is a GNU (and some BSD) extension. POSIX ls has no --color.",
      q: "What is the Single UNIX Specification?",
      a: "The Open Group standard that certified UNIX systems implement. Linux is Unix-like and POSIX-rich but typical distros are not UNIX-trademark certified.",
      related: ["unix-posix", "quoting-expansion"],
      takeaway: "Unix is a family. POSIX is the shared dialect. Linux speaks that dialect with a GNU accent.",
    }),
    cx({
      id: "bsd-sysv-linux-map",
      title: "BSD, System V, and Linux — the family map",
      simple: "Old Unix split into two styles. BSD gave us sockets and many macOS commands. System V gave us a different ps and init. Linux borrowed from both and then invented systemd.",
      technical: "ps aux is BSD syntax; ps -ef is System V. Linux ps accepts both. macOS is BSD userland + XNU. Solaris was System V. Linux init used to look SysV (runlevels); now targets.",
      analogy: "Two school districts with different report cards. Linux accepts both report cards, then added its own app (systemd).",
      command: "ps -ef | head -n 2; ps aux | head -n 2",
      output: "UID PID PPID ...\nUSER PID %CPU ...",
      explanation: "Same idea, two flag languages. On Linux both work. On some Unixes only one does.",
      mistakes: ["Memorizing only ps aux and freezing on AIX/Solaris.", "Assuming systemd exists on BSD or macOS."],
      practices: ["Learn both ps spellings.", "Ask which init is PID 1 before writing service files."],
      prompt: "Which ps form is BSD-style?",
      solution: "ps aux (no dash, BSD). ps -ef is UNIX/System V.",
      q: "Does macOS use systemd?",
      a: "No. macOS uses launchd. Service files and journalctl do not apply. Commands are often BSD, not GNU.",
      related: ["boot-and-init", "systemd"],
      takeaway: "When a command 'does not work', first ask: GNU, BSD, or POSIX?",
    }),
  ],
  distributions: [
    cx({
      id: "how-to-pick-a-distro",
      title: "How to pick a distro without religion",
      simple: "For learning, use whatever you can install quickly (Ubuntu, Fedora, or a cloud image). For work, pick what your team already knows how to patch.",
      technical: "LTS/enterprise: Ubuntu LTS, RHEL, SLES, Debian stable. Fast: Fedora, Arch. Minimal: Alpine (musl, apk). Immutable: Fedora CoreOS, Ubuntu Core. Amazon Linux is Fedora/RHEL-like for AWS.",
      analogy: "Do not buy a truck because a forum likes trucks. Buy what the warehouse already stocks parts for.",
      command: "grep -E '^(NAME|VERSION|ID)=' /etc/os-release",
      output: "NAME=\"Ubuntu\"\nVERSION=\"24.04.1 LTS\"\nID=ubuntu",
      explanation: "Scripts should read ID and VERSION_ID, not scrape lsb_release.",
      mistakes: ["Rebuilding production on Arch because it is 'more Linux'.", "Mixing Debian and RPM packages on one rootfs."],
      practices: ["Match prod in staging.", "Learn one Debian-family and one RPM-family well."],
      prompt: "A bank wants 10 years of security updates. Name a reasonable choice.",
      solution: "RHEL (or Rocky/Alma with a support plan), Ubuntu LTS with ESM, SLES — not a rolling desktop distro.",
      q: "What is a rolling release?",
      a: "Packages move continuously with no big-bang version (Arch, some Tumbleweed). Great for latest software; harder for frozen production.",
      related: ["package-managers", "production-linux"],
      takeaway: "Distro choice is a support and packaging choice, not a personality test.",
    }),
    cx({
      id: "same-kernel-different-tools",
      title: "Same kernel, different tools",
      simple: "Two machines can run kernel 6.8 and still feel alien: one uses apt and systemd, another uses apk and OpenRC, another uses busybox.",
      technical: "Userland is independent: glibc vs musl, GNU coreutils vs busybox, systemd vs OpenRC vs runit. Android uses the Linux kernel with Bionic libc and no GNU userland.",
      analogy: "Same engine, different dashboard. The speedometer (syscalls) is similar; the buttons (apt vs dnf) are not.",
      command: "ldd --version 2>&1 | head -n 1; ls /bin/ls; readlink -f /bin/sh",
      output: "ldd (Ubuntu GLIBC) ...\n/bin/ls\n/usr/bin/dash",
      explanation: "This host is glibc + GNU ls + dash as /bin/sh. Alpine would show musl and busybox.",
      mistakes: ["Assuming /bin/sh is Bash.", "Assuming useradd flags match on every distro."],
      practices: ["Check readlink /bin/sh in CI.", "Use posix sh in container entrypoints when you can."],
      prompt: "Why might apk add fail on Ubuntu?",
      solution: "apk is Alpine's package manager. Ubuntu uses apt. The kernel being Linux is not enough.",
      q: "Is Android a Linux distribution?",
      a: "It uses the Linux kernel but a different userland (Bionic, toybox/toolbox historically, no typical GNU/systemd). People still say 'Linux kernel' for Android.",
      related: ["kernel-and-gnu"],
      takeaway: "Never assume the next Linux box has the same package manager or the same /bin/sh.",
    }),
  ],
  "kernel-and-gnu": [
    cx({
      id: "licenses-you-will-be-asked",
      title: "Licenses you will actually be asked about",
      simple: "Linux the kernel is GPL v2 only. Many userland tools are GPL v3 or LGPL. You can run Linux in a company without paying a license fee, but you cannot hide GPL kernel changes if you ship the kernel.",
      technical: "GPLv2 copyleft for kernel (including many drivers). CDDL, MIT, Apache appear in userland. Binary-only modules are legally and technically fraught (tainted kernel).",
      analogy: "The kitchen recipe (kernel) must stay open if you serve the dish. The restaurant name (your app) can still be yours.",
      command: "uname -r; cat /proc/sys/kernel/tainted",
      output: "6.8.0-40-generic\n0",
      explanation: "A non-zero tainted value often means proprietary modules or a previous oops. Support teams ask for this.",
      mistakes: ["Pasting a proprietary .ko from a random site.", "Confusing 'open source' with 'public domain'."],
      practices: ["Prefer in-tree or distro-signed modules.", "Record licenses when you vendor binaries."],
      prompt: "Can you sell a product that runs Linux?",
      solution: "Yes. Many appliances do. If you distribute a modified kernel, GPL obligations for that kernel still apply.",
      q: "What does a 'tainted' kernel mean?",
      a: "The kernel has loaded something (often out-of-tree or proprietary modules) or has hit a previous error. It is a support signal, not a virus label.",
      related: ["architecture"],
      takeaway: "Free as in freedom for the kernel source; still read licenses before you ship a device.",
    }),
    cx({
      id: "gnu-coreutils-vs-busybox",
      title: "GNU coreutils versus BusyBox",
      simple: "On Ubuntu, ls is a full GNU program with long flags. On Alpine and many routers, ls is BusyBox: one binary pretending to be many commands, with shorter help.",
      technical: "BusyBox applets are size-optimized. Flags differ (no ls --group-directories-first). Buildroot and embedded Linux default to BusyBox. Distroless images may have almost no shell.",
      analogy: "A Swiss Army knife versus a full toolbox. Both cut; the toolbox has extra bits.",
      command: "ls --version 2>&1 | head -n 1",
      output: "ls (GNU coreutils) 9.4",
      explanation: "If this errors, you may be on BusyBox or BSD ls. Adjust scripts.",
      mistakes: ["Using GNU-only find -printf in an Alpine CI image.", "Assuming wget exists; some images have only curl, or neither."],
      practices: ["Pin the base image.", "Use POSIX flags in shared scripts."],
      prompt: "You wrote ls --color=always in a backup script. Name one environment where it breaks.",
      solution: "BusyBox ls, or BSD ls on macOS — they may reject the long option.",
      q: "Why do container images stay small?",
      a: "They omit GNU userland, docs, and locales; often musl+busybox or a single static binary. The kernel is still the host's Linux kernel.",
      related: ["distributions", "production-linux"],
      takeaway: "Always know whether the box is GNU, BusyBox, or BSD before you paste a command.",
    }),
  ],
};
