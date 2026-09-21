/**
 * The filesystem hierarchy, as documented by the FHS and `man 7 hier`.
 * Used by the interactive tree so the explanation of each directory lives in
 * data rather than in markup.
 */

export interface FsEntry {
  path: string;
  purpose: string;
  detail: string;
  /** Files worth knowing inside this directory. */
  notable?: { name: string; what: string }[];
  /** Why an engineer ends up here in practice. */
  realWorld?: string;
  /** True for kernel-backed virtual filesystems with no on-disk storage. */
  virtual?: boolean;
}

export const fsTree: FsEntry[] = [
  {
    path: "/",
    purpose: "The root of the single unified tree.",
    detail:
      "Linux has no drive letters. Every storage device, network share and virtual filesystem is grafted onto one tree at a mount point, so a path never tells you which device it lives on. `findmnt` or `df /path` answers that.",
    realWorld: "Understanding this is what makes `df` output and /etc/fstab readable.",
  },
  {
    path: "/bin, /sbin, /lib",
    purpose: "Essential binaries and libraries.",
    detail:
      "On every current mainstream distribution these are symlinks into /usr (the “/usr merge”). /bin holds commands for all users, /sbin those intended for administration. The split predates initramfs, which now handles the early-boot problem it was invented for.",
    notable: [
      { name: "/bin/sh", what: "The POSIX shell. On Debian and Ubuntu this is dash, not bash — the usual reason a script works interactively but fails with #!/bin/sh." },
      { name: "/sbin/init", what: "PID 1. A symlink to systemd on most distributions." },
    ],
    realWorld: "When a container image is missing a command, this is what it is missing.",
  },
  {
    path: "/etc",
    purpose: "System-wide configuration, as editable text.",
    detail:
      "Machine-local configuration only — never binaries, never data that changes on its own. Its text-file nature is what makes Linux configuration diffable, reviewable and safe to put in version control.",
    notable: [
      { name: "/etc/passwd", what: "Accounts. World-readable, and despite the name it holds no passwords — the x means the hash is in shadow." },
      { name: "/etc/shadow", what: "Password hashes. Mode 640, root-owned, readable only by the shadow group." },
      { name: "/etc/fstab", what: "Filesystems to mount at boot. A wrong entry here can leave a machine unbootable." },
      { name: "/etc/ssh/sshd_config", what: "SSH server policy. Validate with `sshd -t` before restarting." },
      { name: "/etc/os-release", what: "Machine-readable distribution identity." },
    ],
    realWorld: "The first directory to back up, and the first to check in a configuration incident.",
  },
  {
    path: "/home",
    purpose: "Per-user files and per-user configuration.",
    detail:
      "Each user gets a directory they own. User-level settings live in dotfiles and in ~/.config, which is why a setting can differ between two accounts on one machine. Frequently a separate filesystem so a user cannot fill the root disk.",
    notable: [
      { name: "~/.ssh", what: "Keys and known_hosts. Must not be group- or world-writable or SSH silently refuses key auth." },
      { name: "~/.bashrc", what: "Runs for interactive non-login shells — the usual home for aliases." },
    ],
  },
  {
    path: "/var",
    purpose: "Data that changes while the system runs.",
    detail:
      "Logs, spools, caches, databases and mail. It grows, which is precisely why it is the directory that fills a disk. On a server it is often its own filesystem so that runaway logs cannot take the root filesystem down with them.",
    notable: [
      { name: "/var/log", what: "Text logs. With systemd the journal is binary and lives in /var/log/journal." },
      { name: "/var/lib", what: "State that packages own — databases, container images, package manager data." },
      { name: "/var/tmp", what: "Temporary files that must survive a reboot, unlike /tmp." },
    ],
    realWorld: "The first place to look when df reports a full disk.",
  },
  {
    path: "/tmp",
    purpose: "Scratch space for anything, cleared regularly.",
    detail:
      "World-writable with the sticky bit set (drwxrwxrwt), so any user may create files but only the owner may delete their own. On many systems it is a tmpfs, meaning it lives in RAM and vanishes on reboot — and counts against memory.",
    realWorld: "A process writing large temporary files to a tmpfs /tmp is an unobvious cause of memory pressure.",
  },
  {
    path: "/usr",
    purpose: "The read-only bulk of the installed system.",
    detail:
      "Programs, libraries, headers and documentation installed by the package manager. Shareable and, in principle, mountable read-only. /usr/local is the parallel tree for software you install yourself, which package updates will not touch.",
    notable: [
      { name: "/usr/bin", what: "Nearly every command on the system." },
      { name: "/usr/local/bin", what: "Locally installed software. Usually earlier in PATH than /usr/bin." },
      { name: "/usr/share/doc", what: "Package documentation, including changelogs." },
    ],
  },
  {
    path: "/proc",
    purpose: "The kernel and its processes, presented as files.",
    virtual: true,
    detail:
      "A virtual filesystem generated on read. Nothing is stored on disk, which is why the files usually report size 0. Each running process has a numbered directory, and tools like ps, top, free and uptime are mostly just parsers of what is here.",
    notable: [
      { name: "/proc/meminfo", what: "What `free` reads." },
      { name: "/proc/cmdline", what: "The kernel command line this boot used." },
      { name: "/proc/<pid>/fd", what: "Every file descriptor a process holds — how you find a deleted file still consuming disk." },
      { name: "/proc/self", what: "A symlink to the reading process's own directory." },
    ],
    realWorld: "Answers questions no installed tool can, on a stripped-down container with no utilities.",
  },
  {
    path: "/sys",
    purpose: "The kernel device model.",
    virtual: true,
    detail:
      "Also virtual. Exposes buses, devices, drivers and their tunables as a structured tree. Where /proc grew organically and mixes concerns, sysfs is the deliberate, one-value-per-file replacement.",
    notable: [
      { name: "/sys/class/net", what: "Every network interface the kernel knows about." },
      { name: "/sys/block", what: "Block devices and their queue settings, including the I/O scheduler." },
    ],
  },
  {
    path: "/dev",
    purpose: "Device nodes.",
    virtual: true,
    detail:
      "Managed at runtime by udev. Character and block devices appear here as files so that ordinary read and write calls reach hardware — the clearest expression of “everything is a file”.",
    notable: [
      { name: "/dev/null", what: "Discards everything written to it." },
      { name: "/dev/urandom", what: "Cryptographically suitable random bytes." },
      { name: "/dev/sda, /dev/nvme0n1", what: "Whole disks. Writing to one directly destroys its partition table." },
    ],
  },
  {
    path: "/boot",
    purpose: "What is needed to start the kernel.",
    detail:
      "The kernel image, the initramfs and the bootloader's configuration. Often a small separate partition, which is why it is the filesystem that fills after several kernel updates and then breaks the next one.",
    notable: [{ name: "/boot/efi", what: "The EFI System Partition on UEFI systems. FAT-formatted." }],
  },
  {
    path: "/run",
    purpose: "Runtime state since boot.",
    virtual: true,
    detail:
      "A tmpfs holding PID files, sockets and locks for currently running software. Cleared on every boot by construction, which replaced the old and unreliable practice of clearing /var/run with a script.",
  },
  {
    path: "/opt, /srv, /mnt, /media",
    purpose: "Add-on software, served data, and mount points.",
    detail:
      "/opt is for self-contained third-party packages. /srv is for data this machine serves. /mnt is for temporary manual mounts, and /media is where removable devices are mounted automatically.",
  },
];
