/**
 * Content Versioning Service
 * 
 * Tracks complete version history of educational content with audit trail.
 * Maintains snapshots of all content changes for compliance and rollback.
 */

import { DatabaseService } from '../database/databaseService';
import { IDatabase } from 'pg-promise';

export interface ContentVersion {
    id: string;
    contentId: string;
    version: number;
    title: Record<string, string>; // { ms: '', en: '', zh: '', ta: '' }
    description: Record<string, string>;
    body: Record<string, string>;
    metadata: Record<string, any>;
    changedBy: string;
    changedAt: Date;
    changeNote?: string;
    changeType: VersionChangeType;
    previousVersion?: number;
    statusAtVersion?: string;
}

export type VersionChangeType = 
    | 'created' 
    | 'updated' 
    | 'translated' 
    | 'reviewed' 
    | 'published' 
    | 'unpublished' 
    | 'archived' 
    | 'restored';

export interface VersionDiff {
    version: number;
    previousVersion: number;
    changes: {
        field: string;
        language?: string;
        oldValue: any;
        newValue: any;
    }[];
    changedBy: string;
    changedAt: Date;
}

export interface CreateVersionParams {
    contentId: string;
    version: number;
    title: Record<string, string>;
    description: Record<string, string>;
    body: Record<string, string>;
    metadata?: Record<string, any>;
    changedBy: string;
    changeNote?: string;
    changeType: VersionChangeType;
    previousVersion?: number;
    statusAtVersion?: string;
}

export class ContentVersioningService {
    private db: IDatabase<any>;

    constructor() {
        const dbService = DatabaseService.getInstance();
        this.db = dbService.getConnection();
    }

    /**
     * Create a new version snapshot of content
     */
    async createVersion(params: CreateVersionParams): Promise<ContentVersion> {
        const version = await this.db.one<ContentVersion>(
            `
            INSERT INTO education_content_versions (
                content_id, version, title, description, body, metadata,
                changed_by, change_note, change_type, previous_version, status_at_version
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING 
                id, content_id as "contentId", version,
                title, description, body, metadata,
                changed_by as "changedBy", changed_at as "changedAt",
                change_note as "changeNote", change_type as "changeType",
                previous_version as "previousVersion", status_at_version as "statusAtVersion"
            `,
            [
                params.contentId,
                params.version,
                JSON.stringify(params.title),
                JSON.stringify(params.description),
                JSON.stringify(params.body),
                JSON.stringify(params.metadata || {}),
                params.changedBy,
                params.changeNote,
                params.changeType,
                params.previousVersion,
                params.statusAtVersion
            ]
        );

        return version;
    }

    /**
     * Get a specific version of content
     */
    async getVersion(contentId: string, version: number): Promise<ContentVersion | null> {
        const result = await this.db.oneOrNone<ContentVersion>(
            `
            SELECT 
                id, content_id as "contentId", version,
                title, description, body, metadata,
                changed_by as "changedBy", changed_at as "changedAt",
                change_note as "changeNote", change_type as "changeType",
                previous_version as "previousVersion", status_at_version as "statusAtVersion"
            FROM education_content_versions
            WHERE content_id = $1 AND version = $2
            `,
            [contentId, version]
        );

        return result;
    }

    /**
     * Get all versions for a content piece
     */
    async getVersionHistory(contentId: string, limit: number = 50): Promise<ContentVersion[]> {
        const versions = await this.db.manyOrNone<ContentVersion>(
            `
            SELECT 
                id, content_id as "contentId", version,
                title, description, body, metadata,
                changed_by as "changedBy", changed_at as "changedAt",
                change_note as "changeNote", change_type as "changeType",
                previous_version as "previousVersion", status_at_version as "statusAtVersion"
            FROM education_content_versions
            WHERE content_id = $1
            ORDER BY version DESC
            LIMIT $2
            `,
            [contentId, limit]
        );

        return versions || [];
    }

    /**
     * Get the latest version number for content
     */
    async getLatestVersionNumber(contentId: string): Promise<number> {
        const result = await this.db.oneOrNone<{ version: number }>(
            `
            SELECT MAX(version) as version
            FROM education_content_versions
            WHERE content_id = $1
            `,
            [contentId]
        );

        return result?.version || 0;
    }

