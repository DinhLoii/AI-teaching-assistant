export const DEFAULT_SUBJECT_DESCRIPTIONS: Record<string, string> = {
  PRF192: 'Fundamental C programming concepts: variables, data types, control flow, functions, pointers, structs, file I/O, and algorithmic thinking.',
  PRO192: 'Object-oriented programming using Java: classes, encapsulation, inheritance, polymorphism, interfaces, exception handling, and collections.',
  CSD201: 'Core data structures & algorithms: linked lists, stacks, queues, trees, BSTs, heaps, hash tables, graphs, and Big-O complexity analysis.',
  DBI202: 'Relational database design & management: ERD modeling, Normalization, primary/foreign keys, constraints, and SQL (DDL, DML, DCL).',
  PRJ301: 'Java Web Application development using Servlets, JSP, MVC architecture, JDBC, Sessions, Filters, and database integration.',
  PRN212: 'C# and .NET application development: LINQ, Entity Framework Core, ASP.NET Core Web API, JWT authentication, and SQL Server.',
  SWP391: 'Team-based software project: applying agile development, requirement analysis, design, testing, Git version control, and final delivery.',
  WDP301: 'Modern web application development using HTML5, CSS3, JavaScript, responsive layouts, REST APIs, and frontend-backend integration.',
  PRM392: 'Android mobile application development: Activities, Fragments, Room database, REST APIs, Firebase integration, and Material Design UI.',
  PRM393: 'Android mobile application development: Activities, Fragments, Room database, REST APIs, Firebase integration, and Material Design UI.',
  SWD392: 'Software architecture and design patterns: UML, GoF patterns, layered architecture, Clean Architecture, SOLID principles, and system scalability.'
}

export function getCleanSubjectDescription(code?: string | null, rawDesc?: string | null): string {
  if (code && DEFAULT_SUBJECT_DESCRIPTIONS[code.toUpperCase()]) {
    return DEFAULT_SUBJECT_DESCRIPTIONS[code.toUpperCase()]
  }
  if (!rawDesc) {
    return 'Comprehensive course covering core principles, practical exercises, and real-world software applications.'
  }
  return rawDesc
}

export function extractAssignmentTypesFromSyllabus(syllabusDataRaw?: string | object | null): string[] {
  const fallbackTypes = ['Assignment 1', 'Assignment 2', 'Lab 1', 'Lab 2', 'Workshop', 'Project']

  if (!syllabusDataRaw) {
    return fallbackTypes
  }

  try {
    const parsed = typeof syllabusDataRaw === 'string' ? JSON.parse(syllabusDataRaw) : syllabusDataRaw
    const scheme = parsed?.assessmentScheme || parsed?.assessment_scheme || parsed?.assessments || []
    const sessions = parsed?.sessions || parsed?.sessionList || []

    const excludeKeywords = ['final', 'progress', 'progesstest', 'pt', 'practical', 'pe', 'exam', 'kiểm tra', 'thi']

    const resultTypes: string[] = []

    if (Array.isArray(scheme) && scheme.length > 0) {
      scheme.forEach((item: any) => {
        const cat = String(item.category || item.name || '').trim()
        if (!cat) return

        const lowerCat = cat.toLowerCase()
        const isExcluded = excludeKeywords.some(kw => lowerCat.includes(kw))

        if (!isExcluded) {
          let partNum = parseInt(String(item.part || '1'), 10) || 1
          const cleanName = cat.replace(/\s*\([A-Za-z0-9]+\)\s*/g, ' ').trim()

          if (Array.isArray(sessions) && sessions.length > 0) {
            let maxFoundInSessions = 0

            sessions.forEach((s: any) => {
              const topicStr = String(s.topic || '').toLowerCase()
              const tasksStr = String(s.studentTasks || '').toLowerCase()
              const combined = `${topicStr} ${tasksStr}`

              const cleanLower = cleanName.toLowerCase()
              const matchRegex = new RegExp(`${cleanLower}\\s*(\\d+)`, 'i')
              const match = combined.match(matchRegex)
              if (match && match[1]) {
                const num = parseInt(match[1], 10)
                if (num > maxFoundInSessions) maxFoundInSessions = num
              }
            })

            if (maxFoundInSessions > partNum) {
              partNum = maxFoundInSessions
            }
          }

          if (partNum > 1) {
            for (let i = 1; i <= partNum; i++) {
              resultTypes.push(`${cleanName} ${i}`)
            }
          } else {
            resultTypes.push(cleanName || cat)
          }
        }
      })
    }

    if (resultTypes.length === 0) {
      return fallbackTypes
    }

    return Array.from(new Set(resultTypes))
  } catch {
    return fallbackTypes
  }
}
