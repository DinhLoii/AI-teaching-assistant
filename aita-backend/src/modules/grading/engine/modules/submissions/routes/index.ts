import { Router } from 'express';
import { SubmissionController } from '../controllers/SubmissionController.js';
import { RubricEvaluator } from '../../../application/evaluator/RubricEvaluator.js';
import { ExecutionSandboxService } from '../../../application/sandbox/ExecutionSandboxService.js';
import { PlaywrightExecutor } from '../../../application/execution/PlaywrightExecutor.js';
import { LocalArtifactStore } from '../../../infrastructure/file-system/LocalArtifactStore.js';
import { GeminiAiProvider } from '../../../infrastructure/ai/GeminiAiProvider.js';
import { uploadMiddleware } from '../../../shared/middleware/uploadMiddleware.js';
import { requireRoles } from '../../../../../../middleware/auth.js';

export let engineSubmissionController: SubmissionController;

export function createSubmissionRoutes(): Router {
  const router = Router();

  const artifactStore = new LocalArtifactStore();
  const aiProvider = new GeminiAiProvider();
  const rubricEvaluator = new RubricEvaluator(aiProvider, artifactStore);
  const sandboxService = new ExecutionSandboxService();
  const playwrightExecutor = new PlaywrightExecutor(artifactStore);

  engineSubmissionController = new SubmissionController(sandboxService, playwrightExecutor, rubricEvaluator);
  const controller = engineSubmissionController;

  router.post('/', requireRoles('ADMIN', 'LECTURER'), uploadMiddleware.single('file'), controller.submit);
  router.post('/upload-batch', requireRoles('ADMIN', 'LECTURER'), uploadMiddleware.array('files', 50), controller.submitBatch);
  router.post('/grade-existing', requireRoles('ADMIN', 'LECTURER'), controller.gradeExisting);
  router.post('/grade-existing-batch', requireRoles('ADMIN', 'LECTURER'), controller.gradeExistingBatch);
  router.post('/grade-selected-batch', requireRoles('ADMIN', 'LECTURER'), controller.gradeSelectedBatch);
  router.post('/batch-cancel', requireRoles('ADMIN', 'LECTURER'), controller.cancelBatch);
  router.get('/batch-status', requireRoles('ADMIN', 'LECTURER'), controller.getBatchStatus);
  router.get('/history', requireRoles('ADMIN', 'LECTURER'), controller.getHistory);
  router.delete('/history/:id', requireRoles('ADMIN', 'LECTURER'), controller.deleteHistory);
  router.get('/:id/stream', controller.streamProgress);
  router.post('/:id/cancel', controller.cancel);
  router.get('/:id/result', controller.getResult);
  router.put('/:id/result', requireRoles('ADMIN', 'LECTURER'), controller.updateResult);
  router.post('/:id/publish', requireRoles('ADMIN', 'LECTURER'), controller.publish);
  router.post('/:id/unpublish', requireRoles('ADMIN', 'LECTURER'), controller.unpublish);
  router.get('/health', controller.healthCheck);

  return router;
}


