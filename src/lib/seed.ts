import type { Chapter, Difficulty, Paper, Priority, TrackId } from "./types";

/**
 * IMPORTANT: chapter titles below are seeded from the standard NCTB textbook
 * structure and are NOT confirmed against the official HSC 2027 syllabus.
 * Every seeded chapter has titleVerified = false. Language-paper literature
 * units are "[Fill in]" placeholders on purpose. Verify and edit them in the
 * Syllabus tab (Edit → "Title checked against my textbook").
 *
 * Priority / difficulty / estimated hours are editable starting guesses.
 */

export const PAPERS: Paper[] = [
  { id: "bn1", name: "Bangla 1st Paper", short: "Bangla 1", subject: "Bangla", track: "language" },
  { id: "bn2", name: "Bangla 2nd Paper", short: "Bangla 2", subject: "Bangla", track: "language" },
  { id: "en1", name: "English 1st Paper", short: "English 1", subject: "English", track: "language" },
  { id: "en2", name: "English 2nd Paper", short: "English 2", subject: "English", track: "language" },
  { id: "ict", name: "ICT", short: "ICT", subject: "ICT", track: "ict" },
  { id: "hm1", name: "Higher Mathematics 1st Paper", short: "Higher Math 1", subject: "Higher Mathematics", track: "math" },
  { id: "hm2", name: "Higher Mathematics 2nd Paper", short: "Higher Math 2", subject: "Higher Mathematics", track: "math" },
  { id: "bio1", name: "Biology 1st Paper", short: "Biology 1", subject: "Biology", track: "biology" },
  { id: "bio2", name: "Biology 2nd Paper", short: "Biology 2", subject: "Biology", track: "biology" },
  { id: "chem1", name: "Chemistry 1st Paper", short: "Chemistry 1", subject: "Chemistry", track: "chemistry" },
  { id: "chem2", name: "Chemistry 2nd Paper", short: "Chemistry 2", subject: "Chemistry", track: "chemistry" },
  { id: "phy1", name: "Physics 1st Paper", short: "Physics 1", subject: "Physics", track: "physics" },
  { id: "phy2", name: "Physics 2nd Paper", short: "Physics 2", subject: "Physics", track: "physics" },
];

export const PAPER_BY_ID: Record<string, Paper> = Object.fromEntries(PAPERS.map((p) => [p.id, p]));

export const TRACKS: Record<TrackId, { label: string; weight: number; papers: string[] }> = {
  physics: { label: "Physics", weight: 0.2, papers: ["phy1", "phy2"] },
  math: { label: "Higher Mathematics", weight: 0.19, papers: ["hm1", "hm2"] },
  chemistry: { label: "Chemistry", weight: 0.15, papers: ["chem1", "chem2"] },
  biology: { label: "Biology", weight: 0.18, papers: ["bio1", "bio2"] },
  language: { label: "Bangla & English", weight: 0.2, papers: ["bn1", "bn2", "en1", "en2"] },
  ict: { label: "ICT", weight: 0.08, papers: ["ict"] },
};

export const TRACK_ORDER: TrackId[] = ["physics", "math", "chemistry", "biology", "language", "ict"];
export const SCIENCE_TRACKS: TrackId[] = ["physics", "math", "chemistry", "biology"];

type Row = [title: string, d: "E" | "M" | "H", p: "H" | "M" | "L", hours: number, placeholder?: boolean];

const D: Record<string, Difficulty> = { E: "Easy", M: "Medium", H: "Hard" };
const P: Record<string, Priority> = { H: "High", M: "Medium", L: "Low" };

