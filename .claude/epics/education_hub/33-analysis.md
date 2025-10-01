---
issue: 33
title: Offline & Sync Capability
analyzed: 2025-10-01T11:42:54Z
estimated_hours: 48
parallelization_factor: 2.4
---

# Parallel Work Analysis: Issue #33

## Overview
Implement offline-first architecture for education content with download manager, local caching (7-day TTL), background sync service, and storage management. Critical for rural Malaysia users with poor connectivity.

## Parallel Streams

### Stream A: Offline Storage Service
**Scope**: Local file storage, caching logic, TTL management
**Files**:
- `frontend/src/services/offlineStorageService.ts`
- `frontend/src/utils/storageUtils.ts`
**Agent Type**: mobile-app-developer
**Can Start**: immediately
**Estimated Hours**: 12
**Dependencies**: none

**Deliverables**:
- OfflineStorageService class with download/cache/delete methods
- File system integration (React Native FS)
- Storage quota management (500MB limit)
- TTL expiry logic (7-day automatic cleanup)
- Metadata tracking in AsyncStorage

### Stream B: Background Sync Service
**Scope**: Queue management, network detection, retry logic
**Files**:
- `frontend/src/services/backgroundSyncService.ts`
- `frontend/src/utils/syncUtils.ts`
**Agent Type**: mobile-app-developer
**Can Start**: immediately
**Estimated Hours**: 12
**Dependencies**: none

**Deliverables**:
- BackgroundSyncService with queue management
- React Native Background Fetch integration
- Network connectivity detection (NetInfo)
- Retry logic with exponential backoff
- Sync operation types (progress, quiz, achievement)

### Stream C: Download Manager UI
**Scope**: User interface for managing offline content
**Files**:
- `frontend/src/screens/education/DownloadManagerScreen.tsx`
- `frontend/src/components/education/DownloadButton.tsx`
- `frontend/src/components/education/OfflineIndicator.tsx`
- `frontend/src/components/education/StorageStatsCard.tsx`
**Agent Type**: react-component-architect
**Can Start**: after Streams A & B define interfaces
**Estimated Hours**: 10
**Dependencies**: Streams A & B (service APIs)

**Deliverables**:
- Download Manager screen with storage stats
- Download button with progress indicator
- Offline indicator badge in UI
- Storage quota visualization
- Delete/manage downloaded content UI

### Stream D: Offline Hooks & Integration
**Scope**: React hooks for offline functionality, integration with existing screens
**Files**:
- `frontend/src/hooks/useOfflineContent.ts`
- `frontend/src/hooks/useNetworkStatus.ts`
- Modify existing screens (ContentDetailScreen, etc.)
**Agent Type**: react-component-architect
**Can Start**: after Streams A, B, C complete
**Estimated Hours**: 14
**Dependencies**: Streams A, B, C

**Deliverables**:
- useOfflineContent hook for checking cached status
- useNetworkStatus hook for connectivity detection
- Integration into ContentDetailScreen (download button)
- Integration into EducationHomeScreen (offline indicator)
- Fallback to offline content when network unavailable

## Coordination Points

### Shared Files
- **`frontend/src/types/offline.ts`**: Streams A & B define shared types
  - **Resolution**: Create shared types file, both streams import
- **Download UI**: Stream C uses services from Streams A & B
  - **Resolution**: Streams A & B expose clean APIs, Stream C consumes

### Sequential Requirements
1. **Service layer** (Streams A & B) must complete before UI (Stream C) can be built
2. **UI components** (Stream C) needed before integration (Stream D) can use them
3. **Integration** (Stream D) is final step, connects everything together

### Integration Points
- Stream D integrates services from A & B into existing app screens
- Stream C UI components call services from A & B
- Background sync (Stream B) depends on storage service (Stream A) for metadata

## Conflict Risk Assessment
- **Low Risk**: Streams A & B work on different services (storage vs sync)
- **Low Risk**: Stream C is pure UI, doesn't conflict with services
- **Medium Risk**: Stream D modifies existing screens, potential merge conflicts with Task 31 work

## Parallelization Strategy

**Recommended Approach**: hybrid

**Phase 1** (12 hours):
- Launch Stream A (storage) and Stream B (sync) in parallel
- Both are independent services with no conflicts
- Define shared types/interfaces early

**Phase 2** (10 hours):
- Launch Stream C (download UI) after A & B APIs are stable
- Build UI that consumes services from A & B

**Phase 3** (14 hours):
- Launch Stream D (integration) after all components ready
- Connect offline functionality into existing screens
- End-to-end testing

## Expected Timeline

**With parallel execution:**
- Wall time: 36 hours (12 + 10 + 14)
- Total work: 48 hours
- Efficiency gain: 25%

**Without parallel execution:**
- Wall time: 48 hours (sequential: A → B → C → D)

**Critical path**: Stream A & B (12h) → Stream C (10h) → Stream D (14h)

## Notes

### Storage Strategy
- Use React Native File System (RNFS) for file storage
- AsyncStorage for metadata (file index, expiry dates)
- Target 500MB max storage (configurable)
- Articles stored as JSON files
- Videos stored as MP4 files (compressed 720p)

### Background Sync
- Use React Native Background Fetch for periodic sync
- Minimum interval: 15 minutes
- Battery-friendly (don't drain battery)
- Only sync when WiFi connected (optional setting)
- Queue operations when offline, execute when online

### Download Queue Management
- Support pause/resume/cancel operations
- Show download progress (percentage, bytes)
- Handle interrupted downloads (resume from last position)
- Prioritize user-initiated downloads over auto-downloads

### Offline Detection
- Use NetInfo for network state
- Cache last online status
- Show offline indicator in UI when disconnected
- Auto-switch to offline content when network unavailable

### Testing Strategy
- Test in airplane mode (full offline)
- Test with intermittent connectivity
- Test sync after long offline period (multiple queued operations)
- Test storage quota enforcement
- Test TTL expiry cleanup

### Performance Considerations
- Download in background thread (don't block UI)
- Show progress updates every 10% (not more frequent)
- Clean up expired content on app launch
- Batch sync operations (don't sync one-by-one)

### Dependency on Previous Tasks
- **Task 30**: Batch sync API endpoints
- **Task 31**: UI screens to integrate offline features
- **Minimal blocker**: Can build offline services independently, integrate later

### Platform Considerations
- iOS: Background fetch has limitations (not guaranteed)
- Android: More flexible background processing
- Handle platform differences gracefully
- Test on both iOS and Android devices
