/**
 * Admin Login Screen
 *
 * Dedicated login screen for education content management admin panel.
 * Supports authentication for admin, content_creator, and medical_reviewer roles.
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, TYPOGRAPHY } from '@/constants/config';

interface LoginFormData {
    email: string;
    password: string;
}

interface AdminLoginScreenProps {
    navigation: any;
}

export default function AdminLoginScreen({ navigation }: AdminLoginScreenProps) {
    const [formData, setFormData] = useState<LoginFormData>({
        email: '',
        password: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Clear error when component mounts
        setError(null);
    }, []);

    const handleInputChange = (field: keyof LoginFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (error) {
            setError(null);
        }
    };

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleLogin = async () => {
        // Clear previous errors
        setError(null);

        // Validate inputs
        if (!formData.email.trim() || !formData.password.trim()) {
            setError('Please enter both email and password');
            return;
        }

        if (!validateEmail(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);

        try {
            // TODO: Implement actual API call to admin authentication endpoint
            // const response = await fetch('/api/admin/auth/login', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({
            //         email: formData.email.trim().toLowerCase(),
            //         password: formData.password,
            //     }),
            // });
            //
            // if (!response.ok) {
            //     const errorData = await response.json();
            //     throw new Error(errorData.error || 'Login failed');
            // }
            //
            // const data = await response.json();
            // const { token, user } = data;
            //
            // // Verify user has admin role
            // const validRoles = ['admin', 'content_creator', 'medical_reviewer'];
            // if (!validRoles.includes(user.educationRole || user.role)) {
            //     throw new Error('Unauthorized: Admin access required');
            // }
            //
            // // Store authentication token
            // await AsyncStorage.setItem('adminToken', token);
            // await AsyncStorage.setItem('adminUser', JSON.stringify(user));
            //
            // // Navigate to admin dashboard
            // navigation.navigate('AdminDashboard');

            // Placeholder success response for development
            setTimeout(() => {
                setIsLoading(false);
                Alert.alert(
                    'Login Successful',
                    'You have been logged in as an admin user.\n\nNote: This is a placeholder. Actual authentication needs to be implemented.',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                // TODO: Navigate to admin dashboard once created
                                // navigation.navigate('AdminDashboard');
                            },
                        },
                    ]
                );
            }, 1000);
        } catch (err) {
            setIsLoading(false);
            const errorMessage = err instanceof Error ? err.message : 'Login failed. Please try again.';
            setError(errorMessage);
            Alert.alert('Login Failed', errorMessage);
        }
    };

    const handleForgotPassword = () => {
        Alert.alert(
            'Reset Password',
            'Please contact your system administrator to reset your admin password.',
            [{ text: 'OK' }]
        );
    };

    const handleBackToMain = () => {
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Admin Portal</Text>
                        <Text style={styles.subtitle}>Education Content Management</Text>
                    </View>

                    {error && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email Address</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="admin@medimate.my"
                                placeholderTextColor={COLORS.TEXT_SECONDARY}
                                value={formData.email}
                                onChangeText={(value) => handleInputChange('email', value)}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!isLoading}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your password"
                                placeholderTextColor={COLORS.TEXT_SECONDARY}
                                value={formData.password}
                                onChangeText={(value) => handleInputChange('password', value)}
                                secureTextEntry
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!isLoading}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.forgotPassword}
                            onPress={handleForgotPassword}
                            disabled={isLoading}
                        >
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                            onPress={handleLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={COLORS.WHITE} />
                            ) : (
                                <Text style={styles.loginButtonText}>Sign In</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.roleInfo}>
                            <Text style={styles.roleInfoTitle}>Authorized Roles:</Text>
                            <Text style={styles.roleInfoText}>Administrator</Text>
                            <Text style={styles.roleInfoText}>Content Creator</Text>
                            <Text style={styles.roleInfoText}>Medical Reviewer</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={handleBackToMain}
                            disabled={isLoading}
                        >
                            <Text style={styles.backButtonText}>Back to Main App</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            MediMate Education Admin Portal
                        </Text>
                        <Text style={styles.footerSubtext}>
                            Secure access for authorized personnel only
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.BACKGROUND,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: COLORS.PRIMARY,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.TEXT_SECONDARY,
        textAlign: 'center',
    },
    errorContainer: {
        backgroundColor: '#FEE2E2',
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#DC2626',
    },
    errorText: {
        color: '#DC2626',
        fontSize: 14,
        fontWeight: '500',
    },
    form: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.TEXT_PRIMARY,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.WHITE,
        borderWidth: 1,
        borderColor: COLORS.BORDER,
        borderRadius: 8,
        padding: 14,
        fontSize: 16,
        color: COLORS.TEXT_PRIMARY,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 20,
    },
    forgotPasswordText: {
        color: COLORS.PRIMARY,
        fontSize: 14,
        fontWeight: '500',
    },
    loginButton: {
        backgroundColor: COLORS.PRIMARY,
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        marginBottom: 24,
    },
    loginButtonDisabled: {
        backgroundColor: COLORS.TEXT_SECONDARY,
    },
    loginButtonText: {
        color: COLORS.WHITE,
        fontSize: 16,
        fontWeight: '700',
    },
    roleInfo: {
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
    },
    roleInfoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.TEXT_PRIMARY,
        marginBottom: 8,
    },
    roleInfoText: {
        fontSize: 13,
        color: COLORS.TEXT_SECONDARY,
        marginLeft: 8,
        marginVertical: 2,
    },
    backButton: {
        backgroundColor: COLORS.WHITE,
        borderWidth: 1,
        borderColor: COLORS.BORDER,
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
    },
    backButtonText: {
        color: COLORS.TEXT_PRIMARY,
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        alignItems: 'center',
        marginTop: 40,
    },
    footerText: {
        fontSize: 12,
        color: COLORS.TEXT_SECONDARY,
        fontWeight: '600',
    },
    footerSubtext: {
        fontSize: 11,
        color: COLORS.TEXT_SECONDARY,
        marginTop: 4,
    },
});
