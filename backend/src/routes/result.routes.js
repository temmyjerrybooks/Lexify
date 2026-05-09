const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const resultController = require('../controllers/result.controller');

router.use(verifyToken); // All result routes require auth

router.get('/', resultController.getUserResults);
router.get('/analytics', resultController.getAnalytics);
router.get('/:resultId', resultController.getResult);

module.exports = router;
