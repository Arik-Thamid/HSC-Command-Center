export type Priority = "High" | "Medium" | "Low";
export type Difficulty = "Easy" | "Medium" | "Hard";
export type ChapterStatus = "Not Started" | "In Progress" | "Completed" | "Needs Revision";
export type TaskType = "Learn" | "Practice" | "Revise" | "Test" | "Practical";
export type TaskStatus = "Not Started" | "In Progress" | "Completed" | "Skipped";
export type TestType = "CQ" | "MCQ" | "Written" | "Practical" | "Model Test";
export type TrackId = "physics" | "math" | "chemistry" | "biology" | "language" | "ict";
export type TaskKind = "chapter" | "recall" | "review" | "audit" | "manual";

export interface Paper {
  id: string;
  name: string;
  short: string;
  subject: string;
  track: TrackId;
}

export interface Chapter {
  id: string;
  paperId: string;
  number: number;
  title: string;
  /** true once the student has checked the title against the textbook / syllabus */
  titleVerified: boolean;
  /** true when the title is a "[Fill in]" placeholder */
  placeholder: boolean;
  priority: Priority;
  difficulty: Difficulty;
  status: ChapterStatus;
  plannedStart: string;
  plannedFinish: string;
  actualCompletion: string;
  estHours: number;
  theory: boolean;
  notes: boolean;
  cq: boolean;
  mcq: boolean;
  rev1: boolean;
  rev2: boolean;
  /** 0 = not rated yet, 1-5 otherwise */
  confidence: number;
  weakAreas: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface Task {
  id: string;
  date: string;
  paperId: string | null;
  chapterId: string | null;
  topic: string;
  type: TaskType;
  kind: TaskKind;
  plannedMin: number;
  actualMin: number;
  status: TaskStatus;
  difficulty: Difficulty;
  questionsSolved: number;
  mistakes: number;
  notes: string;
  checklist: ChecklistItem[];
  completedOn: string;
  generated: boolean;
}

export interface Revision {
  chapterId: string;
  firstStudyDate: string;
  r1Date: string;
  r2Date: string;
  r3Date: string;
  r1Done: string;
  r2Done: string;
  r3Done: string;
  previousMistakes: string;
  nextAction: string;
}

export interface TestRecord {
  id: string;
  date: string;
  paperId: string;
  chapterId: string | null;
  type: TestType;
  totalMarks: number;
  marksObtained: number | null;
  timeTakenMin: number;
  mistakes: string;
  weakTopics: string;
  followUp: string;
  generated: boolean;
}

export interface WeeklyReview {
  weekStart: string;
  repeatedMistakes: string;
  reasonsBehind: string;
  nextPriorities: string;
  recoveryPlan: string;
  honestNote: string;
}

export interface DailyPage {
  date: string;
  mainGoal: string;
  secondGoal: string;
  practiceTarget: string;
  sessionNotes: Record<string, string>;
  finished: string;
  recall: string;
  questions: string;
  mistakes: string;
  unfinished: string;
  tomorrow: string;
}

export interface PrepItem {
  id: string;
  label: string;
  done: boolean;
}

export interface Settings {
  startDate: string;
  endDate: string;
  /** total hours per study day, including the daily recall block */
  dailyHours: number;
  /** number of final days reserved for audit / weak chapters / mixed practice */
  auditDays: number;
  /** 0 = Sunday ... 5 = Friday, 6 = Saturday */
  restWeekday: number;
  weekStartsOn: number;
}

export interface TrackReport {
  track: TrackId;
  label: string;
  chapters: number;
  requiredHours: number;
  availableHours: number;
  scale: number;
  overflowChapters: string[];
}

export interface PlanReport {
  generatedOn: string;
  fromDate: string;
  studyDays: number;
  reviewDays: number;
  auditDays: number;
  tracks: TrackReport[];
  requiredHours: number;
  availableHours: number;
  verdict: "ok" | "tight" | "overloaded";
}
