import AppController from '../controllers/AppController';
import express from 'express';

const router = express.Router();

router.get('/status', (req, res) => {
    AppController.getStatus(req, res);
})

router.get('/stats', (req, res) => {
    AppController.getStats(req, res);
})

export default router;
