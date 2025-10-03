/**
 * Comprehensive tests for ContentVersioningService
 * Tests version tracking, comparison, restoration, and audit trail
 */

import { ContentVersioningService, VersionChangeType } from '../ContentVersioningService';
import { DatabaseService } from '../../database/databaseService';

// Mock dependencies
jest.mock('../../database/databaseService');

describe('ContentVersioningService', () => {
    let service: ContentVersioningService;
    let mockDb: any;

    const mockContentId = 'content-123';
    const mockUserId = 'user-456';

    const mockContent = {
        title: { ms: 'Tajuk', en: 'Title', zh: '标题', ta: 'தலைப்பு' },
        description: { ms: 'Penerangan', en: 'Description', zh: '描述', ta: 'விளக்கம்' },
        body: { ms: 'Kandungan MS', en: 'Content EN', zh: '内容', ta: 'உள்ளடக்கம்' },
        metadata: { tags: ['health', 'education'] }
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock database
        mockDb = {
            one: jest.fn(),
            oneOrNone: jest.fn(),
            manyOrNone: jest.fn(),
            none: jest.fn(),
        };

        (DatabaseService.getInstance as jest.Mock) = jest.fn().mockReturnValue({
            getConnection: () => mockDb
        });

        service = new ContentVersioningService();
    });

    describe('createVersion', () => {
        it('should create a new version with all required fields', async () => {
            const mockVersion = {
                id: 'version-1',
                contentId: mockContentId,
                version: 1,
                ...mockContent,
                changedBy: mockUserId,
                changedAt: new Date(),
                changeType: 'created' as VersionChangeType,
                changeNote: 'Initial version'
            };

            mockDb.one.mockResolvedValue(mockVersion);

            const result = await service.createVersion({
                contentId: mockContentId,
                version: 1,
                ...mockContent,
                changedBy: mockUserId,
                changeType: 'created',
                changeNote: 'Initial version'
            });

            expect(result).toEqual(mockVersion);
            expect(mockDb.one).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO education_content_versions'),
                expect.arrayContaining([
                    mockContentId,
                    1,
                    JSON.stringify(mockContent.title),
                    JSON.stringify(mockContent.description),
                    JSON.stringify(mockContent.body)
                ])
            );
        });

        it('should handle version with previous version reference', async () => {
            const mockVersion = {
                id: 'version-2',
                contentId: mockContentId,
                version: 2,
                ...mockContent,
                changedBy: mockUserId,
                changedAt: new Date(),
                changeType: 'updated' as VersionChangeType,
                previousVersion: 1
            };

            mockDb.one.mockResolvedValue(mockVersion);

            const result = await service.createVersion({
                contentId: mockContentId,
                version: 2,
                ...mockContent,
                changedBy: mockUserId,
                changeType: 'updated',
                previousVersion: 1
            });

            expect(result.previousVersion).toBe(1);
        });
    });

    describe('getVersion', () => {
        it('should retrieve a specific version', async () => {
            const mockVersion = {
                id: 'version-1',
                contentId: mockContentId,
                version: 1,
                ...mockContent,
                changedBy: mockUserId,
                changedAt: new Date(),
                changeType: 'created' as VersionChangeType
            };

            mockDb.oneOrNone.mockResolvedValue(mockVersion);

            const result = await service.getVersion(mockContentId, 1);

            expect(result).toEqual(mockVersion);
            expect(mockDb.oneOrNone).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                [mockContentId, 1]
            );
        });

        it('should return null if version not found', async () => {
            mockDb.oneOrNone.mockResolvedValue(null);

            const result = await service.getVersion(mockContentId, 999);

            expect(result).toBeNull();
        });
    });

    describe('getVersionHistory', () => {
        it('should retrieve all versions in descending order', async () => {
            const mockVersions = [
                {
                    id: 'version-3',
                    contentId: mockContentId,
                    version: 3,
                    changeType: 'updated',
                    changedAt: new Date('2025-10-03')
                },
                {
                    id: 'version-2',
                    contentId: mockContentId,
                    version: 2,
                    changeType: 'translated',
                    changedAt: new Date('2025-10-02')
                },
                {
                    id: 'version-1',
                    contentId: mockContentId,
                    version: 1,
                    changeType: 'created',
                    changedAt: new Date('2025-10-01')
                }
            ];

            mockDb.manyOrNone.mockResolvedValue(mockVersions);

            const result = await service.getVersionHistory(mockContentId);

            expect(result).toHaveLength(3);
            expect(result[0].version).toBe(3);
            expect(result[2].version).toBe(1);
        });

        it('should respect limit parameter', async () => {
            mockDb.manyOrNone.mockResolvedValue([]);

            await service.getVersionHistory(mockContentId, 10);

            expect(mockDb.manyOrNone).toHaveBeenCalledWith(
                expect.stringContaining('LIMIT $2'),
                [mockContentId, 10]
            );
        });

        it('should return empty array if no versions exist', async () => {
            mockDb.manyOrNone.mockResolvedValue(null);

            const result = await service.getVersionHistory(mockContentId);

            expect(result).toEqual([]);
        });
    });

    describe('getLatestVersionNumber', () => {
        it('should return the highest version number', async () => {
            mockDb.oneOrNone.mockResolvedValue({ version: 5 });

            const result = await service.getLatestVersionNumber(mockContentId);

            expect(result).toBe(5);
        });

        it('should return 0 if no versions exist', async () => {
            mockDb.oneOrNone.mockResolvedValue(null);

            const result = await service.getLatestVersionNumber(mockContentId);

            expect(result).toBe(0);
        });
    });

    describe('compareVersions', () => {
        it('should detect changes in title across languages', async () => {
            const version1 = {
                title: { ms: 'Tajuk 1', en: 'Title 1', zh: '标题1', ta: 'தலைப்பு 1' },
                description: mockContent.description,
                body: mockContent.body,
                metadata: mockContent.metadata,
                changedBy: mockUserId,
                changedAt: new Date('2025-10-01')
            };

            const version2 = {
                title: { ms: 'Tajuk 2', en: 'Title 1', zh: '标题1', ta: 'தலைப்பு 1' },
                description: mockContent.description,
                body: mockContent.body,
                metadata: mockContent.metadata,
                changedBy: mockUserId,
                changedAt: new Date('2025-10-02')
            };

            mockDb.oneOrNone.mockResolvedValueOnce(version1).mockResolvedValueOnce(version2);

            const result = await service.compareVersions(mockContentId, 1, 2);

            expect(result).not.toBeNull();
            expect(result!.changes).toHaveLength(1);
            expect(result!.changes[0]).toEqual({
                field: 'title',
                language: 'ms',
                oldValue: 'Tajuk 1',
                newValue: 'Tajuk 2'
            });
        });

        it('should detect body changes in specific language', async () => {
            const version1 = {
                title: mockContent.title,
                description: mockContent.description,
                body: { ms: 'Old MS', en: 'Content EN', zh: '内容', ta: 'உள்ளடக்கம்' },
                metadata: mockContent.metadata,
                changedBy: mockUserId,
                changedAt: new Date('2025-10-01')
            };

            const version2 = {
                title: mockContent.title,
                description: mockContent.description,
                body: { ms: 'New MS', en: 'Content EN', zh: '内容', ta: 'உள்ளடக்கம்' },
                metadata: mockContent.metadata,
                changedBy: mockUserId,
                changedAt: new Date('2025-10-02')
            };

            mockDb.oneOrNone.mockResolvedValueOnce(version1).mockResolvedValueOnce(version2);

            const result = await service.compareVersions(mockContentId, 1, 2);

            expect(result!.changes).toContainEqual({
                field: 'body',
                language: 'ms',
                oldValue: 'Old MS',
                newValue: 'New MS'
            });
        });

        it('should detect metadata changes', async () => {
            const version1 = {
                ...mockContent,
                metadata: { tags: ['health'] }
            };

            const version2 = {
                ...mockContent,
                metadata: { tags: ['health', 'education'] }
            };

            mockDb.oneOrNone.mockResolvedValueOnce(version1).mockResolvedValueOnce(version2);

            const result = await service.compareVersions(mockContentId, 1, 2);

            const metadataChange = result!.changes.find(c => c.field === 'metadata');
            expect(metadataChange).toBeDefined();
        });

        it('should return null if either version does not exist', async () => {
            mockDb.oneOrNone.mockResolvedValueOnce(null).mockResolvedValueOnce(mockContent);

            const result = await service.compareVersions(mockContentId, 1, 2);

            expect(result).toBeNull();
        });
    });

    describe('restoreVersion', () => {
        it('should restore content to previous version', async () => {
            const targetVersion = {
                ...mockContent,
                version: 2,
                statusAtVersion: 'published'
            };

            const newVersion = {
                id: 'version-4',
                contentId: mockContentId,
                version: 4,
                ...mockContent,
                changedBy: mockUserId,
                changeType: 'restored' as VersionChangeType
            };

            mockDb.oneOrNone.mockResolvedValue(targetVersion);
            mockDb.one
                .mockResolvedValueOnce({ version: 3 }) // getLatestVersionNumber
                .mockResolvedValueOnce(newVersion);   // createVersion
            mockDb.none.mockResolvedValue(undefined);

            const result = await service.restoreVersion(
                mockContentId,
                2,
                mockUserId,
                'Restoring to working version'
            );

            expect(result.changeType).toBe('restored');
            expect(mockDb.none).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE education_content'),
                expect.any(Array)
            );
        });

        it('should throw error if target version not found', async () => {
            mockDb.oneOrNone.mockResolvedValue(null);

            await expect(
                service.restoreVersion(mockContentId, 999, mockUserId)
            ).rejects.toThrow('Version 999 not found');
        });

        it('should auto-generate restore note if not provided', async () => {
            const targetVersion = { ...mockContent, version: 2 };
            mockDb.oneOrNone.mockResolvedValue(targetVersion);
            mockDb.one
                .mockResolvedValueOnce({ version: 3 })
                .mockResolvedValueOnce({
                    changeNote: 'Restored from version 2'
                });
            mockDb.none.mockResolvedValue(undefined);

            await service.restoreVersion(mockContentId, 2, mockUserId);

            const createCall = mockDb.one.mock.calls.find(call =>
                call[0].includes('INSERT INTO education_content_versions')
            );

            expect(createCall).toBeDefined();
        });
    });

    describe('getVersionHistoryWithDetails', () => {
        it('should include user details in version history', async () => {
            const mockVersionsWithUsers = [
                {
                    id: 'version-1',
                    contentId: mockContentId,
                    version: 1,
                    changedBy: mockUserId,
                    changedByName: 'John Doe',
                    changedByEmail: 'john@example.com',
                    changedAt: new Date()
                }
            ];

            mockDb.manyOrNone.mockResolvedValue(mockVersionsWithUsers);

            const result = await service.getVersionHistoryWithDetails(mockContentId);

            expect(result[0]).toHaveProperty('changedByName');
            expect(result[0]).toHaveProperty('changedByEmail');
            expect(mockDb.manyOrNone).toHaveBeenCalledWith(
                expect.stringContaining('LEFT JOIN users u'),
                [mockContentId, 50]
            );
        });
    });

    describe('getVersionStats', () => {
        it('should return comprehensive statistics', async () => {
            mockDb.one.mockResolvedValue({
                total_versions: '5',
                total_contributors: '3'
            });

            mockDb.manyOrNone.mockResolvedValue([
                { changeType: 'created', count: 1 },
                { changeType: 'updated', count: 2 },
                { changeType: 'translated', count: 2 }
            ]);

            mockDb.oneOrNone.mockResolvedValue({ version: 1 }); // first version

            const result = await service.getVersionStats(mockContentId);

            expect(result.totalVersions).toBe(5);
            expect(result.totalContributors).toBe(3);
            expect(result.changesByType.created).toBe(1);
            expect(result.changesByType.updated).toBe(2);
        });
    });

    describe('bulkCreateVersions', () => {
        it('should handle bulk inserts for migration', async () => {
            const versions = [
                {
                    contentId: 'content-1',
                    version: 1,
                    ...mockContent,
                    changedBy: mockUserId,
                    changeType: 'created' as VersionChangeType
                },
                {
                    contentId: 'content-2',
                    version: 1,
                    ...mockContent,
                    changedBy: mockUserId,
                    changeType: 'created' as VersionChangeType
                }
            ];

            mockDb.none.mockResolvedValue(undefined);

            await service.bulkCreateVersions(versions);

            expect(mockDb.none).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO education_content_versions'),
                expect.any(Array)
            );
        });

        it('should handle empty array gracefully', async () => {
            await service.bulkCreateVersions([]);

            expect(mockDb.none).not.toHaveBeenCalled();
        });
    });
});
