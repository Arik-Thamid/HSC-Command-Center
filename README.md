# HSC 2027 Command Center

Next.js 14 (App Router) + TypeScript + Tailwind CSS + Zustand. Data is saved automatically in the browser (localStorage); export backups from Settings.

## Run
```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production
npm run check:plan # prints workload report for the generated 83-day plan
```
Deploy to Vercel or any Node host as-is. No environment variables or database needed.

## Pages
Command Center (/), Daily Planner (/planner), Syllabus (/syllabus), Revision (/revision), Tests (/tests), Weekly Review (/weekly), 83-Day Roadmap (/roadmap), Daily page (/daily/YYYY-MM-DD), Settings & Data (/settings).

## Important
- Chapter titles are seeded from the standard NCTB textbook structure and are NOT verified against the official HSC 2027 syllabus. Language-paper literature units are "[Fill in]" placeholders. Edit them in Syllabus.
- Priority, difficulty and estimated hours are editable guesses; the workload verdict depends on them.
- Data lives per browser/device. Back up regularly.
# HSC-Command-Center
# HSC-Command-Center
