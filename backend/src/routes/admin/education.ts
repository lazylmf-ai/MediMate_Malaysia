/**
 * Admin Education Routes
 *
 * API routes for education content management system.
 * Implements role-based access control for admin, content_creator, and medical_reviewer roles.
 */

import express from 'express';
import { requireRole } from '../../middleware/authorization';
import { authenticateUser } from '../../middleware/auth';
import { educationAdminController } from '../../controllers/admin/EducationAdminController';

const router = express.Router();

// Apply authentication to all admin routes
router.use(authenticateUser);

/**
 * Content Management Endpoints
 */

// List all content (with filtering and pagination)
router.get(
    '/content',
    requireRole(['admin', 'content_creator', 'medical_reviewer']),
    (req, res) => educationAdminController.listContent(req, res)
);

// Get specific content by ID
router.get(
    '/content/:id',
    requireRole(['admin', 'content_creator', 'medical_reviewer']),
    (req, res) => educationAdminController.getContent(req, res)
);

// Create new content
router.post(
    '/content',
    requireRole(['admin', 'content_creator']),
    (req, res) => educationAdminController.createContent(req, res)
);

// Update existing content
router.put(
    '/content/:id',
    requireRole(['admin', 'content_creator']),
    (req, res) => educationAdminController.updateContent(req, res)
);

// Delete content (admin only)
router.delete(
    '/content/:id',
    requireRole(['admin']),
    (req, res) => educationAdminController.deleteContent(req, res)
);

/**
 * Review Workflow Endpoints
 */

// Submit content for review
router.post(
    '/content/:id/submit-review',
    requireRole(['content_creator', 'admin']),
    (req, res) => educationAdminController.submitForReview(req, res)
);

// Assign reviewer to content (admin only)
router.post(
    '/content/:id/assign-reviewer',
    requireRole(['admin']),
    (req, res) => educationAdminController.assignReviewer(req, res)
);

// Approve content (medical reviewer only)
router.post(
    '/content/:id/approve',
    requireRole(['medical_reviewer', 'admin']),
    (req, res) => educationAdminController.approveContent(req, res)
);

// Request changes to content (medical reviewer only)
router.post(
    '/content/:id/request-changes',
    requireRole(['medical_reviewer', 'admin']),
    (req, res) => educationAdminController.requestChanges(req, res)
);

/**
 * Publishing Endpoints
 */

// Publish content
router.post(
    '/content/:id/publish',
    requireRole(['admin', 'medical_reviewer']),
    (req, res) => educationAdminController.publishContent(req, res)
);

// Unpublish content (admin only)
router.post(
    '/content/:id/unpublish',
    requireRole(['admin']),
    (req, res) => educationAdminController.unpublishContent(req, res)
);

// Archive content (admin only)
router.post(
    '/content/:id/archive',
    requireRole(['admin']),
    (req, res) => educationAdminController.archiveContent(req, res)
);

/**
 * Analytics Endpoints
 */

// Get analytics overview (admin only)
router.get(
    '/analytics/overview',
    requireRole(['admin']),
    (req, res) => educationAdminController.getAnalyticsOverview(req, res)
);

// Get analytics for specific content
router.get(
    '/analytics/content/:id',
    requireRole(['admin', 'content_creator']),
    (req, res) => educationAdminController.getContentAnalytics(req, res)
);

/**
 * Translation Management Endpoints
 */

// Get translation status for content
router.get(
    '/content/:id/translations',
    requireRole(['admin', 'content_creator']),
    (req, res) => educationAdminController.getTranslationStatus(req, res)
);

// Update translation for specific language
router.put(
    '/content/:id/translations/:language',
    requireRole(['content_creator', 'admin']),
    (req, res) => educationAdminController.updateTranslation(req, res)
);

export default router;
