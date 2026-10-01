/**
 * DBI202 Syllabus Data
 * Standalone syllabus definition for "Database Systems" subject.
 * Used by seed.ts to populate the SyllabusData column.
 */

export const DBI202_SYLLABUS = {
    code: 'DBI202',
    name: 'Database Systems',
    noCredit: 3,
    degreeLevel: 'Bachelor',
    timeAllocation: 'Study hour (150h) = 45h contact hours + 1h final exam + 85\' practical exam + 104h self-study',
    preRequisite: '',
    description: `- Knowledge about database systems has become an essential part of an education in computer science because database management has evolved from a specialized computer application to a central component of a modern computing environment.
- The content of this course includes aspects of database management basic concepts, database design, database languages, and database-system implementation. Basing on these contents, the course emphasizes on how to organize, maintain and retrieve efficiently data and information from a DBMS.`,

    studentTasks: [
        'Students must attend at least 80% of contact slots in order to be accepted to the final examination.',
        'Student is responsible to do all exercises given by instructor in class or at home and submit on time.',
        'Promptly access to the https://flm.fpt.edu.vn/ for up-to-date course information.'
    ],

    tools: ['Microsoft SQL Server'],

    clos: [
        { cloName: 'CLO1', cloDetails: 'Understand the database concepts and database management system software', loDetails: 'LO1' },
        { cloName: 'CLO2', cloDetails: 'Understand the relation model of data and Algebraic Query Language', loDetails: 'LO2' },
        { cloName: 'CLO3', cloDetails: 'Understand data normalization and apply normalization techniques in database design', loDetails: 'LO3' },
        { cloName: 'CLO4', cloDetails: 'Be able to model an application’s data requirements using conceptual modeling tools like ER diagrams and design database schemas based on the conceptual model.', loDetails: 'LO4' },
        { cloName: 'CLO5', cloDetails: 'Be proficient in structure query language including Data Definition Language(DDL) and Data Manipulation Language(DML)', loDetails: 'LO5' },
        { cloName: 'CLO6', cloDetails: 'Understand PL/SQL concepts and manipulate with View, Cursors, Stored Procedures, Functions, Database Triggers', loDetails: 'LO6' },
        { cloName: 'CLO7', cloDetails: 'Apply the Index in database design and query optimization', loDetails: 'LO7' }
    ],

    assessmentScheme: [
        { category: 'Assignment', part: '1', weight: '20.0%' },
        { category: 'Lab', part: '5', weight: '10.0%' },
        { category: 'Progress test', part: '2', weight: '10.0%' },
        { category: 'Practical Exam', part: '1', weight: '30.0%' },
        { category: 'Final exam', part: '1', weight: '30.0%' }
    ],

    sessions: [
        { session: 1, topic: 'Chapter 1. The Worlds of Database Systems: 1.1 The Evolution of Database Systems, 1.2 Overview of Database Management System', type: 'Offline', clo: 'CLO1', itu: 'I', studentMaterials: 'Textbook, slides', sDownload: 'DBI202', cloudinaryUrl: 'https://res.cloudinary.com/xadxabsr/raw/upload/fl_attachment/1_DBI202_j7uood.zip', studentTasks: 'Read chapter 1 in text book, focus on 1.1 and 1.2' },
        { session: 2, topic: '1.3 Outline of Database-System Studies - Assignment Introduction (individual)', type: 'Offline', clo: 'CLO1', itu: 'I', studentMaterials: 'Textbook, slides', sDownload: 'DBI202', cloudinaryUrl: 'https://res.cloudinary.com/xadxabsr/raw/upload/fl_attachment/2_DBI202_hnnxbm.zip', studentTasks: 'Read chapter 1 in text book, focus on 1.1 and 1.2' },
        { session: 3, topic: 'Chapter 2. The Relational Model of Data: 2.1 An Overview of Data Models', type: 'Offline', clo: 'CLO2', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 2 in text book, focus on 2.1 and 2.2' },
        { session: 4, topic: '2.2 Basics of the Relational Model', type: 'Offline', clo: 'CLO2', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 2 in text book, focus on 2.1 and 2.2' },
        { session: 5, topic: '2.4 An Algebraic Query Language', type: 'Offline', clo: 'CLO2', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 2 in text book, focus on 2.4' },
        { session: 6, topic: '2.4 An Algebraic Query Language (cont.)', type: 'Offline', clo: 'CLO2', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 2 in text book, focus on 2.4' },
        { session: 7, topic: 'Lab 1 assistance', type: 'Offline', clo: 'CLO1, CLO2', itu: 'U', studentMaterials: 'Textbook, slides, lab\'s questions', sDownload: '', studentTasks: 'Do lab 1 as homework' },
        { session: 8, topic: 'Lab 1 assistance (cont.)', type: 'Offline', clo: 'CLO1, CLO2', itu: 'U', studentMaterials: 'Textbook, slides, lab\'s questions', sDownload: '', studentTasks: 'Do lab 1 as homework' },
        { session: 9, topic: 'Chapter 3. Design Theory for Relational Databases: 3.1 Functional Dependencies', type: 'Offline', clo: 'CLO3', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 3 in text book, focus on 3.1 and 3.2' },
        { session: 10, topic: '3.2 Rules About Functional Dependencies', type: 'Offline', clo: 'CLO3', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 3 in text book, focus on 3.1 and 3.2' },
        { session: 11, topic: '3.3 Design of Relational Database Schema', type: 'Offline', clo: 'CLO3', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 3 in text book, focus on 3.3' },
        { session: 12, topic: '3.3 Design of Relational Database Schema (cont.)', type: 'Offline', clo: 'CLO3', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 3 in text book, focus on 3.3' },
        { session: 13, topic: '3.5 Normal Forms (1NF, 2NF)', type: 'Offline', clo: 'CLO3', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 3 in text book, focus on 3.5' },
        { session: 14, topic: '3.5 Normal Forms (cont. 3NF, BCNF)', type: 'Offline', clo: 'CLO3', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 3 in text book, focus on 3.5' },
        { session: 15, topic: 'Lab 2 assistance', type: 'Offline', clo: 'CLO3', itu: 'U', studentMaterials: 'Textbook, slides, lab\'s questions', sDownload: '', studentTasks: 'Do lab 2 as homework' },
        { session: 16, topic: 'Lab 2 assistance (cont.)', type: 'Offline', clo: 'CLO3', itu: 'U', studentMaterials: 'Textbook, slides, lab\'s questions', sDownload: '', studentTasks: 'Do lab 2 as homework' },
        { session: 17, topic: 'Progress test 1 (<=30\') - Assignment assistance', type: 'Offline', clo: 'CLO1, CLO2, CLO3', itu: 'I, U', studentMaterials: 'Textbook, slides, assignment\'s questions', sDownload: '', studentTasks: 'Do assignment as homework' },
        { session: 18, topic: 'Assignment assistance (cont.)', type: 'Offline', clo: 'CLO1, CLO2, CLO3', itu: 'I, U', studentMaterials: 'Textbook, slides, assignment\'s questions', sDownload: '', studentTasks: 'Do assignment as homework' },
        { session: 19, topic: 'Chapter 4. High-Level Database Models: 4.1 The Entity / Relationship Model', type: 'Offline', clo: 'CLO4', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 4 in text book, focus on 4.1, 4.2 and 4.3' },
        { session: 20, topic: '4.2 Design Principles - 4.3 Constraints in the E / R Model', type: 'Offline', clo: 'CLO4', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 4 in text book, focus on 4.1, 4.2 and 4.3' },
        { session: 21, topic: '4.4 Weak Entity Sets - 4.5 From E / R Diagrams to Relational Models', type: 'Offline', clo: 'CLO4', itu: 'I, T, U', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 4 in text book, focus on 4.4, 4.5 and 4.6' },
        { session: 22, topic: '4.6 Converting Subclass Structures to Relations', type: 'Offline', clo: 'CLO4', itu: 'I, T, U', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 4 in text book, focus on 4.4, 4.5 and 4.6' },
        { session: 23, topic: 'Lab 3 assistance', type: 'Offline', clo: 'CLO4', itu: 'U', studentMaterials: 'Textbook, slides, lab\'s questions', sDownload: '', studentTasks: 'Do lab 3 as homework' },
        { session: 24, topic: 'Lab 3 assistance (cont.)', type: 'Offline', clo: 'CLO4', itu: 'U', studentMaterials: 'Textbook, slides, lab\'s questions', sDownload: '', studentTasks: 'Do lab 3 as homework' },
        { session: 25, topic: 'Assignment assistance', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4', itu: 'U', studentMaterials: 'Textbook, slides, assignment\'s questions', sDownload: '', studentTasks: 'Do assignment as homework' },
        { session: 26, topic: 'Assignment assistance (cont.)', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4', itu: 'U', studentMaterials: 'Textbook, slides, assignment\'s questions', sDownload: '', studentTasks: 'Do assignment as homework' },
        { session: 27, topic: 'Chapter 6. The Database Language SQL: 6.1 Data Definition Language (DDL)', type: 'Offline', clo: 'CLO5', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 6 in text book, focus on 6.1 and 6.2' },
        { session: 28, topic: 'DDL (cont.)', type: 'Offline', clo: 'CLO5', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 6 in text book, focus on 6.1 and 6.2' },
        { session: 29, topic: '6.2 Implement constraints on attributes with MS SQL Server (Keys and Foreign Keys, UNIQUE, CHECK,...)', type: 'Offline', clo: 'CLO5', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 7 in text book, focus on 7.1 and 7.2' },
        { session: 30, topic: '6.2 Implement constraints on attributes with MS SQL Server (cont.)', type: 'Offline', clo: 'CLO5', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 7 in text book, focus on 7.1 and 7.2' },
        { session: 31, topic: '6.3 DML introduction & Basic of SQL Queries', type: 'Offline', clo: 'CLO5', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 6 in text book' },
        { session: 32, topic: 'DML (cont.)', type: 'Offline', clo: 'CLO5', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 6 in text book' },
        { session: 33, topic: '6.4 Query on more than one relation', type: 'Offline', clo: 'CLO5', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 6 in text book' },
        { session: 34, topic: '6.4 Query on more than one relation (cont.)', type: 'Offline', clo: 'CLO5', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 6 in text book' },
        { session: 35, topic: '6.5 Nested Queries in SQL', type: 'Offline', clo: 'CLO5', itu: 'T, U', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 6 in text book' },
        { session: 36, topic: '6.5 Nested Queries in SQL (cont.)', type: 'Offline', clo: 'CLO5', itu: 'T, U', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 6 in text book' },
        { session: 37, topic: '6.6 Aggregation Queries in SQL', type: 'Offline', clo: 'CLO5', itu: 'T, U', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 6 in text book' },
        { session: 38, topic: '6.6 Aggregation Queries in SQL (cont.)', type: 'Offline', clo: 'CLO5', itu: 'T, U', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 6 in text book' },
        { session: 39, topic: '6.7 Database Modifications (INSERT, UPDATE statement)', type: 'Offline', clo: 'CLO5', itu: 'T, U', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 6 in text book' },
        { session: 40, topic: '6.7 Database Modifications (cont. DELETE statement)', type: 'Offline', clo: 'CLO5', itu: 'T, U', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 6 in text book' },
        { session: 41, topic: 'Chapter 7. Practical Issues of database application: 7.1 Index', type: 'Offline', clo: 'CLO7', itu: 'I, T, U', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 6 in text book' },
        { session: 42, topic: 'Index (cont.)', type: 'Offline', clo: 'CLO7', itu: 'I, T, U', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 6 in text book' },
        { session: 43, topic: '7.2 Transaction, View and Query Optimization', type: 'Offline', clo: 'CLO6, CLO7', itu: 'I, T, U', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 6 in text book' },
        { session: 44, topic: '7.2 Transaction, View and Query Optimization (cont.)', type: 'Offline', clo: 'CLO6, CLO7', itu: 'I, T, U', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 6 in text book' },
        { session: 45, topic: 'Lab 4 assistance', type: 'Offline', clo: 'CLO5, CLO6, CLO7', itu: 'U', studentMaterials: 'Textbook, slides, lab\'s questions', sDownload: '', studentTasks: 'Do lab 4 as homework' },
        { session: 46, topic: 'Lab 4 assistance (cont.)', type: 'Offline', clo: 'CLO5, CLO6, CLO7', itu: 'U', studentMaterials: 'Textbook, slides, lab\'s questions', sDownload: '', studentTasks: 'Do lab 4 as homework' },
        { session: 47, topic: 'Assignment assistance (focus on query)', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO7', itu: 'U', studentMaterials: 'Textbook, slides, assignment\'s questions', sDownload: '', studentTasks: 'Do assignment as homework' },
        { session: 48, topic: 'Assignment assistance (focus on query) (cont.)', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO7', itu: 'U', studentMaterials: 'Textbook, slides, assignment\'s questions', sDownload: '', studentTasks: 'Do assignment as homework' },
        { session: 49, topic: 'Chapter 8. Constraints and T-SQL Programming: 8.1 Triggers', type: 'Offline', clo: 'CLO6', itu: 'T, U', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 7 in text book, focus on 7.5' },
        { session: 50, topic: '8.2 Constraint with triggers', type: 'Offline', clo: 'CLO6', itu: 'T, U', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 7 in text book, focus on 7.5' },
        { session: 51, topic: '8.3 View, Function', type: 'Offline', clo: 'CLO6', itu: 'T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 7 in text book' },
        { session: 52, topic: '8.3 View, Function (cont.)', type: 'Offline', clo: 'CLO6', itu: 'T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 7 in text book' },
        { session: 53, topic: '8.4 Cursors', type: 'Offline', clo: 'CLO6', itu: 'T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 9 in text book' },
        { session: 54, topic: '8.5 Implement stored procedure with MS SQL Server', type: 'Offline', clo: 'CLO6', itu: 'T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Read chapter 9 in text book' },
        { session: 55, topic: 'Progress test 2 - Lab 5 assistance', type: 'Offline', clo: 'CLO4, CLO5, CLO6, CLO7', itu: 'U', studentMaterials: 'Textbook, slides, lab\'s questions', sDownload: '', studentTasks: 'Do lab 5 as homework' },
        { session: 56, topic: 'Lab 5 assistance (cont.)', type: 'Offline', clo: 'CLO4, CLO5, CLO6, CLO7', itu: 'U', studentMaterials: 'Textbook, slides, lab\'s questions', sDownload: '', studentTasks: 'Do lab 5 as homework' },
        { session: 57, topic: 'Assignment review', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6, CLO7', itu: 'U', studentMaterials: 'Textbook, slides, assignment\'s questions', sDownload: '', studentTasks: 'Do assignment as homework' },
        { session: 58, topic: 'Assignment review (cont.)', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6, CLO7', itu: 'U', studentMaterials: 'Textbook, slides, assignment\'s questions', sDownload: '', studentTasks: 'Do assignment as homework' },
        { session: 59, topic: 'Review', type: 'Offline', clo: 'All CLOs', itu: '', studentMaterials: '', sDownload: '', studentTasks: '' },
        { session: 60, topic: 'Review', type: 'Offline', clo: 'All CLOs', itu: '', studentMaterials: '', sDownload: '', studentTasks: '' }
    ]
};