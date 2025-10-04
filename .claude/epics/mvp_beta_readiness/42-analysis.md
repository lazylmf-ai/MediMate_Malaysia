---
issue: 42
title: Week 1 - Critical Bug Fixes & Navigation Wiring
analyzed: 2025-10-04T12:35:05Z
estimated_hours: 40
parallelization_factor: 2.5
---

# Parallel Work Analysis: Issue #42

## Overview

Week 1 focuses on fixing critical production-blocking bugs and wiring existing navigation flows. The work involves backend bug fixes, removing mock data, creating new navigators, and building 4 shared UI components. This is highly parallelizable work with minimal file conflicts.

## Parallel Streams

### Stream A: Backend Stability & API Fixes
**Scope**: Fix critical Redis bug and remove mock data from medication/family APIs
**Files**:
- `backend/src/services/medication/MedicationService.ts` (Redis import fix)
- `backend/src/services/cache/redisService.ts` (verify exports)
- `backend/src/routes/medication.ts` (remove mocks, wire to DB)
- `backend/src/routes/family.ts` (remove mocks, wire to DB)
- `backend/src/controllers/MedicationController.ts` (DB queries)
- `backend/src/controllers/family/FamilyController.ts` (DB queries)

**Agent Type**: backend-developer
**Can Start**: immediately
**Estimated Hours**: 12 hours
**Dependencies**: none

**Tasks**:
1. Fix Redis import error (1 hour) - **P0 CRITICAL**
2. Test medication service startup (0.5 hour)
3. Remove medication API mocks (4 hours)
   - POST /api/medications
   - GET /api/medications/:id
   - PUT /api/medications/:id
   - DELETE /api/medications/:id
   - GET /api/medications/user/:userId
4. Remove family API mocks (3 hours)
   - GET /api/family/:familyId/members
   - POST /api/family/:familyId/invite
   - GET /api/family/:familyId/adherence
5. Write database queries (2 hours)
6. Backend integration tests (1.5 hours)

---

### Stream B: Navigation Wiring & Screen Integration
**Scope**: Create navigation stacks and wire existing screens to main app navigation
**Files**:
- `frontend/src/navigation/MedicationsNavigator.tsx` (new file)
- `frontend/src/navigation/FamilyNavigator.tsx` (new file)
- `frontend/src/navigation/MainNavigator.tsx` (update to include new navigators)
- `frontend/src/screens/MedicationsScreen.tsx` (replace placeholder)
- `frontend/src/screens/FamilyScreen.tsx` (replace placeholder)
- `frontend/src/screens/medication/MedicationListScreen.tsx` (new file, or wire existing)
- `frontend/src/types/navigation.ts` (update type definitions)

**Agent Type**: react-component-architect
**Can Start**: immediately
**Estimated Hours**: 12 hours
**Dependencies**: none

**Tasks**:
1. Create MedicationsNavigator stack (2 hours)
2. Create FamilyNavigator stack (2 hours)
3. Replace MedicationsScreen placeholder (1 hour)
4. Replace FamilyScreen placeholder with CaregiverDashboard (1 hour)
5. Update MainNavigator routing (2 hours)
6. Configure deep linking (2 hours)
7. Navigation type definitions (1 hour)
8. Navigation tests (1 hour)

---

### Stream C: Shared UI Components Library
**Scope**: Build 4 reusable shared components required by MedicationEntryScreen and other screens
**Files**:
- `frontend/src/components/shared/SearchableDropdown.tsx` (new file)
- `frontend/src/components/shared/ValidationMessage.tsx` (new file)
- `frontend/src/components/shared/ProgressIndicator.tsx` (new file)
- `frontend/src/components/shared/CulturalNote.tsx` (new file)
- `frontend/src/components/shared/index.ts` (export barrel file)
- `frontend/src/components/shared/SearchableDropdown.test.tsx` (new file)
- `frontend/src/components/shared/ValidationMessage.test.tsx` (new file)
- `frontend/src/components/shared/ProgressIndicator.test.tsx` (new file)
- `frontend/src/components/shared/CulturalNote.test.tsx` (new file)

**Agent Type**: react-component-architect
**Can Start**: immediately
**Estimated Hours**: 16 hours
**Dependencies**: none

**Tasks**:
1. Build SearchableDropdown (4 hours)
   - Search filter logic
   - Keyboard navigation
   - Accessibility (ARIA labels)
   - Unit tests
2. Build ValidationMessage (3 hours)
   - Type-based styling (error/warning/success/info)
   - Icon integration
   - Accessibility
   - Unit tests
3. Build ProgressIndicator (4 hours)
   - Visual progress bar
   - Percentage display
   - Cultural styling (colors, animations)
   - Unit tests
4. Build CulturalNote (4 hours)
   - Cultural context icons (prayer, festival, dietary)
   - Info box styling
   - Internationalization
   - Unit tests
