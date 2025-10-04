/**
 * Analytics Dashboard Screen
 *
 * Comprehensive analytics dashboard for educational content performance.
 * Shows key metrics, top performing content, status distribution, and trends.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    RefreshControl,
    ActivityIndicator,
    Alert,
    SafeAreaView,
} from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { apiClient } from '@/api/client';
import type { ApiResponse } from '@/api/types';
import { StatCard } from '@/components/admin/StatCard';
import { TopContentCard } from '@/components/admin/TopContentCard';

const { width: screenWidth } = Dimensions.get('window');

export interface AnalyticsOverview {
    totalContent: number;
    totalViews: number;
    totalCompletions: number;
    averageEngagement: number;
    topContent: TopContentItem[];
    contentByStatus: StatusDistribution[];
    viewsByMonth: MonthlyViews[];
}

export interface TopContentItem {
    id: string;
    title: string;
    views: number;
    completions: number;
    engagementRate: number;
    averageRating: number;
}

export interface StatusDistribution {
    name: string;
    count: number;
    population: number;
    color: string;
    legendFontColor: string;
    legendFontSize: number;
}

export interface MonthlyViews {
    month: string;
    views: number;
    completions: number;
}

export interface AnalyticsDashboardScreenProps {
    navigation: any;
    route?: any;
}

export const AnalyticsDashboardScreen: React.FC<AnalyticsDashboardScreenProps> = ({ navigation }) => {
    const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            setError(null);

            const response = await apiClient.request<AnalyticsOverview>('/admin/education/analytics/overview', {
                method: 'GET'
            });

            if (response.success && response.data) {
                setAnalytics(response.data);
            } else {
                throw new Error(response.error || 'Failed to load analytics');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load analytics');
            Alert.alert('Error', 'Failed to load analytics. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadAnalytics();
    }, []);

    const handleContentPress = (contentId: string) => {
        navigation.navigate('ContentAnalytics', { contentId });
    };

    const chartConfig = {
        backgroundColor: '#FFFFFF',
        backgroundGradientFrom: '#FFFFFF',
        backgroundGradientTo: '#FFFFFF',
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(117, 117, 117, ${opacity})`,
        style: {
            borderRadius: 8,
        },
        propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: '#2196F3',
        },
    };

    const formatViewsData = () => {
        if (!analytics?.viewsByMonth || analytics.viewsByMonth.length === 0) {
            return {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [
                    {
                        data: [0, 0, 0, 0, 0, 0],
                        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                        strokeWidth: 2,
                    }
                ],
                legend: ['Monthly Views']
            };
        }

        return {
            labels: analytics.viewsByMonth.map(m => m.month),
            datasets: [
                {
                    data: analytics.viewsByMonth.map(m => m.views),
                    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                    strokeWidth: 2,
                }
            ],
            legend: ['Monthly Views']
        };
    };

    const formatStatusData = () => {
        if (!analytics?.contentByStatus || analytics.contentByStatus.length === 0) {
            return [
                {
                    name: 'No Data',
                    population: 1,
                    color: '#E0E0E0',
                    legendFontColor: '#7F7F7F',
                    legendFontSize: 12
                }
            ];
        }

        return analytics.contentByStatus;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2196F3" />
                    <Text style={styles.loadingText}>Loading analytics...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error || !analytics) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error || 'No data available'}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#2196F3']}
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Analytics Dashboard</Text>
                    <Text style={styles.headerSubtitle}>Content Performance Overview</Text>
                </View>

                {/* Overview Stats */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCardWrapper}>
                        <StatCard
                            title="Total Content"
                            value={analytics.totalContent}
                            icon="📚"
                            backgroundColor="#E3F2FD"
                            textColor="#1976D2"
                        />
                    </View>
                    <View style={styles.statCardWrapper}>
                        <StatCard
                            title="Total Views"
                            value={analytics.totalViews.toLocaleString()}
                            icon="👁️"
                            backgroundColor="#F3E5F5"
                            textColor="#7B1FA2"
                        />
                    </View>
                </View>

                <View style={styles.statsGrid}>
                    <View style={styles.statCardWrapper}>
                        <StatCard
                            title="Completions"
                            value={analytics.totalCompletions.toLocaleString()}
                            icon="✅"
                            backgroundColor="#E8F5E9"
                            textColor="#388E3C"
                        />
                    </View>
                    <View style={styles.statCardWrapper}>
                        <StatCard
                            title="Engagement Rate"
                            value={`${(analytics.averageEngagement * 100).toFixed(1)}%`}
                            icon="📈"
                            backgroundColor="#FFF3E0"
                            textColor="#F57C00"
                        />
                    </View>
                </View>

                {/* Views by Month Chart */}
                <View style={styles.chartSection}>
                    <Text style={styles.sectionTitle}>Views by Month</Text>
                    <View style={styles.chartContainer}>
                        <LineChart
                            data={formatViewsData()}
                            width={screenWidth - 40}
                            height={220}
                            chartConfig={chartConfig}
                            bezier
                            style={styles.chart}
                            withInnerLines={true}
                            withOuterLines={true}
                            withVerticalLines={true}
                            withHorizontalLines={true}
                        />
                    </View>
                </View>

                {/* Top Performing Content */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Top Performing Content</Text>
                    {analytics.topContent && analytics.topContent.length > 0 ? (
                        analytics.topContent.map((content, index) => (
                            <TopContentCard
                                key={content.id}
                                content={content}
                                rank={index + 1}
                                onPress={handleContentPress}
                            />
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>No content data available</Text>
                        </View>
                    )}
                </View>

                {/* Content by Status */}
                <View style={styles.chartSection}>
                    <Text style={styles.sectionTitle}>Content by Status</Text>
                    <View style={styles.chartContainer}>
                        <PieChart
                            data={formatStatusData()}
                            width={screenWidth - 40}
                            height={220}
                            chartConfig={chartConfig}
                            accessor="population"
                            backgroundColor="transparent"
                            paddingLeft="15"
                            absolute
                            style={styles.chart}
                        />
                    </View>
                </View>

                {/* Bottom Padding */}
                <View style={styles.bottomPadding} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5'
    },
    scrollView: {
        flex: 1
    },
    scrollContent: {
        paddingBottom: 20
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#757575'
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    errorText: {
        fontSize: 16,
        color: '#F44336',
        textAlign: 'center'
    },
    header: {
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0'
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 4
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#757575'
    },
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingTop: 12,
        gap: 8
    },
    statCardWrapper: {
        flex: 1
    },
    section: {
        padding: 20,
        backgroundColor: '#FFFFFF',
        marginTop: 12
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 16
    },
    chartSection: {
        padding: 20,
        backgroundColor: '#FFFFFF',
        marginTop: 12
    },
    chartContainer: {
        alignItems: 'center',
        borderRadius: 8,
        overflow: 'hidden'
    },
    chart: {
        marginVertical: 8,
        borderRadius: 8
    },
    emptyState: {
        padding: 40,
        alignItems: 'center'
    },
    emptyStateText: {
        fontSize: 14,
        color: '#9E9E9E',
        textAlign: 'center'
    },
    bottomPadding: {
        height: 20
    }
});
