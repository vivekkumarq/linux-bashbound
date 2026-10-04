/**
 * The vocabulary the course assumes.
 *
 * Words like userland, POSIX, GNU and BSD were being used in module one and
 * never defined anywhere — including in a "best practice" that told the reader
 * to keep kernel, userland and distribution straight in their vocabulary, a
 * sentence that is useless if one of the three words has never been explained.
 *
 * Each entry carries a plain definition and, where the name itself is the
 * confusing part, the reason it is called that. Historical names are most of
 * the difficulty in Unix: nothing about the word "daemon" or "tty" tells you
 * what it means, and nobody can infer it.
 *
 * `aka` lists the spellings that should resolve to the same entry.
 */

export interface GlossaryEntry {
  term: string;
  aka?: string[];
  /** One or two sentences. Must stand alone, with no other jargon in it. */
  definition: string;
  /** Where the name comes from, when the name is the obstacle. */
  why?: string;
  /** Module that teaches it properly, if one does. */
  topic?: string;
}

export const glossary: GlossaryEntry[] = [
  {
    term: "kernel",
    definition:
      "The one program that is always running and is allowed to touch the hardware directly. It shares the CPU between programs, hands out memory, and owns the disks and network cards. Everything else has to ask it.",
    why: "From the kernel of a nut: the core, with everything else as the shell around it.",
    topic: "what-is-linux",
  },
  {
    term: "userland",
    aka: ["user land", "user-land"],
    definition:
      "Everything on the system that is not the kernel: the shell you type into, commands like ls and cp, the libraries programs link against, the login screen. If you can run it, delete it, or upgrade it on its own, it is userland.",
    why:
      "The word exists because the two halves can be swapped independently. Ubuntu, Android and Alpine all run the Linux kernel, but their userlands are so different that a program built for one may not run on another at all. Saying Linux alone does not tell you which half is meant.",
    topic: "what-is-linux",
  },
  {
    term: "user space",
    aka: ["userspace"],
    definition:
      "The restricted mode that normal programs run in. Code here cannot reach the hardware or another program's memory; it has to ask the kernel for anything real. The CPU itself enforces this.",
    why:
      "Near-synonym of userland, but used for the privilege level rather than the software. Userland is what is installed; user space is the mode it runs in.",
    topic: "architecture",
  },
  {
    term: "kernel space",
    definition:
      "The privileged mode the kernel runs in, where code may access any memory and command the hardware. A bug here can take the whole machine down, which is why as little as possible runs in it.",
    topic: "architecture",
  },
  {
    term: "system call",
    aka: ["syscall", "system calls", "syscalls"],
    definition:
      "The way a normal program asks the kernel to do something it is not allowed to do itself — open a file, send a packet, start a process. It is the only door between user space and kernel space, and there are only a few hundred of them.",
    why: "Reading a file looks like a function call in your code, but underneath it is a deliberate, guarded switch into the kernel.",
    topic: "architecture",
  },
  {
    term: "POSIX",
    definition:
      "A written standard that says what a Unix-like system must provide: which commands exist, how the shell language behaves, and which C functions are available. It is a document, not software.",
    why:
      "Short for Portable Operating System Interface. It exists so a program written on one Unix can be compiled and run on another without rewriting it. Linux follows it closely but has never paid to be certified, so the correct phrase is POSIX-compatible, not POSIX-certified. When a manual says a flag is not POSIX, it means that flag may be missing on other Unix systems.",
    topic: "linux-vs-unix",
  },
  {
    term: "GNU",
    definition:
      "A project started in 1983 to build a complete Unix-like system that anyone could use, read, change and share. It produced most of the programs you type every day — bash, ls, cp, grep, gcc — but its own kernel was never finished.",
    why:
      "A recursive joke: GNU's Not Unix. Pronounced with a hard g. Because the GNU kernel never shipped and the Linux kernel had no programs to run, the two were combined in the early 1990s — which is why some people insist the system is properly called GNU/Linux.",
    topic: "kernel-and-gnu",
  },
  {
    term: "BSD",
    definition:
      "Berkeley Software Distribution: a version of Unix developed at the University of California, Berkeley, which grew into today's FreeBSD, OpenBSD and NetBSD. It is a separate family from Linux, not a Linux distribution.",
    why:
      "It matters for two practical reasons. Its licence lets companies use the code in closed products, which is how macOS came to be built on BSD foundations. And its versions of common commands take different flags from the GNU ones — a reason a script written on Linux can fail on a Mac.",
    topic: "linux-vs-unix",
  },
  {
    term: "Unix",
    definition:
      "The operating system built at Bell Labs in 1969 whose design — files, processes, small composable tools, a shell to join them — nearly every later system copied. Linux contains none of its code but follows its design.",
    topic: "linux-vs-unix",
  },
  {
    term: "Unix-like",
    definition:
      "A system that behaves the way Unix does without being descended from its source code. Linux is the main example: written from scratch, but with the same ideas.",
    topic: "linux-vs-unix",
  },
  {
    term: "distribution",
    aka: ["distro", "distributions", "distros"],
    definition:
      "A kernel and a userland, chosen and assembled by someone so the result installs and boots. The distribution decides the package manager, the default shell, how often you get updates, and for how long they are supported.",
    why: "Ubuntu, Debian, Fedora and Arch are distributions. All run Linux; what differs is everything around it.",
    topic: "distributions",
  },
  {
    term: "shell",
    definition:
      "The program that reads what you type, works out which command you meant, runs it, and shows the result. Bash is one; zsh and fish are others. It is an ordinary program and can be replaced.",
    why: "Named for being the outer layer wrapped around the kernel.",
    topic: "terminal-shell",
  },
  {
    term: "terminal",
    definition:
      "The window that gives you a keyboard and a screen for text. It does not understand any commands itself — it just passes your keystrokes to the shell and prints back what comes out.",
    topic: "terminal-shell",
  },
  {
    term: "TTY",
    aka: ["tty"],
    definition:
      "The kernel's name for a text input and output device, and the reason commands like tty and stty are spelled that way.",
    why:
      "Short for teletype, the electric typewriter that was the terminal in the 1960s. The hardware is long gone, but the name and some of its behaviour survive in the software that replaced it.",
    topic: "terminal-shell",
  },
  {
    term: "daemon",
    aka: ["daemons"],
    definition:
      "A program that runs in the background with no terminal attached, waiting to do a job — serve web pages, accept logins, write logs. Names traditionally end in d: sshd, systemd, crond.",
    why:
      "From the Greek daemon, a helpful spirit working unseen, not the demon of religion. Chosen at MIT in the 1960s, and the pun stuck.",
    topic: "process-model",
  },
  {
    term: "process",
    definition:
      "One running program, with its own memory, its own view of open files, and a number identifying it. Running the same command twice gives two processes.",
    topic: "process-model",
  },
  {
    term: "PID",
    definition:
      "Process ID: the number the kernel gives each running process so it can be referred to — to check on it, or to stop it. Numbers are reused after a process exits.",
    topic: "process-model",
  },
  {
    term: "file descriptor",
    aka: ["file descriptors"],
    definition:
      "A small number a process uses to refer to something it has open — a file, a pipe, a network connection. Every process starts with three: 0 for input, 1 for normal output, 2 for errors.",
    why: "This is why redirecting errors is written 2> — the 2 is the descriptor number, not an arbitrary symbol.",
    topic: "pipes-redirection",
  },
  {
    term: "inode",
    aka: ["inodes"],
    definition:
      "The record that holds everything about a file except its name and its contents: size, owner, permissions, timestamps, and where the data sits on disk. Names live in directories and point at inodes.",
    why:
      "This split is why a single file can have several names, why renaming is instant, and why deleting a name does not always free the space.",
    topic: "inodes-and-links",
  },
  {
    term: "FHS",
    definition:
      "Filesystem Hierarchy Standard: the agreement on what belongs in each top-level directory — programs in /usr/bin, configuration in /etc, logs in /var/log. It is why you can find your way around a machine you have never seen.",
    topic: "directory-map",
  },
  {
    term: "root",
    definition:
      "Two different things. The root user is the administrator account, which bypasses every permission check. The root directory, written /, is the top of the filesystem. Context tells them apart.",
    topic: "users-groups",
  },
  {
    term: "mount",
    aka: ["mounted", "mounting", "mount point"],
    definition:
      "Attaching a storage device so its contents appear inside an existing directory. Linux has no drive letters: a second disk shows up as a folder, wherever you attach it.",
    topic: "mounts",
  },
  {
    term: "PATH",
    definition:
      "The list of directories the shell searches, in order, when you type a command name. If a program is not in one of them, the shell reports command not found even though the program is installed.",
    topic: "env-and-path",
  },
  {
    term: "environment variable",
    aka: ["environment variables"],
    definition:
      "A named value handed to a program when it starts, used to tell it something without passing an argument — where to find things, what language to print in, which editor to open.",
    topic: "env-and-path",
  },
  {
    term: "exit status",
    aka: ["exit code", "return code"],
    definition:
      "A number every command leaves behind when it finishes: 0 means success, anything else means failure. Scripts and the && operator use it to decide what to do next.",
    topic: "bash-scripting",
  },
  {
    term: "standard input",
    aka: ["stdin"],
    definition:
      "Where a command reads from when you do not name a file — normally your keyboard, or whatever a pipe feeds it.",
    topic: "pipes-redirection",
  },
  {
    term: "standard output",
    aka: ["stdout"],
    definition:
      "Where a command writes its normal results — normally the screen, unless redirected to a file or piped into another command.",
    topic: "pipes-redirection",
  },
  {
    term: "standard error",
    aka: ["stderr"],
    definition:
      "A second output channel, separate from normal output, used for error messages. Keeping it separate means errors still reach you when the real output is being piped somewhere else.",
    topic: "pipes-redirection",
  },
  {
    term: "pipe",
    aka: ["pipes", "pipeline"],
    definition:
      "A direct connection from one command's output to the next command's input, written with a vertical bar. Nothing is saved to disk; the data flows through while both commands run at once.",
    topic: "pipes-redirection",
  },
  {
    term: "libc",
    aka: ["glibc", "C library"],
    definition:
      "The library almost every program uses to talk to the kernel, so that opening a file is an ordinary function call rather than hand-written assembly. glibc is the usual implementation on desktop and server Linux; Alpine uses a smaller one called musl.",
    why: "Swapping it is why a binary built on Ubuntu may refuse to start on Alpine.",
    topic: "architecture",
  },
  {
    term: "monolithic kernel",
    definition:
      "A kernel where drivers, filesystems and the network stack all run together in the privileged mode, rather than as separate programs. Linux is monolithic, but can load and unload parts at runtime.",
    topic: "architecture",
  },
  {
    term: "package manager",
    aka: ["package management"],
    definition:
      "The tool that installs, updates and removes software, working out what else is needed and fetching it. apt, dnf and pacman are the common ones; which you have depends on the distribution.",
    topic: "package-managers",
  },
  {
    term: "init",
    definition:
      "The first process the kernel starts, with PID 1. It starts everything else and adopts any process whose parent exits. On most systems today it is systemd.",
    topic: "boot-and-init",
  },
  {
    term: "systemd",
    definition:
      "The init system and service manager used by most mainstream distributions. It starts services in dependency order, restarts them when they fail, and collects their logs.",
    topic: "boot-and-init",
  },
  {
    term: "GPL",
    aka: ["GPLv2", "copyleft"],
    definition:
      "The licence the Linux kernel uses. You may use, change and redistribute the code, but if you distribute a modified version you must release your changes under the same terms.",
    why:
      "The contrast with the BSD licence is the practical difference between the two families: BSD code can be taken into a closed product, GPL code cannot. That single clause shaped who built what on which.",
    topic: "kernel-and-gnu",
  },
  {
    term: "free software",
    aka: ["open source", "FOSS"],
    definition:
      "Software you are free to run, read, change and share. Free refers to that freedom, not to price — most of it can also be sold.",
    why: "The two names describe the same licences; they differ in emphasis, which is why you see both.",
    topic: "kernel-and-gnu",
  },
  {
    term: "man page",
    aka: ["manual page", "man pages"],
    definition:
      "The manual installed with the system, read with the man command. Section numbers separate things that share a name: man 1 printf is the command, man 3 printf is the C function.",
    topic: "help-systems",
  },
];

/** Lookup by term or alias, lowercased. */
export const glossaryByTerm = new Map<string, GlossaryEntry>(
  glossary.flatMap((e) => [e.term, ...(e.aka ?? [])].map((k) => [k.toLowerCase(), e] as const)),
);