5. Create barrel exports (0.5 hour)
6. Storybook documentation (0.5 hour)

---

## Coordination Points

### Shared Files

**Low Conflict Risk:**
- `frontend/src/types/navigation.ts` - Only Stream B modifies (navigation types)
- `frontend/src/navigation/MainNavigator.tsx` - Only Stream B modifies (routing)
- `backend/src/services/medication/MedicationService.ts` - Only Stream A modifies (Redis fix)

**No Shared Files:**
- Streams A, B, and C work on completely separate directories
- Backend (Stream A) vs Frontend Navigation (Stream B) vs Frontend Components (Stream C)

### Sequential Requirements

**None** - All streams are fully independent and can run in parallel:

1. Stream A (Backend) doesn't depend on frontend work
2. Stream B (Navigation) uses existing screens, doesn't need new components yet
3. Stream C (Components) builds standalone UI, doesn't need navigation or backend

**Note:** MedicationEntryScreen currently imports Stream C components, but this screen isn't part of Week 1 work. It will be fixed once components are available (Week 1 or 2).

---

## Conflict Risk Assessment

**🟢 LOW RISK: Highly parallelizable work**

**Why Low Risk:**
- Streams work in completely different directories:
  - Stream A: `backend/`
  - Stream B: `frontend/src/navigation/` + `frontend/src/screens/`
  - Stream C: `frontend/src/components/shared/`
- No shared files being modified by multiple streams
- Backend and frontend work are independent
- Navigation and components are independent

**Minimal Coordination Needed:**
- Streams B and C might want to coordinate on component naming conventions (very minor)
- Stream A backend changes won't affect Stream B/C frontend work (APIs already exist)

---

## Parallelization Strategy

**Recommended Approach**: **FULL PARALLEL** ✅

Launch all 3 streams simultaneously on Day 1:
- **Stream A** (Backend Engineer): Start immediately, fix Redis bug first (1 hour P0), then remove mocks
- **Stream B** (Frontend Dev 1): Start immediately, create navigators and wire screens
- **Stream C** (Frontend Dev 2): Start immediately, build shared components library

**No dependencies between streams** - all can complete independently.

**Team Allocation:**
- 1 Backend Developer → Stream A (12 hours over 1.5 days)
- 1 Frontend Developer → Stream B (12 hours over 1.5 days)
- 1 Frontend Developer → Stream C (16 hours over 2 days)

**Coordination Points:**
- Daily 15-minute standup to sync progress
- Stream A should prioritize Redis fix (P0) on Day 1 morning
- Streams B and C can work fully independently

---

## Expected Timeline

### With Parallel Execution (RECOMMENDED):
- **Wall time**: 16 hours (2 days with 8-hour workdays)
- **Total work**: 40 hours (12 + 12 + 16)
- **Efficiency gain**: 60% faster (40h → 16h wall time)
- **Parallelization factor**: 2.5x speedup

**Day-by-Day Breakdown:**
```
Day 1:
  Stream A: Redis fix (1h) + API mock removal starts (7h) = 8h
  Stream B: MedicationsNavigator + FamilyNavigator (8h)
  Stream C: SearchableDropdown + ValidationMessage (7h)

Day 2:
  Stream A: Complete API mocks + tests (4h) = DONE ✅
  Stream B: Wire screens + deep linking + tests (4h) = DONE ✅
  Stream C: ProgressIndicator + CulturalNote + tests (9h)

Day 2.5:
  Stream C: Complete remaining work (7h from Day 2, need 9h) = DONE ✅
```

### Without Parallel Execution (NOT RECOMMENDED):
- **Wall time**: 40 hours (5 days sequential)
- **Total work**: 40 hours
- **No efficiency gain**

**Sequential would be:**
```
Day 1-1.5: Stream A (12h)
Day 1.5-3: Stream B (12h)
Day 3-5: Stream C (16h)
```

---

## Testing Strategy

### Stream A (Backend) Testing:
```bash
# After Redis fix
npm test -- backend/src/services/medication/MedicationService.test.ts

# After API mock removal
npm test -- backend/src/routes/medication.test.ts
npm test -- backend/src/routes/family.test.ts

# Integration tests
npm test -- backend/src/__tests__/integration/medication-api.test.ts
```

### Stream B (Navigation) Testing:
```bash
# Navigation tests
npm test -- frontend/src/navigation/MedicationsNavigator.test.tsx
npm test -- frontend/src/navigation/FamilyNavigator.test.tsx

# E2E navigation flow
npm test -- frontend/src/__tests__/e2e/navigation-flow.test.tsx
```