    /**
     * Compare two versions and generate diff
     */
    async compareVersions(
        contentId: string, 
        version1: number, 
        version2: number
    ): Promise<VersionDiff | null> {
        const [v1, v2] = await Promise.all([
            this.getVersion(contentId, version1),
            this.getVersion(contentId, version2)
        ]);

        if (!v1 || !v2) {
            return null;
        }

        const changes: VersionDiff['changes'] = [];

        // Compare title for each language
        const languages = ['ms', 'en', 'zh', 'ta'] as const;
        for (const lang of languages) {
            if (v1.title[lang] !== v2.title[lang]) {
                changes.push({
                    field: 'title',
                    language: lang,
                    oldValue: v1.title[lang],
                    newValue: v2.title[lang]
                });
            }
        }

        // Compare description for each language
        for (const lang of languages) {
            if (v1.description[lang] !== v2.description[lang]) {
                changes.push({
                    field: 'description',
                    language: lang,
                    oldValue: v1.description[lang],
                    newValue: v2.description[lang]
                });
            }
        }

        // Compare body for each language
        for (const lang of languages) {
            if (v1.body[lang] !== v2.body[lang]) {
                changes.push({
                    field: 'body',
                    language: lang,
                    oldValue: v1.body[lang],
                    newValue: v2.body[lang]
                });
            }
        }

        // Compare metadata
        if (JSON.stringify(v1.metadata) !== JSON.stringify(v2.metadata)) {
            changes.push({
                field: 'metadata',
                oldValue: v1.metadata,
                newValue: v2.metadata
            });
        }

        return {
            version: version2,
            previousVersion: version1,
            changes,
            changedBy: v2.changedBy,
            changedAt: v2.changedAt
        };
    }

    /**
     * Restore content to a previous version
     */
    async restoreVersion(
        contentId: string, 
        targetVersion: number, 
        restoredBy: string,
        restoreNote?: string
    ): Promise<ContentVersion> {
        const targetVersionData = await this.getVersion(contentId, targetVersion);
        
        if (!targetVersionData) {
            throw new Error(`Version ${targetVersion} not found for content ${contentId}`);
        }

        const currentVersion = await this.getLatestVersionNumber(contentId);
        const newVersion = currentVersion + 1;

        // Create new version with restored content
        const restoredVersion = await this.createVersion({
            contentId,
            version: newVersion,
            title: targetVersionData.title,
            description: targetVersionData.description,
            body: targetVersionData.body,
            metadata: targetVersionData.metadata,
            changedBy: restoredBy,
            changeNote: restoreNote || `Restored from version ${targetVersion}`,
            changeType: 'restored',
            previousVersion: currentVersion,
            statusAtVersion: targetVersionData.statusAtVersion
        });

        // Update the main content table
        await this.db.none(
            `
            UPDATE education_content
            SET 
                title = $1,
                description = $2,
                body = $3,
                metadata = $4,
                version = $5
            WHERE id = $6
            `,
            [
                JSON.stringify(targetVersionData.title),
                JSON.stringify(targetVersionData.description),
                JSON.stringify(targetVersionData.body),
                JSON.stringify(targetVersionData.metadata),
                newVersion,
                contentId
            ]
        );

        return restoredVersion;
    }

    /**
     * Get version history with user details
     */
    async getVersionHistoryWithDetails(
        contentId: string, 
        limit: number = 50
    ): Promise<Array<ContentVersion & { changedByName: string; changedByEmail: string }>> {
        const versions = await this.db.manyOrNone(
            `
            SELECT 
                ecv.id, 
                ecv.content_id as "contentId", 
                ecv.version,
                ecv.title, 
                ecv.description, 
                ecv.body, 
                ecv.metadata,
                ecv.changed_by as "changedBy", 
                ecv.changed_at as "changedAt",
                ecv.change_note as "changeNote", 
                ecv.change_type as "changeType",
                ecv.previous_version as "previousVersion", 
                ecv.status_at_version as "statusAtVersion",
                u.name as "changedByName",
                u.email as "changedByEmail"
            FROM education_content_versions ecv
            LEFT JOIN users u ON ecv.changed_by = u.id
            WHERE ecv.content_id = $1
            ORDER BY ecv.version DESC
            LIMIT $2
            `,
            [contentId, limit]
        );

        return versions || [];
    }

