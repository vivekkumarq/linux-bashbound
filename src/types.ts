export type Difficulty = "Beginner" | "Intermediate" | "Advanced" | "Expert";
export type Track = "Linux" | "Unix" | "Bash" | "POSIX";
export type CommandCategory =
  | "File"
  | "Text Processing"
  | "Networking"
  | "Process"
  | "System Administration"
  | "Security"
  | "Archive"
  | "Shell"
  | "Storage"
  | "Package";

export type QuestionType =
  | "Conceptual"
  | "Command"
  | "Output"
  | "Scenario"
  | "Troubleshooting"
  | "Multiple choice"
  | "What happens when"
  | "Why"
  | "How would you";

export interface RoadmapLevel {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  difficulty: Exclude<Difficulty, "Expert">;
  hours: number;
  summary: string;
  topics: string[];
  prerequisites: number[];
}

export interface Concept {
  id: string;
  title: string;
  simple: string;
  technical: string;
  analogy: string;
  example: {
    command: string;
    output: string;
    explanation: string;
  };
  mistakes: string[];
  practices: string[];
  exercise: { prompt: string; solution: string };
  interview: { question: string; answer: string };
  related: string[];
  whereUsed?: string[];
  takeaway?: string;
}

export interface Topic {
  slug: string;
  title: string;
  level: number;
  difficulty: Exclude<Difficulty, "Expert">;
  minutes: number;
  summary: string;
  why: string;
  prerequisites: string[];
  concepts: Concept[];
  references: { label: string; href: string }[];
}

export interface CommandEntry {
  name: string;
  summary: string;
  category: CommandCategory;
  syntax: string;
  purpose: string;
  flags: { flag: string; meaning: string }[];
  examples: { title: string; command: string; note: string }[];
  realWorld: string;
  mistakes?: string[];
  interview?: string[];
  related: string[];
  posix?: boolean;
  gnu?: boolean;
  destructive?: boolean;
  warning?: string;
}

export interface InterviewQuestion {
  id: number;
  question: string;
  category: string;
  difficulty: Difficulty;
  operatingSystem: Track[];
  tags: string[];
  type: QuestionType;
  answer: string;
  explanation: string;
  example?: string;
  relatedTopics: string[];
  choices?: string[];
  correctIndex?: number;
}

export interface Challenge {
  id: string;
  title: string;
  prompt: string;
  difficulty: Exclude<Difficulty, "Expert">;
  tags: string[];
  hints: string[];
  approach: string;
  solution: string;
}

export interface LabStep {
  id: string;
  prompt: string;
  options: { id: string; label: string; next: string; note: string }[];
}

export interface Lab {
  id: string;
  title: string;
  alert: string;
  symptom: string;
  goal: string;
  start: string;
  steps: Record<string, LabStep>;
  resolution: string;
}

export interface CheatSheet {
  slug: string;
  title: string;
  description: string;
  groups: { heading: string; rows: { item: string; meaning: string }[] }[];
}

export interface QuizConfig {
  count: 10 | 25 | 50;
  category: string;
}

export interface ProgressState {
  completedTopics: string[];
  bookmarkedQuestions: number[];
  masteredQuestions: number[];
  seenQuestions: number[];
  quizHistory: {
    at: number;
    category: string;
    score: number;
    total: number;
    weak: string[];
  }[];
  challengeDays: string[];
  lastVisit: string | null;
  streak: number;
  theme: "dark" | "midnight" | "forest" | "light" | "paper" | "contrast" | "system";
  font: "sans" | "serif" | "mono";
}
