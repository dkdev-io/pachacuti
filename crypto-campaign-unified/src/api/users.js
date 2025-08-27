/**
 * User API Routes
 * Handles user authentication and profile management
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/supabaseClient.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { validateUserData } from '../utils/validation.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();
const dbService = new DatabaseService();

/**
 * POST /api/users/register
 * Register new user
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, walletAddress } = req.body;

  try {
    // Validate input data
    const validation = validateUserData({ email, password, firstName, lastName });
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid user data',
        details: validation.errors
      });
    }

    // Check if user already exists
    const existingUser = await dbService.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'User already exists with this email'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const userData = {
      id: crypto.randomUUID(),
      email,
      password_hash: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      wallet_address: walletAddress,
      status: 'active',
      role: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const user = await dbService.createUser(userData);
    
    // Generate JWT token
    const token = generateToken(user);

    // Remove sensitive data from response
    const { password_hash, ...userResponse } = user;

    res.status(201).json({
      data: {
        user: userResponse,
        token,
        expiresIn: '24h'
      },
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register user'
    });
  }
}));

/**
 * POST /api/users/login
 * User login
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await dbService.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Account is inactive'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Update last login
    await dbService.updateUser(user.id, {
      last_login_at: new Date().toISOString()
    });

    // Remove sensitive data from response
    const { password_hash, ...userResponse } = user;

    res.json({
      data: {
        user: userResponse,
        token,
        expiresIn: '24h'
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to login'
    });
  }
}));

/**
 * GET /api/users/profile
 * Get current user profile
 */
router.get('/profile', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await dbService.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // Remove sensitive data
    const { password_hash, ...userResponse } = user;

    res.json({ data: userResponse });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch profile'
    });
  }
}));

/**
 * PUT /api/users/profile
 * Update user profile
 */
router.put('/profile', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { firstName, lastName, walletAddress } = req.body;

  try {
    const updates = {
      updated_at: new Date().toISOString()
    };

    if (firstName !== undefined) updates.first_name = firstName;
    if (lastName !== undefined) updates.last_name = lastName;
    if (walletAddress !== undefined) updates.wallet_address = walletAddress;

    const updatedUser = await dbService.updateUser(userId, updates);
    
    // Remove sensitive data
    const { password_hash, ...userResponse } = updatedUser;

    res.json({
      data: userResponse,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update profile'
    });
  }
}));

/**
 * PUT /api/users/password
 * Change user password
 */
router.put('/password', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  try {
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'New password must be at least 8 characters long'
      });
    }

    // Get current user
    const user = await dbService.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await dbService.updateUser(userId, {
      password_hash: hashedNewPassword,
      updated_at: new Date().toISOString()
    });

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to change password'
    });
  }
}));

/**
 * POST /api/users/logout
 * User logout (token blacklisting would be implemented here)
 */
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  // In a production system, you would blacklist the token here
  // For now, we'll just return success
  res.json({
    message: 'Logout successful'
  });
}));

/**
 * DELETE /api/users/account
 * Delete user account
 */
router.delete('/account', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { password } = req.body;

  try {
    // Validate password for account deletion
    if (!password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Password is required to delete account'
      });
    }

    const user = await dbService.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid password'
      });
    }

    // Check for active campaigns or contributions
    const activeCampaigns = await dbService.getUserActiveCampaigns(userId);
    const pendingContributions = await dbService.getUserPendingContributions(userId);

    if (activeCampaigns.length > 0 || pendingContributions.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Cannot delete account with active campaigns or pending contributions'
      });
    }

    // Soft delete user (mark as inactive)
    await dbService.updateUser(userId, {
      status: 'deleted',
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.json({
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete account'
    });
  }
}));

export { router as userRoutes };