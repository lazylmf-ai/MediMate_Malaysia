/**
 * Assigned Review Card Component
 *
 * Displays a content review assigned to the current reviewer.
 * Shows content details and provides quick action to start review.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
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

export interface AssignedReviewCardProps {
    review: ContentReview;
    onReview: () => void;
}

export const AssignedReviewCard: React.FC<AssignedReviewCardProps> = ({
    review,
    onReview,
}) => {
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

    const getPriorityIndicator = (dateString: string): { text: string; color: string } => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours > 72) {
            return { text: 'High Priority', color: '#F44336' };
        }
        if (diffInHours > 48) {
            return { text: 'Medium Priority', color: '#FF9800' };
        }
        return { text: 'Normal', color: '#4CAF50' };
    };

    const priority = getPriorityIndicator(review.updatedAt);

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onReview}
            activeOpacity={0.7}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(review.status) }]}>
                        <Text style={styles.statusText}>{review.status.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                    <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>{getContentTypeLabel(review.type)}</Text>
                    </View>
                    <View style={[styles.priorityBadge, { backgroundColor: priority.color }]}>
                        <Text style={styles.priorityText}>{priority.text}</Text>
                    </View>
                </View>
                <Text style={styles.version}>v{review.version}</Text>
            </View>

            {/* Title */}
            <Text style={styles.title} numberOfLines={2}>
                {review.title.en || review.title.ms || 'Untitled'}
            </Text>

            {/* Description */}
            <Text style={styles.description} numberOfLines={2}>
                {review.description.en || review.description.ms || 'No description'}
            </Text>

            {/* Metadata */}
            <View style={styles.metadata}>
                <View style={styles.metadataRow}>
                    <Text style={styles.metadataLabel}>Category:</Text>
                    <Text style={styles.metadataValue}>{review.category}</Text>
                </View>
                <View style={styles.metadataRow}>
                    <Text style={styles.metadataLabel}>Author:</Text>
                    <Text style={styles.metadataValue}>{review.authorName || 'Unknown'}</Text>
                </View>
                <View style={styles.metadataRow}>
                    <Text style={styles.metadataLabel}>Assigned:</Text>
                    <Text style={styles.metadataValue}>{formatDate(review.updatedAt)}</Text>
                </View>
            </View>

            {/* Review Notes */}
            {review.reviewNotes && (
                <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText} numberOfLines={2}>
                        {review.reviewNotes}
                    </Text>
                </View>
            )}

            {/* Action Button */}
            <View style={styles.actionContainer}>
                <View style={styles.reviewButton}>
                    <Text style={styles.reviewButtonText}>Start Review</Text>
                    <Text style={styles.reviewButtonIcon}>→</Text>
                </View>
            </View>
        </TouchableOpacity>
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
        borderLeftWidth: 4,
        borderLeftColor: '#007AFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
        flex: 1,
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
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    priorityText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '600',
    },
    version: {
        fontSize: 12,
        color: '#999',
        fontWeight: '500',
        marginLeft: 8,
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
    metadataRow: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    metadataLabel: {
        fontSize: 12,
        color: '#999',
        width: 80,
    },
    metadataValue: {
        fontSize: 12,
        color: '#333',
        fontWeight: '500',
        flex: 1,
    },
    notesContainer: {
        backgroundColor: '#FFF9E6',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#FFB300',
    },
    notesLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#F57C00',
        marginBottom: 4,
    },
    notesText: {
        fontSize: 12,
        color: '#666',
        lineHeight: 18,
    },
    actionContainer: {
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 12,
    },
    reviewButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: '#007AFF',
        borderRadius: 8,
    },
    reviewButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    reviewButtonIcon: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default AssignedReviewCard;
