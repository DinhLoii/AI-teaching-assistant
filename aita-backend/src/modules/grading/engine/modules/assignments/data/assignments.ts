// @ts-nocheck
import { Assignment } from '../types';

/**
 * Static assignment data store (MVP — no database).
 * In a production system, this would be backed by a database.
 */
export const assignments: Assignment[] = [
  {
    id: 'student-management-system',
    title: 'Student Management System',
    description:
      'Build a Student Management System using ASP.NET Core Web API with clean architecture principles. ' +
      'The system should demonstrate proper separation of concerns, dependency injection, and standard ' +
      '.NET design patterns.',
    requirements: [
      'Use ASP.NET Core Web API',
      'Use MVC architecture with Controllers',
      'Implement a Service layer for business logic',
      'Implement the Repository pattern for data access',
      'Use Dependency Injection via constructor injection',
      'Define Interfaces for services and repositories',
      'Separate DbContext from Controllers — use Repository layer',
      'Follow C# naming conventions (PascalCase, I-prefix for interfaces)',
      'Keep methods concise (under 40 lines)',
    ],
    rubric: [
      { requirement: 'MVC Structure (Controllers)', score: 10, category: 'Architecture' },
      { requirement: 'Service Layer', score: 10, category: 'Architecture' },
      { requirement: 'Repository Pattern', score: 10, category: 'Architecture' },
      { requirement: 'Dependency Injection', score: 10, category: 'Architecture' },
      { requirement: 'Interfaces', score: 10, category: 'Architecture' },
      { requirement: 'Naming Convention', score: 10, category: 'Naming' },
      { requirement: 'Build Success', score: 20, category: 'Code Quality' },
      { requirement: 'Clean Controller Design', score: 10, category: 'Best Practices' },
      { requirement: 'Method Size', score: 10, category: 'Code Quality' },
    ],
    totalScore: 100,
  },
];

