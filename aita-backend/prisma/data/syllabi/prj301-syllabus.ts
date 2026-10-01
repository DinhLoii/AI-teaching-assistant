/**
 * PRJ301 Syllabus Data
 * Standalone syllabus definition for "Java Web Application Development" subject.
 * Used by seed.ts to populate the SyllabusData column.
 */

export const PRJ301_SYLLABUS = {
    code: 'PRJ301',
    name: 'Java Web Application Development',
    noCredit: 3,
    degreeLevel: 'Bachelor',
    timeAllocation: 'Study hour (150h) = 45h contact hours + 1h final exam + 85\' practical exam + 102.6h self-study',
    preRequisite: 'DBI202, PRO192',
    description: `By the end of this course Students will be able to:
a) Knowledge: (what will students know?)
• Understand the core technologies of Java web programming:
- Servlet and JSP
- Scope of sharing state (session, application, request,page)
• Know how to develop and deploy your own websites using Java
• Understand and be able to apply MVC architecture for the web
- Learning how to apply JPA in websites using Java
• Learning how to apply AI in your own website using Java
b) Skills: (what will students be able to do?)
• Basic Web application development applying MVC Design Pattern using Servlet/Filter as Controller
• Creating a simple Web Application demo using JPA`,

    studentTasks: [
        'Attend at least 80% of contact hours in order to be accepted to the final examination.',
        'Actively participate in class activities.',
        'Fulfil tasks given by instructor after class.',
        'Use their own laptop in class only for learning purpose.',
        'Read the textbook in advance.',
        'Promptly access to the https://flm.fpt.edu.vn/ for up-to-date course information.'
    ],

    tools: [
        'Tomcat 9 or higher',
        'Netbeans 13 or higher',
        'Java EE: 1.8 or higher',
        'MS SQL Server 2019 or higher'
    ],

    clos: [
        { cloName: 'CLO1', cloDetails: 'understand the basic web application structure and be able to deploy Web application', loDetails: 'LO1' },
        { cloName: 'CLO2', cloDetails: 'understand and be able to work with the basic features of Java web application', loDetails: 'LO2' },
        { cloName: 'CLO3', cloDetails: 'be able to work with JDBC', loDetails: 'LO3' },
        { cloName: 'CLO4', cloDetails: 'be able to use different languages in JSP', loDetails: 'LO4' },
        { cloName: 'CLO5', cloDetails: 'understand and be able to work with other server side objects in Java Web Application', loDetails: 'LO5' },
        { cloName: 'CLO6', cloDetails: 'understand and be able to work with simple MVC Architecture', loDetails: 'LO6' },
        { cloName: 'CLO7', cloDetails: 'be able to combine web front-end & back-end in the Java web application.', loDetails: 'LO7' },
        { cloName: 'CLO8', cloDetails: 'be able to use JPA in the Java web application.', loDetails: 'LO8' },
        { cloName: 'CLO9', cloDetails: 'be able to use AI in the Java web application.', loDetails: 'LO9' }
    ],

    assessmentScheme: [
        { category: 'Assignment', part: '1', weight: '30.0%' },
        { category: 'Practical Exam', part: '1', weight: '30.0%' },
        { category: 'Progress Test 1', part: '1', weight: '5.0%' },
        { category: 'Progress Test 2', part: '1', weight: '5.0%' },
        { category: 'Workshop 1', part: '1', weight: '5.0%' },
        { category: 'Workshop 2', part: '1', weight: '5.0%' },
        { category: 'Final Exam', part: '1', weight: '20.0%' }
    ],

    sessions: [
        { session: 1, topic: 'Introduction to java web application: The core and basic of Java web server technologies, Web design vs server technologies', type: 'Offline', clo: 'CLO1', itu: 'I, T', studentMaterials: 'Textbook: Chapter 1 & 2', sDownload: 'PRJ301', cloudinaryUrl: 'https://drive.google.com/uc?export=download&id=1ORDOFNJNlhaLyElrzSZJ6h71gpwNK0bX', studentTasks: 'Read textbook, do exercise' },
        { session: 2, topic: 'Setup Environment: JDK 1.8 or higher, Servlet container: Tomcat 10 or higher, Integrate Netbeans 13 with the web container.', type: 'Offline', clo: 'CLO1', itu: 'T, U', studentMaterials: 'Textbook: Chapter 1 & 2', sDownload: '', studentTasks: 'Read textbook, do exercise' },
        { session: 3, topic: 'Creating/Building the first application: Learn to create Servlet, Guide to Using Prompt Engineering Effectively with Java Web', type: 'Offline', clo: 'CLO1, CLO8', itu: 'T, U', studentMaterials: 'Textbook: Chapter 1 & 2', sDownload: '', studentTasks: 'Read textbook, do exercise. Learn prompt engineering for AI integration in Java Web.' },
        { session: 4, topic: 'Learn to create JSP - Deploy the web application', type: 'Offline', clo: 'CLO1', itu: 'T, U', studentMaterials: 'Textbook: Chapter 1 & 2', sDownload: '', studentTasks: 'Read textbook, do exercise' },
        { session: 5, topic: 'Writing the First Servlet: Create a servlet class, Configure servlet for deployment', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Textbook: Chapter 3', sDownload: '', studentTasks: 'Read textbook, do exercise' },
        { session: 6, topic: 'Work with request and response objects: Understanding DoGet and DoPost', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Textbook: Chapter 3', sDownload: '', studentTasks: 'Read textbook, do exercise' },
        { session: 7, topic: 'Using parameter to accept form submission & query string - Response text content to client', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Textbook: Chapter 3', sDownload: '', studentTasks: 'Read textbook, do exercise' },
        { session: 8, topic: 'Using AI in Netbeans 24', type: 'Offline', clo: 'CLO1', itu: 'T, U', studentMaterials: 'Textbook: Chapter 3', sDownload: '', studentTasks: 'Study how to use Jeddict AI assistant in Netbeans' },
        { session: 9, topic: 'Practice Classwork 1', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Textbook: Chapter 3', sDownload: '', studentTasks: 'Read textbook, do exercise' },
        { session: 10, topic: 'Practice Classwork 1', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Textbook: Chapter 3', sDownload: '', studentTasks: 'Read textbook, do exercise' },
        { session: 11, topic: 'Web Application Interacting with Database: JDBC Introduction, Types of JDBC Drivers', type: 'Offline', clo: 'CLO3', itu: 'I, T', studentMaterials: 'JDBC Tutorial Documentation', sDownload: '', studentTasks: 'Read textbook, complete classwork and Workshop 1' },
        { session: 12, topic: 'Web Application Interacting with Database: JDBC Introduction, Types of JDBC Drivers', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'JDBC Tutorial Documentation', sDownload: '', studentTasks: 'Read textbook, complete classwork and Workshop 1' },
        { session: 13, topic: 'JDBC Basics: Processing SQL Statements', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'JDBC Tutorial Documentation', sDownload: '', studentTasks: 'Read textbook, complete classwork and Workshop 1' },
        { session: 14, topic: 'JDBC Basics: Processing SQL Statements', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'JDBC Tutorial Documentation', sDownload: '', studentTasks: 'Read textbook, complete classwork and Workshop 1' },
        { session: 15, topic: 'JDBC Basics: Processing SQL Statements - Use a Database Query Agent in Java Web Applications', type: 'Offline', clo: 'CLO3, CLO8', itu: 'T, U', studentMaterials: 'JDBC Tutorial Documentation', sDownload: '', studentTasks: 'Learn and implement AI-driven database queries' },
        { session: 16, topic: 'Implement CRUD application using MS SQL Server 2019 or version higher', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'JDBC Tutorial Documentation', sDownload: '', studentTasks: 'Read textbook, complete classwork and Workshop 1' },
        { session: 17, topic: 'Implement CRUD application using MS SQL Server 2019 or version higher', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'JDBC Tutorial Documentation', sDownload: '', studentTasks: 'Read textbook, complete classwork and Workshop 1' },
        { session: 18, topic: 'Implement CRUD application using MS SQL Server 2019 or version higher', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'JDBC Tutorial Documentation', sDownload: '', studentTasks: 'Read textbook, complete classwork and Workshop 1' },
        { session: 19, topic: 'Practice Classwork 2', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'JDBC Tutorial Documentation', sDownload: '', studentTasks: 'Read textbook, complete classwork and Workshop 1' },
        { session: 20, topic: 'Practice Classwork 2', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'JDBC Tutorial Documentation', sDownload: '', studentTasks: 'Read textbook, complete classwork and Workshop 1' },
        { session: 21, topic: 'Using JSP to display content: Why use JSP?, 3 Ways to use JSP (Only HTML, Only JSP code)', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Textbook: Chapter 4', sDownload: '', studentTasks: 'Read textbook, do exercise' },
        { session: 22, topic: 'A mixture of JSP code with HTML text in A JSP file - Using the Implicit variables in A JSP', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Textbook: Chapter 4', sDownload: '', studentTasks: 'Read textbook, do exercise' },
        { session: 23, topic: 'Configuring JSP properties in the web.xml', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Textbook: Chapter 4', sDownload: '', studentTasks: 'Read textbook, do exercise' },
        { session: 24, topic: 'Combining JSP and Servlet', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Textbook: Chapter 4', sDownload: '', studentTasks: 'Read textbook, do exercise' },
        { session: 25, topic: 'Practice Classwork 3', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Textbook: Chapter 4', sDownload: '', studentTasks: 'Read textbook, do exercise' },
        { session: 26, topic: 'Practice Classwork 3', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Textbook: Chapter 4', sDownload: '', studentTasks: 'Read textbook, do exercise' },
        { session: 27, topic: 'Introduction to MVC Architecture: General of Java Application Design', type: 'Offline', clo: 'CLO6', itu: 'I, T', studentMaterials: 'Textbook: Chapter 4', sDownload: '', studentTasks: 'Read article 2, complete classwork' },
        { session: 28, topic: 'Introduction to MVC Architecture: General of Java Application Design', type: 'Offline', clo: 'CLO6', itu: 'I, T', studentMaterials: 'Textbook: Chapter 4', sDownload: '', studentTasks: 'Read article 2, complete classwork' },
        { session: 29, topic: 'MVC Pattern - How to apply MVC in Java Web Application', type: 'Offline', clo: 'CLO6', itu: 'T, U', studentMaterials: 'Textbook: Chapter 4', sDownload: '', studentTasks: 'Read article 2, complete classwork' },
        { session: 30, topic: 'MVC Pattern - How to apply MVC in Java Web Application', type: 'Offline', clo: 'CLO6', itu: 'T, U', studentMaterials: 'Textbook: Chapter 4', sDownload: '', studentTasks: 'Read article 2, complete classwork' },
        { session: 31, topic: 'Practice', type: 'Offline', clo: 'CLO6', itu: 'T, U', studentMaterials: 'Textbook: Chapter 4', sDownload: '', studentTasks: 'Read article 2, complete classwork' },
        { session: 32, topic: 'Practice', type: 'Offline', clo: 'CLO6', itu: 'T, U', studentMaterials: 'Textbook: Chapter 4', sDownload: '', studentTasks: 'Read article 2, complete classwork' },
        { session: 33, topic: 'Maintaining state using session and cookie: Explain why session is necessary, How session and cookie work', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Textbook: Chapter 5', sDownload: '', studentTasks: 'Read textbook, complete classwork, do exercise' },
        { session: 34, topic: 'Store and Retrieve data to session and cookie', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Textbook: Chapter 5', sDownload: '', studentTasks: 'Read textbook, complete classwork, do exercise' },
        { session: 35, topic: 'Practice Classwork 4', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Textbook: Chapter 5', sDownload: '', studentTasks: 'Read textbook, complete classwork, do exercise' },
        { session: 36, topic: 'Practice Classwork 4', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Textbook: Chapter 5', sDownload: '', studentTasks: 'Read textbook, complete classwork, do exercise' },
        { session: 37, topic: 'Expression Language: What and Why use EL, EL syntax (Immediate evaluation, operators, Static Field)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Textbook: Chapter 6', sDownload: '', studentTasks: 'Read textbook, complete classwork, do exercise' },
        { session: 38, topic: 'EL functions, Collections, How to use scoped variables in EL expressions (pageContext)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Textbook: Chapter 6', sDownload: '', studentTasks: 'Read textbook, complete classwork, do exercise' },
        { session: 39, topic: 'sessionScope, applicationScope, Implicit Variables in EL', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Textbook: Chapter 6', sDownload: '', studentTasks: 'Read textbook, complete classwork, do exercise' },
        { session: 40, topic: 'Practice Classwork 5', type: 'Offline', clo: 'CLO9', itu: 'T, U', studentMaterials: 'Textbook: Chapter 6', sDownload: '', studentTasks: 'Read textbook, complete classwork, do exercise' },
        { session: 41, topic: 'Using JPA: Guide to work with persistence connect to DB', type: 'Offline', clo: 'CLO9', itu: 'T, U', studentMaterials: 'Textbook: Chapter 19', sDownload: '', studentTasks: 'Read textbook, complete classwork, do exercise' },
        { session: 44, topic: 'Practice Classwork 6', type: 'Offline', clo: 'CLO9', itu: 'T, U', studentMaterials: 'Textbook: Chapter 19', sDownload: '', studentTasks: 'Read textbook, complete classwork, do exercise' },
        { session: 45, topic: 'Using Custom tag: Guide to create a simple Web Application demo using JPA', type: 'Offline', clo: 'CLO9', itu: 'T, U', studentMaterials: 'Textbook: Chapter 19', sDownload: '', studentTasks: 'Read textbook, complete classwork, do exercise' },
        { session: 48, topic: 'Practice Classwork 7', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Textbook: Chapter 19', sDownload: '', studentTasks: 'Read textbook, complete classwork, do exercise' },
        { session: 49, topic: 'Introduction to Filter: Understand the purpose of Filter', type: 'Offline', clo: 'CLO5', itu: 'T, U', studentMaterials: 'Textbook: Chapter 9', sDownload: '', studentTasks: 'Read textbook, complete classwork, do exercise' },
        { session: 50, topic: 'Create, Declaring and Mapping Filter', type: 'Offline', clo: 'CLO5', itu: 'T, U', studentMaterials: 'Textbook: Chapter 9', sDownload: '', studentTasks: 'Read textbook, complete classwork, do exercise' },
        { session: 51, topic: 'Forward and Redirect to another servlet - Using init parameters - Building a Coding AI Agent in Java Web', type: 'Offline', clo: 'CLO5, CLO8', itu: 'T, U', studentMaterials: 'Textbook: Chapter 9', sDownload: '', studentTasks: 'Experiment with AI-driven database queries' },
        { session: 52, topic: 'Practice Classwork 8', type: 'Offline', clo: 'CLO5', itu: 'T, U', studentMaterials: 'Textbook: Chapter 9', sDownload: '', studentTasks: 'Read textbook, complete classwork, do exercise' },
        { session: 53, topic: 'Introduction to Event Listener: ServletContextEvent, HttpSessionEvent, ServletRequestEvent', type: 'Offline', clo: 'CLO5', itu: 'T, U', studentMaterials: 'Filters Documentation', sDownload: '', studentTasks: 'Read textbook, complete classwork, do exercise' },
        { session: 54, topic: 'ServletContextAttributeEvent, HttpSessionBindingEvent, ServletRequestAttributeEvent', type: 'Offline', clo: 'CLO5', itu: 'T, U', studentMaterials: 'Filters Documentation', sDownload: '', studentTasks: 'Read textbook, complete classwork, do exercise' },
        { session: 55, topic: 'Assignment Evaluation - Course Summary for Final Exam', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6, CLO7', itu: 'T, U', studentMaterials: '', sDownload: '', studentTasks: '' },
        { session: 56, topic: 'Assignment Evaluation - Course Summary for Final Exam', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6, CLO7', itu: 'T, U', studentMaterials: '', sDownload: '', studentTasks: '' },
        { session: 57, topic: 'Assignment Evaluation - Course Summary for Final Exam', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6, CLO7', itu: 'T, U', studentMaterials: '', sDownload: '', studentTasks: '' },
        { session: 58, topic: 'Assignment Evaluation - Course Summary for Final Exam', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6, CLO7', itu: 'T, U', studentMaterials: '', sDownload: '', studentTasks: '' },
        { session: 59, topic: 'Assignment Evaluation - Course Summary for Final Exam', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6, CLO7', itu: 'T, U', studentMaterials: '', sDownload: '', studentTasks: '' },
        { session: 60, topic: 'Assignment Evaluation - Course Summary for Final Exam', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6, CLO7', itu: 'T, U', studentMaterials: '', sDownload: '', studentTasks: '' }
    ]
};