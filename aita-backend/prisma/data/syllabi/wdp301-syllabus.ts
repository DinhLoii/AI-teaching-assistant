/**
 * WDP301 Syllabus Data
 * Standalone syllabus definition for "Web Development Project" subject.
 * Used by seed.ts to populate the SyllabusData column.
 */

export const WDP301_SYLLABUS = {
    code: 'WDP301',
    name: 'Web Development Project',
    noCredit: 3,
    degreeLevel: 'Bachelor',
    timeAllocation: 'Study hour (150h) = 45h contact hours + 105h self-study',
    preRequisite: 'FER201m, SDN301m',
    description: `This course focuses on designing, developing, and integrating the basic Web-based system/application using React, React Native, Node.js, Express technologies (with the system requirements, technical framework & NoSQL (MongoDB) as assigned/agreed by the teacher).
Students are required to build the system with other 3-5 team members as appointed by the teacher.
After the course, students will be able to achieve Fullstack web development proficiency with the following skills by practising with other members of the assigned team:
- Proficiency in common web techniques and React, Node.js, Express, React Native development skills
- Proficiency in front end skills (React, Bootstrap) required for industry
- Analyze & design the solution following the object-oriented models
- Coordinate with the team to complete the works in the form of a project`,

    studentTasks: [
        'Build the team & select/define the project topic with arrangement/guide from the teacher.',
        'Select the team leader and using the FPT account (@fpt.edu.vn account) to setup/configure the project management environment (sources, tasks, issues, milestones) on GitLab & project documents management on OneDrive.',
        'Get the detailed assignment from the teacher, plan the project tasks, and execute the project accordingly.',
        'Students must attend at least 80% of contact slots in order to be accepted to the final presentation.',
        'Student is responsible to do all exercises given by the teacher in class or at home and submit on time.',
        "Constantly follow the teacher's guides/references for up-to-date course information regarding assignment submission and feedback on assignments and project work.",
        'Using GitLab to collaborate in every phase of the project by all the team members.'
    ],

    tools: [
        'OneDrive or Google Drive for document management',
        'GitLab (https://gitlab.com/) for issue and code version management',
        'Visual Studio Code (https://code.visualstudio.com)',
        'Internet'
    ],

    clos: [
        { cloName: 'CLO1', cloDetails: 'Can study & analyze to understand the project requirements, actively make questions if necessary', loDetails: 'LO1' },
        { cloName: 'CLO2', cloDetails: 'Understand and applying MVC design pattern, knowledge of OOP in designing code modules as well as designing database based on designed UI', loDetails: 'LO2' },
        { cloName: 'CLO3', cloDetails: 'Proficiency in Web programming skills, based on the Java/DotNet programming language', loDetails: 'LO3' },
        { cloName: 'CLO4', cloDetails: 'Exhibit professional working attitudes', loDetails: 'LO4' },
        { cloName: 'CLO5', cloDetails: 'Practice oral presentation and inter-personal communications', loDetails: 'LO5' }
    ],

    assessmentScheme: [
        { category: 'On-going Assessment 1', part: '1', weight: '20.0%' },
        { category: 'On-going Assessment 2', part: '1', weight: '20.0%' },
        { category: 'On-going Assessment 3', part: '1', weight: '20.0%' },
        { category: 'Final Project Presentation', part: '1', weight: '40.0%' }
    ],

    sessions: [
        { session: 1, topic: 'INITIATION PHASE - Subject introduction', type: 'Offline', clo: 'CLO1, CLO2, CLO3', itu: 'I', studentMaterials: 'This Syllabus, Student Materials', sDownload: 'WDP301', cloudinaryUrl: 'https://res.cloudinary.com/xadxabsr/raw/upload/fl_attachment/1_WDP301_d6x6px.zip', studentTasks: 'Study materials, Q&A' },
        { session: 2, topic: 'Subject introduction', type: 'Offline', clo: 'CLO1, CLO2, CLO3', itu: 'I', studentMaterials: 'This Syllabus, Student Materials', sDownload: 'WDP301', cloudinaryUrl: 'https://res.cloudinary.com/xadxabsr/raw/upload/fl_attachment/2_WDP301_ciqscb.zip', studentTasks: 'Study materials, Q&A' },
        { session: 3, topic: 'Project environment preparation', type: 'Offline', clo: 'CLO1, CLO2, CLO4', itu: 'T, U', studentMaterials: 'This Syllabus, Student Materials', sDownload: '', studentTasks: 'Setup/Configure working environment' },
        { session: 4, topic: 'Project environment preparation', type: 'Offline', clo: 'CLO1, CLO2, CLO4', itu: 'T, U', studentMaterials: 'This Syllabus, Student Materials', sDownload: '', studentTasks: 'Setup/Configure working environment' },
        { session: 5, topic: 'Requirement Introduction & Iteration 1 Planning', type: 'Offline', clo: 'CLO1, CLO2, CLO4', itu: 'I, U', studentMaterials: 'Project Tracking', sDownload: '', studentTasks: 'Study requirement, Q&A, plan' },
        { session: 6, topic: 'Requirement Introduction & Iteration 1 Planning', type: 'Offline', clo: 'CLO1, CLO2, CLO4', itu: 'I, U', studentMaterials: 'Project Tracking', sDownload: '', studentTasks: 'Study requirement, Q&A, plan' },
        { session: 7, topic: 'CONSTRUCTION PHASE_Development Iteration 1 (Iter1) - Requirement clarification & software design', type: 'Offline', clo: 'CLO1, CLO2, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Template_SRS Document, Template_SDS Document, Reference Materials', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SRS Document, Design Code Modules' },
        { session: 8, topic: 'Requirement clarification & software design', type: 'Offline', clo: 'CLO1, CLO2, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Template_SRS Document, Template_SDS Document, Reference Materials', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SRS Document, Design Code Modules' },
        { session: 9, topic: 'Requirement clarification & software design', type: 'Offline', clo: 'CLO1, CLO2, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Template_SRS Document, Template_SDS Document, Reference Materials', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SRS Document, Design Code Modules' },
        { session: 10, topic: 'Requirement clarification & software design', type: 'Offline', clo: 'CLO1, CLO2, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Template_SRS Document, Template_SDS Document, Reference Materials', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SRS Document, Design Code Modules' },
        { session: 11, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 12, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 13, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 14, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 15, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 16, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 17, topic: 'Iteration1 Review & Iteration2 Planning', type: 'Offline', clo: 'CLO3, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Project Tracking, Issue Report', sDownload: '', studentTasks: 'Track project information, Complete the iteration\'s software package' },
        { session: 18, topic: 'Iteration1 Review & Iteration2 Planning', type: 'Offline', clo: 'CLO3, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Project Tracking, Issue Report', sDownload: '', studentTasks: 'Track project information, Complete the iteration\'s software package' },
        { session: 19, topic: 'CONSTRUCTION PHASE_Development Iteration 2 (Iter2) - Requirement clarification & software design', type: 'Offline', clo: 'CLO1, CLO2, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Template_SRS Document, Template_SDS Document, Reference Materials', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SRS Document, Design Code Modules' },
        { session: 20, topic: 'Requirement clarification & software design', type: 'Offline', clo: 'CLO1, CLO2, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Template_SRS Document, Template_SDS Document, Reference Materials', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SRS Document, Design Code Modules' },
        { session: 21, topic: 'Requirement clarification & software design', type: 'Offline', clo: 'CLO1, CLO2, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Template_SRS Document, Template_SDS Document, Reference Materials', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SRS Document, Design Code Modules' },
        { session: 22, topic: 'Requirement clarification & software design', type: 'Offline', clo: 'CLO1, CLO2, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Template_SRS Document, Template_SDS Document, Reference Materials', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SRS Document, Design Code Modules' },
        { session: 23, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 24, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 25, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 26, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 27, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 28, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 29, topic: 'Iteration2 Review & Iteration3 Planning', type: 'Offline', clo: 'CLO3, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Project Tracking, Issue Report', sDownload: '', studentTasks: 'Track project information, Complete the iteration\'s software package' },
        { session: 30, topic: 'Iteration2 Review & Iteration3 Planning', type: 'Offline', clo: 'CLO3, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Project Tracking, Issue Report', sDownload: '', studentTasks: 'Track project information, Complete the iteration\'s software package' },
        { session: 31, topic: 'CONSTRUCTION PHASE_Development Iteration 3 (Iter3) - Requirement clarification & software design', type: 'Offline', clo: 'CLO1, CLO2, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Template_SRS Document, Template_SDS Document, Reference Materials', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SRS Document, Design Code Modules' },
        { session: 32, topic: 'Requirement clarification & software design', type: 'Offline', clo: 'CLO1, CLO2, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Template_SRS Document, Template_SDS Document, Reference Materials', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SRS Document, Design Code Modules' },
        { session: 33, topic: 'Requirement clarification & software design', type: 'Offline', clo: 'CLO1, CLO2, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Template_SRS Document, Template_SDS Document, Reference Materials', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SRS Document, Design Code Modules' },
        { session: 34, topic: 'Requirement clarification & software design', type: 'Offline', clo: 'CLO1, CLO2, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Template_SRS Document, Template_SDS Document, Reference Materials', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SRS Document, Design Code Modules' },
        { session: 35, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 36, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 37, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 38, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 39, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 40, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 41, topic: 'Iteration3 Review & Final Iteration Planning', type: 'Offline', clo: 'CLO3, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Project Tracking, Issue Report', sDownload: '', studentTasks: 'Track project information, Complete the iteration\'s software package' },
        { session: 42, topic: 'Iteration3 Review & Final Iteration Planning', type: 'Offline', clo: 'CLO3, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Project Tracking, Issue Report', sDownload: '', studentTasks: 'Track project information, Complete the iteration\'s software package' },
        { session: 43, topic: 'CLOSING PHASE_Final Iteration (Iter4) - Requirement clarification & software design', type: 'Offline', clo: 'CLO1, CLO2, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Template_SRS Document, Template_SDS Document, Reference Materials', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SRS Document, Design Code Modules' },
        { session: 44, topic: 'Requirement clarification & software design', type: 'Offline', clo: 'CLO1, CLO2, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Template_SRS Document, Template_SDS Document, Reference Materials', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SRS Document, Design Code Modules' },
        { session: 45, topic: 'Requirement clarification & software design', type: 'Offline', clo: 'CLO1, CLO2, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Template_SRS Document, Template_SDS Document, Reference Materials', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SRS Document, Design Code Modules' },
        { session: 46, topic: 'Requirement clarification & software design', type: 'Offline', clo: 'CLO1, CLO2, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Template_SRS Document, Template_SDS Document, Reference Materials', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SRS Document, Design Code Modules' },
        { session: 47, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 48, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 49, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 50, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 51, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 52, topic: 'Practice: design, code, self-test, integrate', type: 'Offline', clo: 'CLO2, CLO3, CLO4, CLO5', itu: 'U', studentMaterials: 'Reference Materials, Coding Standards', sDownload: '', studentTasks: 'Present/demo iteration\'s work results, Clarify/Confirm Requirements, Prepare SDS Document, Code, Self-Test, Integrate' },
        { session: 53, topic: 'Final Project Preparation', type: 'Offline', clo: 'CLO3, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Final Release Document, Project Tracking, Issue Report', sDownload: '', studentTasks: 'Present/demo iteration\'s work results' },
        { session: 54, topic: 'Final Project Preparation', type: 'Offline', clo: 'CLO3, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Student\'s submitted materials', sDownload: '', studentTasks: 'Present/demo iteration\'s work results' },
        { session: 55, topic: 'Review', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5', itu: 'T, U', studentMaterials: '', sDownload: '', studentTasks: '' },
        { session: 56, topic: 'Review', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5', itu: 'T, U', studentMaterials: '', sDownload: '', studentTasks: '' },
        { session: 57, topic: 'Review', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5', itu: 'T, U', studentMaterials: '', sDownload: '', studentTasks: '' },
        { session: 58, topic: 'Review', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5', itu: 'T, U', studentMaterials: '', sDownload: '', studentTasks: '' },
        { session: 59, topic: 'Review', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5', itu: 'T, U', studentMaterials: '', sDownload: '', studentTasks: '' },
        { session: 60, topic: 'Review', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5', itu: 'T, U', studentMaterials: '', sDownload: '', studentTasks: '' }
    ]
};