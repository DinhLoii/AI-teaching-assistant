import { Router } from 'express'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../utils/async-handler.js'
import type { SemestersController } from './semesters.controller.js'

export function createSemestersRouter(controller: SemestersController): Router {
  const router = Router()

  router.use(authenticate)

  router.get('/', requireRoles('ADMIN', 'LECTURER', 'STUDENT'), asyncHandler(controller.list.bind(controller)))
  router.post('/', requireRoles('ADMIN'), asyncHandler(controller.create.bind(controller)))
  router.post('/season', requireRoles('ADMIN'), asyncHandler(controller.createSeason.bind(controller)))
  router.post('/season/:season/activate', requireRoles('ADMIN'), asyncHandler(controller.activateSeason.bind(controller)))
  router.delete('/season/:season', requireRoles('ADMIN'), asyncHandler(controller.deleteSeason.bind(controller)))
  router.patch('/:id', requireRoles('ADMIN'), asyncHandler(controller.update.bind(controller)))
  router.delete('/:id', requireRoles('ADMIN'), asyncHandler(controller.delete.bind(controller)))

  // Subject assignment routes
  router.get('/:id/subjects', requireRoles('ADMIN', 'LECTURER', 'STUDENT'), asyncHandler(controller.listSemesterSubjects.bind(controller)))
  router.put('/:id/subjects', requireRoles('ADMIN'), asyncHandler(controller.manageSemesterSubjects.bind(controller)))
  router.post('/:id/subjects', requireRoles('ADMIN'), asyncHandler(controller.addSubjects.bind(controller)))
  router.delete('/:id/subjects/:subjectId', requireRoles('ADMIN'), asyncHandler(controller.removeSubject.bind(controller)))

  // Classes by subject within a semester
  router.get('/:id/subjects/:subjectId/classes', requireRoles('ADMIN', 'LECTURER', 'STUDENT'), asyncHandler(controller.getClassesBySubject.bind(controller)))

  return router
}
