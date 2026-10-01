/**
 * SWP391 Syllabus Data
 * Standalone syllabus definition for "Software Development Project" subject.
 * Used by seed.ts to populate the SyllabusData column.
 */

export const SWP391_SYLLABUS = {
    code: 'SWP391',
    name: 'Software Development Project',
    noCredit: 3,
    degreeLevel: 'Bachelor',
    timeAllocation: 'Study hour (150h) = 45h contact hours + 1h Project Presentation + 104h self-study',
    preRequisite: 'PRJ301, SWE201c or SWE202c, pass LAB211',
    description: `This course guides students through the full Software Development Life Cycle (SDLC) by working on a real-world team project, with an emphasis on applying AI responsibly in requirement analysis, design, implementation, and testing. Students will practice user story writing, system design, coding using MVC and OOP, workflow development, testing, and reporting. AI tools are integrated into each phase to enhance productivity and quality.`,

    studentTasks: [
        'Join the team as arranged by the teacher.',
        'Select the project topic & technology stack and get approval from teacher before implementing.',
        'Attend at least 80% of contact slots in order to be accepted to the final presentation.',
        'Analyze requirements, write user requirements, and create system diagrams with AI-assisted tools.',
        'Design system architecture, database schema, and UI/UX wireframes using MVC, OOP, and AI suggestions.',
        'Implement core features with AI-supported coding, apply coding standards, and manage source code in Git.',
        'Develop and run unit/integration tests, using AI to suggest and refine test cases.',
        'Deploy the application to staging, verify functionality, and prepare for final delivery.',
        'Manage project progress, present milestones, and prepare high-quality reports with AI support.'
    ],

    tools: [
        'Miro, Lucidchart, Figma, Draw.io, ChatGPT, Gemini',
        'IntelliJ IDEA / VS Code / Visual Studio, GitHub Copilot, Tabnine',
        'MySQL Workbench, SQL Server Management Studio, pgAdmin',
        'JUnit, NUnit, Postman, Selenium, AI-powered test case generators',
        'Jira, Trello, Notion, Git/GitHub',
        'Docker, Heroku, AWS / Azure / GCP, Vercel'
    ],

    clos: [
        { cloName: 'CLO1', cloDetails: 'Analyze and clarify project requirements with AI-assisted elicitation and documentation', loDetails: 'LO1' },
        { cloName: 'CLO2', cloDetails: 'Design system modules and databases using MVC, OOP, and AI-supported modelling tools', loDetails: 'LO2' },
        { cloName: 'CLO3', cloDetails: 'Create ERD models and implement relational databases with SQL, applying AI tools for design validation and query optimization.', loDetails: 'LO3' },
        { cloName: 'CLO4', cloDetails: 'Develop web applications in Java/.NET/Node.js with AI-enhanced coding, debugging, and workflow implementation.', loDetails: 'LO4' },
        { cloName: 'CLO5', cloDetails: 'Demonstrate teamwork, professional ethics, and responsible AI use in software development.', loDetails: 'LO5' },
        { cloName: 'CLO6', cloDetails: 'Deliver effective presentations and reports with AI-aided content and visualization.', loDetails: 'LO6' }
    ],

    assessmentScheme: [
        { category: 'Milestone 1: Requirement Analysis & Design', part: '1', weight: '15.0%' },
        { category: 'Milestone 2: Workflow 1 & 2 Implementation', part: '1', weight: '20.0%' },
        { category: 'Milestone 3: Full System Completion & Testing', part: '1', weight: '25.0%' },
        { category: 'Final Project Presentation', part: '1', weight: '40.0%' }
    ],

    sessions: [
        { session: 1, topic: 'Course Introduction & Topic Allocation', type: 'Offline', clo: 'CLO1, CLO4', itu: 'I, T', studentMaterials: 'Course outline, IDE', sDownload: 'SWP391', cloudinaryUrl: 'https://res.cloudinary.com/xadxabsr/raw/upload/fl_attachment/1_SWP391_hsocu3.zip', studentTasks: 'Listen to course overview, join teams' },
        { session: 2, topic: 'Course Introduction & Topic Allocation', type: 'Offline', clo: 'CLO1, CLO4', itu: 'I, T', studentMaterials: 'Course outline, IDE', sDownload: 'SWP391', cloudinaryUrl: 'https://res.cloudinary.com/xadxabsr/raw/upload/fl_attachment/2_SWP391_mfn4k2.zip', studentTasks: 'Listen to course overview, join teams' },
        { session: 3, topic: 'Introduction to AI-Augmented SDLC', type: 'Offline', clo: 'CLO1, CLO4', itu: 'I, T', studentMaterials: 'Reading file, IDE', sDownload: '', studentTasks: 'Learn SDLC concept, note AI examples' },
        { session: 4, topic: 'User Requirements Development with Domain Experts (invited guest, lecturer role-play or AI Agents)', type: 'Offline', clo: 'CLO1, CLO4', itu: 'T, U', studentMaterials: 'Requirement doc, IDE', sDownload: '', studentTasks: 'Practice requirement elicitation, draft simple requirement document' },
        { session: 5, topic: 'User Requirements Development with Domain Experts', type: 'Offline', clo: 'CLO1, CLO4', itu: 'T, U', studentMaterials: 'Requirement doc, IDE', sDownload: '', studentTasks: 'Practice requirement elicitation, draft simple requirement document' },
        { session: 6, topic: 'User Requirements Development with Domain Experts', type: 'Offline', clo: 'CLO1, CLO4', itu: 'T, U', studentMaterials: 'Requirement doc, IDE', sDownload: '', studentTasks: 'Practice requirement elicitation, draft simple requirement document' },
        { session: 7, topic: 'Data Modeling- ERD Conceptual & Logical', type: 'Offline', clo: 'CLO1, CLO4', itu: 'T, U', studentMaterials: 'ERD tool, diagrams', sDownload: '', studentTasks: 'Sketch ER diagram, refine with relationships, validate with data' },
        { session: 8, topic: 'Data Modeling- ERD Conceptual & Logical', type: 'Offline', clo: 'CLO1, CLO4', itu: 'T, U', studentMaterials: 'ERD tool, diagrams', sDownload: '', studentTasks: 'Sketch ER diagram, refine with relationships, validate with data' },
        { session: 9, topic: 'Data Modeling- ERD Conceptual & Logical', type: 'Offline', clo: 'CLO1, CLO4', itu: 'T, U', studentMaterials: 'ERD tool, diagrams', sDownload: '', studentTasks: 'Sketch ER diagram, refine with relationships, validate with data' },
        { session: 10, topic: 'Database design- Tables and Constraints', type: 'Offline', clo: 'CLO1, CLO2', itu: 'T, U', studentMaterials: 'SQL scripts, IDE', sDownload: '', studentTasks: 'Map ERD to tables, add keys/constraints, run sample DDL' },
        { session: 11, topic: 'Database design- Tables and Constraints', type: 'Offline', clo: 'CLO1, CLO2', itu: 'T, U', studentMaterials: 'SQL scripts, IDE', sDownload: '', studentTasks: 'Map ERD to tables, add keys/constraints, run sample DDL' },
        { session: 12, topic: 'Database design- Tables and Constraints', type: 'Offline', clo: 'CLO1, CLO2', itu: 'T, U', studentMaterials: 'SQL scripts, IDE', sDownload: '', studentTasks: 'Map ERD to tables, add keys/constraints, run sample DDL' },
        { session: 13, topic: 'Software design with MVC Pattern', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'MVC design doc, IDE', sDownload: '', studentTasks: 'Sketch MVC design, define controllers/views, present diagram' },
        { session: 14, topic: 'Software design with MVC Pattern', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'MVC design doc, IDE', sDownload: '', studentTasks: 'Sketch MVC design, define controllers/views, present diagram' },
        { session: 15, topic: 'Software design with MVC Pattern', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'MVC design doc, IDE', sDownload: '', studentTasks: 'Sketch MVC design, define controllers/views, present diagram' },
        { session: 16, topic: 'UI & Workflow Prototyping', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Prototyping tool, UI mockups', sDownload: '', studentTasks: 'Draw wireframes, build prototype, present to peers' },
        { session: 17, topic: 'UI & Workflow Prototyping', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Prototyping tool, UI mockups', sDownload: '', studentTasks: 'Draw wireframes, build prototype, present to peers' },
        { session: 18, topic: 'UI & Workflow Prototyping', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Prototyping tool, UI mockups', sDownload: '', studentTasks: 'Draw wireframes, build prototype, present to peers' },
        { session: 19, topic: 'Milestone 1 Review & Evaluation', type: 'Offline', clo: 'CLO1, CLO2', itu: 'U', studentMaterials: 'Presentation slides, report', sDownload: '', studentTasks: 'Present milestone, receive feedback' },
        { session: 20, topic: 'Milestone 1 Review & Evaluation', type: 'Offline', clo: 'CLO1, CLO2', itu: 'U', studentMaterials: 'Presentation slides, report', sDownload: '', studentTasks: 'Present milestone, receive feedback' },
        { session: 21, topic: 'Milestone 1 Review & Evaluation', type: 'Offline', clo: 'CLO1, CLO2', itu: 'U', studentMaterials: 'Presentation slides, report', sDownload: '', studentTasks: 'Present milestone, receive feedback' },
        { session: 22, topic: 'Development Phase Planning (Phase 2)', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Planning doc, chart', sDownload: '', studentTasks: 'Make phase plan, assign tasks, confirm timeline' },
        { session: 23, topic: 'Environment Setup and Version Control', type: 'Offline', clo: 'CLO2, CLO3', itu: 'T, U', studentMaterials: 'Git client, IDE', sDownload: '', studentTasks: 'Install IDE & Git, configure environment, practice commit/push' },
        { session: 24, topic: 'Environment Setup and Version Control', type: 'Offline', clo: 'CLO2, CLO3', itu: 'T, U', studentMaterials: 'Git client, IDE', sDownload: '', studentTasks: 'Install IDE & Git, configure environment, practice commit/push' },
        { session: 25, topic: 'Build Model in MVC- Develop Repository & Service Layers', type: 'Offline', clo: 'CLO6', itu: 'T, U', studentMaterials: 'Git client, IDE', sDownload: '', studentTasks: 'Write sample repository/service code, commit and test' },
        { session: 26, topic: 'Build Model in MVC- Develop Repository & Service Layers', type: 'Offline', clo: 'CLO5', itu: 'T, U', studentMaterials: 'Git client, IDE', sDownload: '', studentTasks: 'Write sample repository/service code, commit and test' },
        { session: 27, topic: 'Build Model in MVC- Develop Repository & Service Layers', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Git client, IDE', sDownload: '', studentTasks: 'Write sample repository/service code, commit and test' },
        { session: 28, topic: 'Workflow 0: Basic Web Security- Register/Login/Logout/Forgot Password', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Git client, IDE', sDownload: '', studentTasks: 'Implement login form, add validation, connect DB' },
        { session: 29, topic: 'Workflow 0: Basic Web Security- Register/Login/Logout/Forgot Password', type: 'Offline', clo: 'CLO1', itu: 'T, U', studentMaterials: 'Git client, IDE', sDownload: '', studentTasks: 'Implement login form, add validation, connect DB' },
        { session: 30, topic: 'Workflow 0: Basic Web Security- Register/Login/Logout/Forgot Password', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Git client, IDE', sDownload: '', studentTasks: 'Implement login form, add validation, connect DB' },
        { session: 31, topic: 'Workflow 1: Basic CRUD in DB Tables- Master Data Setup', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'Git client, IDE', sDownload: '', studentTasks: 'Create CRUD forms, insert/update/test records' },
        { session: 32, topic: 'Workflow 1: Basic CRUD in DB Tables- Master Data Setup', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'Git client, IDE', sDownload: '', studentTasks: 'Create CRUD forms, insert/update/test records' },
        { session: 33, topic: 'Workflow 1: Basic CRUD in DB Tables- Master Data Setup', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'Git client, IDE', sDownload: '', studentTasks: 'Create CRUD forms, insert/update/test records' },
        { session: 34, topic: 'Workflow 2: Core Transaction Flow (Success Path)', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'Git client, IDE', sDownload: '', studentTasks: 'Draw transaction flow, code success path, run tests' },
        { session: 35, topic: 'Workflow 2: Core Transaction Flow (Success Path)', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'Git client, IDE', sDownload: '', studentTasks: 'Draw transaction flow, code success path, run tests' },
        { session: 36, topic: 'Workflow 2: Core Transaction Flow (Success Path)', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'Git client, IDE', sDownload: '', studentTasks: 'Draw transaction flow, code success path, run tests' },
        { session: 37, topic: 'Workflow 2: Core Transaction Flow (Exception Path)', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'Git client, IDE', sDownload: '', studentTasks: 'Draw transaction flow, code exception path, run tests' },
        { session: 38, topic: 'Workflow 2: Core Transaction Flow (Exception Path)', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'Git client, IDE', sDownload: '', studentTasks: 'Draw transaction flow, code exception path, run tests' },
        { session: 39, topic: 'Workflow 2: Core Transaction Flow (Exception Path)', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'Git client, IDE', sDownload: '', studentTasks: 'Draw transaction flow, code exception path, run tests' },
        { session: 40, topic: 'AI-support for Automation Testing', type: 'Offline', clo: 'CLO2, CLO3', itu: 'T, U', studentMaterials: 'Test cases, AI tool', sDownload: '', studentTasks: 'Try AI tool for test cases, run scripts, adjust test scripts' },
        { session: 41, topic: 'AI-support for Automation Testing', type: 'Offline', clo: 'CLO2, CLO3', itu: 'T, U', studentMaterials: 'Test cases, AI tool', sDownload: '', studentTasks: 'Try AI tool for test cases, run scripts, adjust test scripts' },
        { session: 42, topic: 'AI-support for Automation Testing', type: 'Offline', clo: 'CLO2, CLO3', itu: 'T, U', studentMaterials: 'Test cases, AI tool', sDownload: '', studentTasks: 'Try AI tool for test cases, run scripts, adjust test scripts' },
        { session: 43, topic: 'Milestone 2 Review & Evaluation', type: 'Offline', clo: 'CLO2, CLO3', itu: 'U', studentMaterials: 'Presentation slides, report', sDownload: '', studentTasks: 'Present milestone, receive feedback' },
        { session: 44, topic: 'Milestone 2 Review & Evaluation', type: 'Offline', clo: 'CLO2, CLO3', itu: 'U', studentMaterials: 'Presentation slides, report', sDownload: '', studentTasks: 'Present milestone, receive feedback' },
        { session: 45, topic: 'Milestone 2 Review & Evaluation', type: 'Offline', clo: 'CLO2, CLO3', itu: 'U', studentMaterials: 'Presentation slides, report', sDownload: '', studentTasks: 'Present milestone, receive feedback' },
        { session: 46, topic: 'Workflow 3: Dashboard & Reporting', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'Dashboard mockup, KPI sheet', sDownload: '', studentTasks: 'Identify KPIs, build charts, present dashboard' },
        { session: 47, topic: 'Workflow 3: Dashboard & Reporting', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'Dashboard mockup, KPI sheet', sDownload: '', studentTasks: 'Identify KPIs, build charts, present dashboard' },
        { session: 48, topic: 'Workflow 3: Dashboard & Reporting', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'Dashboard mockup, KPI sheet', sDownload: '', studentTasks: 'Identify KPIs, build charts, present dashboard' },
        { session: 49, topic: 'Software Deployment and Data Preparation', type: 'Offline', clo: 'CLO4, CLO5', itu: 'T, U', studentMaterials: 'Deployment script', sDownload: '', studentTasks: 'Practice deployment steps, seed sample data, run demo' },
        { session: 50, topic: 'Software Deployment and Data Preparation', type: 'Offline', clo: 'CLO4, CLO5', itu: 'T, U', studentMaterials: 'Deployment script', sDownload: '', studentTasks: 'Practice deployment steps, seed sample data, run demo' },
        { session: 51, topic: 'Software Deployment and Data Preparation', type: 'Offline', clo: 'CLO4, CLO5', itu: 'T, U', studentMaterials: 'Deployment script', sDownload: '', studentTasks: 'Practice deployment steps, seed sample data, run demo' },
        { session: 52, topic: 'User Acceptance Testing and Quality Improvement', type: 'Offline', clo: 'CLO5', itu: 'U', studentMaterials: 'UAT report, defect log', sDownload: '', studentTasks: 'Join UAT, fix small defects, re-test improvements' },
        { session: 53, topic: 'User Acceptance Testing and Quality Improvement', type: 'Offline', clo: 'CLO5', itu: 'U', studentMaterials: 'UAT report, defect log', sDownload: '', studentTasks: 'Join UAT, fix small defects, re-test improvements' },
        { session: 54, topic: 'User Acceptance Testing and Quality Improvement', type: 'Offline', clo: 'CLO5', itu: 'U', studentMaterials: 'UAT report, defect log', sDownload: '', studentTasks: 'Join UAT, fix small defects, re-test improvements' },
        { session: 55, topic: 'Milestone 3- Final Presentation', type: 'Offline', clo: 'CLO5', itu: 'U', studentMaterials: 'Presentation slides, report', sDownload: '', studentTasks: 'Present milestone, receive feedback' },
        { session: 56, topic: 'Milestone 3- Final Presentation', type: 'Offline', clo: 'CLO5', itu: 'U', studentMaterials: 'Presentation slides, report', sDownload: '', studentTasks: 'Present milestone, receive feedback' },
        { session: 57, topic: 'Milestone 3- Final Presentation', type: 'Offline', clo: 'CLO5', itu: 'U', studentMaterials: 'Presentation slides, report', sDownload: '', studentTasks: 'Present milestone, receive feedback' },
        { session: 58, topic: 'Project Closing and Retrospective', type: 'Offline', clo: 'CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Retrospective notes, repo archive', sDownload: '', studentTasks: 'Join retrospective, clean up repo, share lessons learned' },
        { session: 59, topic: 'Project Closing and Retrospective', type: 'Offline', clo: 'CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Retrospective notes, repo archive', sDownload: '', studentTasks: 'Join retrospective, clean up repo, share lessons learned' },
        { session: 60, topic: 'Project Closing and Retrospective', type: 'Offline', clo: 'CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Retrospective notes, repo archive', sDownload: '', studentTasks: 'Join retrospective, clean up repo, share lessons learned' }
    ]
};