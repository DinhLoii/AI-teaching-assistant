import { Router } from 'express';
import { SubmissionController } from '../controllers/SubmissionController.js';
import { RubricEvaluator } from '../../../application/evaluator/RubricEvaluator.js';
import { ExecutionSandboxService } from '../../../application/sandbox/ExecutionSandboxService.js';
import { PlaywrightExecutor } from '../../../application/execution/PlaywrightExecutor.js';
import { LocalArtifactStore } from '../../../infrastructure/file-system/LocalArtifactStore.js';
import { GeminiAiProvider } from '../../../infrastructure/ai/GeminiAiProvider.js';
import { uploadMiddleware } from '../../../shared/middleware/uploadMiddleware.js';

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

  router.post('/', uploadMiddleware.single('file'), controller.submit);
  router.post('/upload-batch', uploadMiddleware.array('files', 50), controller.submitBatch);
  router.post('/grade-existing', controller.gradeExisting);
  router.post('/grade-existing-batch', controller.gradeExistingBatch);
  router.post('/grade-selected-batch', controller.gradeSelectedBatch);
  router.post('/batch-cancel', controller.cancelBatch);
  router.get('/batch-status', controller.getBatchStatus);
  router.get('/history', controller.getHistory);
  router.delete('/history/:id', controller.deleteHistory);
  router.get('/:id/stream', controller.streamProgress);
  router.post('/:id/cancel', controller.cancel);
  router.get('/:id/result', controller.getResult);
  router.put('/:id/result', controller.updateResult);
  router.post('/:id/publish', controller.publish);
  router.post('/:id/unpublish', controller.unpublish);
  router.get('/health', controller.healthCheck);

  return router;
}


