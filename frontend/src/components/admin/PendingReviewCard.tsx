/**
 * Pending Review Card Component
 *
 * Displays a content item pending review assignment.
 * Shows content details and allows admin to assign a reviewer.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from 'react-native';

export interface ContentReview {
    id: string;
    title: Record<string, string>;
    description: Record<string, string>;
    type: string;
    category: string;
    status: 'draft' | 'in_review' | 'approved' | 'published' | 'archived';
    authorId: string;
    authorName?: string;
    reviewerId?: string;
    reviewerName?: string;
    reviewNotes?: string;
    version: number;
    createdAt: string;
    updatedAt: string;
}

export interface PendingReviewCardProps {
    review: ContentReview;
    onAssign: (contentId: string, reviewerId: string) => void;
    onView: () => void;
}

export const PendingReviewCard: React.FC<PendingReviewCardProps> = ({
    review,
    onAssign,
    onView,
}) => {
    const [assigning, setAssigning] = useState(false);

    const handleAssignToMe = async () => {
        try {
            setAssigning(true);
            // TODO: Get current user ID from auth context
            // For now, this is a placeholder
            const currentUserId = 'current-user-id';
            await onAssign(review.id, currentUserId);
        } catch (error) {
            Alert.alert('Error', 'Failed to assign review');
        } finally {
            setAssigning(false);
        }
    };

    const handleAssignToOther = () => {
        // TODO: Show modal to select reviewer from list
        Alert.alert('Assign Reviewer', 'Reviewer selection modal coming soon');
    };

    const getContentTypeLabel = (type: string): string => {
        const labels: Record<string, string> = {
            article: 'Article',
            video: 'Video',
            quiz: 'Quiz',
            interactive: 'Interactive',
        };
        return labels[type] || type;
    };

    const getStatusColor = (status: string): string => {
        const colors: Record<string, string> = {
            draft: '#9E9E9E',
            in_review: '#FF9800',
            approved: '#4CAF50',
            published: '#2196F3',
            archived: '#757575',
        };
        return colors[status] || '#9E9E9E';
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

        if (diffInHours < 1) {
            const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
            return `${diffInMinutes} minutes ago`;
        }
        if (diffInHours < 24) {
            return `${diffInHours} hours ago`;
        }
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
            return `${diffInDays} days ago`;
        }
        return date.toLocaleDateString();
    };

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(review.status) }]}>
                        <Text style={styles.statusText}>{review.status.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                    <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>{getContentTypeLabel(review.type)}</Text>
                    </View>
                </View>
                <Text style={styles.version}>v{review.version}</Text>
            </View>

            {/* Title */}
            <Text style={styles.title} numberOfLines={2}>
                {review.title.en || review.title.ms || 'Untitled'}
            </Text>

            {/* Description */}
            <Text style={styles.description} numberOfLines={3}>
                {review.description.en || review.description.ms || 'No description'}
            </Text>

            {/* Metadata */}
            <View style={styles.metadata}>
                <Text style={styles.metadataItem}>
                    Category: <Text style={styles.metadataValue}>{review.category}</Text>
                </Text>
                <Text style={styles.metadataItem}>
                    Author: <Text style={styles.metadataValue}>{review.authorName || 'Unknown'}</Text>
                </Text>
                <Text style={styles.metadataItem}>
                    Submitted: <Text style={styles.metadataValue}>{formatDate(review.updatedAt)}</Text>
                </Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.viewButton}
                    onPress={onView}
                >
                    <Text style={styles.viewButtonText}>View Content</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.assignButton, assigning && styles.buttonDisabled]}
                    onPress={handleAssignToMe}
                    disabled={assigning}
                >
                    <Text style={styles.assignButtonText}>
                        {assigning ? 'Assigning...' : 'Assign to Me'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.assignOtherButton}
                    onPress={handleAssignToOther}
                >
                    <Text style={styles.assignOtherButtonText}>Assign Other</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        gap: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '600',
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        backgroundColor: '#E0E0E0',
    },
    typeText: {
        color: '#666',
        fontSize: 10,
        fontWeight: '600',
    },
    version: {
        fontSize: 12,
        color: '#999',
        fontWeight: '500',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 12,
    },
    metadata: {
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 12,
        marginBottom: 12,
    },
    metadataItem: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    metadataValue: {
        color: '#333',
        fontWeight: '500',
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    viewButton: {
        flex: 1,
        paddingVertical: 10,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    viewButtonText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '600',
    },
    assignButton: {
        flex: 1,
        paddingVertical: 10,
        backgroundColor: '#007AFF',
        borderRadius: 8,
        alignItems: 'center',
    },
    assignButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    assignOtherButton: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    assignOtherButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});

export default PendingReviewCard;
