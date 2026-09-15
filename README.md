# Linux BashBound

**From first command to system mastery.**

A structured Linux and Unix learning site. Open it, pick a starting point, and move through the command line, Bash, filesystems, permissions, processes, networking, packaging, scripting, administration, storage, security, performance, internals, POSIX, and interview practice.

The whole course runs in the browser. There is no account, no server, and no backend. Progress stays on this device.

**Live site:** [https://vivekkumarq.github.io/linux-bashbound/](https://vivekkumarq.github.io/linux-bashbound/)

[Start learning](https://vivekkumarq.github.io/linux-bashbound/learn) · [Roadmap](https://vivekkumarq.github.io/linux-bashbound/roadmap) · [Command explorer](https://vivekkumarq.github.io/linux-bashbound/commands) · [Interview Arena](https://vivekkumarq.github.io/linux-bashbound/interview) · [Daily challenge](https://vivekkumarq.github.io/linux-bashbound/challenges) · [Troubleshooting lab](https://vivekkumarq.github.io/linux-bashbound/troubleshooting)

---

## What this is

A written Linux course with a practice layer on top of it.

If you have never opened a terminal, the beginner path starts at the operating system and walks you to your first commands. If you already live on servers, skip ahead: test yourself, jump a roadmap level, or drill interview questions.

Every lesson answers the same questions:

1. Where am I?
2. What should I learn next?
3. Why does this matter?
4. Where is it used?
5. What should I type?
6. What will an interviewer ask?

The in-browser terminal is **Simulation Mode**. It keeps a fake filesystem so you can practise `pwd`, `ls`, `cd`, `mkdir`, and friends without touching a real machine.

## The curriculum

Sixteen levels, meant to be followed in order if you are new:

| Level | Focus |
|------:|-------|
| 0 | Linux fundamentals |
| 1 | Terminal and shell |
| 2 | Filesystem |
| 3 | Users and permissions |
| 4 | Processes |
| 5 | Networking |
| 6 | Package management |
| 7 | Bash scripting |
| 8 | System administration |
| 9 | Storage and filesystems |
| 10 | Security |
| 11 | Performance and monitoring |
| 12 | Networking internals |
| 13 | Advanced Linux |
| 14 | Unix and POSIX |
| 15 | Production Linux |

A dedicated beginner path sequences the first modules so the first click is never a guess.

## What you can do on the site

- **Learn** — each concept has a simple explanation, a technical explanation, an analogy, a command, expected output, mistakes, an exercise, and interview relevance
- **Roadmap** — click a level, see difficulty, time, prerequisites, and completion
- **Command explorer** — search `grep`, `chmod`, `ss`, `journalctl`… syntax, flags, examples, copy, try in the simulator
- **Interview Arena** — 1,000+ questions with filters, bookmarks, mastered flags, and random draw
- **Quizzes** — 10, 25, or 50 questions, then score and weak areas
- **Daily challenge** — one practical task, hints first, solution when you ask
- **Troubleshooting labs** — incident paths (disk full, high CPU, DNS, SSH, zombies…)
- **Cheat sheets** — commands, Bash, networking, systemd, SSH, Vim, regex
- **My Learning** — local progress, streak, bookmarks (no login)

Destructive tools such as `rm`, `chmod -R`, `fdisk`, and `rsync --delete` carry warnings and safe examples.

## Tech stack

| Area | Choice |
| ---- | ------ |
| UI | React 19, TypeScript |
| Build | Vite |
| Routing | React Router |
| Styling | CSS custom properties, dark / light / system |
| State | `localStorage` in this browser |
| Hosting | GitHub Pages, published from this repository |

No API, no database, no authentication.

## Project structure

```
src/
├── components/     navigation, terminal, diagrams, code blocks
├── pages/          home, learn, roadmap, commands, interview, quizzes, labs
├── data/           lessons, commands, questions, challenges, cheat sheets
├── lib/            terminal simulator
├── hooks/          theme and progress store
├── utils/          search and storage
└── styles/         design tokens
```

Lessons and questions live in `src/data/` so the UI does not hard-code the curriculum.

## Local setup

Node.js 20+ and npm.

```bash
git clone https://github.com/vivekkumarq/linux-bashbound.git
cd linux-bashbound
npm install
npm run dev
```

The app is at [http://127.0.0.1:4321](http://127.0.0.1:4321).

```bash
npm run build
npm run preview
npm run lint
```

## Deployment

Hosted on **GitHub Pages from this repository**.

Live URL: [https://vivekkumarq.github.io/linux-bashbound/](https://vivekkumarq.github.io/linux-bashbound/)

Pushing to `main` runs `.github/workflows/pages.yml`. It installs dependencies, builds with `BASE_PATH=/linux-bashbound/`, and publishes `dist/`. Pages is set to **Source: GitHub Actions**. `public/404.html` restores deep links after a refresh.

## Licence

MIT. See [LICENSE](LICENSE).

Linux is a registered trademark of Linus Torvalds. Unix is a registered trademark of The Open Group. This project is independent educational material and is not affiliated with those trademark holders.
