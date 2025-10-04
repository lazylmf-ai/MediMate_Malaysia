/**
 * Review Content Screen
 *
 * Detailed content review screen with comment system.
 * Allows reviewers to approve or request changes to educational content.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { apiClient } from '@/api/client';
import type { ApiResponse } from '@/api/types';
import ContentPreview from '@/components/admin/ContentPreview';
import CommentCard from '@/components/admin/CommentCard';

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
}

export interface ContentData {
    id: string;
    title: Record<string, string>;
    description: Record<string, string>;
    body: Record<string, string>;
    type: string;
    category: string;
    status: string;
    authorName?: string;
    version: number;
    createdAt: string;
    updatedAt: string;
}

export interface ReviewContentScreenProps {
    route: {
        params: {
            contentId: string;
        };
    };
    navigation: any;
}

export const ReviewContentScreen: React.FC<ReviewContentScreenProps> = ({ route, navigation }) => {
    const { contentId } = route.params;

    const [content, setContent] = useState<ContentData | null>(null);
    const [comments, setComments] = useState<ReviewComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [selectedSeverity, setSelectedSeverity] = useState<'info' | 'suggestion' | 'required' | 'critical'>('suggestion');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadContent();
        loadComments();
    }, [contentId]);

    const loadContent = async () => {
        try {
            const response = await apiClient.request<ContentData>(`/admin/education/content/${contentId}`, {
                method: 'GET'
            });

            if (response.success && response.data) {
                setContent(response.data);
            } else {
                setError(response.error || 'Failed to load content');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load content');
        } finally {
            setLoading(false);
        }
    };

    const loadComments = async () => {
        try {
            const response = await apiClient.request<ReviewComment[]>(`/admin/education/content/${contentId}/comments`, {
                method: 'GET'
            });

            if (response.success && response.data) {
                setComments(response.data);
            }
        } catch (err) {
            console.error('Failed to load comments:', err);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) {
            Alert.alert('Error', 'Please enter a comment');
            return;
        }

        try {
            setSubmitting(true);

            const response = await apiClient.request<ReviewComment>(`/admin/education/content/${contentId}/comments`, {
                method: 'POST',
                body: JSON.stringify({
                    comment: newComment,
                    severity: selectedSeverity
                })
            });

            if (response.success && response.data) {
                setComments([response.data, ...comments]);
                setNewComment('');
                Alert.alert('Success', 'Comment added successfully');
            } else {
                Alert.alert('Error', response.error || 'Failed to add comment');
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to add comment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprove = () => {
        Alert.alert(
            'Approve Content',
            'This content will be marked as approved and ready for publishing. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    style: 'default',
                    onPress: async () => {
                        try {
                            setSubmitting(true);

                            const response = await apiClient.request(`/admin/education/content/${contentId}/approve`, {
                                method: 'POST',
                                body: JSON.stringify({
                                    comment: newComment || 'Content approved'
                                })
                            });

                            if (response.success) {
                                Alert.alert('Success', 'Content approved successfully', [
                                    { text: 'OK', onPress: () => navigation.goBack() }
                                ]);
                            } else {
                                Alert.alert('Error', response.error || 'Failed to approve content');
                            }
                        } catch (err) {
                            Alert.alert('Error', 'Failed to approve content');
                        } finally {
                            setSubmitting(false);
                        }
                    }
                }
            ]
        );
    };

    const handleRequestChanges = () => {
        if (!newComment.trim()) {
            Alert.alert('Error', 'Please provide feedback for requested changes');
            return;
        }

        Alert.alert(
            'Request Changes',
            'This content will be sent back to the author with your feedback. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Request Changes',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setSubmitting(true);

                            const response = await apiClient.request(`/admin/education/content/${contentId}/request-changes`, {
                                method: 'POST',
                                body: JSON.stringify({
                                    comment: newComment,
                                    severity: selectedSeverity
                                })
                            });

                            if (response.success) {
                                Alert.alert('Success', 'Changes requested successfully', [
                                    { text: 'OK', onPress: () => navigation.goBack() }
                                ]);
                            } else {
                                Alert.alert('Error', response.error || 'Failed to request changes');
                            }
                        } catch (err) {
                            Alert.alert('Error', 'Failed to request changes');
                        } finally {
                            setSubmitting(false);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Loading content...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error || !content) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorTitle}>Error</Text>
                    <Text style={styles.errorText}>{error || 'Content not found'}</Text>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView style={styles.content}>
                    {/* Content Preview */}
                    <ContentPreview content={content} />

                    {/* Review Comments Section */}
                    <View style={styles.commentsSection}>
                        <Text style={styles.sectionTitle}>Review Comments</Text>

                        {comments.length === 0 ? (
                            <View style={styles.noComments}>
                                <Text style={styles.noCommentsText}>No comments yet</Text>
                            </View>
                        ) : (
                            comments.map((comment) => (
                                <CommentCard key={comment.id} comment={comment} />
                            ))
                        )}

                        {/* Add Comment Form */}
                        <View style={styles.addCommentForm}>
                            <Text style={styles.formLabel}>Add Review Comment</Text>

                            {/* Severity Selector */}
                            <View style={styles.severitySelector}>
                                {(['info', 'suggestion', 'required', 'critical'] as const).map((severity) => (
                                    <TouchableOpacity
                                        key={severity}
                                        style={[
                                            styles.severityButton,
                                            selectedSeverity === severity && styles.severityButtonActive,
                                            styles[`severity_${severity}`]
                                        ]}
                                        onPress={() => setSelectedSeverity(severity)}
                                    >
                                        <Text
                                            style={[
                                                styles.severityButtonText,
                                                selectedSeverity === severity && styles.severityButtonTextActive
                                            ]}
                                        >
                                            {severity.charAt(0).toUpperCase() + severity.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TextInput
                                style={styles.commentInput}
                                value={newComment}
                                onChangeText={setNewComment}
                                placeholder="Enter your review feedback..."
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />

                            <TouchableOpacity
                                style={[styles.addCommentButton, submitting && styles.buttonDisabled]}
                                onPress={handleAddComment}
                                disabled={submitting}
                            >
                                <Text style={styles.addCommentButtonText}>
                                    {submitting ? 'Adding...' : 'Add Comment'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.actionBar}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.requestChangesButton, submitting && styles.buttonDisabled]}
                        onPress={handleRequestChanges}
                        disabled={submitting}
                    >
                        <Text style={styles.actionButtonText}>Request Changes</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton, submitting && styles.buttonDisabled]}
                        onPress={handleApprove}
                        disabled={submitting}
                    >
                        <Text style={styles.actionButtonText}>
                            {submitting ? 'Processing...' : 'Approve'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#D32F2F',
        marginBottom: 8,
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    backButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#007AFF',
        borderRadius: 8,
    },
    backButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    commentsSection: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    noComments: {
        padding: 24,
        alignItems: 'center',
    },
    noCommentsText: {
        fontSize: 14,
        color: '#999',
    },
    addCommentForm: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    formLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    severitySelector: {
        flexDirection: 'row',
        marginBottom: 12,
        gap: 8,
    },
    severityButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        alignItems: 'center',
    },
    severityButtonActive: {
        borderWidth: 2,
    },
    severity_info: {
        backgroundColor: '#E3F2FD',
    },
    severity_suggestion: {
        backgroundColor: '#F1F8E9',
    },
    severity_required: {
        backgroundColor: '#FFF3E0',
    },
    severity_critical: {
        backgroundColor: '#FFEBEE',
    },
    severityButtonText: {
        fontSize: 12,
        color: '#666',
    },
    severityButtonTextActive: {
        fontWeight: '600',
        color: '#333',
    },
    commentInput: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        minHeight: 100,
        backgroundColor: '#FFFFFF',
    },
    addCommentButton: {
        marginTop: 12,
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    addCommentButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    actionBar: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    requestChangesButton: {
        backgroundColor: '#FF9800',
    },
    approveButton: {
        backgroundColor: '#4CAF50',
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});

export default ReviewContentScreen;
