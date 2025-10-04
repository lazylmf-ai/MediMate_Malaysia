/**
 * Top Content Card Component
 *
 * Displays a content item in the top performing content list
 * with ranking, metrics, and engagement indicators.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export interface TopContentCardProps {
    content: {
        id: string;
        title: string;
        views: number;
        completions: number;
        engagementRate: number;
        averageRating: number;
    };
    rank: number;
    onPress?: (contentId: string) => void;
}

export const TopContentCard: React.FC<TopContentCardProps> = ({
    content,
    rank,
    onPress
}) => {
    const getRankColor = () => {
        switch (rank) {
            case 1:
                return '#FFD700'; // Gold
            case 2:
                return '#C0C0C0'; // Silver
            case 3:
                return '#CD7F32'; // Bronze
            default:
                return '#E0E0E0'; // Gray
        }
    };

    const getRankBadge = () => {
        switch (rank) {
            case 1:
                return '🥇';
            case 2:
                return '🥈';
            case 3:
                return '🥉';
            default:
                return `#${rank}`;
        }
    };

    const formatNumber = (num: number): string => {
        if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K`;
        }
        return num.toString();
    };

    const getEngagementColor = (rate: number): string => {
        if (rate >= 0.7) return '#4CAF50'; // High engagement
        if (rate >= 0.4) return '#FF9800'; // Medium engagement
        return '#F44336'; // Low engagement
    };

    const renderStars = (rating: number): string => {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let stars = '⭐'.repeat(fullStars);
        if (hasHalfStar) stars += '⭐';
        return stars || '☆☆☆☆☆';
    };

    const handlePress = () => {
        if (onPress) {
            onPress(content.id);
        }
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={handlePress}
            activeOpacity={0.7}
            disabled={!onPress}
        >
            <View style={[styles.rankBadge, { backgroundColor: getRankColor() }]}>
                <Text style={styles.rankText}>
                    {getRankBadge()}
                </Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.title} numberOfLines={2}>
                    {content.title}
                </Text>

                <View style={styles.metricsContainer}>
                    <View style={styles.metric}>
                        <Text style={styles.metricLabel}>Views</Text>
                        <Text style={styles.metricValue}>
                            {formatNumber(content.views)}
                        </Text>
                    </View>

                    <View style={styles.metric}>
                        <Text style={styles.metricLabel}>Completions</Text>
                        <Text style={styles.metricValue}>
                            {formatNumber(content.completions)}
                        </Text>
                    </View>

                    <View style={styles.metric}>
                        <Text style={styles.metricLabel}>Engagement</Text>
                        <Text
                            style={[
                                styles.metricValue,
                                { color: getEngagementColor(content.engagementRate) }
                            ]}
                        >
                            {(content.engagementRate * 100).toFixed(1)}%
                        </Text>
                    </View>
                </View>

                {content.averageRating > 0 && (
                    <View style={styles.ratingContainer}>
                        <Text style={styles.stars}>
                            {renderStars(content.averageRating)}
                        </Text>
                        <Text style={styles.ratingValue}>
                            {content.averageRating.toFixed(1)}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
        alignItems: 'flex-start'
    },
    rankBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    rankText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF'
    },
    content: {
        flex: 1
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333333',
        marginBottom: 12,
        lineHeight: 22
    },
    metricsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    metric: {
        flex: 1,
        alignItems: 'center'
    },
    metricLabel: {
        fontSize: 11,
        color: '#757575',
        marginBottom: 4,
        textTransform: 'uppercase'
    },
    metricValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333333'
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0'
    },
    stars: {
        fontSize: 14,
        marginRight: 8
    },
    ratingValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333333'
    }
});
