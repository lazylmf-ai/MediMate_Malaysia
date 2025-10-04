/**
 * Stat Card Component
 *
 * Displays a single analytics metric with icon, title, and value.
 * Used in the analytics dashboard for key performance indicators.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface StatCardProps {
    title: string;
    value: string | number;
    icon?: string;
    subtitle?: string;
    trend?: {
        direction: 'up' | 'down' | 'neutral';
        value: string;
    };
    backgroundColor?: string;
    textColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon,
    subtitle,
    trend,
    backgroundColor = '#FFFFFF',
    textColor = '#333333'
}) => {
    const getTrendColor = () => {
        if (!trend) return '#757575';
        switch (trend.direction) {
            case 'up':
                return '#4CAF50';
            case 'down':
                return '#F44336';
            default:
                return '#757575';
        }
    };

    const getTrendIcon = () => {
        if (!trend) return '';
        switch (trend.direction) {
            case 'up':
                return '↑';
            case 'down':
                return '↓';
            default:
                return '→';
        }
    };

    return (
        <View style={[styles.container, { backgroundColor }]}>
            {icon && (
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>{icon}</Text>
                </View>
            )}

            <View style={styles.content}>
                <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
                    {title}
                </Text>

                <Text style={[styles.value, { color: textColor }]} numberOfLines={1}>
                    {value}
                </Text>

                {subtitle && (
                    <Text style={[styles.subtitle, { color: textColor }]} numberOfLines={1}>
                        {subtitle}
                    </Text>
                )}

                {trend && (
                    <View style={styles.trendContainer}>
                        <Text style={[styles.trendText, { color: getTrendColor() }]}>
                            {getTrendIcon()} {trend.value}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
        marginBottom: 12,
        minHeight: 120,
        justifyContent: 'center'
    },
    iconContainer: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    icon: {
        fontSize: 20
    },
    content: {
        flex: 1
    },
    title: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
        opacity: 0.7
    },
    value: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 4
    },
    subtitle: {
        fontSize: 12,
        opacity: 0.6,
        marginTop: 4
    },
    trendContainer: {
        marginTop: 8
    },
    trendText: {
        fontSize: 12,
        fontWeight: '600'
    }
});
