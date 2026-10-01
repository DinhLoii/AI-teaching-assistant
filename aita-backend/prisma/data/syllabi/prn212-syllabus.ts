/**
 * PRN212 Syllabus Data
 * Standalone syllabus definition for "Basis Cross-Platform Application Programming With .NET" subject.
 * Used by seed.ts to populate the SyllabusData column.
 */

export const PRN212_SYLLABUS = {
    code: 'PRN212',
    name: 'Basis Cross-Platform Application Programming With .NET',
    noCredit: 3,
    degreeLevel: 'Bachelor',
    timeAllocation: 'Study hour (150h) = 49.5h contact hours + 145 minute final exam + 98.1h self-study',
    preRequisite: 'PRO192, DBI202',
    description: `Upon completion of this course students should:
1. Understand the followings:
• C# language for developing .NET applications;
• Fundamental concepts of .NET Platform
• Basic knowledge of Windows Presentation Foundation in .NET
2. Be able to:
• Develop Cross-platform Desktop applications and support for user experience ( UI & UX )
3. Be able to work in a team and present group's results`,

    studentTasks: [
        'Students must attend at least 80% of contact sessions in order to be accepted to the final examination.',
        'Student is responsible to do all assigned exercises given by instructor in class or at home and submit on time.',
        'Use laptop in class only for learning purpose.',
        'Promptly access to the https://flm.fpt.edu.vn/ for up-to-date course information.'
    ],

    tools: [
        'Internet',
        'Visual Studio.NET 2022 or later',
        'MS SQL Server 2019 or later',
        'Platform : .NET 8.0 or later',
        'GitHub Copilot: Automated suggestions when writing code in C#, XAML, SQL, ...',
        'AI-enhanced Debuggers (JetBrains Rider AI or Visual Studio IntelliCode)',
        'GitHub Workflow'
    ],

    clos: [
        { cloName: 'CLO1', cloDetails: 'Describe about .NET Core Platform, and more new features of C# language .', loDetails: 'LO1' },
        { cloName: 'CLO2', cloDetails: 'Demonstrate about OOP , Generic, Delegate & Event , LINQ and Design Pattern in C#', loDetails: 'LO2' },
        { cloName: 'CLO3', cloDetails: 'Demonstrate about Windows Presentation Foundation', loDetails: 'LO3' },
        { cloName: 'CLO4', cloDetails: 'Demonstrate about accessing to the database by Entity Framework ( ORM )', loDetails: 'LO4' },
        { cloName: 'CLO5', cloDetails: 'Explain about Concurrency programming, Stream I/O', loDetails: 'LO5' },
        { cloName: 'CLO6', cloDetails: 'Apply Generative AI tools to support software development tasks in .NET', loDetails: 'LO6' }
    ],

    assessmentScheme: [
        { category: 'Assignment', part: '2', weight: '15.0%' },
        { category: 'Group Project', part: '1', weight: '20.0%' },
        { category: 'Progress test', part: '2', weight: '10.0%' },
        { category: 'Final exam', part: '2', weight: '55.0%' }
    ],

    sessions: [
        { session: 1, topic: 'Course Introduction - Working Environment - Project Introduction', type: 'Offline', clo: 'CLO1', itu: 'I', studentMaterials: 'Course Introduction Slide, Project List', sDownload: 'PRN212', cloudinaryUrl: 'https://res.cloudinary.com/xadxabsr/raw/upload/fl_attachment/1_PRN212_oopje3.zip', studentTasks: '- Choose Group (3-5 Students)\n- Choose Topic\n- Collect requirements about Topic' },
        { session: 2, topic: 'Chapter 01: Introduction to .NET Platform & Visual Studio.NET', type: 'Offline', clo: 'CLO1', itu: 'T, U', studentMaterials: 'https://learn.microsoft.com/en-us/dotnet/core/introduction', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 3, topic: 'Chapter 01: Introduction to .NET Platform & Visual Studio.NET (cont.)', type: 'Offline', clo: 'CLO1', itu: 'T, U', studentMaterials: 'https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-8/overview', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 4, topic: 'Chapter 01: Introduction to .NET Platform & Visual Studio.NET (cont.)', type: 'Offline', clo: 'CLO1', itu: 'T, U', studentMaterials: 'https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-8/overview', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 5, topic: 'Chapter 01: Introduction to .NET Platform & Visual Studio.NET (cont.)', type: 'Offline', clo: 'CLO1', itu: 'T, U', studentMaterials: 'https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-8/overview', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 6, topic: 'Chapter 01: Introduction to .NET Platform & Visual Studio.NET (cont.)', type: 'Offline', clo: 'CLO1', itu: 'T, U', studentMaterials: 'https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-8/overview', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 7, topic: 'Chapter 02: C# Programming', type: 'Offline', clo: 'CLO1', itu: 'T, U', studentMaterials: 'Chapter 3 & 4 (C# 12 and .NET 8 Book)', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 8, topic: 'Chapter 02: C# Programming (cont.)', type: 'Offline', clo: 'CLO1', itu: 'T, U', studentMaterials: 'Chapter 3 & 4 (C# 12 and .NET 8 Book)', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 9, topic: 'Chapter 02: C# Programming (cont.)', type: 'Offline', clo: 'CLO1', itu: 'T, U', studentMaterials: 'Chapter 3 & 4 (C# 12 and .NET 8 Book)', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 10, topic: 'Chapter 03: Object-Oriented Programming with C#', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Chapter 5 (C# 12 and .NET 8 Book)', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 11, topic: 'Chapter 03: Object-Oriented Programming with C# (cont.)', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Chapter 5 (C# 12 and .NET 8 Book)', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 12, topic: 'Chapter 03: Object-Oriented Programming with C# (cont.)', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Chapter 5 (C# 12 and .NET 8 Book)', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 13, topic: 'Chapter 04: Collections & Generic', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'https://learn.microsoft.com/vi-vn/dotnet/standard/generics/collections', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 14, topic: 'Chapter 04: Collections & Generic (cont.)', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/collections', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 15, topic: 'Chapter 04: Collections & Generic (cont.)', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/collections', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 16, topic: 'Chapter 05: Design Pattern in .NET', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'https://refactoring.guru/design-patterns/csharp', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 17, topic: 'Chapter 05: Design Pattern in .NET (cont.)', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'https://refactoring.guru/design-patterns/csharp', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 18, topic: 'Chapter 05: Design Pattern in .NET (cont.)', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'https://refactoring.guru/design-patterns/csharp', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 19, topic: 'Chapter 06: Delegate , Event & LINQ', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Microsoft Docs Delegates, Events & LINQ', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 20, topic: 'Chapter 06: Delegate , Event & LINQ (cont.)', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Microsoft Docs Delegates, Events & LINQ', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 21, topic: 'Chapter 06: Delegate , Event & LINQ (cont.)', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Microsoft Docs Delegates, Events & LINQ', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 22, topic: 'Chapter 06: Delegate , Event & LINQ (cont.)', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Microsoft Docs Delegates, Events & LINQ', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 23, topic: 'Chapter 06: Delegate , Event & LINQ (cont.)', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Chapter 11 (C# 12 and .NET 8 Book)', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 24, topic: 'GENAI: Applying Generative AI & Workflow CI/CD in .NET', type: 'Offline', clo: 'CLO6', itu: 'T, U', studentMaterials: 'Slide', sDownload: '', studentTasks: '- Read the slide' },
        { session: 25, topic: 'GENAI: Applying Generative AI & Workflow CI/CD in .NET (cont.)', type: 'Offline', clo: 'CLO6', itu: 'T, U', studentMaterials: 'Slide', sDownload: '', studentTasks: '- Read the slide' },
        { session: 26, topic: 'GENAI: Applying Generative AI & Workflow CI/CD in .NET (cont.)', type: 'Offline', clo: 'CLO6', itu: 'T, U', studentMaterials: 'Slide', sDownload: '', studentTasks: '- Read the slide' },
        { session: 27, topic: 'Progress Test 1', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'Exam', sDownload: '', studentTasks: '- Do Quiz' },
        { session: 28, topic: 'Project Review 01', type: 'Offline', clo: 'CLO2, CLO6', itu: 'T, U', studentMaterials: 'Project List', sDownload: '', studentTasks: '- Gather Requirements\n- Use GenAI to help write UseCases and preliminary UI\n- Create diagrams using PlantUML\n- Upload diagrams + documentation to GitHub' },
        { session: 29, topic: 'Chapter 07: Building WPF Application', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'https://learn.microsoft.com/en-us/dotnet/desktop/wpf/?view=netdesktop-8.0', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 30, topic: 'Chapter 07: Building WPF Application (cont.)', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'https://learn.microsoft.com/en-us/dotnet/desktop/wpf/windows/?view=netdesktop-8.0', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 31, topic: 'Chapter 07: Building WPF Application (cont.)', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'https://learn.microsoft.com/en-us/dotnet/desktop/wpf/windows/?view=netdesktop-8.1', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 32, topic: 'Chapter 07: Building WPF Application (cont.)', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'WPF Styles Templates Overview', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 33, topic: 'Chapter 07: Building WPF Application (cont.)', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'WPF Styles Templates Overview', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 34, topic: 'Chapter 07: Building WPF Application (cont.)', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'WPF Styles Templates Overview', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 35, topic: 'Chapter 07: Building WPF Application (cont.)', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'https://learn.microsoft.com/en-us/dotnet/desktop/wpf/data/?view=netdesktop-8.0', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 36, topic: 'Chapter 07: Building WPF Application (cont.)', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'https://learn.microsoft.com/en-us/dotnet/desktop/wpf/data/?view=netdesktop-8.1', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 37, topic: 'Chapter 07: Building WPF Application (cont.)', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'https://learn.microsoft.com/en-us/dotnet/desktop/wpf/data/?view=netdesktop-8.2', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 38, topic: 'Lab 1', type: 'Offline', clo: 'CLO1, CLO2, CLO3', itu: 'T, U', studentMaterials: 'Lab 01', sDownload: '', studentTasks: '- Do exercises\n- Self practice' },
        { session: 39, topic: 'Assignment 1', type: 'Offline', clo: 'CLO1, CLO2, CLO3', itu: 'T, U', studentMaterials: 'Assignment 01', sDownload: '', studentTasks: '- Discuss assignment problems' },
        { session: 40, topic: 'Project Review 02', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO6', itu: 'T, U', studentMaterials: 'Project List', sDownload: '', studentTasks: '- WPF Project Setup\n- Layout and Logic Setup\n- Testing (Unit Test / UI Test)\n- Reporting and Reflecting on GenAI Usage' },
        { session: 41, topic: 'Chapter 08: Working with Databases Using Entity Framework Core', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Chapter 10 (C# 12 and .NET 8 Book)', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 42, topic: 'Chapter 08: Working with Databases Using Entity Framework Core (cont.)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Chapter 10 (C# 12 and .NET 8 Book)', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 43, topic: 'Chapter 08: Working with Databases Using Entity Framework Core (cont.)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Chapter 10 (C# 12 and .NET 8 Book)', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 44, topic: 'Chapter 08: Working with Databases Using Entity Framework Core (cont.)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'Chapter 10 (C# 12 and .NET 8 Book)', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 45, topic: 'Chapter 08: Working with Databases Using Entity Framework Core (cont.)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'https://learn.microsoft.com/en-us/ef/core/', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 46, topic: 'Chapter 08: Working with Databases Using Entity Framework Core (cont.)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'https://learn.microsoft.com/en-us/ef/core/', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 47, topic: 'Chapter 08: Working with Databases Using Entity Framework Core (cont.)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'https://learn.microsoft.com/en-us/ef/core/', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 48, topic: 'Chapter 08: Working with Databases Using Entity Framework Core (cont.)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'https://learn.microsoft.com/en-us/ef/core/', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 49, topic: 'Chapter 08: Working with Databases Using Entity Framework Core (cont.)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'https://learn.microsoft.com/en-us/ef/core/', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 50, topic: 'Chapter 09: Working with Files and System.IO', type: 'Offline', clo: 'CLO5', itu: 'T, U', studentMaterials: 'Chapter 9 (C# 12 and .NET 8 Book)', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 51, topic: 'Chapter 09: Working with Files and System.IO (cont.)', type: 'Offline', clo: 'CLO5', itu: 'T, U', studentMaterials: 'Chapter 9 (C# 12 and .NET 8 Book)', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 52, topic: 'Chapter 09: Working with Files and System.IO (cont.)', type: 'Offline', clo: 'CLO5', itu: 'T, U', studentMaterials: 'Chapter 9 (C# 12 and .NET 8 Book)', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 53, topic: 'Project Review 03', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6', itu: 'T, U', studentMaterials: 'Project List', sDownload: '', studentTasks: '- Application Demo\n- Performance Reporting\n- Reflection on GenAI Usage and Teamwork' },
        { session: 54, topic: 'Chapter 10: Working with XML and JSON Serializing', type: 'Offline', clo: 'CLO5', itu: 'T, U', studentMaterials: 'https://www.json.org/json-en.html', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 55, topic: 'Lab 2', type: 'Offline', clo: 'CLO3, CLO4, CLO5, CLO6', itu: 'T, U', studentMaterials: 'Lab 02', sDownload: '', studentTasks: '- Do exercises\n- Self practice' },
        { session: 56, topic: 'Assignment 2', type: 'Offline', clo: 'CLO3, CLO4, CLO5, CLO6', itu: 'T, U', studentMaterials: 'Assignment 02', sDownload: '', studentTasks: '- Discuss assignment problems' },
        { session: 57, topic: 'Progress Test 2', type: 'Offline', clo: 'CLO3, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Exam', sDownload: '', studentTasks: '- Do Quiz' },
        { session: 58, topic: 'Chapter 11: Introduction to Concurrency Programming', type: 'Offline', clo: 'CLO5', itu: 'T, U', studentMaterials: 'Microsoft Docs Threading', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 59, topic: 'Chapter 11: Introduction to Concurrency Programming (cont.)', type: 'Offline', clo: 'CLO5', itu: 'T, U', studentMaterials: 'Microsoft Docs Threading', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 60, topic: 'Chapter 11: Introduction to Concurrency Programming (cont.)', type: 'Offline', clo: 'CLO5', itu: 'T, U', studentMaterials: 'Microsoft Docs Managed Thread Pool', sDownload: '', studentTasks: '- Read the slide, related reference documents\n- Do exercises\n- Self practice' },
        { session: 61, topic: 'Project Evaluation', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6', itu: 'U', studentMaterials: '', sDownload: '', studentTasks: 'Group Presentation' },
        { session: 62, topic: 'Project Evaluation', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6', itu: 'U', studentMaterials: '', sDownload: '', studentTasks: 'Group Presentation' },
        { session: 63, topic: 'Project Evaluation', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6', itu: 'U', studentMaterials: '', sDownload: '', studentTasks: 'Group Presentation' },
        { session: 64, topic: 'Project Evaluation', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6', itu: 'U', studentMaterials: '', sDownload: '', studentTasks: 'Group Presentation' },
        { session: 65, topic: 'Project Evaluation', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6', itu: 'U', studentMaterials: '', sDownload: '', studentTasks: 'Group Presentation' },
        { session: 66, topic: 'Project Evaluation', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5, CLO6', itu: 'U', studentMaterials: '', sDownload: '', studentTasks: 'Group Presentation' }
    ]
};