const SEED: Record<string, Row[]> = {
  phy1: [
    ["Physical World and Measurement (ভৌতজগৎ ও পরিমাপ)", "M", "M", 6],
    ["Vectors (ভেক্টর)", "M", "H", 8],
    ["Dynamics (গতিবিদ্যা)", "H", "H", 10],
    ["Newtonian Mechanics (নিউটনিয়ান বলবিদ্যা)", "H", "H", 10],
    ["Work, Energy and Power (কাজ, শক্তি ও ক্ষমতা)", "M", "H", 8],
    ["Gravitation and Gravity (মহাকর্ষ ও অভিকর্ষ)", "H", "H", 9],
    ["Structural Properties of Matter (পদার্থের গাঠনিক ধর্ম)", "M", "M", 7],
    ["Periodic Motion (পর্যাবৃত্ত গতি)", "H", "H", 9],
    ["Waves (তরঙ্গ)", "M", "H", 8],
    ["Ideal Gas and Kinetic Theory of Gases (আদর্শ গ্যাস ও গ্যাসের গতিতত্ত্ব)", "M", "M", 6],
  ],
  phy2: [
    ["Thermodynamics (তাপগতিবিদ্যা)", "H", "H", 10],
    ["Static Electricity (স্থির তড়িৎ)", "H", "H", 10],
    ["Current Electricity (চল তড়িৎ)", "H", "H", 10],
    ["Magnetic Effects of Current and Magnetism (তড়িৎ প্রবাহের চৌম্বক ক্রিয়া ও চুম্বকত্ব)", "M", "H", 8],
    ["Electromagnetic Induction and Alternating Current (তড়িচ্চুম্বকীয় আবেশ ও পরিবর্তী প্রবাহ)", "H", "H", 9],
    ["Geometrical Optics (জ্যামিতিক আলোকবিজ্ঞান)", "M", "H", 8],
    ["Physical Optics (ভৌত আলোকবিজ্ঞান)", "M", "M", 7],
    ["Introduction to Modern Physics (আধুনিক পদার্থবিজ্ঞানের সূচনা)", "M", "H", 7],
    ["Atomic Model and Nuclear Physics (পরমাণুর মডেল ও নিউক্লিয়ার পদার্থবিজ্ঞান)", "M", "H", 8],
    ["Semiconductor and Electronics (সেমিকন্ডাক্টর ও ইলেকট্রনিক্স)", "M", "M", 7],
    ["Astronomy (জ্যোতির্বিজ্ঞান)", "E", "L", 4],
  ],
  chem1: [
    ["Laboratory Safety and Use (ল্যাবরেটরির নিরাপদ ব্যবহার)", "E", "M", 5],
    ["Qualitative Chemistry (গুণগত রসায়ন)", "H", "H", 12],
    ["Periodic Properties and Chemical Bonding (মৌলের পর্যায়বৃত্ত ধর্ম ও রাসায়নিক বন্ধন)", "H", "H", 11],
    ["Chemical Changes (রাসায়নিক পরিবর্তন)", "H", "H", 11],
    ["Vocational Chemistry (কর্মমুখী রসায়ন)", "M", "M", 8],
  ],
  chem2: [
    ["Environmental Chemistry (পরিবেশ রসায়ন)", "M", "M", 8],
    ["Organic Chemistry (জৈব রসায়ন)", "H", "H", 14],
    ["Quantitative Chemistry (পরিমাণগত রসায়ন)", "H", "H", 12],
    ["Electrochemistry (তড়িৎ রসায়ন)", "H", "H", 9],
    ["Economic Chemistry (অর্থনৈতিক রসায়ন)", "E", "M", 5],
  ],
  hm1: [
    ["Matrices and Determinants (ম্যাট্রিক্স ও নির্ণায়ক)", "M", "H", 8],
    ["Vectors (ভেক্টর)", "M", "H", 9],
    ["Straight Lines (সরলরেখা)", "M", "H", 8],
    ["Circles (বৃত্ত)", "M", "H", 8],
    ["Permutations and Combinations (বিন্যাস ও সমাবেশ)", "M", "M", 7],
    ["Trigonometric Ratios (ত্রিকোণমিতিক অনুপাত)", "M", "M", 6],
    ["Trigonometric Ratios of Associated and Compound Angles (সংযুক্ত ও যৌগিক কোণের ত্রিকোণমিতিক অনুপাত)", "H", "M", 8],
    ["Functions and Graphs of Functions (ফাংশন ও ফাংশনের লেখচিত্র)", "M", "M", 7],
    ["Differentiation (অন্তরীকরণ)", "H", "H", 10],
    ["Integration (যোগজীকরণ)", "H", "H", 10],
  ],
  hm2: [
    ["Real Numbers and Inequalities (বাস্তব সংখ্যা ও অসমতা)", "E", "M", 6],
    ["Linear Programming (যোগাশ্রয়ী প্রোগ্রাম)", "E", "M", 5],
    ["Complex Numbers (জটিল সংখ্যা)", "H", "H", 9],
    ["Polynomials and Polynomial Equations (বহুপদী ও বহুপদী সমীকরণ)", "H", "H", 9],
    ["Binomial Expansion (দ্বিপদী বিস্তৃতি)", "M", "M", 7],
    ["Conics (কনিক)", "H", "H", 11],
    ["Inverse Trigonometric Functions and Trigonometric Equations (বিপরীত ত্রিকোণমিতিক ফাংশন ও ত্রিকোণমিতিক সমীকরণ)", "H", "H", 9],
    ["Statics (স্থিতিবিদ্যা)", "H", "H", 9],
    ["Motion of a Particle in a Plane (সমতলে বস্তুকণার গতি)", "H", "H", 10],
    ["Measures of Dispersion and Probability (বিস্তার পরিমাপ ও সম্ভাবনা)", "M", "M", 8],
  ],
  bio1: [
    ["Cell and Its Structure (কোষ ও এর গঠন)", "M", "H", 7],
    ["Cell Division (কোষ বিভাজন)", "M", "H", 6],
    ["Cell Chemistry (কোষ রসায়ন)", "H", "H", 8],
    ["Microorganisms (অণুজীব)", "M", "M", 6],
    ["Algae and Fungi (শৈবাল ও ছত্রাক)", "M", "M", 6],
    ["Bryophyta and Pteridophyta (ব্রায়োফাইটা ও টেরিডোফাইটা)", "M", "M", 5],
    ["Gymnosperms and Angiosperms (নগ্নবীজী ও আবৃতবীজী উদ্ভিদ)", "M", "M", 6],
    ["Tissue and Tissue System (টিস্যু ও টিস্যুতন্ত্র)", "M", "H", 7],
    ["Plant Physiology (উদ্ভিদ শারীরতত্ত্ব)", "H", "H", 10],
    ["Plant Reproduction (উদ্ভিদ প্রজনন)", "M", "M", 6],
    ["Biotechnology (জীবপ্রযুক্তি)", "M", "M", 6],
    ["Biodiversity and Conservation (জীবের পরিবেশ, বিস্তার ও সংরক্ষণ)", "E", "M", 5],
  ],
  bio2: [
    ["Animal Diversity and Classification (প্রাণীর বিভিন্নতা ও শ্রেণিবিন্যাস)", "M", "M", 7],
    ["Animal Identity (প্রাণীর পরিচিতি)", "M", "M", 6],
    ["Digestion and Absorption (পরিপাক ও শোষণ)", "M", "H", 6],
    ["Blood and Circulation (রক্ত ও সঞ্চালন)", "M", "H", 7],
    ["Gas Exchange (গ্যাসীয় বিনিময়)", "M", "M", 5],
    ["Waste and Excretion (বর্জ্য ও নিষ্কাশন)", "M", "M", 5],
    ["Locomotion and Movement (চলন ও অঙ্গচালনা)", "M", "M", 5],
    ["Coordination and Control (সমন্বয় ও নিয়ন্ত্রণ)", "H", "H", 8],
    ["Human Life Cycle (মানব জীবনের ধারা)", "M", "M", 6],
    ["Immunity (মানবদেহের প্রতিরক্ষা)", "M", "M", 5],
    ["Genetics and Evolution (জীনতত্ত্ব ও বিবর্তন)", "H", "H", 9],
    ["Animal Behaviour (প্রাণীর আচরণ)", "E", "L", 4],
  ],
  ict: [
    ["ICT: Global and Bangladesh Perspective (তথ্য ও যোগাযোগ প্রযুক্তি: বিশ্ব ও বাংলাদেশ প্রেক্ষিত)", "M", "H", 6],
    ["Communication Systems and Computer Networking (কমিউনিকেশন সিস্টেমস ও কম্পিউটার নেটওয়ার্কিং)", "M", "H", 7],
    ["Number Systems and Digital Devices (সংখ্যা পদ্ধতি ও ডিজিটাল ডিভাইস)", "H", "H", 9],
    ["Web Design Introduction and HTML (ওয়েব ডিজাইন পরিচিতি ও এইচটিএমএল)", "M", "H", 8],
    ["Programming Language (প্রোগ্রামিং ভাষা)", "H", "H", 10],
    ["Database Management System (ডেটাবেজ ম্যানেজমেন্ট সিস্টেম)", "M", "H", 8],
  ],
  bn1: [
    ["[Fill in] Prose (গদ্য) — text 1", "M", "M", 4, true],
    ["[Fill in] Prose (গদ্য) — text 2", "M", "M", 4, true],
    ["[Fill in] Prose (গদ্য) — text 3", "M", "M", 4, true],
    ["[Fill in] Poetry (কবিতা) — set 1", "M", "M", 4, true],
    ["[Fill in] Poetry (কবিতা) — set 2", "M", "M", 4, true],
    ["[Fill in] Novel / prescribed supplementary reading", "M", "M", 5, true],
    ["[Fill in] Short stories", "M", "M", 4, true],
    ["[Fill in] Drama", "M", "M", 4, true],
  ],
  bn2: [
    ["Sounds, letters and spelling rules (ধ্বনি, বর্ণ ও বানান)", "M", "M", 4],
    ["Word formation and vocabulary (শব্দ গঠন ও শব্দভান্ডার)", "M", "M", 4],
    ["Parts of speech and sentence structure (পদ ও বাক্য)", "M", "M", 4],
    ["Translation and correct usage (অনুবাদ ও শুদ্ধ প্রয়োগ)", "M", "M", 4],
    ["Writing: summary and amplification (সারাংশ, সারমর্ম, ভাব-সম্প্রসারণ)", "M", "H", 4],
    ["Writing: letters, applications and reports (পত্র, আবেদন, প্রতিবেদন)", "M", "H", 4],
    ["Writing: essays (প্রবন্ধ রচনা)", "M", "H", 4],
    ["Mixed grammar revision", "M", "M", 3],
  ],
  en1: [
    ["[Fill in] Textbook units — group 1", "M", "M", 4, true],
    ["[Fill in] Textbook units — group 2", "M", "M", 4, true],
    ["[Fill in] Textbook units — group 3", "M", "M", 4, true],
    ["[Fill in] Textbook units — group 4", "M", "M", 4, true],
    ["Reading comprehension: seen and unseen passages", "M", "H", 4],
    ["Vocabulary and gap-filling practice", "M", "M", 4],
    ["Writing: paragraphs, letters and applications", "M", "H", 4],
    ["Writing: reports, summaries and composition", "M", "H", 4],
  ],
  en2: [
    ["Right forms of verbs, tense and subject-verb agreement", "M", "H", 4],
    ["Articles, prepositions and determiners", "M", "M", 4],
    ["Connectors, clauses and sentence transformation", "M", "H", 4],
    ["Completing sentences, editing and gap-filling", "M", "M", 4],
    ["Writing formats: paragraphs and letters", "M", "H", 4],
    ["Writing formats: reports, applications and emails", "M", "H", 4],
    ["Writing formats: dialogues, graph description and composition", "M", "M", 4],
    ["Mixed grammar revision", "M", "M", 3],
  ],
};

