/**
 * Family Routes
 * RESTful API routes for family circle management
 */

import { Router } from 'express';
import { FamilyController } from '../controllers/family.controller';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { familyPermissionCheck } from '../middleware/permissions';
import { body, param, query } from 'express-validator';

const router = Router();

// Authentication required for all family routes
router.use(authenticateToken);

// Validation schemas
const createFamilyValidation = [
  body('name').isLength({ min: 2, max: 100 }).withMessage('Family name must be 2-100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be under 500 characters'),
  body('cultural_preferences').optional().isObject().withMessage('Cultural preferences must be an object'),
  body('privacy_settings').optional().isObject().withMessage('Privacy settings must be an object'),
  validateRequest
];

const updateFamilyValidation = [
  param('familyId').isUUID().withMessage('Invalid family ID'),
  body('name').optional().isLength({ min: 2, max: 100 }).withMessage('Family name must be 2-100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be under 500 characters'),
  body('cultural_preferences').optional().isObject().withMessage('Cultural preferences must be an object'),
  body('privacy_settings').optional().isObject().withMessage('Privacy settings must be an object'),
  validateRequest
];

const inviteMemberValidation = [
  param('familyId').isUUID().withMessage('Invalid family ID'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').isIn(['admin', 'caregiver', 'dependent', 'observer']).withMessage('Valid role is required'),
  body('relationship').isLength({ min: 2, max: 50 }).withMessage('Relationship must be 2-50 characters'),
  body('phone').optional().isMobilePhone('ms-MY').withMessage('Invalid Malaysian phone number'),
  body('cultural_context').optional().isObject().withMessage('Cultural context must be an object'),
  validateRequest
];

const acceptInvitationValidation = [
  param('inviteCode').isLength({ min: 6, max: 50 }).withMessage('Invalid invite code'),
  body('display_name').isLength({ min: 2, max: 100 }).withMessage('Display name must be 2-100 characters'),
  body('cultural_preferences').optional().isObject().withMessage('Cultural preferences must be an object'),
  body('emergency_contact').optional().isObject().withMessage('Emergency contact must be an object'),
  validateRequest
];

const updateMemberValidation = [
  param('familyId').isUUID().withMessage('Invalid family ID'),
  param('memberId').isUUID().withMessage('Invalid member ID'),
  body('display_name').optional().isLength({ min: 2, max: 100 }).withMessage('Display name must be 2-100 characters'),
  body('relationship').optional().isLength({ min: 2, max: 50 }).withMessage('Relationship must be 2-50 characters'),
  body('phone').optional().isMobilePhone('ms-MY').withMessage('Invalid Malaysian phone number'),
  body('cultural_preferences').optional().isObject().withMessage('Cultural preferences must be an object'),
  validateRequest
];

const updateRoleValidation = [
  param('familyId').isUUID().withMessage('Invalid family ID'),
  param('memberId').isUUID().withMessage('Invalid member ID'),
  body('role').isIn(['admin', 'caregiver', 'dependent', 'observer']).withMessage('Valid role is required'),
  validateRequest
];

const familyIdValidation = [
  param('familyId').isUUID().withMessage('Invalid family ID'),
  validateRequest
];

const invitationIdValidation = [
  param('invitationId').isUUID().withMessage('Invalid invitation ID'),
  validateRequest
];

const permissionValidation = [
  param('familyId').isUUID().withMessage('Invalid family ID'),
  query('permission').isLength({ min: 1 }).withMessage('Permission parameter is required'),
  validateRequest
];

// Family Management Routes
router.post('/', createFamilyValidation, FamilyController.createFamily);
router.get('/my-families', FamilyController.getUserFamilies);

// Family Details Routes
router.get('/:familyId', familyIdValidation, FamilyController.getFamilyDetails);
router.put('/:familyId', updateFamilyValidation, familyPermissionCheck('manageFamily'), FamilyController.updateFamily);
router.delete('/:familyId', familyIdValidation, familyPermissionCheck('manageFamily'), FamilyController.archiveFamily);

// Family Dashboard
router.get('/:familyId/dashboard', familyIdValidation, FamilyController.getFamilyDashboard);
router.get('/:familyId/stats', familyIdValidation, FamilyController.getFamilyStats);

// Family Member Management Routes
router.post('/:familyId/members/invite', inviteMemberValidation, familyPermissionCheck('inviteMembers'), FamilyController.inviteMember);
router.put('/:familyId/members/:memberId', updateMemberValidation, FamilyController.updateMember);
router.put('/:familyId/members/:memberId/role', updateRoleValidation, familyPermissionCheck('manageMembers'), FamilyController.updateMemberRole);
router.delete('/:familyId/members/:memberId', familyIdValidation, familyPermissionCheck('manageMembers'), FamilyController.removeMember);

// Invitation Management Routes
router.post('/invitations/:inviteCode/accept', acceptInvitationValidation, FamilyController.acceptInvitation);
router.delete('/invitations/:invitationId', invitationIdValidation, FamilyController.revokeInvitation);

// Permission Check Routes
router.get('/:familyId/permissions/check', permissionValidation, FamilyController.checkPermission);

export default router;