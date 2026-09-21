import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.tsx";
import "./styles/global.css";
import "./styles/appearance.css";
import "./styles/features.css";
import "./styles/interactive.css";
import "./styles/lesson.css";
import "./styles/shortcuts.css";
import "./styles/arena.css";
import "./styles/quiz.css";
import { HomePage } from "./pages/HomePage.tsx";

// Restores the path that public/404.html stashed before GitHub Pages served
// the SPA shell, so a direct hit on /learn/inodes-and-links lands correctly.
const redirect = sessionStorage.getItem("bb-spa-redirect");
if (redirect) {
  sessionStorage.removeItem("bb-spa-redirect");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const path = redirect.startsWith(base) ? redirect.slice(base.length) || "/" : redirect;
  window.history.replaceState(null, "", `${base}${path.startsWith("/") ? path : `/${path}`}`);
}

// Home ships with the shell because it is the entry point for most visits.
// Every other route is split, so the question bank, command corpus and lesson
// text are fetched only when someone actually opens them.
const page = (load: () => Promise<Record<string, React.ComponentType>>, name: string) => async () => ({
  Component: (await load())[name],
});

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,
      children: [
        { index: true, element: <HomePage /> },
        { path: "roadmap", lazy: page(() => import("./pages/RoadmapPage.tsx"), "RoadmapPage") },
        { path: "learn", lazy: page(() => import("./pages/LearnIndexPage.tsx"), "LearnIndexPage") },
        { path: "learn/:slug", lazy: page(() => import("./pages/TopicPage.tsx"), "TopicPage") },
        { path: "commands", lazy: page(() => import("./pages/CommandsPage.tsx"), "CommandsPage") },
        { path: "commands/:name", lazy: page(() => import("./pages/CommandsPage.tsx"), "CommandsPage") },
        { path: "interview", lazy: page(() => import("./pages/InterviewPage.tsx"), "InterviewPage") },
        { path: "interview/:id", lazy: page(() => import("./pages/InterviewPage.tsx"), "InterviewPage") },
        { path: "quizzes", lazy: page(() => import("./pages/QuizPage.tsx"), "QuizPage") },
        { path: "challenges", lazy: page(() => import("./pages/ChallengesPage.tsx"), "ChallengesPage") },
        { path: "cheatsheets", lazy: page(() => import("./pages/CheatSheetsPage.tsx"), "CheatSheetsPage") },
        { path: "cheatsheets/:slug", lazy: page(() => import("./pages/CheatSheetsPage.tsx"), "CheatSheetsPage") },
        { path: "troubleshooting", lazy: page(() => import("./pages/LabsPage.tsx"), "LabsPage") },
        { path: "troubleshooting/:id", lazy: page(() => import("./pages/LabsPage.tsx"), "LabsPage") },
        { path: "progress", lazy: page(() => import("./pages/ProgressPage.tsx"), "ProgressPage") },
        { path: "terminal", lazy: page(() => import("./pages/TerminalPage.tsx"), "TerminalPage") },
        { path: "*", lazy: page(() => import("./pages/NotFoundPage.tsx"), "NotFoundPage") },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
