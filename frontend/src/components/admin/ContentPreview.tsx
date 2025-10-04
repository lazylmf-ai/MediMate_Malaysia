/**
 * Content Preview Component
 *
 * Displays educational content in preview mode for review.
 * Shows multi-language content with language selector.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';

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

export interface ContentPreviewProps {
    content: ContentData;
}

type Language = 'ms' | 'en' | 'zh' | 'ta';

const LANGUAGES: { code: Language; label: string }[] = [
    { code: 'ms', label: 'Malay' },
    { code: 'en', label: 'English' },
    { code: 'zh', label: 'Chinese' },
    { code: 'ta', label: 'Tamil' },
];

export const ContentPreview: React.FC<ContentPreviewProps> = ({ content }) => {
    const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');

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
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getLanguageCompleteness = (lang: Language): 'complete' | 'partial' | 'missing' => {
        const hasTitle = content.title[lang] && content.title[lang].trim().length > 0;
        const hasDescription = content.description[lang] && content.description[lang].trim().length > 0;
        const hasBody = content.body[lang] && content.body[lang].trim().length > 0;

        if (hasTitle && hasDescription && hasBody) return 'complete';
        if (hasTitle || hasDescription || hasBody) return 'partial';
        return 'missing';
    };

    const getCompletenessColor = (completeness: string): string => {
        const colors: Record<string, string> = {
            complete: '#4CAF50',
            partial: '#FF9800',
            missing: '#F44336',
        };
        return colors[completeness] || '#9E9E9E';
    };

    const renderHTMLContent = (html: string): string => {
        // Simple HTML to text conversion for preview
        // In a real app, you'd use a proper HTML renderer
        return html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<[^>]+>/g, '');
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerBadges}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(content.status) }]}>
                        <Text style={styles.statusText}>{content.status.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                    <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>{getContentTypeLabel(content.type)}</Text>
                    </View>
                </View>
                <Text style={styles.version}>Version {content.version}</Text>
            </View>

            {/* Metadata */}
            <View style={styles.metadata}>
                <View style={styles.metadataRow}>
                    <Text style={styles.metadataLabel}>Category:</Text>
                    <Text style={styles.metadataValue}>{content.category}</Text>
                </View>
                <View style={styles.metadataRow}>
                    <Text style={styles.metadataLabel}>Author:</Text>
                    <Text style={styles.metadataValue}>{content.authorName || 'Unknown'}</Text>
                </View>
                <View style={styles.metadataRow}>
                    <Text style={styles.metadataLabel}>Created:</Text>
                    <Text style={styles.metadataValue}>{formatDate(content.createdAt)}</Text>
                </View>
                <View style={styles.metadataRow}>
                    <Text style={styles.metadataLabel}>Updated:</Text>
                    <Text style={styles.metadataValue}>{formatDate(content.updatedAt)}</Text>
                </View>
            </View>

            {/* Language Selector */}
            <View style={styles.languageSelector}>
                <Text style={styles.languageSelectorTitle}>Language:</Text>
                <View style={styles.languageButtons}>
                    {LANGUAGES.map((lang) => {
                        const completeness = getLanguageCompleteness(lang.code);
                        const isSelected = selectedLanguage === lang.code;

                        return (
                            <TouchableOpacity
                                key={lang.code}
                                style={[
                                    styles.languageButton,
                                    isSelected && styles.languageButtonActive,
                                ]}
                                onPress={() => setSelectedLanguage(lang.code)}
                            >
                                <View style={styles.languageButtonContent}>
                                    <Text
                                        style={[
                                            styles.languageButtonText,
                                            isSelected && styles.languageButtonTextActive,
                                        ]}
                                    >
                                        {lang.label}
                                    </Text>
                                    <View
                                        style={[
                                            styles.completenessIndicator,
                                            { backgroundColor: getCompletenessColor(completeness) },
                                        ]}
                                    />
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Content Preview */}
            <View style={styles.contentPreview}>
                <Text style={styles.previewTitle}>Content Preview</Text>

                {/* Title */}
                <View style={styles.contentSection}>
                    <Text style={styles.sectionLabel}>Title</Text>
                    <Text style={styles.contentTitle}>
                        {content.title[selectedLanguage] || '(No title in this language)'}
                    </Text>
                </View>

                {/* Description */}
                <View style={styles.contentSection}>
                    <Text style={styles.sectionLabel}>Description</Text>
                    <Text style={styles.contentDescription}>
                        {content.description[selectedLanguage] || '(No description in this language)'}
                    </Text>
                </View>

                {/* Body */}
                <View style={styles.contentSection}>
                    <Text style={styles.sectionLabel}>Body</Text>
                    <ScrollView
                        style={styles.contentBodyScroll}
                        nestedScrollEnabled={true}
                    >
                        <Text style={styles.contentBody}>
                            {content.body[selectedLanguage]
                                ? renderHTMLContent(content.body[selectedLanguage])
                                : '(No content in this language)'}
                        </Text>
                    </ScrollView>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerBadges: {
        flexDirection: 'row',
        gap: 8,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
    typeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#E0E0E0',
    },
    typeText: {
        color: '#666',
        fontSize: 11,
        fontWeight: '600',
    },
    version: {
        fontSize: 14,
        color: '#999',
        fontWeight: '500',
    },
    metadata: {
        backgroundColor: '#F5F5F5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    metadataRow: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    metadataLabel: {
        fontSize: 13,
        color: '#999',
        width: 80,
        fontWeight: '500',
    },
    metadataValue: {
        fontSize: 13,
        color: '#333',
        flex: 1,
    },
    languageSelector: {
        marginBottom: 16,
    },
    languageSelectorTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    languageButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    languageButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#E0E0E0',
    },
    languageButtonActive: {
        backgroundColor: '#E3F2FD',
        borderColor: '#007AFF',
    },
    languageButtonContent: {
        alignItems: 'center',
    },
    languageButtonText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
        marginBottom: 4,
    },
    languageButtonTextActive: {
        color: '#007AFF',
        fontWeight: '600',
    },
    completenessIndicator: {
        width: 24,
        height: 4,
        borderRadius: 2,
    },
    contentPreview: {
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        paddingTop: 16,
    },
    previewTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    contentSection: {
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#999',
        textTransform: 'uppercase',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    contentTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        lineHeight: 30,
    },
    contentDescription: {
        fontSize: 15,
        color: '#666',
        lineHeight: 22,
    },
    contentBodyScroll: {
        maxHeight: 400,
        backgroundColor: '#FAFAFA',
        padding: 12,
        borderRadius: 8,
    },
    contentBody: {
        fontSize: 14,
        color: '#333',
        lineHeight: 24,
    },
});

export default ContentPreview;
