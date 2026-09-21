# Linux BashBound

**From first command to system mastery.**

An interactive Linux and Unix learning environment. Start at "what is an operating system", finish at production troubleshooting, kernel internals and interview readiness — without leaving the browser.

No account, no server, no backend. Progress lives in `localStorage` on the device you learn on.

**Live site:** [vivekkumarq.github.io/linux-bashbound](https://vivekkumarq.github.io/linux-bashbound/)

[Start learning](https://vivekkumarq.github.io/linux-bashbound/learn) · [Roadmap](https://vivekkumarq.github.io/linux-bashbound/roadmap) · [Commands](https://vivekkumarq.github.io/linux-bashbound/commands) · [Interview Arena](https://vivekkumarq.github.io/linux-bashbound/interview) · [Terminal](https://vivekkumarq.github.io/linux-bashbound/terminal) · [Labs](https://vivekkumarq.github.io/linux-bashbound/troubleshooting)

---

## What this is

A written Linux course with a practice layer on top of it.

If you have never opened a terminal, the beginner path starts at the operating system and walks you to your first commands. If you already live on servers, skip ahead: jump a roadmap level, drill the arena, or work an incident lab.

Every module answers the same six questions:

1. Where am I in the course?
2. What should I learn next?
3. Why does this matter?
4. Where is it used in real systems?
5. What should I type?
6. What will an interviewer ask?

## What is actually in here

These numbers are counted from the content at build time by `scripts/content-stats.mjs` and written into `src/data/stats.generated.ts`. Nothing in the UI prints a figure that was not measured.

| | |
|---:|---|
| **16** | roadmap levels |
| **40** | modules |
| **122** | concepts |
| **128** | commands |
| **1,282** | interview questions |
| **86** | multiple-choice questions driving the quiz engine |
| **30** | daily challenges |
| **9** | incident labs |
| **11** | cheat sheets |

Every interview question is either hand-written or derived from a lesson field that was already authored as a question and an answer — a concept's own interview Q&A, its exercise, its worked output, its common mistake. Prose restated as a pseudo-question ("explain in simple terms: X") is deliberately **not** generated, because padding a counter is not the same as having questions.

## The curriculum

Sixteen levels, in dependency order:

| Level | Focus | Level | Focus |
|------:|-------|------:|-------|
| 00 | Linux fundamentals | 08 | System administration |
| 01 | Terminal and shell | 09 | Storage and filesystems |
| 02 | Filesystem | 10 | Security |
| 03 | Users and permissions | 11 | Performance and monitoring |
| 04 | Processes | 12 | Networking internals |
| 05 | Networking | 13 | Advanced Linux |
| 06 | Package management | 14 | Unix and POSIX |
| 07 | Bash scripting | 15 | Production Linux |

Each level shows its status — locked, available, in progress, completed, mastered — and draws a rail that fills as you finish its modules. Nothing is gated: if you already know a level, skip it and the map catches up.

## Features

### Learning

- **Modules** — simple explanation, technical explanation, analogy, worked example with real output, common mistakes, best practices, an exercise, and interview relevance
- **Mastery** — four independent signals per module (read, practised, quiz passed, interview tested) rather than one "completed" tick, each linking to the thing that would satisfy it
- **Focus mode** — <kbd>f</kbd> strips the shell down to the lesson
- **Continue learning** — the home page resumes at the next unfinished module

### Interactive explainers

- **Permission builder** — toggle any bit and the mode string, the octal value and the `chmod` command move together; special bits included, and the meaning of each bit differs correctly between a file and a directory
- **Under the hood** — step through what actually happens when you type `ls`, open a URL, fork a process, or build a pipeline
- **Filesystem tree** — every top-level directory, including which ones the kernel generates rather than stores

### Practice

- **Terminal sandbox** — a simulated shell over an in-memory filesystem. Pipes, `>` and `>>` redirection, `*` and `?` globbing, tab completion, and command history. Filters read stdin when given no file, so `cat f | grep x | wc -l` behaves. Nothing reaches the host.
- **Command explorer** — 128 commands with syntax, flags, examples, real-world use, mistakes, copy, and try-in-terminal
- **Interview Arena** — filter by category, difficulty, OS family and bookmarks; multiple-choice questions are answerable with immediate feedback; revealing an answer points at the lesson that teaches it
- **Quizzes** — 10, 25 or 50 questions, then score and weak areas
- **Daily challenge** — one practical task, hints before solutions
- **Incident labs** — disk full, high CPU, DNS failure, SSH lockout, zombies, and more

### Everywhere

- **Command palette** — <kbd>Ctrl</kbd>+<kbd>K</kbd> searches modules, commands, questions and cheat sheets
- **Keyboard shortcuts** — <kbd>?</kbd> for the list; <kbd>n</kbd>/<kbd>p</kbd> between modules, <kbd>g</kbd> then a letter to jump, <kbd>r</kbd> for a random question, <kbd>t</kbd> for theme
- **Seven palettes** — light, paper, dark, midnight, forest, contrast, and system; three type choices
- **Accessibility** — semantic HTML, keyboard-reachable interactive diagrams, visible focus states, and `prefers-reduced-motion` honoured throughout

Destructive tools — `rm`, `dd`, `mkfs`, `fdisk`, `chmod -R`, `rsync --delete` — carry warnings and safe examples. The sandbox refuses `rm -rf /` the way a real system does.

## Screenshots

<!-- Add screenshots to docs/screenshots/ and link them here. -->

| | |
|---|---|
| Home | `docs/screenshots/home.png` |
| Roadmap | _to add_ |
| Lesson with permission builder | _to add_ |
| Terminal sandbox | _to add_ |
| Interview Arena | _to add_ |

## Tech stack

| Area | Choice |
| ---- | ------ |
| UI | React 19, TypeScript |
| Build | Vite 8 |
| Routing | React Router 7, code-split per route |
| Styling | Hand-written CSS with design tokens — no framework |
| State | `localStorage`, no account |
| Hosting | GitHub Pages from this repository |

No API, no database, no authentication, no UI library. Three runtime dependencies: `react`, `react-dom`, `react-router-dom`.

## Project structure

```
scripts/
├── content-stats.mjs     counts content, validates it, fails the build on broken links
└── terminal-test.mjs     smoke test for the shell layer
src/
├── components/
│   ├── interactive/      permission builder, flow diagram, filesystem tree
│   └── …                 navbar, terminal, palette, shortcuts, mastery
├── pages/                one per route
├── data/                 levels, modules, commands, questions, labs, flows
├── lib/                  terminal engine, shell layer, learning state
├── hooks/                store access
├── utils/                search, storage
└── styles/               tokens, then one file per feature area
```

Content lives in `src/data/` and never inside a component, so adding a module, a command, a question or an explainer is a data change.

## Local setup

Node.js 20+ and npm.

```bash
git clone https://github.com/vivekkumarq/linux-bashbound.git
cd linux-bashbound
npm install
npm run dev          # http://127.0.0.1:4321
```

```bash
npm run build        # regenerates stats, type-checks, then builds
npm run preview      # serve the production build
npm test             # terminal sandbox checks
npm run lint
npm run stats        # print content counts and integrity problems
```

`npm run build` runs `npm run stats` first. That step fails the build on content that would render as a broken page: an unanswerable quiz question, a roadmap level pointing at a module that does not exist, an unreachable module, or a dangling prerequisite.

## Deployment

GitHub Pages, published from this repository by `.github/workflows/pages.yml` on every push to `main`. It installs, builds with `BASE_PATH=/linux-bashbound/`, and publishes `dist/`. Pages is set to **Source: GitHub Actions**.

Deep links survive a refresh: `public/404.html` stashes the requested path and `src/main.tsx` restores it before the router mounts.

## Contributing

Issues and pull requests are welcome.

- **Add a module** — a new entry in `src/data/topics.ts`, listed on a level in `src/data/roadmap.ts`. `npm run stats` will tell you if it is unreachable.
- **Add a command** — an entry in `src/data/commands.ts`. Related commands that this site does not document render as plain text rather than dead links.
- **Add interview questions** — `src/data/questions.ts`. Hand-written entries only; please do not add generators that restate prose as questions.
- **Add an explainer** — a new flow is a data entry in `src/data/flows.ts`, then one line in `src/components/interactive/forTopic.tsx`.

Before opening a PR, run `npm run build` and `npm test`.

Accuracy matters more than volume here. Commands and output must be correct, and behaviour that differs between distributions, shells or between GNU and POSIX should say so explicitly.

## Roadmap

- Terminal tasks with success conditions, so a lesson can verify the exercise was completed rather than take your word for it
- More multiple-choice coverage, so every category can fill a 50-question quiz
- Network and process visualisers built on the same flow primitive
- A concept graph linking modules, commands and questions

## Licence

MIT. See [LICENSE](LICENSE).

Linux is a registered trademark of Linus Torvalds. Unix is a registered trademark of The Open Group. This project is independent educational material and is not affiliated with those trademark holders, with any distribution vendor, or with the Linux Foundation.
