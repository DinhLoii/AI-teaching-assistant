import { Router } from 'express';
import multer from 'multer';
import { AssignmentController } from '../controllers/AssignmentController.js';
import { DocumentExtractor } from '../../../assignment/DocumentExtractor.js';
import { LocalArtifactStore } from '../../../infrastructure/file-system/LocalArtifactStore.js';

export function createAssignmentRoutes(): Router {
  const router = Router();
  const artifactStore = new LocalArtifactStore();
  const documentExtractor = new DocumentExtractor();
  const controller = new AssignmentController(documentExtractor, artifactStore);
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for PDF/DOCX uploads
  });

  router.post('/upload', upload.single('file'), controller.uploadAssignment);
  router.post('/extract-text', upload.single('file'), controller.extractText);
  router.post('/generate-content', controller.generateContent);
  router.post('/parse-rubric', controller.parseRubric);
  router.post('/parse-sql-key', upload.single('file'), controller.parseSqlKey);
  router.post('/parse-requirements', controller.parseRequirements);
  router.post('/generate-rubric', controller.generateRubric);
  router.post('/publish', controller.publish);
  router.get('/', controller.getAll);
  router.get('/trash', controller.getTrash);
  router.post('/bulk-hard-delete', controller.bulkHardDelete);
  router.post('/bulk-restore', controller.bulkRestore);
  router.get('/:id/events', controller.streamAssignmentEvents);
  router.get('/:id/sql-key', controller.downloadSqlKey);
  router.get('/:id', controller.getById);
  router.put('/strategy/update-all', controller.updateAllStrategy);
  router.post('/:id/update-answer-key', upload.single('file'), controller.updateAnswerKey);
  router.post('/:id/restore', controller.restore);
  router.delete('/:id/hard-delete', controller.hardDelete);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.delete);

  return router;
}

