/**
 * CSD201 Syllabus Data
 * Standalone syllabus definition for "Data Structures and Algorithm" subject.
 * Used by seed.ts to populate the SyllabusData column.
 */

export const CSD201_SYLLABUS = {
    code: 'CSD201',
    name: 'Data Structures and Algorithm',
    noCredit: 3,
    degreeLevel: 'Bachelor',
    timeAllocation: 'Study hour (150h) = 45h contact hours + 1h TE + 85\' PE + 102.6h self-study',
    preRequisite: 'PRO192',
    description: `Upon finishing the course, students can:
1) Knowledge: Understand (ABET e)
- the connection between data structures and their algorithms, including an analysis of algorithms' complexity;
- data structure in the context of object-oriented program design;
- how data structure are implemented in an OO programming language such as Java
2) Able to (ABET e)
- organize and manipulate basic structures: array, linked list, tree, heap, hash
- use algorithms for traversing, sorting, searching on studying structures
- select a suitable algorithm to solve a practical problem
3) Able to (ABET k)
- use JAVA programming language for solving some problems
- use Eclipse tool for developing programs in JAVA
- Implement some programs in JAVA to solve practical problems based on the studying algorithms
4) Others: (ABET i)
- Improve study skills (academic reading, information searching, ...)`,

    studentTasks: [
        'Students must attend at least 80% of contact sessions in order to be accepted to the final examination.',
        'Student is responsible to do all exercises given by instructor in class or at home and submit on time.',
        'Promptly access to the https://flm.fpt.edu.vn/ for up-to-date course information.'
    ],

    tools: [],

    clos: [
        { cloName: 'CLO1', cloDetails: 'Describe the list data structure and its’ different way of implementations. Implement the singly linked list.', loDetails: 'LO1' },
        { cloName: 'CLO2', cloDetails: 'Define stack and queue. Describe basic operations and the use of these structures.', loDetails: 'LO2' },
        { cloName: 'CLO3', cloDetails: 'Describe about recursive definitions, algorithms, functions and their implementation and use.', loDetails: 'LO3' },
        { cloName: 'CLO4', cloDetails: 'Explain about general tree, Binary Tree and Binary Search Tree (BST). Implement BST with basic operations.', loDetails: 'LO4' },
        { cloName: 'CLO5', cloDetails: 'Discuss about graphs and their application. Implement a graph with some basic operations.', loDetails: 'LO5' },
        { cloName: 'CLO6', cloDetails: 'Explain the operation and performance of some basic and advanced sorting algorithms.', loDetails: 'LO6' },
        { cloName: 'CLO7', cloDetails: 'Explain about hashing and application.', loDetails: 'LO7' },
        { cloName: 'CLO8', cloDetails: 'Describe the Text Processing problem and its’ application. Explain the Huffman, LZW and Run-length encoding Algorithms.', loDetails: 'LO8' }
    ],

    assessmentScheme: [
        { category: 'Progress test (PT)', part: '2', weight: '20.0%' },
        { category: 'Assignment (AS)', part: '2', weight: '20.0%' },
        { category: 'Practical Exam', part: '1', weight: '30.0%' },
        { category: 'Final exam', part: '1', weight: '30.0%' }
    ],

    sessions: [
        { session: 1, topic: 'Course Introduction - 1.1. Using Arrays - 1.2. Singly Linked Lists', type: 'Offline', clo: 'CLO1', itu: 'I, T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: 'CSD201', cloudinaryUrl: 'https://res.cloudinary.com/xadxabsr/raw/upload/fl_attachment/1_CSD201_vwoats.zip', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 2, topic: '1.3. Circularly Linked Lists - 1.4. Doubly Linked Lists', type: 'Offline', clo: 'CLO1', itu: 'I, T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: 'CSD201', cloudinaryUrl: 'https://res.cloudinary.com/xadxabsr/raw/upload/fl_attachment/2_CSD201_beebas.zip', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 3, topic: 'Progress test and/or Review Exercises', type: 'Offline', clo: 'CLO1', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 4, topic: 'Guiding Exercises/Assignment', type: 'Offline', clo: 'CLO1', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 5, topic: '2.1 Stacks', type: 'Offline', clo: 'CLO2', itu: 'I, T, U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 6, topic: 'Guiding Exercises/Assignment', type: 'Offline', clo: 'CLO2', itu: 'I, T, U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 7, topic: '2.2 Queues - 2.3 Double-Ended Queues (Deque)', type: 'Offline', clo: 'CLO2', itu: 'T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 8, topic: '2.4 The Priority Queue', type: 'Offline', clo: 'CLO2', itu: 'T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 9, topic: 'Progress test and/or Review Exercises', type: 'Offline', clo: 'CLO2', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 10, topic: 'Guiding Exercises/Assignment', type: 'Offline', clo: 'CLO2', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 11, topic: '3.1 Illustrative Examples: 3.1.1 The Factorial Function, 3.1.2 Binary Search, 3.1.3 File Systems', type: 'Offline', clo: 'CLO3', itu: 'I, T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 12, topic: '3.2 Analyzing Recursive Algorithms - 3.3 Further Examples of Recursion - 3.4 Designing Recursive Algorithms - 3.5 Eliminating Tail Recursion', type: 'Offline', clo: 'CLO3', itu: 'I, T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 13, topic: 'Progress test and/or Review Exercises', type: 'Offline', clo: 'CLO3', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 14, topic: 'Guiding Exercises/Assignment', type: 'Offline', clo: 'CLO3', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 15, topic: '4.1 General Trees: 4.1.1 Tree Definitions and Properties, 4.1.2 The Tree Abstract Data Type', type: 'Offline', clo: 'CLO4', itu: 'T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 16, topic: '4.2 Binary Trees - 4.3 Implementing Trees - 4.4 Tree Traversal Algorithms', type: 'Offline', clo: 'CLO4', itu: 'T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 17, topic: 'Progress test and/or Review Exercises - Assignment evaluation', type: 'Offline', clo: 'CLO4', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 18, topic: 'Guiding Exercises/Assignment', type: 'Offline', clo: 'CLO4', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 19, topic: '4.5 Binary Search Trees: 4.5.1 Searching Within a Binary Search Tree', type: 'Offline', clo: 'CLO4', itu: 'T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 20, topic: '4.5.2 Insertions and Deletions', type: 'Offline', clo: 'CLO4', itu: 'T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 21, topic: 'Progress test and/or Review Exercises', type: 'Offline', clo: 'CLO4', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 22, topic: 'Guiding Exercises/Assignment', type: 'Offline', clo: 'CLO4', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 23, topic: '4.6 Balanced Search Trees - 4.7 AVL Trees', type: 'Offline', clo: 'CLO4', itu: 'T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 24, topic: '4.8 Heaps', type: 'Offline', clo: 'CLO4', itu: 'T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 25, topic: 'Progress test and/or Review Exercises', type: 'Offline', clo: 'CLO4', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 26, topic: 'Guiding Exercises/Assignment', type: 'Offline', clo: 'CLO4', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 1' },
        { session: 27, topic: 'Progress test 1 and review', type: 'Offline', clo: 'CLO4', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 28, topic: 'Review', type: 'Offline', clo: 'CLO4', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 29, topic: '5.1 Graphs - 5.2 Data Structures for Graphs (Edge List, Adjacency List, Adjacency Matrix)', type: 'Offline', clo: 'CLO5', itu: 'I, T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 30, topic: '5.3 Graph Traversals (Depth-First Search, Breadth-First Search)', type: 'Offline', clo: 'CLO5', itu: 'I, T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 31, topic: 'Progress test and/or Review Exercises', type: 'Offline', clo: 'CLO5', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 32, topic: 'Guiding Exercises/Assignment', type: 'Offline', clo: 'CLO5', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 33, topic: '5.4 Shortest Paths - 5.4.1 Weighted Graphs', type: 'Offline', clo: 'CLO5', itu: 'T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 34, topic: '5.4.2 Dijkstra’s Algorithm', type: 'Offline', clo: 'CLO5', itu: 'T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 35, topic: 'Progress test and/or Review Exercises', type: 'Offline', clo: 'CLO5', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 36, topic: 'Guiding Exercises/Assignment', type: 'Offline', clo: 'CLO5', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 37, topic: '5.5 Minimum Spanning Trees - 5.5.1 Prim-Jarník Algorithm', type: 'Offline', clo: 'CLO5', itu: 'T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 38, topic: '5.5.2 Kruskal’s Algorithm - 5.6. Euler\'s tour and Euler\'s cycle', type: 'Offline', clo: 'CLO5', itu: 'T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 39, topic: 'Progress test and/or Review Exercises', type: 'Offline', clo: 'CLO5', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 40, topic: 'Guiding Exercises/Assignment', type: 'Offline', clo: 'CLO5', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 41, topic: '6.1 Selection-Sort - 6.2 Insertion-Sort', type: 'Offline', clo: 'CLO6', itu: 'I, T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 42, topic: '6.3 Bubble-sort - 6.4 Quick-Sort', type: 'Offline', clo: 'CLO6', itu: 'I, T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 43, topic: 'Progress test and/or Review Exercises', type: 'Offline', clo: 'CLO6', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 44, topic: 'Guiding Exercises/Assignment', type: 'Offline', clo: 'CLO6', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 45, topic: '6.5 Merge-Sort - 6.6 Heap-Sort', type: 'Offline', clo: 'CLO6', itu: 'T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 46, topic: '6.7 Linear-Time Sorting: Bucket-Sort and Radix-Sort - 6.8 Comparing Sorting Algorithms', type: 'Offline', clo: 'CLO6', itu: 'T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 47, topic: 'Progress test and/or Review Exercises', type: 'Offline', clo: 'CLO6', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 48, topic: 'Guiding Exercises/Assignment', type: 'Offline', clo: 'CLO6', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 49, topic: '7.1 Hash Tables - 7.2 Hash Functions - 7.3 Collision-Handling', type: 'Offline', clo: 'CLO7', itu: 'I, T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 50, topic: '7.4 Load Factors, Rehashing, and Efficiency - 7.5 Java Hash Table Implementation', type: 'Offline', clo: 'CLO7', itu: 'I, T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 51, topic: 'Progress test and/or Review Exercises', type: 'Offline', clo: 'CLO7', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 52, topic: 'Guiding Exercises/Assignment', type: 'Offline', clo: 'CLO7', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 53, topic: '8.1 Abundance of Digitized Text - 8.2 Pattern-Matching Algorithms (Brute Force, KMP)', type: 'Offline', clo: 'CLO8', itu: 'I, T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 54, topic: '8.3 Text Compression (Huffman Coding, LZW, Run-length Encoding)', type: 'Offline', clo: 'CLO8', itu: 'I, T', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 55, topic: 'Progress test and/or Review Exercises', type: 'Offline', clo: 'CLO8', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 56, topic: 'Progress test and/or Review Exercises', type: 'Offline', clo: 'CLO8', itu: 'U', studentMaterials: 'Text book, slides, exercises and sample practical examples', sDownload: '', studentTasks: 'Study just learned materials, do writing exercises and redo practical examples and do assignment 2' },
        { session: 57, topic: 'Assignment evaluation', type: 'Offline', clo: '', itu: '', studentMaterials: '', sDownload: '', studentTasks: '' },
        { session: 58, topic: 'Assignment evaluation', type: 'Offline', clo: '', itu: '', studentMaterials: '', sDownload: '', studentTasks: '' },
        { session: 59, topic: 'Progress test 2 and review', type: 'Offline', clo: '', itu: '', studentMaterials: '', sDownload: '', studentTasks: '' },
        { session: 60, topic: 'Review', type: 'Offline', clo: '', itu: '', studentMaterials: '', sDownload: '', studentTasks: '' }
    ]
};