/**
 * Translation Status Indicator Component
 *
 * Visual indicator for translation status across all supported languages.
 * Shows completion progress and individual language status with color coding.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type Language = 'ms' | 'en' | 'zh' | 'ta';
export type TranslationStatus = 'missing' | 'draft' | 'review' | 'approved';

export interface LanguageStatusInfo {
    language: Language;
    status: TranslationStatus;
    lastUpdated: Date;
    translatorName?: string;
    reviewerName?: string;
    wordCount?: number;
    qualityScore?: number;
}

export interface TranslationStatusIndicatorProps {
    contentId: string;
    languages: LanguageStatusInfo[];
    compact?: boolean;
    showDetails?: boolean;
    onLanguagePress?: (language: Language) => void;
}

const LANGUAGE_NAMES: Record<Language, string> = {
    ms: 'Malay',
    en: 'English',
    zh: 'Chinese',
    ta: 'Tamil',
};

const LANGUAGE_FLAGS: Record<Language, string> = {
    ms: '🇲🇾',
    en: '🇬🇧',
    zh: '🇨🇳',
    ta: '🇮🇳',
};

const STATUS_COLORS: Record<TranslationStatus, { bg: string; text: string; icon: string }> = {
    missing: {
        bg: '#FEE2E2',
        text: '#991B1B',
        icon: 'alert-circle',
    },
    draft: {
        bg: '#FEF3C7',
        text: '#92400E',
        icon: 'create',
    },
    review: {
        bg: '#DBEAFE',
        text: '#1E40AF',
        icon: 'eye',
    },
    approved: {
        bg: '#D1FAE5',
        text: '#065F46',
        icon: 'checkmark-circle',
    },
};

const STATUS_LABELS: Record<TranslationStatus, string> = {
    missing: 'Missing',
    draft: 'Draft',
    review: 'In Review',
    approved: 'Approved',
};

export const TranslationStatusIndicator: React.FC<TranslationStatusIndicatorProps> = ({
    languages,
    compact = false,
    showDetails = true,
    onLanguagePress,
}) => {
    const totalLanguages = languages.length;
    const approvedCount = languages.filter(l => l.status === 'approved').length;
    const completionPercentage = (approvedCount / totalLanguages) * 100;

    if (compact) {
        return (
            <View style={styles.compactContainer}>
                <View style={styles.compactProgress}>
                    <View
                        style={[
                            styles.compactProgressBar,
                            { width: `${completionPercentage}%` },
                        ]}
                    />
                </View>
                <Text style={styles.compactText}>
                    {approvedCount}/{totalLanguages} languages
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Overall Progress */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Translation Progress</Text>
                <Text style={styles.headerPercentage}>
                    {completionPercentage.toFixed(0)}%
                </Text>
            </View>

            <View style={styles.progressBarContainer}>
                <View
                    style={[
                        styles.progressBar,
                        { width: `${completionPercentage}%` },
                    ]}
                />
            </View>

            <View style={styles.statsRow}>
                <Text style={styles.statsText}>
                    {approvedCount} of {totalLanguages} approved
                </Text>
            </View>

            {/* Language Status Cards */}
            <View style={styles.languageGrid}>
                {languages.map((langInfo) => (
                    <TouchableOpacity
                        key={langInfo.language}
                        style={styles.languageCard}
                        onPress={() => onLanguagePress?.(langInfo.language)}
                        activeOpacity={onLanguagePress ? 0.7 : 1}
                    >
                        <View style={styles.languageHeader}>
                            <Text style={styles.languageFlag}>
                                {LANGUAGE_FLAGS[langInfo.language]}
                            </Text>
                            <Text style={styles.languageName}>
                                {LANGUAGE_NAMES[langInfo.language]}
                            </Text>
                        </View>

                        <View
                            style={[
                                styles.statusBadge,
                                { backgroundColor: STATUS_COLORS[langInfo.status].bg },
                            ]}
                        >
                            <Ionicons
                                name={STATUS_COLORS[langInfo.status].icon as any}
                                size={14}
                                color={STATUS_COLORS[langInfo.status].text}
                                style={styles.statusIcon}
                            />
                            <Text
                                style={[
                                    styles.statusText,
                                    { color: STATUS_COLORS[langInfo.status].text },
                                ]}
                            >
                                {STATUS_LABELS[langInfo.status]}
                            </Text>
                        </View>

                        {showDetails && (
                            <View style={styles.details}>
                                {langInfo.wordCount !== undefined && (
                                    <Text style={styles.detailText}>
                                        {langInfo.wordCount.toLocaleString()} words
                                    </Text>
                                )}
                                {langInfo.qualityScore !== undefined && (
                                    <View style={styles.qualityScore}>
                                        <Ionicons name="star" size={12} color="#F59E0B" />
                                        <Text style={styles.detailText}>
                                            {langInfo.qualityScore.toFixed(1)}
                                        </Text>
                                    </View>
                                )}
                                {langInfo.translatorName && (
                                    <Text style={styles.detailText} numberOfLines={1}>
                                        By: {langInfo.translatorName}
                                    </Text>
                                )}
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    compactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    compactProgress: {
        flex: 1,
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        overflow: 'hidden',
    },
    compactProgressBar: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 4,
    },
    compactText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    headerPercentage: {
        fontSize: 20,
        fontWeight: '700',
        color: '#10B981',
    },
    progressBarContainer: {
        height: 12,
        backgroundColor: '#E5E7EB',
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 6,
    },
    statsRow: {
        marginBottom: 16,
    },
    statsText: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
    },
    languageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    languageCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    languageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6,
    },
    languageFlag: {
        fontSize: 20,
    },
    languageName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        marginBottom: 8,
    },
    statusIcon: {
        marginRight: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    details: {
        gap: 4,
    },
    detailText: {
        fontSize: 11,
        color: '#6B7280',
    },
    qualityScore: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
});

export default TranslationStatusIndicator;