    /**
     * Get changes by user
     */
    async getChangesByUser(
        userId: string, 
        limit: number = 50
    ): Promise<ContentVersion[]> {
        const versions = await this.db.manyOrNone<ContentVersion>(
            `
            SELECT 
                id, content_id as "contentId", version,
                title, description, body, metadata,
                changed_by as "changedBy", changed_at as "changedAt",
                change_note as "changeNote", change_type as "changeType",
                previous_version as "previousVersion", status_at_version as "statusAtVersion"
            FROM education_content_versions
            WHERE changed_by = $1
            ORDER BY changed_at DESC
            LIMIT $2
            `,
            [userId, limit]
        );

        return versions || [];
    }

    /**
     * Get version statistics for content
     */
    async getVersionStats(contentId: string): Promise<{
        totalVersions: number;
        firstVersion: ContentVersion | null;
        latestVersion: ContentVersion | null;
        totalContributors: number;
        changesByType: Record<VersionChangeType, number>;
    }> {
        const stats = await this.db.one(
            `
            SELECT 
                COUNT(*) as total_versions,
                COUNT(DISTINCT changed_by) as total_contributors
            FROM education_content_versions
            WHERE content_id = $1
            `,
            [contentId]
        );

        const changesByType = await this.db.manyOrNone<{ changeType: VersionChangeType; count: number }>(
            `
            SELECT 
                change_type as "changeType",
                COUNT(*) as count
            FROM education_content_versions
            WHERE content_id = $1
            GROUP BY change_type
            `,
            [contentId]
        );

        const versions = await this.getVersionHistory(contentId, 1);
        const firstVersionData = await this.db.oneOrNone<ContentVersion>(
            `
            SELECT 
                id, content_id as "contentId", version,
                title, description, body, metadata,
                changed_by as "changedBy", changed_at as "changedAt",
                change_note as "changeNote", change_type as "changeType",
                previous_version as "previousVersion", status_at_version as "statusAtVersion"
            FROM education_content_versions
            WHERE content_id = $1
            ORDER BY version ASC
            LIMIT 1
            `,
            [contentId]
        );

        const changesByTypeMap: Record<string, number> = {};
        changesByType?.forEach(item => {
            changesByTypeMap[item.changeType] = item.count;
        });

        return {
            totalVersions: parseInt(stats.total_versions),
            firstVersion: firstVersionData,
            latestVersion: versions[0] || null,
            totalContributors: parseInt(stats.total_contributors),
            changesByType: changesByTypeMap as Record<VersionChangeType, number>
        };
    }

    /**
     * Delete all versions for content (cascade delete)
     * Only use when deleting content permanently
     */
    async deleteVersionHistory(contentId: string): Promise<void> {
        await this.db.none(
            `DELETE FROM education_content_versions WHERE content_id = $1`,
            [contentId]
        );
    }

    /**
     * Bulk create versions for migration or import
     */
    async bulkCreateVersions(versions: CreateVersionParams[]): Promise<void> {
        if (versions.length === 0) return;

        const values = versions.map((v, idx) => {
            const offset = idx * 11;
            return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`;
        }).join(', ');

        const params = versions.flatMap(v => [
            v.contentId,
            v.version,
            JSON.stringify(v.title),
            JSON.stringify(v.description),
            JSON.stringify(v.body),
            JSON.stringify(v.metadata || {}),
            v.changedBy,
            v.changeNote,
            v.changeType,
            v.previousVersion,
            v.statusAtVersion
        ]);

        await this.db.none(
            `
            INSERT INTO education_content_versions (
                content_id, version, title, description, body, metadata,
                changed_by, change_note, change_type, previous_version, status_at_version
            )
            VALUES ${values}
            `,
            params
        );
    }
}

export default ContentVersioningService;