### Stream C (Components) Testing:
```bash
# Component unit tests
npm test -- frontend/src/components/shared/SearchableDropdown.test.tsx
npm test -- frontend/src/components/shared/ValidationMessage.test.tsx
npm test -- frontend/src/components/shared/ProgressIndicator.test.tsx
npm test -- frontend/src/components/shared/CulturalNote.test.tsx

# Accessibility tests
npm test -- frontend/src/components/shared/a11y.test.tsx
```

---

## Integration Points

### End of Week 1:
Once all 3 streams complete, verify integration:

1. **Backend + Frontend Integration**:
   - Test medication APIs return real data (not mocks)
   - Test family APIs return real data
   - Test API error handling

2. **Navigation Integration**:
   - Test medication list screen loads
   - Test family caregiver dashboard loads
   - Test deep linking works

3. **Component Integration**:
   - Test MedicationEntryScreen imports work (needs Stream C complete)
   - Test shared components render correctly
   - Test accessibility across all screens

### Integration Testing (Day 5):
After all streams complete, run comprehensive integration tests:
```bash
# Full E2E flow
npm test -- e2e/medication-flow.test.tsx
npm test -- e2e/family-flow.test.tsx

# Cross-stream integration
npm test -- integration/full-app.test.tsx
```

---

## Risk Mitigation

### Stream A Risks:
**Risk**: Database queries more complex than expected
**Mitigation**: Database schema already exists, use ORM query builder
**Contingency**: Simplify queries, optimize later

### Stream B Risks:
**Risk**: Existing screens have dependencies on missing components
**Mitigation**: Most screens exist and work, just need navigation wiring
**Contingency**: Temporarily stub missing dependencies, fix when Stream C completes

### Stream C Risks:
**Risk**: Components more complex than estimated (cultural styling, i18n)
**Mitigation**: Start with minimal versions, enhance in Week 2
**Contingency**: Skip Storybook documentation if time-constrained

---

## Success Metrics

### Stream A (Backend) - Day 2 Target:
- [ ] Redis import bug fixed ✅
- [ ] 0 backend console errors
- [ ] 8/8 API endpoints return real data (0 mocks)
- [ ] All backend tests passing (100%)

### Stream B (Navigation) - Day 2 Target:
- [ ] 2/2 navigators created ✅
- [ ] 2/2 placeholder screens replaced ✅
- [ ] Deep linking functional
- [ ] Navigation tests passing (100%)
- [ ] <1s navigation between screens

### Stream C (Components) - Day 2.5 Target:
- [ ] 4/4 components built and tested ✅
- [ ] 100% test coverage on components
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Storybook entries created
- [ ] Components exported in barrel file

### Overall Week 1 - Day 5 Target:
- [ ] All 3 streams complete ✅
- [ ] End-to-end medication flow working
- [ ] End-to-end family flow working
- [ ] 0 critical bugs
- [ ] 0 placeholder screens
- [ ] Demo video recorded

---

## Notes

### Critical Priority:
🔴 **Stream A Redis fix is P0** - must complete in first hour of Day 1 to unblock medication service

### Component Reusability:
The 4 shared components (Stream C) will be used across the app:
- SearchableDropdown: Medication search, family member selection
- ValidationMessage: Form validation across all screens
- ProgressIndicator: Multi-step forms, loading states
- CulturalNote: Cultural reminders, prayer notifications, festival alerts

Building these properly in Week 1 saves time in Weeks 2-4.

### Testing Philosophy:
Each stream should aim for:
- Unit tests: 100% coverage for new code
- Integration tests: Key user flows
- Accessibility: WCAG 2.1 AA compliance
- No mocks in final integration tests

### Code Review:
- Stream A: Backend code review after Day 2
- Stream B: Navigation code review after Day 2
- Stream C: Component code review after Day 3
- Full integration review: Day 5

---

## Recommended Execution Plan

**Day 1 Morning (Hour 1):**
- Stream A: Fix Redis import bug (P0) ✅
- Stream B: Create MedicationsNavigator skeleton
- Stream C: Set up component directory structure

**Day 1 Afternoon:**
- Stream A: Start removing medication API mocks
- Stream B: Build MedicationsNavigator fully
- Stream C: Build SearchableDropdown

**Day 2:**
- Stream A: Complete API mock removal + tests
- Stream B: Build FamilyNavigator + wire screens
- Stream C: Build ValidationMessage + start ProgressIndicator

**Day 3:**
- Stream A: **COMPLETE** ✅
- Stream B: **COMPLETE** ✅
- Stream C: Build ProgressIndicator + CulturalNote

**Day 4:**
- Stream C: Complete CulturalNote + tests + Storybook
- **Integration Testing**: Test all streams together

**Day 5:**
- Final integration testing
- Bug fixes
- Demo video recording
- **Week 1 COMPLETE** ✅

---

**Next**: After analysis approval, run `/pm:issue-start 42` to begin parallel execution
