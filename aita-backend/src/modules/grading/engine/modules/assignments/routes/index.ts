import { Router } from 'express';
import multer from 'multer';
import { AssignmentController } from '../controllers/AssignmentController.js';
import { DocumentExtractor } from '../../../assignment/DocumentExtractor.js';
import { LocalArtifactStore } from '../../../infrastructure/file-system/LocalArtifactStore.js';
import { requireRoles } from '../../../../../../middleware/auth.js';
import { requireAssignmentAccess, requirePublishClasses } from '../../../assignment/assignment-access.js';

export function createAssignmentRoutes(): Router {
  const router = Router();
  const artifactStore = new LocalArtifactStore();
  const documentExtractor = new DocumentExtractor();
  const controller = new AssignmentController(documentExtractor, artifactStore);
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for PDF/DOCX uploads
  });

  const staff = requireRoles('ADMIN', 'LECTURER');
  router.post('/upload', staff, upload.single('file'), controller.uploadAssignment);
  router.post('/extract-text', staff, upload.single('file'), controller.extractText);
  router.post('/generate-content', staff, controller.generateContent);
  router.post('/parse-rubric', staff, controller.parseRubric);
  router.post('/parse-sql-key', staff, upload.single('file'), controller.parseSqlKey);
  router.post('/parse-requirements', staff, controller.parseRequirements);
  router.post('/generate-rubric', staff, controller.generateRubric);
  router.post('/publish', staff, requirePublishClasses, controller.publish);
  router.get('/', controller.getAll);
  router.get('/trash', requireRoles('ADMIN', 'LECTURER'), controller.getTrash);
  router.post('/bulk-hard-delete', staff, requireAssignmentAccess(true, true), controller.bulkHardDelete);
  router.post('/bulk-restore', staff, requireAssignmentAccess(true, true), controller.bulkRestore);
  router.get('/:id/events', staff, requireAssignmentAccess(), controller.streamAssignmentEvents);
  router.get('/:id/sql-key', staff, requireAssignmentAccess(), controller.downloadSqlKey);
  router.get('/:id', requireAssignmentAccess(), controller.getById);
  router.put('/strategy/update-all', staff, controller.updateAllStrategy);
  router.post('/:id/update-answer-key', staff, requireAssignmentAccess(true), upload.single('file'), controller.updateAnswerKey);
  router.post('/:id/restore', staff, requireAssignmentAccess(true), controller.restore);
  router.delete('/:id/hard-delete', staff, requireAssignmentAccess(true), controller.hardDelete);
  router.put('/:id', staff, requireAssignmentAccess(true), controller.update);
  router.delete('/:id', staff, requireAssignmentAccess(true), controller.delete);

  return router;
}

