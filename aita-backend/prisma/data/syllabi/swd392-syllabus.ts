/**
 * SWD392 Syllabus Data
 * Standalone syllabus definition for "Software Architecture and Design" subject.
 * Used by seed.ts to populate the SyllabusData column.
 */

export const SWD392_SYLLABUS = {
    code: 'SWD392',
    name: 'Software Architecture and Design',
    noCredit: 3,
    degreeLevel: 'Bachelor',
    timeAllocation: 'Study hour (150h) = 45h contact hours + 145-minute final exam + 102,6h self-study',
    preRequisite: 'SWE201c or SWE202c, PRO192',
    description: `This is a course in concepts and methods for the architectural design of software systems of sufficient size and complexity to require the effort of several people for many months. Fundamental design concepts and design notations are introduced. Several design methods are presented and compared, with examples of their use. Students will undertake a term project working in small groups addressing the design of a relatively complex software system.`,

    studentTasks: [
        'Students must attend at least 80% of contact slots in order to be accepted to the final examination.',
        'Student is responsible to do all exercises given by instructor in class or at home and submit on time.',
        'Constantly follow announcements on LMS at https://flm.fpt.edu.vn/ for up-to-date course information regarding assignment submission and feedback on assignments and project work.'
    ],

    tools: [
        'Internet',
        'The Rational Software Architect CASE tool',
        'Visual Paradigm, MagicDraw, and Visio'
    ],

    clos: [
        { cloName: 'CLO1', cloDetails: 'Know the Fundamentals of Software Design that includes Software Design Process, Concepts, Notations and Methods', loDetails: 'LO1' },
        { cloName: 'CLO2', cloDetails: 'Able to explain the steps in Using COMET/UML, design concepts and multiplicity of associations Collaborative Object Modeling and architectural design method (COMET)', loDetails: 'LO2' },
        { cloName: 'CLO3', cloDetails: 'Able to use artifacts in developing Software Analysis Model : classes and objects,statecharts for state dependent objects, object interaction diagrams for each use case Using AI tools generating UML diagrams', loDetails: 'LO3' },
        { cloName: 'CLO4', cloDetails: 'Able to design overall Software Architecture in developing Software Design Model Analyzing design solutions with AI-driven improvement recommendations.', loDetails: 'LO4' },
        { cloName: 'CLO5', cloDetails: 'Able to design relational database in developing Software Design Model', loDetails: 'LO5' },
        { cloName: 'CLO6', cloDetails: 'Able to explain the structure and document a Design Pattern', loDetails: 'LO6' },
        { cloName: 'CLO7', cloDetails: 'Effectively utilize AI tools (ChatGPT, PlantUML, Copilot) to support software architecture analysis and design, including: suggesting appropriate architectural models based on system requirements, generating UML diagrams (Use Case, Class, Sequence, Statechart...)', loDetails: 'LO7' }
    ],

    assessmentScheme: [
        { category: 'Course Project', part: '1', weight: '25.0%' },
        { category: 'Progress test', part: '3', weight: '15.0%' },
        { category: 'Final exam', part: '2', weight: '60.0%' }
    ],

    sessions: [
        { session: 1, topic: 'Course Introduction - Intro to Software Design (Chapter 1-2)', type: 'Offline', clo: 'CLO1', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: 'SWD392', cloudinaryUrl: 'https://drive.google.com/uc?export=download&id=1rAuJHZspluXgnOCUxA6gG_up9jpQ9X51', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 2, topic: 'Course Introduction - Intro to Software Design (Chapter 1-2)', type: 'Offline', clo: 'CLO1', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 3, topic: 'Course Introduction - Intro to Software Design (Chapter 1-2)', type: 'Offline', clo: 'CLO1', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 4, topic: 'Intro to Software Design (Chapter 3-4) - Course Project introduction', type: 'Offline', clo: 'CLO1', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 5, topic: 'Intro to Software Design (Chapter 3-4)', type: 'Offline', clo: 'CLO1', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 6, topic: 'Intro to Software Design (Chapter 3-4)', type: 'Offline', clo: 'CLO1', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 7, topic: 'Requirements and Use Case Modeling (Chapter 5-6) - Software Quality Attributes (Chapter 20)', type: 'Offline', clo: 'CLO2, CLO3', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 8, topic: 'Requirements and Use Case Modeling (Chapter 5-6) - Software Quality Attributes (Chapter 20)', type: 'Offline', clo: 'CLO2, CLO3', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 9, topic: 'Requirements and Use Case Modeling (Chapter 5-6) - Software Quality Attributes (Chapter 20)', type: 'Offline', clo: 'CLO2, CLO3', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 10, topic: 'Requirements and Use Case Modeling (Chapter 5-6) - Software Quality Attributes (Chapter 20). Use ChatGPT to generate use case descriptions based on user requirements. Use GitHub Copilot to generate boilerplate code for logic implementation based on the use case', type: 'Offline', clo: 'CLO2, CLO3', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 11, topic: 'Analysis Modeling – Static modeling (Chapter 7) - Analysis Modeling – Object and Class Structuring (Chapter 8)', type: 'Offline', clo: 'CLO2, CLO3', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 12, topic: 'Analysis Modeling – Static modeling (Chapter 7) - Analysis Modeling – Object and Class Structuring (Chapter 8)', type: 'Offline', clo: 'CLO2, CLO3', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 13, topic: 'Analysis Modeling – Static modeling (Chapter 7) - Analysis Modeling – Object and Class Structuring (Chapter 8)', type: 'Offline', clo: 'CLO2, CLO3', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 14, topic: 'Analysis Modeling – Static modeling (Chapter 7) - Analysis Modeling – Object and Class Structuring (Chapter 8)', type: 'Offline', clo: 'CLO2, CLO3', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 15, topic: 'Analysis Modeling – Dynamic Interaction Modeling (Chapter 9, 11) - Finite State Machines and Statecharts (Chapter 10)', type: 'Offline', clo: 'CLO2, CLO3', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 16, topic: 'Analysis Modeling – Dynamic Interaction Modeling (Chapter 9, 11) - Finite State Machines and Statecharts (Chapter 10)', type: 'Offline', clo: 'CLO2, CLO3', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 17, topic: 'Analysis Modeling – Dynamic Interaction Modeling (Chapter 9-10-11) - Finite State Machines and Statecharts (Chapter 10)', type: 'Offline', clo: 'CLO2, CLO3', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 18, topic: 'Analysis Modeling – Dynamic Interaction Modeling (Chapter 9-10-11) - Finite State Machines and Statecharts (Chapter 10). Generate UML architecture diagrams using PlantUML code.', type: 'Offline', clo: 'CLO2, CLO3', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 19, topic: 'Introduction to Design Patterns (Material 3)', type: 'Offline', clo: 'CLO6', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 20, topic: 'Creational & Structural Patterns', type: 'Offline', clo: 'CLO7', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 21, topic: 'Behavioral Patterns', type: 'Offline', clo: 'CLO8', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 22, topic: 'Use ChatGPT to suggest appropriate design patterns. Progress test 1. Course Project- On-going Assessment 1', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO5, CLO6', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Do presentation' },
        { session: 23, topic: 'Course Project- On-going Assessment 1', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO5, CLO6', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Do presentation' },
        { session: 24, topic: 'Course Project- On-going Assessment 1', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO5, CLO6', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Do presentation' },
        { session: 25, topic: 'Course Project- On-going Assessment 1', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO5, CLO6', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Do presentation' },
        { session: 26, topic: 'Overview of Software Architecture (Chapter 12) - Software Subsystem Architectural Design (Chapter 13)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 27, topic: 'Overview of Software Architecture (Chapter 12) - Software Subsystem Architectural Design (Chapter 13)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 28, topic: 'Overview of Software Architecture (Chapter 12) - Software Subsystem Architectural Design (Chapter 13)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 29, topic: 'Overview of Software Architecture (Chapter 12) - Software Subsystem Architectural Design (Chapter 13)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 30, topic: 'Designing Object-Oriented Software Architectures (Chapter 14)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 31, topic: 'Designing Object-Oriented Software Architectures (Chapter 14)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 32, topic: 'Designing Object-Oriented Software Architectures (Chapter 14)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 33, topic: 'Designing Object-Oriented Software Architectures (Chapter 14)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 34, topic: 'Designing Client/Server Software Architectures (Chapter 15) - Client/Server Software Architectures Case Study (Chapter 21)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 35, topic: 'Designing Client/Server Software Architectures (Chapter 15) - Client/Server Software Architectures Case Study (Chapter 21)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 36, topic: 'Designing Client/Server Software Architectures (Chapter 15) - Client/Server Software Architectures Case Study (Chapter 21)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 37, topic: 'Designing Client/Server Software Architectures (Chapter 15) - Client/Server Software Architectures Case Study (Chapter 21)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 38, topic: 'Progress test 2. Using ChatGPT and PlantUML suggest applying relevant patterns in the design. Course Project- On-going Assessment 2', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Do presentation' },
        { session: 39, topic: 'Course Project- On-going Assessment 2', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Do presentation' },
        { session: 40, topic: 'Course Project- On-going Assessment 2', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Do presentation' },
        { session: 41, topic: 'Course Project- On-going Assessment 2', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Do presentation' },
        { session: 42, topic: 'Designing Service-Oriented Architectures (Chapter 16) - Service-Oriented Architectures Case Study(Chapter 22)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 43, topic: 'Designing Service-Oriented Architectures (Chapter 16) - Service-Oriented Architectures Case Study(Chapter 22)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 44, topic: 'Designing Service-Oriented Architectures (Chapter 16) - Service-Oriented Architectures Case Study(Chapter 22)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 45, topic: 'Designing Service-Oriented Architectures (Chapter 16) - Service-Oriented Architectures Case Study(Chapter 22)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 46, topic: 'Designing Component-Based Software Architectures (Chapter 17) - Component-Based Software Architectures Case Study (Chapter 23)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 47, topic: 'Designing Component-Based Software Architectures (Chapter 17) - Component-Based Software Architectures Case Study (Chapter 23)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 48, topic: 'Designing Component-Based Software Architectures (Chapter 17) - Component-Based Software Architectures Case Study (Chapter 23)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 49, topic: 'Designing Component-Based Software Architectures (Chapter 17) - Component-Based Software Architectures Case Study (Chapter 23)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 50, topic: 'Designing Concurrent and Real-time Software Architectures (Chapter 18) - Real-time Software Architectures Case Study (Chapter 24)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 51, topic: 'Designing Concurrent and Real-time Software Architectures (Chapter 18) - Real-time Software Architectures Case Study (Chapter 24)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 52, topic: 'Designing Concurrent and Real-time Software Architectures (Chapter 18) - Real-time Software Architectures Case Study (Chapter 24)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 53, topic: 'Designing Concurrent and Real-time Software Architectures (Chapter 18) - Real-time Software Architectures Case Study (Chapter 24)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Slide, Video', sDownload: '', studentTasks: 'Read Slide, Watch Video, Do quizzes and assignments (if any)' },
        { session: 54, topic: 'Progress test 3. Course Project: Support writing architectural documentation. Generate UML diagrams with example code using PlantUML or Mermaid. Suggest design pattern, architectural Patterns application rules', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6', itu: 'T, U', studentMaterials: '', sDownload: '', studentTasks: 'Do presentation' },
        { session: 55, topic: 'Course Project - Final Evaluation (Team 1-2-3-4)', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6', itu: 'T, U', studentMaterials: '', sDownload: '', studentTasks: 'Do presentation' },
        { session: 56, topic: 'Course Project - Final Evaluation (Team 1-2-3-4)', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6', itu: 'T, U', studentMaterials: '', sDownload: '', studentTasks: 'Do presentation' },
        { session: 57, topic: 'Course Project - Final Evaluation (Team 1-2-3-4)', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6', itu: 'T, U', studentMaterials: '', sDownload: '', studentTasks: 'Do presentation' },
        { session: 58, topic: 'Course Project - Final Evaluation (Team 5-6)', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6', itu: 'T, U', studentMaterials: '', sDownload: '', studentTasks: 'Do presentation' },
        { session: 59, topic: 'Course Project - Final Evaluation (Team 5-6)', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6', itu: 'T, U', studentMaterials: '', sDownload: '', studentTasks: 'Do presentation' },
        { session: 60, topic: 'Course Review', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6', itu: 'T, U', studentMaterials: '', sDownload: '', studentTasks: 'Do presentation' }
    ]
};