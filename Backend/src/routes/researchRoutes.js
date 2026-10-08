/**
 * researchRoutes.js
 *
 * All /api/research routes wired to their controllers.
 */

import { Router } from 'express';
import {
  startResearch,
  getResearchById,
  streamEvents,
  getPaper,
} from '../controllers/researchController.js';

const router = Router();

// POST /api/research
router.post('/', startResearch);

// GET /api/research/:id
router.get('/:id', getResearchById);

// GET /api/research/:id/events  (SSE)
router.get('/:id/events', streamEvents);

// GET /api/research/:id/paper
router.get('/:id/paper', getPaper);

export default router;
