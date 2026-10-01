/**
 * PRF192 Syllabus Data
 * Standalone syllabus definition for "Programming Fundamentals" subject.
 * Used by seed.ts to populate the SyllabusData column.
 */

export const PRF192_SYLLABUS = {
  code: 'PRF192',
  name: 'Programming Fundamentals',
  noCredit: 3,
  degreeLevel: 'Bachelor',
  timeAllocation: 'Study hour (150h) = 45h contact hours + 1h final exam + 104h self-study',
  preRequisite: 'None',
  description: `Understand basics computer system and methods of software development, focus on function-oriented programming design, coding, testing and discipline in programming.
Explain basic concepts of programming, function-oriented programming design, modularity, understand and coding programs using C language.`,

  studentTasks: [
    'Students must attend at least 80% of contact sessions in order to be accepted to the final examination.',
    'Student is responsible to do all assigned exercises given by instructor in class or at home and submit on time.',
    'Use laptop in class only for learning purpose.',
    'Promptly access to the https://flm.fpt.edu.vn/ for up-to-date course information.'
  ],

  tools: [
    'Internet',
    'C language utility (ex.DevC++ 6.3)'
  ],

  clos: [
    { cloName: 'CLO1', cloDetails: 'Understand and describe about a program, and the way it works on computer.', loDetails: 'LO1' },
    { cloName: 'CLO2', cloDetails: 'Demonstrate about variables, expressions and basic operations and illustrate them by program examples.', loDetails: 'LO2' },
    { cloName: 'CLO3', cloDetails: 'Explain the meaning and use of Logic constructs in C Language. Describe about programming styles.', loDetails: 'LO3' },
    { cloName: 'CLO4', cloDetails: 'Describe about Modularity and Functions in C programs and their use.', loDetails: 'LO4' },
    { cloName: 'CLO5', cloDetails: 'Understanding and using pointers in programs.', loDetails: 'LO5' },
    { cloName: 'CLO6', cloDetails: 'Discuss about C Libraries and their use.', loDetails: 'LO6' },
    { cloName: 'CLO7', cloDetails: 'Discuss about Arrays, Struct and their use in C programs.', loDetails: 'LO7' },
    { cloName: 'CLO8', cloDetails: 'Discuss about Strings and their use in C programs.', loDetails: 'LO8' },
    { cloName: 'CLO9', cloDetails: 'Discuss about Files and their use in C programs.', loDetails: 'LO9' }
  ],

  assessmentScheme: [
    { category: 'Assignment', part: '1', weight: '15.0%' },
    { category: 'Practical Exam', part: '1', weight: '30.0%' },
    { category: 'Progress test', part: '2', weight: '15.0%' },
    { category: 'Workshop', part: '5', weight: '10.0%' },
    { category: 'Final exam', part: '1', weight: '30.0%' }
  ],

  sessions: [
    { session: 1, topic: 'Introduction and installing tools', type: 'Offline', clo: 'CLO1', itu: 'I', studentMaterials: 'Textbook', sDownload: 'PRF192_Slides_1', cloudinaryUrl: 'https://res.cloudinary.com/xadxabsr/raw/upload/fl_attachment/1_PRF192_Slides_1_jcb91s.zip', studentTasks: 'Read Textbook, install tools' },
    { session: 2, topic: 'Basic concepts computer system; steps to develop a software', type: 'Offline', clo: 'CLO1', itu: 'T', studentMaterials: 'Textbook', sDownload: 'PRF192_Slides_2', cloudinaryUrl: 'https://res.cloudinary.com/xadxabsr/raw/upload/fl_attachment/2_PRF192_Slides_2_z2jjbq.zip', studentTasks: 'Read Textbook' },
    { session: 3, topic: 'Structure of a simple C program; C compiler', type: 'Offline', clo: 'CLO1', itu: 'T', studentMaterials: 'Textbook', sDownload: 'PRF192_Slides_3', cloudinaryUrl: 'https://res.cloudinary.com/xadxabsr/raw/upload/fl_attachment/3_PRF192_Slides_3_htiybf.zip', studentTasks: 'Practice a simple C program' },
    { session: 4, topic: 'Variable and constant used in the C programming language', type: 'Offline', clo: 'CLO2', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Practice declaration variable and constant' },
    { session: 5, topic: 'Understand what is a data type', type: 'Offline', clo: 'CLO2', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Read Textbook' },
    { session: 6, topic: 'Basic Memory Operations; Implement basic input/output functions using scanf, printf', type: 'Offline', clo: 'CLO2', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Read Textbook, Practice basic input/output' },
    { session: 7, topic: 'Expressions: Arithmetic, Relational, Logical, Bit operators, Shorthand Assignment operators', type: 'Offline', clo: 'CLO2', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Implement operators' },
    { session: 8, topic: 'Expressions: Mixing Data Types, Casting, Precedence', type: 'Offline', clo: 'CLO2', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Practice Mixing data types and Casting' },
    { session: 9, topic: 'Structured Programming: Selection (if-else, switch-case)', type: 'Offline', clo: 'CLO2', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Implement if-else, switch-case' },
    { session: 10, topic: 'Structured Programming: Loop (for, while, do-while)', type: 'Offline', clo: 'CLO3', itu: 'I', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Implement for, while, do-while' },
    { session: 11, topic: 'Review: The lecturer reviews the learned content', type: 'Offline', clo: 'CLO1, CLO2, CLO3', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Answer the Instructor\'s questions and practice requirements' },
    { session: 12, topic: 'Review (contd): The lecturer reviews the learned content', type: 'Offline', clo: 'CLO1, CLO2, CLO3', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Answer the Instructor\'s questions and practice requirements' },
    { session: 13, topic: 'Workshop 1: Practice declaring and initializing values for variables.', type: 'Offline', clo: 'CLO1, CLO2, CLO3', itu: 'U', studentMaterials: 'Completed Workshop', sDownload: '', studentTasks: 'Complete Workshop 1' },
    { session: 14, topic: 'Workshop 1: Use expressions to perform simple calculations.', type: 'Offline', clo: 'CLO1, CLO2, CLO3', itu: 'U', studentMaterials: 'Completed Workshop', sDownload: '', studentTasks: 'Complete Workshop 1' },
    { session: 15, topic: 'Workshop 1: Practice techniques to control program structure using conditional and loop structures', type: 'Offline', clo: 'CLO1, CLO2, CLO3', itu: 'U', studentMaterials: 'Completed Workshop', sDownload: '', studentTasks: 'Complete Workshop 1' },
    { session: 16, topic: 'Modules: What is a module? How to design modules for a program?', type: 'Offline', clo: 'CLO4', itu: 'I', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Read Textbook' },
    { session: 17, topic: 'Modules: Characteristics of modules', type: 'Offline', clo: 'CLO4', itu: 'I', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Read Textbook' },
    { session: 18, topic: 'Modules: Principles of defining modules', type: 'Offline', clo: 'CLO4', itu: 'I', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Read Textbook' },
    { session: 19, topic: 'Functions: Function definitions', type: 'Offline', clo: 'CLO4', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Practice function definitions' },
    { session: 20, topic: 'Functions: Use a function. Parameters: Pass by value', type: 'Offline', clo: 'CLO4', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Practice use a function' },
    { session: 21, topic: 'Functions: Differentiate Built-in and User-defined functions', type: 'Offline', clo: 'CLO4', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Read Textbook' },
    { session: 22, topic: 'Functions: Extent and Scope of a Variable', type: 'Offline', clo: 'CLO4', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Implement scope of variable' },
    { session: 23, topic: 'Review: The lecturer reviews the learned content', type: 'Offline', clo: 'CLO4', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Answer the Instructor\'s questions and practice requirements' },
    { session: 24, topic: 'Review (cont): The lecturer reviews the learned content', type: 'Offline', clo: 'CLO4', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Answer the Instructor\'s questions and practice requirements' },
    { session: 25, topic: 'Workshop 2: Real-world problem analysis techniques for program modularization', type: 'Offline', clo: 'CLO4', itu: 'U', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Complete Workshop 2' },
    { session: 26, topic: 'Workshop 2: Practice defining and using functions', type: 'Offline', clo: 'CLO4', itu: 'U', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Complete Workshop 2' },
    { session: 27, topic: 'Workshop 2: Build a program in menu form to call functions', type: 'Offline', clo: 'CLO4', itu: 'U', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Complete Workshop 2' },
    { session: 28, topic: 'Introduction to Pointers. Where are pointers used?', type: 'Offline', clo: 'CLO5', itu: 'I', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Read Textbook' },
    { session: 29, topic: 'Pointer Declarations; Pointer operators', type: 'Offline', clo: 'CLO5', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Practice pointer declarations and Implement pointer operators' },
    { session: 30, topic: 'Pointers as parameters of a function. Pass by reference', type: 'Offline', clo: 'CLO5', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Practice pass by reference to parameters of a function' },
    { session: 31, topic: 'Pointers: Dynamic Allocated Data', type: 'Offline', clo: 'CLO5', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Practice dynamic allocated data' },
    { session: 32, topic: 'Libraries: Standard - stdlib.h; Time - time.h', type: 'Offline', clo: 'CLO6', itu: 'I', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Read Textbook' },
    { session: 33, topic: 'Libraries (cond): Math - math.h; Character - ctype.h', type: 'Offline', clo: 'CLO6', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Read Textbook' },
    { session: 34, topic: 'Input/ Formatted Output', type: 'Offline', clo: 'CLO6', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Implement input and formatted output' },
    { session: 35, topic: 'Review: The lecturer reviews the learned content', type: 'Offline', clo: 'CLO5, CLO6', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Answer the Instructor\'s questions and practice requirements' },
    { session: 36, topic: 'Progress Test 1: Evaluate students on the theoretical knowledge they have learned', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6', itu: 'U', studentMaterials: 'Study Materials', sDownload: '', studentTasks: 'Complete Progress Test 1' },
    { session: 37, topic: 'Arrays: Conceps One-Dimensional array and Basic Operations on Array', type: 'Offline', clo: 'CLO7', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Practice one-demensional array declarations and basic operations on array: input/ output' },
    { session: 38, topic: 'Matrix: Two-Dimensional Arrays; Inputting, Outputting Data for Matrix and other operations', type: 'Offline', clo: 'CLO7', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Practice two-demensional array declarations, input/output, operations' },
    { session: 39, topic: 'Arrays: Solve Problems using Arrays (Linear Search and Selection Sort)', type: 'Offline', clo: 'CLO7', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Practice: Search, Sort' },
    { session: 40, topic: 'Struct: Using struct to organize complex data', type: 'Offline', clo: 'CLO7', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Practice declaration, use Struct' },
    { session: 41, topic: 'Review: The lecturer reviews the learned content', type: 'Offline', clo: 'CLO7', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Answer the Instructor\'s questions and practice requirements' },
    { session: 42, topic: 'Review: Array or structs', type: 'Offline', clo: 'CLO7', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Practice case study' },
    { session: 43, topic: 'Workshop 3: Practice basic input/ output and operations of array', type: 'Offline', clo: 'CLO7', itu: 'U', studentMaterials: 'Completed Workshop', sDownload: '', studentTasks: 'Complete Workshop 3' },
    { session: 44, topic: 'Workshop 3: Practice with character arrays using library functions in ctype.h', type: 'Offline', clo: 'CLO6, CLO7', itu: 'U', studentMaterials: 'Completed Workshop', sDownload: '', studentTasks: 'Complete Workshop 3' },
    { session: 45, topic: 'Workshop 3: Manage data with an array of struct', type: 'Offline', clo: 'CLO7', itu: 'U', studentMaterials: 'Completed Workshop', sDownload: '', studentTasks: 'Complete Workshop 3' },
    { session: 46, topic: 'String: Declare/Initialize a string', type: 'Offline', clo: 'CLO8', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Practice declare/ initialize String' },
    { session: 47, topic: 'String: Input/ Output a String using buit-in Functions', type: 'Offline', clo: 'CLO8', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Practice input/ output and operations string' },
    { session: 48, topic: 'Array of strings; operations of String (string.h)', type: 'Offline', clo: 'CLO8', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Implement Array of string' },
    { session: 49, topic: 'Review: The lecturer reviews the learned content', type: 'Offline', clo: 'CLO8', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Answer the Instructor\'s questions and practice requirements' },
    { session: 50, topic: 'Review (contd): The lecturer reviews the learned content', type: 'Offline', clo: 'CLO8', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Answer the Instructor\'s questions and practice requirements' },
    { session: 51, topic: 'Workshop 4: Problem-Solving with String (input/ output/ operations)', type: 'Offline', clo: 'CLO6, CLO7, CLO8', itu: 'U', studentMaterials: 'Completed Workshop', sDownload: '', studentTasks: 'Complete Workshop 4' },
    { session: 52, topic: 'File: Basic concepts File', type: 'Offline', clo: 'CLO9', itu: 'I', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Read Textbook' },
    { session: 53, topic: 'File: File types (Text File, Binary File)', type: 'Offline', clo: 'CLO9', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Read Textbook' },
    { session: 54, topic: 'File: Ways for accessing files', type: 'Offline', clo: 'CLO9', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Implement acessing files' },
    { session: 55, topic: 'File: File Functions', type: 'Offline', clo: 'CLO9', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Practice file functions' },
    { session: 56, topic: 'Review: The lecturer reviews the learned content', type: 'Offline', clo: 'CLO9', itu: 'T', studentMaterials: 'Textbook', sDownload: '', studentTasks: 'Answer the Instructor\'s questions and practice requirements' },
    { session: 57, topic: 'Workshop 5: Open, read, write, and close files using C file handling functions', type: 'Offline', clo: 'CLO9', itu: 'U', studentMaterials: 'Completed Workshop', sDownload: '', studentTasks: 'Complete Workshop 5' },
    { session: 58, topic: 'Progress Test 2', type: 'Offline', clo: 'CLO7, CLO8, CLO9', itu: 'U', studentMaterials: 'Study Materials', sDownload: '', studentTasks: 'Complete Progress Test 2' },
    { session: 59, topic: 'Assigment', type: 'Offline', clo: 'CLO1 - CLO9', itu: 'U', studentMaterials: 'Completed Assignment', sDownload: '', studentTasks: 'Complete Assignment' },
    { session: 60, topic: 'Final Review', type: 'Offline', clo: 'CLO1 - CLO9', itu: 'U', studentMaterials: 'Study Materials', sDownload: '', studentTasks: 'Continue exam preparation' }
  ]
}
