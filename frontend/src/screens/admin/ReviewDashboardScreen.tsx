/**
 * Review Dashboard Screen
 *
 * Main dashboard for medical reviewers and admins to manage content review workflow.
 * Shows pending reviews (unassigned) and assigned reviews for the current reviewer.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    SafeAreaView,
} from 'react-native';
import { apiClient } from '@/api/client';
import type { ApiResponse } from '@/api/types';
import PendingReviewCard from '@/components/admin/PendingReviewCard';
import AssignedReviewCard from '@/components/admin/AssignedReviewCard';

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

export interface ReviewDashboardScreenProps {
    navigation: any;
    route?: any;
}

export const ReviewDashboardScreen: React.FC<ReviewDashboardScreenProps> = ({ navigation }) => {
    const [pendingReviews, setPendingReviews] = useState<ContentReview[]>([]);
    const [myReviews, setMyReviews] = useState<ContentReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTab, setSelectedTab] = useState<'pending' | 'assigned'>('pending');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadReviews();
    }, []);

    const loadReviews = async () => {
        try {
            setError(null);

            const [pendingResponse, assignedResponse] = await Promise.all([
                apiClient.request<ContentReview[]>('/admin/education/reviews/pending', {
                    method: 'GET'
                }),
                apiClient.request<ContentReview[]>('/admin/education/reviews/assigned', {
                    method: 'GET'
                })
            ]);

            if (pendingResponse.success && pendingResponse.data) {
                setPendingReviews(pendingResponse.data);
            }

            if (assignedResponse.success && assignedResponse.data) {
                setMyReviews(assignedResponse.data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load reviews');
            Alert.alert('Error', 'Failed to load reviews. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadReviews();
    }, []);

    const handleAssignReviewer = async (contentId: string, reviewerId: string) => {
        try {
            const response = await apiClient.request(`/admin/education/content/${contentId}/assign-reviewer`, {
                method: 'POST',
                body: JSON.stringify({ reviewerId })
            });

            if (response.success) {
                Alert.alert('Success', 'Reviewer assigned successfully');
                await loadReviews();
            } else {
                Alert.alert('Error', response.error || 'Failed to assign reviewer');
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to assign reviewer');
        }
    };

    const handleReviewContent = (contentId: string) => {
        navigation.navigate('ReviewContent', { contentId });
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Loading reviews...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Review Dashboard</Text>
                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={handleRefresh}
                    disabled={refreshing}
                >
                    <Text style={styles.refreshButtonText}>
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Tab Bar */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'pending' && styles.activeTab]}
                    onPress={() => setSelectedTab('pending')}
                >
                    <Text style={[styles.tabText, selectedTab === 'pending' && styles.activeTabText]}>
                        Pending Reviews ({pendingReviews.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'assigned' && styles.activeTab]}
                    onPress={() => setSelectedTab('assigned')}
                >
                    <Text style={[styles.tabText, selectedTab === 'assigned' && styles.activeTabText]}>
                        My Reviews ({myReviews.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            >
                {selectedTab === 'pending' ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            Pending Reviews - Unassigned
                        </Text>
                        <Text style={styles.sectionDescription}>
                            Content submitted for review awaiting reviewer assignment
                        </Text>
                        {pendingReviews.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>
                                    No pending reviews at this time
                                </Text>
                            </View>
                        ) : (
                            pendingReviews.map((review) => (
                                <PendingReviewCard
                                    key={review.id}
                                    review={review}
                                    onAssign={handleAssignReviewer}
                                    onView={() => handleReviewContent(review.id)}
                                />
                            ))
                        )}
                    </View>
                ) : (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            My Assigned Reviews
                        </Text>
                        <Text style={styles.sectionDescription}>
                            Content assigned to you for review
                        </Text>
                        {myReviews.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>
                                    No reviews assigned to you at this time
                                </Text>
                            </View>
                        ) : (
                            myReviews.map((review) => (
                                <AssignedReviewCard
                                    key={review.id}
                                    review={review}
                                    onReview={() => handleReviewContent(review.id)}
                                />
                            ))
                        )}
                    </View>
                )}
            </ScrollView>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    refreshButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#007AFF',
        borderRadius: 8,
    },
    refreshButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    tab: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#007AFF',
    },
    tabText: {
        fontSize: 16,
        color: '#666',
    },
    activeTabText: {
        color: '#007AFF',
        fontWeight: '600',
    },
    errorContainer: {
        margin: 16,
        padding: 12,
        backgroundColor: '#FFE5E5',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FF4444',
    },
    errorText: {
        color: '#D32F2F',
        fontSize: 14,
    },
    content: {
        flex: 1,
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    sectionDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyStateText: {
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
    },
});

export default ReviewDashboardScreen;
