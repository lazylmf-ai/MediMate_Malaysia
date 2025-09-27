/**
 * Multi-Modal Reminder Display Component
 *
 * Unified interface for all reminder delivery methods:
 * - Visual notifications with cultural themes
 * - Audio playback controls with traditional sounds
 * - Haptic feedback controls
 * - SMS preview and configuration
 * - Voice reminder playback
 * - Real-time delivery status tracking
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { COLORS } from '@/constants/config';

interface ReminderData {
  id: string;
  medicationName: string;
  dosage: string;
  scheduledTime: string;
  instructions?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface DeliveryMethod {
  type: 'visual' | 'audio' | 'haptic' | 'sms' | 'voice';
  enabled: boolean;
  status: 'pending' | 'delivering' | 'delivered' | 'failed';
  lastAttempt?: string;
  errorMessage?: string;
}

interface MultiModalReminderDisplayProps {
  reminder: ReminderData;
  deliveryMethods: DeliveryMethod[];
  culturalTheme?: 'malaysian' | 'chinese' | 'tamil' | 'modern';
  language: 'en' | 'ms' | 'zh' | 'ta';
  onMethodToggle: (type: string, enabled: boolean) => void;
  onRetryMethod: (type: string) => void;
  onPreviewMethod: (type: string) => void;
  isPreviewMode?: boolean;
}

export const MultiModalReminderDisplay: React.FC<MultiModalReminderDisplayProps> = ({
  reminder,
  deliveryMethods,
  culturalTheme = 'modern',
  language,
  onMethodToggle,
  onRetryMethod,
  onPreviewMethod,
  isPreviewMode = false,
}) => {
  const [activeDelivery, setActiveDelivery] = useState<string | null>(null);
  const [soundPlaying, setSoundPlaying] = useState<string | null>(null);
  const [voicePlaying, setVoicePlaying] = useState(false);

  const pulseAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const soundObject = useRef<Audio.Sound | null>(null);

  // Start delivery animation
  useEffect(() => {
    const deliveringMethod = deliveryMethods.find(m => m.status === 'delivering');
    if (deliveringMethod) {
      setActiveDelivery(deliveringMethod.type);
      startPulseAnimation();
    } else {
      setActiveDelivery(null);
      stopPulseAnimation();
    }
  }, [deliveryMethods]);

  // Get localized text
  const getLocalizedText = (key: string, defaultText: string): string => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        reminderFor: 'Reminder for',
        deliveryMethods: 'Delivery Methods',
        visual: 'Visual',
        audio: 'Audio',
        haptic: 'Haptic',
        sms: 'SMS',
        voice: 'Voice',
        pending: 'Pending',
        delivering: 'Delivering...',
        delivered: 'Delivered',
        failed: 'Failed',
        retry: 'Retry',
        preview: 'Preview',
        testVibration: 'Test Vibration',
        playCulturalSound: 'Play Cultural Sound',
        stopSound: 'Stop Sound',
        readAloud: 'Read Aloud',
        stopReading: 'Stop Reading',
        smsPreview: 'SMS Preview',
        at: 'at',
        dose: 'Dose',
        take: 'Take',
        now: 'now',
        instructions: 'Instructions',
        enabled: 'Enabled',
        disabled: 'Disabled',
      },
      ms: {
        reminderFor: 'Peringatan untuk',
        deliveryMethods: 'Kaedah Penyampaian',
        visual: 'Visual',
        audio: 'Audio',
        haptic: 'Haptik',
        sms: 'SMS',
        voice: 'Suara',
        pending: 'Menunggu',
        delivering: 'Menghantar...',
        delivered: 'Dihantar',
        failed: 'Gagal',
        retry: 'Cuba Lagi',
        preview: 'Pratonton',
        testVibration: 'Uji Getaran',
        playCulturalSound: 'Main Bunyi Budaya',
        stopSound: 'Henti Bunyi',
        readAloud: 'Baca dengan Kuat',
        stopReading: 'Henti Membaca',
        smsPreview: 'Pratonton SMS',
        at: 'pada',
        dose: 'Dos',
        take: 'Ambil',
        now: 'sekarang',
        instructions: 'Arahan',
        enabled: 'Diaktifkan',
        disabled: 'Dinyahaktif',
      },
      zh: {
        reminderFor: '提醒',
        deliveryMethods: '传送方式',
        visual: '视觉',
        audio: '音频',
        haptic: '触觉',
        sms: '短信',
        voice: '语音',
        pending: '等待中',
        delivering: '传送中...',
        delivered: '已传送',
        failed: '失败',
        retry: '重试',
        preview: '预览',
        testVibration: '测试振动',
        playCulturalSound: '播放文化声音',
        stopSound: '停止声音',
        readAloud: '朗读',
        stopReading: '停止朗读',
        smsPreview: '短信预览',
        at: '在',
        dose: '剂量',
        take: '服用',
        now: '现在',
        instructions: '说明',
        enabled: '已启用',
        disabled: '已禁用',
      },
      ta: {
        reminderFor: 'நினைவூட்டல்',
        deliveryMethods: 'வினியோக முறைகள்',
        visual: 'காட்சி',
        audio: 'ஆடியோ',
        haptic: 'ஹாப்டிக்',
        sms: 'எஸ்எம்எஸ்',
        voice: 'குரல்',
        pending: 'நிலுவையில்',
        delivering: 'வினியோகிக்கிறது...',
        delivered: 'வினியோகிக்கப்பட்டது',
        failed: 'தோல்வி',
        retry: 'மீண்டும் முயற்சி',
        preview: 'முன்னோட்டம்',
        testVibration: 'அதிர்வு சோதனை',
        playCulturalSound: 'கலாச்சார ஒலியை இயக்கு',
        stopSound: 'ஒலியை நிறுத்து',
        readAloud: 'உரக்க வாசி',
        stopReading: 'வாசிப்பை நிறுத்து',
        smsPreview: 'எஸ்எம்எஸ் முன்னோட்டம்',
        at: 'இல்',
        dose: 'மாத்திரை',
        take: 'எடு',
        now: 'இப்போது',
        instructions: 'வழிமுறைகள்',
        enabled: 'இயக்கப்பட்டது',
        disabled: 'முடக்கப்பட்டது',
      },
    };

    return translations[language]?.[key] || defaultText;
  };

  // Start pulse animation
  const startPulseAnimation = () => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
  };

  // Stop pulse animation
  const stopPulseAnimation = () => {
    pulseAnimation.stopAnimation();
    pulseAnimation.setValue(0);
  };

  // Get priority color
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return COLORS.error;
      case 'high': return COLORS.warning;
      case 'medium': return COLORS.primary;
      case 'low': return COLORS.success;
      default: return COLORS.textLight;
    }
  };

  // Get cultural sound file
  const getCulturalSoundFile = (): string => {
    switch (culturalTheme) {
      case 'malaysian': return 'gamelan_chime.mp3';
      case 'chinese': return 'temple_bell.mp3';
      case 'tamil': return 'veena_note.mp3';
      default: return 'modern_chime.mp3';
    }
  };

  // Handle audio preview
  const handleAudioPreview = useCallback(async () => {
    try {
      if (soundPlaying) {
        if (soundObject.current) {
          await soundObject.current.stopAsync();
          await soundObject.current.unloadAsync();
          soundObject.current = null;
        }
        setSoundPlaying(null);
        return;
      }

      const soundFile = getCulturalSoundFile();
      const { sound } = await Audio.Sound.createAsync(
        // In a real app, this would load from assets
        require('@/assets/sounds/gamelan_chime.mp3'), // Placeholder
        { shouldPlay: true }
      );

      soundObject.current = sound;
      setSoundPlaying('audio');

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setSoundPlaying(null);
          sound.unloadAsync();
          soundObject.current = null;
        }
      });

    } catch (error) {
      console.error('Error playing sound:', error);
      Alert.alert('Error', 'Could not play sound');
    }
  }, [soundPlaying, culturalTheme]);

  // Handle haptic preview
  const handleHapticPreview = useCallback(() => {
    // Create cultural haptic pattern
    const pattern = getCulturalHapticPattern();
    Vibration.vibrate(pattern);

    // Visual feedback
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnimation]);

  // Get cultural haptic pattern
  const getCulturalHapticPattern = (): number[] => {
    switch (culturalTheme) {
      case 'malaysian': return [100, 200, 100, 200, 300]; // Gamelan rhythm
      case 'chinese': return [500, 100, 500]; // Temple bell
      case 'tamil': return [50, 100, 50, 100, 50, 100, 200]; // Veena rhythm
      default: return [200, 100, 200]; // Modern pattern
    }
  };

  // Handle voice preview
  const handleVoicePreview = useCallback(async () => {
    try {
      if (voicePlaying) {
        Speech.stop();
        setVoicePlaying(false);
        return;
      }

      const message = generateVoiceMessage();
      const voiceOptions = getVoiceOptions();

      setVoicePlaying(true);

      Speech.speak(message, {
        ...voiceOptions,
        onDone: () => setVoicePlaying(false),
        onError: () => setVoicePlaying(false),
      });

    } catch (error) {
      console.error('Error with voice preview:', error);
      setVoicePlaying(false);
    }
  }, [voicePlaying, reminder, language]);

  // Generate voice message
  const generateVoiceMessage = (): string => {
    const time = new Date(reminder.scheduledTime).toLocaleTimeString(
      language === 'ms' ? 'ms-MY' :
      language === 'zh' ? 'zh-CN' :
      language === 'ta' ? 'ta-IN' : 'en-US',
      { hour: '2-digit', minute: '2-digit' }
    );

    switch (language) {
      case 'ms':
        return `Masa untuk ubat ${reminder.medicationName}. Ambil ${reminder.dosage} sekarang.`;
      case 'zh':
        return `是时候服用${reminder.medicationName}了。现在服用${reminder.dosage}。`;
      case 'ta':
        return `${reminder.medicationName} மருந்து எடுக்கும் நேரம். இப்போது ${reminder.dosage} எடுக்கவும்.`;
      default:
        return `Time to take ${reminder.medicationName}. Take ${reminder.dosage} now.`;
    }
  };

  // Get voice options
  const getVoiceOptions = () => {
    const baseOptions = {
      pitch: 1.0,
      rate: 0.8, // Slower for elderly-friendly
      volume: 1.0,
    };

    switch (language) {
      case 'ms':
        return { ...baseOptions, language: 'ms-MY' };
      case 'zh':
        return { ...baseOptions, language: 'zh-CN' };
      case 'ta':
        return { ...baseOptions, language: 'ta-IN' };
      default:
        return { ...baseOptions, language: 'en-US' };
    }
  };

  // Generate SMS preview
  const generateSMSPreview = (): string => {
    const time = new Date(reminder.scheduledTime).toLocaleTimeString(
      language === 'ms' ? 'ms-MY' :
      language === 'zh' ? 'zh-CN' :
      language === 'ta' ? 'ta-IN' : 'en-US',
      { hour: '2-digit', minute: '2-digit' }
    );

    switch (language) {
      case 'ms':
        return `🏥 Peringatan Ubat\n\n${reminder.medicationName}\nDos: ${reminder.dosage}\nMasa: ${time}\n\nSila ambil ubat anda sekarang. Untuk sokongan, hubungi keluarga anda.\n\n- MediMate Malaysia`;
      case 'zh':
        return `🏥 用药提醒\n\n${reminder.medicationName}\n剂量：${reminder.dosage}\n时间：${time}\n\n请现在服药。如需支持，请联系您的家人。\n\n- MediMate Malaysia`;
      case 'ta':
        return `🏥 மருந்து நினைவூட்டல்\n\n${reminder.medicationName}\nமாத்திரை: ${reminder.dosage}\nநேரம்: ${time}\n\nதயவுசெய்து இப்போது உங்கள் மருந்தை எடுங்கள். ஆதரவுக்கு, உங்கள் குடும்பத்தைத் தொடர்பு கொள்ளுங்கள்.\n\n- MediMate Malaysia`;
      default:
        return `🏥 Medication Reminder\n\n${reminder.medicationName}\nDose: ${reminder.dosage}\nTime: ${time}\n\nPlease take your medication now. For support, contact your family.\n\n- MediMate Malaysia`;
    }
  };

  // Render delivery method card
  const renderDeliveryMethod = (method: DeliveryMethod) => {
    const isActive = activeDelivery === method.type;
    const isEnabled = method.enabled;

    const pulseStyle = isActive ? {
      opacity: pulseAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.5, 1],
      }),
      transform: [{
        scale: pulseAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.05],
        }),
      }],
    } : {};

    return (
      <Animated.View
        key={method.type}
        style={[
          styles.methodCard,
          isEnabled && styles.methodCardEnabled,
          isActive && styles.methodCardActive,
          pulseStyle,
        ]}
      >
        <View style={styles.methodHeader}>
          <View style={styles.methodInfo}>
            <Ionicons
              name={getMethodIcon(method.type)}
              size={24}
              color={isEnabled ? getPriorityColor(reminder.priority) : COLORS.textLight}
            />
            <Text style={[
              styles.methodTitle,
              { color: isEnabled ? COLORS.text : COLORS.textLight }
            ]}>
              {getLocalizedText(method.type, method.type)}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.methodToggle,
              isEnabled && styles.methodToggleEnabled
            ]}
            onPress={() => onMethodToggle(method.type, !isEnabled)}
          >
            <Text style={[
              styles.methodToggleText,
              isEnabled && styles.methodToggleTextEnabled
            ]}>
              {getLocalizedText(isEnabled ? 'enabled' : 'disabled', isEnabled ? 'Enabled' : 'Disabled')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.methodStatus}>
          <Ionicons
            name={getStatusIcon(method.status)}
            size={16}
            color={getStatusColor(method.status)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(method.status) }]}>
            {getLocalizedText(method.status, method.status)}
          </Text>
        </View>

        {isEnabled && (
          <View style={styles.methodActions}>
            {method.type === 'audio' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleAudioPreview}
              >
                <Ionicons
                  name={soundPlaying ? 'stop' : 'play'}
                  size={16}
                  color={COLORS.primary}
                />
                <Text style={styles.actionButtonText}>
                  {soundPlaying ? getLocalizedText('stopSound', 'Stop Sound') : getLocalizedText('playCulturalSound', 'Play Cultural Sound')}
                </Text>
              </TouchableOpacity>
            )}

            {method.type === 'haptic' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleHapticPreview}
              >
                <Animated.View style={{ transform: [{ scale: scaleAnimation }] }}>
                  <Ionicons name="phone-portrait" size={16} color={COLORS.primary} />
                </Animated.View>
                <Text style={styles.actionButtonText}>
                  {getLocalizedText('testVibration', 'Test Vibration')}
                </Text>
              </TouchableOpacity>
            )}

            {method.type === 'voice' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleVoicePreview}
              >
                <Ionicons
                  name={voicePlaying ? 'stop' : 'mic'}
                  size={16}
                  color={COLORS.primary}
                />
                <Text style={styles.actionButtonText}>
                  {voicePlaying ? getLocalizedText('stopReading', 'Stop Reading') : getLocalizedText('readAloud', 'Read Aloud')}
                </Text>
              </TouchableOpacity>
            )}

            {method.type === 'sms' && (
              <View style={styles.smsPreview}>
                <Text style={styles.smsPreviewTitle}>
                  {getLocalizedText('smsPreview', 'SMS Preview')}:
                </Text>
                <Text style={styles.smsPreviewText} numberOfLines={3}>
                  {generateSMSPreview()}
                </Text>
              </View>
            )}

            {method.status === 'failed' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.retryButton]}
                onPress={() => onRetryMethod(method.type)}
              >
                <Ionicons name="refresh" size={16} color={COLORS.white} />
                <Text style={[styles.actionButtonText, { color: COLORS.white }]}>
                  {getLocalizedText('retry', 'Retry')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Animated.View>
    );
  };

  // Get method icon
  const getMethodIcon = (type: string): string => {
    switch (type) {
      case 'visual': return 'eye';
      case 'audio': return 'musical-notes';
      case 'haptic': return 'phone-portrait';
      case 'sms': return 'chatbubble';
      case 'voice': return 'mic';
      default: return 'notifications';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'pending': return 'time';
      case 'delivering': return 'refresh';
      case 'delivered': return 'checkmark-circle';
      case 'failed': return 'alert-circle';
      default: return 'help';
    }
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return COLORS.textLight;
      case 'delivering': return COLORS.primary;
      case 'delivered': return COLORS.success;
      case 'failed': return COLORS.error;
      default: return COLORS.textLight;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Reminder Header */}
      <View style={styles.reminderHeader}>
        <View style={styles.reminderInfo}>
          <Text style={styles.reminderTitle}>
            {getLocalizedText('reminderFor', 'Reminder for')} {reminder.medicationName}
          </Text>
          <Text style={styles.reminderDetails}>
            {getLocalizedText('dose', 'Dose')}: {reminder.dosage}
          </Text>
          <Text style={styles.reminderTime}>
            {new Date(reminder.scheduledTime).toLocaleString(
              language === 'ms' ? 'ms-MY' :
              language === 'zh' ? 'zh-CN' :
              language === 'ta' ? 'ta-IN' : 'en-US'
            )}
          </Text>
          {reminder.instructions && (
            <Text style={styles.reminderInstructions}>
              {getLocalizedText('instructions', 'Instructions')}: {reminder.instructions}
            </Text>
          )}
        </View>

        <View style={[
          styles.priorityIndicator,
          { backgroundColor: getPriorityColor(reminder.priority) }
        ]}>
          <Text style={styles.priorityText}>
            {reminder.priority.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Delivery Methods */}
      <View style={styles.deliveryMethodsSection}>
        <Text style={styles.sectionTitle}>
          {getLocalizedText('deliveryMethods', 'Delivery Methods')}
        </Text>
        {deliveryMethods.map(renderDeliveryMethod)}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  reminderHeader: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reminderInfo: {
    flex: 1,
    marginRight: 12,
  },
  reminderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  reminderDetails: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  reminderTime: {
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 4,
  },
  reminderInstructions: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  priorityIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  deliveryMethodsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  methodCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    opacity: 0.6,
  },
  methodCardEnabled: {
    opacity: 1,
  },
  methodCardActive: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  methodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  methodToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  methodToggleEnabled: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  methodToggleText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  methodToggleTextEnabled: {
    color: COLORS.white,
  },
  methodStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  methodActions: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: COLORS.background,
    marginBottom: 6,
  },
  retryButton: {
    backgroundColor: COLORS.error,
  },
  actionButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 6,
    fontWeight: '500',
  },
  smsPreview: {
    marginTop: 8,
  },
  smsPreviewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  smsPreviewText: {
    fontSize: 11,
    color: COLORS.textLight,
    backgroundColor: COLORS.background,
    padding: 8,
    borderRadius: 6,
    lineHeight: 16,
  },
});