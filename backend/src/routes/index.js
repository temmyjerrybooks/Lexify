const router = require('express').Router();

const authRoutes = require('./auth.routes');
const examRoutes = require('./exam.routes');
const questionRoutes = require('./question.routes');
const resultRoutes = require('./result.routes');
const aiRoutes = require('./ai.routes');
const userRoutes = require('./user.routes');
const streakRoutes = require('./streak.routes');
const leaderboardRoutes = require('./leaderboard.routes');

router.use('/auth', authRoutes);
router.use('/exams', examRoutes);
router.use('/questions', questionRoutes);
router.use('/results', resultRoutes);
router.use('/ai', aiRoutes);
router.use('/users', userRoutes);
router.use('/streaks', streakRoutes);
router.use('/leaderboard', leaderboardRoutes);

module.exports = router;
