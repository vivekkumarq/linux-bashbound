import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.tsx";
import "./styles/global.css";
import "./styles/appearance.css";
import { HomePage } from "./pages/HomePage.tsx";
import { RoadmapPage } from "./pages/RoadmapPage.tsx";
import { LearnIndexPage } from "./pages/LearnIndexPage.tsx";
import { TopicPage } from "./pages/TopicPage.tsx";
import { CommandsPage } from "./pages/CommandsPage.tsx";
import { InterviewPage } from "./pages/InterviewPage.tsx";
import { QuizPage } from "./pages/QuizPage.tsx";
import { ChallengesPage } from "./pages/ChallengesPage.tsx";
import { CheatSheetsPage } from "./pages/CheatSheetsPage.tsx";
import { LabsPage } from "./pages/LabsPage.tsx";
import { ProgressPage } from "./pages/ProgressPage.tsx";
import { TerminalPage } from "./pages/TerminalPage.tsx";

const redirect = sessionStorage.getItem("bb-spa-redirect");
if (redirect) {
  sessionStorage.removeItem("bb-spa-redirect");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const path = redirect.startsWith(base) ? redirect.slice(base.length) || "/" : redirect;
  window.history.replaceState(null, "", `${base}${path.startsWith("/") ? path : `/${path}`}`);
}

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,
      children: [
        { index: true, element: <HomePage /> },
        { path: "roadmap", element: <RoadmapPage /> },
        { path: "learn", element: <LearnIndexPage /> },
        { path: "learn/:slug", element: <TopicPage /> },
        { path: "commands", element: <CommandsPage /> },
        { path: "commands/:name", element: <CommandsPage /> },
        { path: "interview", element: <InterviewPage /> },
        { path: "interview/:id", element: <InterviewPage /> },
        { path: "quizzes", element: <QuizPage /> },
        { path: "challenges", element: <ChallengesPage /> },
        { path: "cheatsheets", element: <CheatSheetsPage /> },
        { path: "cheatsheets/:slug", element: <CheatSheetsPage /> },
        { path: "troubleshooting", element: <LabsPage /> },
        { path: "progress", element: <ProgressPage /> },
        { path: "terminal", element: <TerminalPage /> },
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
