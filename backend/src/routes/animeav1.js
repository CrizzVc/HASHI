import { Router } from 'express';

const router = Router();

router.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Las extensiones se encuentran deshabilitadas.' });
});

export default router;
