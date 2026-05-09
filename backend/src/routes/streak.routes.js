const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const streakService = require('../services/streak.service');

router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const status = await streakService.getStreakStatus(req.userId);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