export function seedChapters(): Chapter[] {
  const out: Chapter[] = [];
  for (const paper of PAPERS) {
    (SEED[paper.id] ?? []).forEach((row, i) => {
      const [title, d, p, hours, placeholder] = row;
      out.push({
        id: `${paper.id}-${i + 1}`,
        paperId: paper.id,
        number: i + 1,
        title,
        titleVerified: false,
        placeholder: !!placeholder,
        priority: P[p],
        difficulty: D[d],
        status: "Not Started",
        plannedStart: "",
        plannedFinish: "",
        actualCompletion: "",
        estHours: hours,
        theory: false,
        notes: false,
        cq: false,
        mcq: false,
        rev1: false,
        rev2: false,
        confidence: 0,
        weakAreas: "",
      });
    });
  }
  return out;
}

export const DEFAULT_PREP: { id: string; label: string; done: boolean }[] = [
  { id: "prep-1", label: "List every chapter still not Completed and assign a catch-up date", done: false },
  { id: "prep-2", label: "Build a CQ and MCQ error log for each paper", done: false },
  { id: "prep-3", label: "Collect board questions and model-test papers for all papers", done: false },
  { id: "prep-4", label: "Prepare practical notebooks and experiment lists (Physics, Chemistry, Biology, ICT)", done: false },
  { id: "prep-5", label: "Make one-page formula / equation / diagram sheets for each science paper", done: false },
  { id: "prep-6", label: "Draft the January revision timetable and model-test calendar", done: false },
];
