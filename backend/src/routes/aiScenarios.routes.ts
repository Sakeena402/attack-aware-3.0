import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { enforceAiScenarioGenerate } from '../middleware/planLimits.js';
import {
  generateScenarioHandler,
  getScenariosHandler,
  updateScenarioContentHandler,
  approveScenarioHandler,
  rejectScenarioHandler,
} from '../controllers/aiScenarioController.js';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

router.post('/generate', enforceAiScenarioGenerate, generateScenarioHandler);
router.get('/', getScenariosHandler);
router.patch('/:id', updateScenarioContentHandler);
router.post('/:id/approve', approveScenarioHandler);
router.post('/:id/reject', rejectScenarioHandler);

export default router;