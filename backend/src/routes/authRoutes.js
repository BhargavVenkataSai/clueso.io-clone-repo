const express = require('express');
const router = express.Router();
const { signup, login, getMe } = require('../controllers/authController');
const { signupValidation, loginValidation } = require('../middleware/validation');
const authenticate = require('../middleware/authenticate');

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', signupValidation, signup);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginValidation, login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, getMe);

module.exports = router;
