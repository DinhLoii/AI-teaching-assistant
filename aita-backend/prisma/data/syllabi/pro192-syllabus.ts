/**
 * PRO192 Syllabus Data
 * Standalone syllabus definition for "Object-Oriented Programming" subject.
 * Used by seed.ts to populate the SyllabusData column.
 */

export const PRO192_SYLLABUS = {
    code: 'PRO192',
    name: 'Object-Oriented Programming',
    noCredit: 3,
    degreeLevel: 'Bachelor',
    timeAllocation: 'Study hour (150h) = 45h contact hours + 1h final exam + 85\' practical exam + 104h self-study',
    preRequisite: 'Pass PRF192',
    description: `This subject introduces the student to object-oriented programming. The student learns to build reusable objects, encapsulate data and logic within a class, inherit one class from another and implement polymorphism.
- Compose technical documentation of a Java program using internal comments
- Adhere to object-oriented programming principles including encapsulation, polymorphism and inheritance when writing program code
- Trace the execution of Java program logic to determine what a program does or to validate the correctness of a program`,

    studentTasks: [
        'Students must attend at least 80% of contact slots in order to be accepted to the final examination.',
        'Student is responsible to do all exercises given by instructor in class or at home and submit on time.',
        'Use laptop in class only for learning purpose.',
        'Promptly access to the FU FLM at https://flm.fpt.edu.vn/ for up-to-date course information.'
    ],

    tools: [
        'Text Book',
        'NetBeans x.x',
        'Internet'
    ],

    clos: [
        { cloName: 'CLO1', cloDetails: 'Understand the concepts of object oriented (OO) programs to solve problems and fundamentals of object-oriented programming in Java', loDetails: 'LO1' },
        { cloName: 'CLO2', cloDetails: 'Practice basic Java language syntax and semantics to write Java programs and use concepts such as variables, conditional and iterative execution methods', loDetails: 'LO2' },
        { cloName: 'CLO3', cloDetails: 'Uses streams to read and write data from/to different types of sources/targets', loDetails: 'LO3' },
        { cloName: 'CLO4', cloDetails: 'Discuss the benefits and the use of JAVA’s Exceptional handling mechanism', loDetails: 'LO4' },
        { cloName: 'CLO5', cloDetails: 'Identify classes, objects, members of a class and relationships among them needed for a specific problem', loDetails: 'LO5' },
        { cloName: 'CLO6', cloDetails: 'Explain the concept and demonstrates the use of Polymorphism, Encapsulation, Abstraction and Inheritance in java', loDetails: 'LO6' },
        { cloName: 'CLO7', cloDetails: 'Discuss the principles and the use of abstract classes and interfaces in java', loDetails: 'LO7' },
        { cloName: 'CLO8', cloDetails: 'Understand and implement a complete program using object array', loDetails: 'LO8' },
        { cloName: 'CLO9', cloDetails: 'Explain the principles and the use of some (java collections) abstract data types (list, set, map)', loDetails: 'LO9' }
    ],

    assessmentScheme: [
        { category: 'Assignment', part: '1', weight: '20.0%' },
        { category: 'Lab', part: '6', weight: '10.0%' },
        { category: 'Practical Exam', part: '1', weight: '30.0%' },
        { category: 'Progress Test', part: '2', weight: '10.0%' },
        { category: 'Final Exam', part: '1', weight: '30.0%' }
    ],

    sessions: [
        { session: 1, topic: 'Chapter 1: Introduction - 1.1 Welcome to Object-Oriented', type: 'Offline', clo: 'CLO1', itu: 'I', studentMaterials: 'Textbook, slides', sDownload: 'PRO192_1', cloudinaryUrl: 'https://drive.google.com/uc?export=download&id=1cTZP22PnlCtiMsd1a5glUA9LFIngfAsf', studentTasks: 'Textbook, slides' },
        { session: 2, topic: '1.2 Object Terminology and Installation JDK - IDE', type: 'Offline', clo: 'CLO1', itu: '', studentMaterials: 'Textbook, slides', sDownload: 'PRO192_2', cloudinaryUrl: 'https://drive.google.com/uc?export=download&id=15xkiISp_MC7WLf-4EyeiEtvy0XA-LknM', studentTasks: 'Textbook, slides' },
        { session: 3, topic: 'Chapter 2: Basic Java language - 2.1 Basic Java language: Variable, data type', type: 'Offline', clo: 'CLO2', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 4, topic: '2.1 Basic Java language: Control statements', type: 'Offline', clo: 'CLO2', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 5, topic: '2.1 Basic Java language: Method - function - Parameter passing', type: 'Offline', clo: 'CLO2', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 6, topic: '2.1 Basic Java language: Array, ArrayList', type: 'Offline', clo: 'CLO3', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 7, topic: '2.1 Basic Java language: String, StringBuffer', type: 'Offline', clo: 'CLO4', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 8, topic: '2.2 Input and Output (Standard I/O)', type: 'Offline', clo: 'CLO3', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 9, topic: '2.2 Input and Output (Standard I/O) - cont\'d', type: 'Offline', clo: 'CLO4', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 10, topic: 'Lab 1 assistance', type: 'Offline', clo: 'CLO2, CLO3', itu: 'U', studentMaterials: 'lab\'s questions', sDownload: '', studentTasks: 'lab\'s questions' },
        { session: 11, topic: 'Lab 1 assistance', type: 'Offline', clo: 'CLO2, CLO4', itu: 'U', studentMaterials: 'lab\'s questions', sDownload: '', studentTasks: 'lab\'s questions' },
        { session: 12, topic: '2.4 Dynamic Memory', type: 'Offline', clo: 'CLO4', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 13, topic: 'Chapter 3: OOP - 3.1 OOP concept', type: 'Offline', clo: 'CLO5', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 14, topic: '3.2 Data abstraction - concept and technic', type: 'Offline', clo: 'CLO5', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 15, topic: '3.3 Class definition: data and function members', type: 'Offline', clo: 'CLO5', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 16, topic: '3.4 Encapsulation', type: 'Offline', clo: 'CLO5, CLO6', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 17, topic: 'Lab 2 assistance', type: 'Offline', clo: 'CLO5, CLO7', itu: 'U', studentMaterials: 'Lab\'s questions', sDownload: '', studentTasks: 'Lab\'s questions' },
        { session: 18, topic: 'Lab 2 assistance', type: 'Offline', clo: 'CLO5, CLO8', itu: 'U', studentMaterials: 'Lab\'s questions', sDownload: '', studentTasks: 'Lab\'s questions' },
        { session: 19, topic: '3.5 Inheritance: Inheritance introduction', type: 'Offline', clo: 'CLO5, CLO6', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 20, topic: '3.6 Inheritance: Derived Classes', type: 'Offline', clo: 'CLO5, CLO7', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 21, topic: 'Lab 3 assistance', type: 'Offline', clo: 'CLO5, CLO8', itu: 'U', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 22, topic: 'Lab 3 assistance', type: 'Offline', clo: 'CLO5, CLO9', itu: 'U', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 23, topic: '3.7 Polymorphism: Polymorphism concepts', type: 'Offline', clo: 'CLO7', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 24, topic: '3.8 Override and overriden methods', type: 'Offline', clo: 'CLO7', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 25, topic: 'Lab 4 assistance', type: 'Offline', clo: 'CLO7', itu: 'U', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 26, topic: 'Lab 4 assistance', type: 'Offline', clo: 'CLO7', itu: 'U', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 27, topic: 'Chapter 4: Abstract class - Interface - 4.1 Abstract class', type: 'Offline', clo: 'CLO7', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 28, topic: '4.1 Abstract class - con\'t', type: 'Offline', clo: 'CLO7', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 29, topic: '4.2 Interface', type: 'Offline', clo: 'CLO7', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 30, topic: '4.2 Interface - cont\'d', type: 'Offline', clo: 'CLO7', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 31, topic: 'Chapter 5: 5.1 Error & Exception Concepts', type: 'Offline', clo: 'CLO4', itu: '', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 32, topic: '5.2 Handling Exception', type: 'Offline', clo: 'CLO4', itu: '', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 33, topic: 'Progress test 1 + workshop evaluation', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6, CLO7', itu: '', studentMaterials: 'Textbook, slides, assignment\'s questions', sDownload: '', studentTasks: 'Textbook, slides, assignment\'s questions' },
        { session: 34, topic: 'Progress test 1 + workshop evaluation', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6, CLO7', itu: 'I, T', studentMaterials: 'Textbook, slides, assignment\'s questions', sDownload: '', studentTasks: 'Textbook, slides, assignment\'s questions' },
        { session: 35, topic: 'Chapter 6: Array of Objects - 6. Basic Operators: add, update, remove, sort, find', type: 'Offline', clo: 'CLO8', itu: 'I, T', studentMaterials: 'Textbook, slides, lab\'s questions', sDownload: '', studentTasks: 'Textbook, slides, lab\'s questions' },
        { session: 36, topic: 'Array of Objects: 6. Basic Operators: add, update, remove, sort, find - cont\'d', type: 'Offline', clo: 'CLO9', itu: 'I, T', studentMaterials: 'Textbook, slides, lab\'s questions', sDownload: '', studentTasks: 'Textbook, slides, lab\'s questions' },
        { session: 37, topic: 'Array of Objects: 6. Basic Operators: add, update, remove, sort, find - cont\'d', type: 'Offline', clo: 'CLO9', itu: 'I, T', studentMaterials: 'Textbook, slides, lab\'s questions', sDownload: '', studentTasks: 'Textbook, slides, lab\'s questions' },
        { session: 38, topic: 'Array of Objects: 6. Basic Operators: add, update, remove, sort, find - cont\'d', type: 'Offline', clo: 'CLO9', itu: 'I, T', studentMaterials: 'Textbook, slides, lab\'s questions', sDownload: '', studentTasks: 'Textbook, slides, lab\'s questions' },
        { session: 39, topic: 'Chapter 7: Collections in Java: 7.1 Overview', type: 'Offline', clo: 'CLO9', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 40, topic: '7.2 List', type: 'Offline', clo: 'CLO9', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 41, topic: '7.3 Set', type: 'Offline', clo: 'CLO9', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 42, topic: '7.3 Set', type: 'Offline', clo: 'CLO9', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 43, topic: '7.4 Map', type: 'Offline', clo: 'CLO9', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 44, topic: '7.4 Map', type: 'Offline', clo: 'CLO9', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 45, topic: 'Lab 5 assistance', type: 'Offline', clo: 'CLO4, CLO5, CLO6, CLO7', itu: 'U', studentMaterials: 'Lab\'s questions', sDownload: '', studentTasks: 'Lab\'s questions' },
        { session: 46, topic: 'Lab 5 assistance', type: 'Offline', clo: 'CLO4, CLO5, CLO6, CLO7', itu: 'U', studentMaterials: 'Lab\'s questions', sDownload: '', studentTasks: 'Lab\'s questions' },
        { session: 47, topic: 'Chapter 8: Input and Output (File I/O)', type: 'Offline', clo: 'CLO4, CLO5, CLO6, CLO7, CLO8', itu: 'I, T', studentMaterials: 'Textbook, slides, assignment\'s questions', sDownload: '', studentTasks: 'Textbook, slides, assignment\'s questions' },
        { session: 48, topic: '8. Input and Output (File I/O) - cont\'d', type: 'Offline', clo: 'CLO4, CLO5, CLO6, CLO7, CLO8', itu: 'I, T', studentMaterials: 'Textbook, slides, assignment\'s questions', sDownload: '', studentTasks: 'Textbook, slides, assignment\'s questions' },
        { session: 49, topic: '8. Input and Output (File I/O) - cont\'d', type: 'Offline', clo: 'CLO4, CLO5, CLO6, CLO7, CLO8', itu: 'I, T', studentMaterials: 'Textbook, slides, assignment\'s questions', sDownload: '', studentTasks: 'Textbook, slides, assignment\'s questions' },
        { session: 50, topic: '8. Input and Output (File I/O) - cont\'d', type: 'Offline', clo: 'CLO4, CLO5, CLO6, CLO7, CLO8', itu: 'I, T', studentMaterials: 'Textbook, slides, assignment\'s questions', sDownload: '', studentTasks: 'Textbook, slides, assignment\'s questions' },
        { session: 51, topic: 'Lab 6 assistance', type: 'Offline', clo: 'CLO9', itu: 'T, U', studentMaterials: 'lab\'s questions', sDownload: '', studentTasks: 'lab\'s questions' },
        { session: 52, topic: 'Lab 6 assistance', type: 'Offline', clo: 'CLO9', itu: 'T, U', studentMaterials: 'lab\'s questions', sDownload: '', studentTasks: 'lab\'s questions' },
        { session: 53, topic: 'Progress test 2 + workshop evaluation', type: 'Offline', clo: 'CLO8, CLO9', itu: 'U', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 54, topic: 'Progress test 2 + workshop evaluation', type: 'Offline', clo: 'CLO8, CLO9', itu: 'U', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 55, topic: 'Assignment Evaluation', type: 'Offline', clo: '', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 56, topic: 'Assignment Evaluation', type: 'Offline', clo: '', itu: 'I, T', studentMaterials: 'Textbook, slides', sDownload: '', studentTasks: 'Textbook, slides' },
        { session: 57, topic: 'Review', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6, CLO7, CLO8, CLO9', itu: '', studentMaterials: '', sDownload: '', studentTasks: '' },
        { session: 58, topic: 'Review', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6, CLO7, CLO8, CLO9', itu: '', studentMaterials: '', sDownload: '', studentTasks: '' },
        { session: 59, topic: 'Review', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6, CLO7, CLO8, CLO9', itu: '', studentMaterials: '', sDownload: '', studentTasks: '' },
        { session: 60, topic: 'Review', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6, CLO7, CLO8, CLO9', itu: '', studentMaterials: '', sDownload: '', studentTasks: '' }
    ]
};