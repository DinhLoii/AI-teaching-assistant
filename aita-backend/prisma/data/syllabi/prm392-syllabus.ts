/**
 * PRM392 Syllabus Data
 * Standalone syllabus definition for "Mobile Programming" subject.
 * Used by seed.ts to populate the SyllabusData column.
 */

export const PRM392_SYLLABUS = {
    code: 'PRM392',
    name: 'Mobile Programming',
    noCredit: 3,
    degreeLevel: 'Bachelor',
    timeAllocation: 'Study hour (150h) = 45h contact hours + 1h final exam + 1.5h practical exam + 102.5h self-study',
    preRequisite: 'PRO192',
    description: `Upon completion of this course students should:
1. understand basic knowledge of mobile programming
2. get some experienced with all common controls of Android
3. have knowledge about some advanced Android components
4. have knowledge about data storage in mobile application, can use api to connect data from server from mobile application
5. understand knowledge of Android programming which help student can self study further more easily
6. be able to work in team and present group's results`,

    studentTasks: [
        'Students must attend more than 80% of contact sessions in order to be accepted to the final examination.',
        'Student is responsible to do all assigned exercises given by instructor in class or at home and submit on time.',
        'Use laptop in class only for learning purpose.',
        'Promptly access to the FU LMS at http://lms.fpt.edu.vn for up-to-date course information.'
    ],

    tools: [
        'Android Studio (newest version), link: https://developer.android.com/studio',
        'Virtual device attached android studio (or other virtual device), android mobile (only for learning, not for exam - optional)',
        'Laptop: 16GB RAM, 25GB free space before installing studio'
    ],

    clos: [
        { cloName: 'CLO1', cloDetails: 'Describe Android operating system, Android programming', loDetails: 'LO1' },
        { cloName: 'CLO2', cloDetails: 'Describe the way to build GUI android application, to handle events on android GUI', loDetails: 'LO2' },
        { cloName: 'CLO3', cloDetails: 'Explain necessary android components', loDetails: 'LO3' },
        { cloName: 'CLO4', cloDetails: 'Demonstrate how to save data to android device, access to the database', loDetails: 'LO4' },
        { cloName: 'CLO5', cloDetails: 'Demonstrate Android architecture', loDetails: 'LO5' }
    ],

    assessmentScheme: [
        { category: 'Practical Exam', part: '1', weight: '15.0%' },
        { category: 'Progress Test', part: '3', weight: '15.0%' },
        { category: 'Project', part: '1', weight: '30.0%' },
        { category: 'Final exam', part: '1', weight: '40.0%' }
    ],

    sessions: [
        { session: 1, topic: 'Mobile Development Overview - Android Introduction', type: 'Offline', clo: 'CLO1', itu: 'I', studentMaterials: 'eBook: Lesson 1, part 1.0', sDownload: 'PRM392', cloudinaryUrl: 'https://drive.google.com/uc?export=download&id=1cfh4tBLTJHQbowX2HhM3zj7sXa51tRbv', studentTasks: 'eBook, slides' },
        { session: 2, topic: 'Android Studio', type: 'Offline', clo: 'CLO1', itu: 'T, U', studentMaterials: 'eBook: Lesson 1, part 1.1', sDownload: 'PRM392', cloudinaryUrl: 'https://drive.google.com/uc?export=download&id=116JrDzySsVX7AKOyg7-8Wyik4Ppgjbv_', studentTasks: 'eBook, slides' },
        { session: 3, topic: 'Android Application Structure', type: 'Offline', clo: 'CLO1', itu: 'T, U', studentMaterials: 'eBook: Lesson 1, part 1.1', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 4, topic: 'Build the first application', type: 'Offline', clo: 'CLO1', itu: 'T, U', studentMaterials: 'eBook: Lesson 1, part 1.2', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 5, topic: 'Simple UI Widgets', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'eBook: Lesson 1, part 1.2', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 6, topic: 'Using UI in application', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'eBook: Lesson 1, part 1.2', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 7, topic: 'Layout manager (LinearLayout, ConstraintLayout...)', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'eBook: Lesson 1, part 1.2', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 8, topic: "Layout manager (cont'd)", type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'eBook: Lesson 1, part 1.3', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 9, topic: 'Styles', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'https://developer.android.com/guide/topics/ui/look-and-feel/themes', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 10, topic: 'Themes', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'https://developer.android.com/guide/topics/ui/look-and-feel/themes', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 11, topic: 'Binding Views', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'eBook: Lesson 1 (1.2)', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 12, topic: 'Handling actions on Views', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'eBook: Lesson 1 (1.2)', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 13, topic: 'Activity', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'eBook: Lesson 2 (2.1, 2.2)', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 14, topic: 'Android application Lifecyle', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'eBook: Lesson 2 (2.1, 2.2)', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 15, topic: 'Intents', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'eBook: Lesson 2 (2.3)', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 16, topic: 'Linking Activities Using Intents', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'eBook: Lesson 2 (2.3)', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 17, topic: 'Students introduce their project overview + Start Project', type: 'Offline', clo: 'CLO1, CLO2, CLO3', itu: 'T, U', studentMaterials: "Assignment's requirement", sDownload: '', studentTasks: '' },
        { session: 18, topic: "Students introduce their project overview + Start Project (cont'd)", type: 'Offline', clo: 'CLO1, CLO2, CLO3', itu: 'T, U', studentMaterials: "Assignment's requirement", sDownload: '', studentTasks: '' },
        { session: 19, topic: 'RecyclerView', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'eBook: Lesson 4 (4.5)', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 20, topic: 'Implementing RecyclerView', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'eBook: Lesson 4 (4.5)', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 21, topic: 'Guide Exercises + practice RecyclerView', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'eBook: Lesson 4 (4.5)', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 22, topic: "Guide Exercises + practice RecyclerView (cont'd)", type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'eBook: Lesson 4 (4.5)', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 23, topic: 'Display pictures on UI', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'eBook: Lesson 4 (4.3)', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 24, topic: 'Android Menu', type: 'Offline', clo: 'CLO2', itu: 'T, U', studentMaterials: 'eBook: Lesson 4 (4.3)', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 25, topic: 'Android Permission', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'https://developer.android.com/guide/topics/permissions/overview', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 26, topic: 'Handle Permision in Android application', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'https://developer.android.com/guide/topics/permissions/overview', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 27, topic: 'Android Notification', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'eBook: Lesson 8 (8.1)', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 28, topic: 'Practice with Android notification', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'eBook: Lesson 8 (8.1)', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 29, topic: 'Data storage (Shared Preferences)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'eBook: Lesson 9 (9.0, 9.1)', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 30, topic: 'Data storage (Internal/External storage)', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'eBook: Lesson 9 (9.0, 9.1)', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 31, topic: 'Sqlite', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'eBook: Lesson 10', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 32, topic: 'Room database', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'eBook: Lesson 11', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 33, topic: 'Content provider', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'https://developer.android.com/guide/topics/providers/content-providers', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 34, topic: 'Practive with Content provider', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'https://developer.android.com/guide/topics/providers/content-providers', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 35, topic: 'Project Assistant', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4', itu: 'T, U', studentMaterials: 'Prepare project source code', sDownload: '', studentTasks: '' },
        { session: 36, topic: "Project Assistant (Cont'd)", type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4', itu: 'T, U', studentMaterials: 'Prepare project source code', sDownload: '', studentTasks: '' },
        { session: 37, topic: 'Android Services', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'eBook: Lesson 7 (7.4)', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 38, topic: 'Multithread programming', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'eBook: Lesson 7 (7.4)', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 39, topic: 'Using Executor/ExecutorService', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'eBook: Lesson 7 (7.1)', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 40, topic: 'Practice with multiplethread', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'eBook: Lesson 7 (7.1)', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 41, topic: 'Android Fragment', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'https://developer.android.com/guide/fragments', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 42, topic: 'Interact between Fragment and Activity', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'https://developer.android.com/guide/fragments', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 43, topic: 'Google Maps', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'https://developers.google.com/maps/documentation/android-sdk/start', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 44, topic: "Access phone's position", type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'https://developers.google.com/maps/documentation/android-sdk/start', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 45, topic: 'Web Services - Retrofit', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'https://square.github.io/retrofit/', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 46, topic: 'Connect API by Retrofit', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'https://square.github.io/retrofit/', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 47, topic: 'Guide Exercises + practice with Retrofit', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: '', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 48, topic: "Guide Exercises + practice with Retrofit (cont'd)", type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: '', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 49, topic: 'Android socket programming', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'https://socket.io/blog/native-socket-io-and-android/', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 50, topic: 'Practice with socket', type: 'Offline', clo: 'CLO4', itu: 'T, U', studentMaterials: 'https://socket.io/blog/native-socket-io-and-android/', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 51, topic: 'Broadcast receiver', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: 'eBook: Lesson 7 (7.3)', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 52, topic: 'Practice with Broadcast receiver', type: 'Offline', clo: 'CLO3', itu: 'T, U', studentMaterials: '', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 53, topic: 'Android architecture (MVC/MVP)', type: 'Offline', clo: 'CLO5', itu: 'T, U', studentMaterials: 'https://guides.codepath.com/android/Architecture-of-Android-Apps', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 54, topic: 'Android architecture (MVVM)', type: 'Offline', clo: 'CLO5', itu: 'T, U', studentMaterials: 'https://guides.codepath.com/android/Architecture-of-Android-Apps', sDownload: '', studentTasks: 'eBook, slides' },
        { session: 55, topic: 'Project Presentation', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5', itu: 'T, U', studentMaterials: "Assignment's questions", sDownload: '', studentTasks: '' },
        { session: 56, topic: 'Project Presentation', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5', itu: 'T, U', studentMaterials: "Assignment's questions", sDownload: '', studentTasks: '' },
        { session: 57, topic: 'Review', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Slides, classworks', sDownload: '', studentTasks: '' },
        { session: 58, topic: 'Review', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Slides, classworks', sDownload: '', studentTasks: '' },
        { session: 59, topic: 'Review', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Slides, classworks', sDownload: '', studentTasks: '' },
        { session: 60, topic: 'Review', type: 'Offline', clo: 'CLO1, CLO2, CLO3, CLO4, CLO5', itu: 'T, U', studentMaterials: 'Slides, classworks', sDownload: '', studentTasks: '' }
    ]
};