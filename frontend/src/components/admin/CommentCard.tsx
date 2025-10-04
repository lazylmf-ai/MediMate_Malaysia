/**
 * Comment Card Component
 *
 * Displays a review comment with severity indicator, status, and metadata.
 * Shows reviewer information and comment text.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';

export interface ReviewComment {
    id: string;
    contentId: string;
    reviewerId: string;
    reviewerName?: string;
    comment: string;
    section?: string;
    severity: 'info' | 'suggestion' | 'required' | 'critical';
    status: 'pending' | 'addressed' | 'resolved' | 'wont_fix';
    createdAt: string;
    updatedAt: string;
    resolvedAt?: string;
}

export interface CommentCardProps {
    comment: ReviewComment;
    onResolve?: (commentId: string) => void;
}

export const CommentCard: React.FC<CommentCardProps> = ({
    comment,
    onResolve,
}) => {
    const getSeverityConfig = (severity: string): { color: string; backgroundColor: string; label: string } => {
        const configs: Record<string, { color: string; backgroundColor: string; label: string }> = {
            info: {
                color: '#0288D1',
                backgroundColor: '#E1F5FE',
                label: 'Info',
            },
            suggestion: {
                color: '#388E3C',
                backgroundColor: '#E8F5E9',
                label: 'Suggestion',
            },
            required: {
                color: '#F57C00',
                backgroundColor: '#FFF3E0',
                label: 'Required',
            },
            critical: {
                color: '#D32F2F',
                backgroundColor: '#FFEBEE',
                label: 'Critical',
            },
        };
        return configs[severity] || configs.info;
    };

    const getStatusConfig = (status: string): { color: string; label: string } => {
        const configs: Record<string, { color: string; label: string }> = {
            pending: {
                color: '#FF9800',
                label: 'Pending',
            },
            addressed: {
                color: '#2196F3',
                label: 'Addressed',
            },
            resolved: {
                color: '#4CAF50',
                label: 'Resolved',
            },
            wont_fix: {
                color: '#9E9E9E',
                label: "Won't Fix",
            },
        };
        return configs[status] || configs.pending;
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

        if (diffInMinutes < 1) {
            return 'Just now';
        }
        if (diffInMinutes < 60) {
            return `${diffInMinutes}m ago`;
        }

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `${diffInHours}h ago`;
        }

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
            return `${diffInDays}d ago`;
        }

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        });
    };

    const severityConfig = getSeverityConfig(comment.severity);
    const statusConfig = getStatusConfig(comment.status);
    const canResolve = comment.status === 'pending' || comment.status === 'addressed';

    return (
        <View style={[styles.card, { borderLeftColor: severityConfig.color }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View
                        style={[
                            styles.severityBadge,
                            {
                                backgroundColor: severityConfig.backgroundColor,
                                borderColor: severityConfig.color,
                            },
                        ]}
                    >
                        <Text style={[styles.severityText, { color: severityConfig.color }]}>
                            {severityConfig.label}
                        </Text>
                    </View>

                    <View style={styles.statusBadge}>
                        <View
                            style={[
                                styles.statusDot,
                                { backgroundColor: statusConfig.color },
                            ]}
                        />
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>
                            {statusConfig.label}
                        </Text>
                    </View>
                </View>

                <Text style={styles.timestamp}>{formatDate(comment.createdAt)}</Text>
            </View>

            {/* Reviewer Info */}
            <View style={styles.reviewerInfo}>
                <View style={styles.reviewerAvatar}>
                    <Text style={styles.reviewerInitial}>
                        {comment.reviewerName ? comment.reviewerName.charAt(0).toUpperCase() : 'R'}
                    </Text>
                </View>
                <View style={styles.reviewerDetails}>
                    <Text style={styles.reviewerName}>
                        {comment.reviewerName || 'Reviewer'}
                    </Text>
                    {comment.section && (
                        <Text style={styles.section}>Section: {comment.section}</Text>
                    )}
                </View>
            </View>

            {/* Comment Text */}
            <Text style={styles.commentText}>{comment.comment}</Text>

            {/* Resolved Info */}
            {comment.status === 'resolved' && comment.resolvedAt && (
                <View style={styles.resolvedInfo}>
                    <Text style={styles.resolvedText}>
                        Resolved on {formatDate(comment.resolvedAt)}
                    </Text>
                </View>
            )}

            {/* Action Buttons */}
            {canResolve && onResolve && (
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.resolveButton}
                        onPress={() => onResolve(comment.id)}
                    >
                        <Text style={styles.resolveButtonText}>Mark as Resolved</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 14,
        marginBottom: 12,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
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
        flexWrap: 'wrap',
        flex: 1,
    },
    severityBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        borderWidth: 1,
    },
    severityText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 5,
        backgroundColor: '#F5F5F5',
        borderRadius: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    timestamp: {
        fontSize: 11,
        color: '#999',
        marginLeft: 8,
    },
    reviewerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    reviewerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    reviewerInitial: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    reviewerDetails: {
        flex: 1,
    },
    reviewerName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    section: {
        fontSize: 11,
        color: '#999',
        fontStyle: 'italic',
    },
    commentText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 21,
        marginBottom: 8,
    },
    resolvedInfo: {
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        marginTop: 4,
    },
    resolvedText: {
        fontSize: 11,
        color: '#4CAF50',
        fontStyle: 'italic',
    },
    actions: {
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        marginTop: 8,
    },
    resolveButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#4CAF50',
        borderRadius: 6,
        alignItems: 'center',
    },
    resolveButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
});

export default CommentCard;
