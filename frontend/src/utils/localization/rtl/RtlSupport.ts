/**
 * RTL (Right-to-Left) Support Utilities
 * 
 * Provides comprehensive RTL support for Arabic/Persian pharmaceutical terms
 * and mixed content in Malaysian healthcare context.
 */

import { I18nManager, PixelRatio, Dimensions } from 'react-native';
import type { SupportedLanguage } from '@/i18n/translations';

interface RtlDetectionResult {
  hasRtlContent: boolean;
  rtlRanges: Array<{ start: number; end: number; direction: 'rtl' | 'ltr' }>;
  primaryDirection: 'rtl' | 'ltr';
  mixedContent: boolean;
}

interface TextLayoutInfo {
  direction: 'rtl' | 'ltr';
  textAlign: 'left' | 'right' | 'center';
  writingDirection: 'ltr' | 'rtl';
  flexDirection: 'row' | 'row-reverse';
}

export class RtlSupport {
  // Arabic and Persian characters commonly found in Malaysian pharmaceutical context
  private static readonly RTL_UNICODE_RANGES = [
    [0x0590, 0x05FF], // Hebrew
    [0x0600, 0x06FF], // Arabic
    [0x0750, 0x077F], // Arabic Supplement
    [0x08A0, 0x08FF], // Arabic Extended-A
    [0xFB1D, 0xFB4F], // Hebrew Presentation Forms-A
    [0xFB50, 0xFDFF], // Arabic Presentation Forms-A
    [0xFE70, 0xFEFF], // Arabic Presentation Forms-B
  ];

  // Common Arabic pharmaceutical terms in Malaysian context
  private static readonly MALAYSIAN_RTL_TERMS = {
    // Islamic/Arabic terms commonly used in Malaysian healthcare
    'halal': 'حلال',
    'haram': 'حرام',
    'syubhah': 'شبهة',
    'bismillah': 'بسم الله',
    'inshaallah': 'إن شاء الله',
    'alhamdulillah': 'الحمد لله',
    'subhanallah': 'سبحان الله',
    'astaghfirullah': 'أستغفر الله',
    
    // Medical terms
    'dawa': 'دواء', // Medicine
    'shifa': 'شفاء', // Healing
    'mareed': 'مريض', // Patient
    'tabib': 'طبيب', // Doctor
    
    // Prayer-related terms
    'salah': 'صلاة',
    'wudu': 'وضوء',
    'qibla': 'قبلة',
    'imam': 'إمام',
    'masjid': 'مسجد',
  };

  // Persian terms (less common but present in some pharmaceutical contexts)
  private static readonly PERSIAN_MEDICAL_TERMS = {
    'daroo': 'دارو', // Medicine (Persian)
    'bimar': 'بیمار', // Patient (Persian)
    'doctor': 'دکتر', // Doctor (Persian)
  };

  /**
   * Detect RTL content in text
   */
  static detectRtlContent(text: string): RtlDetectionResult {
    if (!text || text.length === 0) {
      return {
        hasRtlContent: false,
        rtlRanges: [],
        primaryDirection: 'ltr',
        mixedContent: false,
      };
    }

    const rtlRanges: Array<{ start: number; end: number; direction: 'rtl' | 'ltr' }> = [];
    let rtlCharCount = 0;
    let ltrCharCount = 0;

    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const isRtl = this.isRtlCharacter(charCode);
      
      if (isRtl) {
        rtlCharCount++;
        // Find the range of RTL characters
        const start = i;
        while (i < text.length && this.isRtlCharacter(text.charCodeAt(i))) {
          i++;
        }
        rtlRanges.push({ start, end: i, direction: 'rtl' });
        i--; // Adjust for loop increment
      } else if (this.isLtrCharacter(charCode)) {
        ltrCharCount++;
      }
    }

    const hasRtlContent = rtlCharCount > 0;
    const primaryDirection = rtlCharCount > ltrCharCount ? 'rtl' : 'ltr';
    const mixedContent = hasRtlContent && ltrCharCount > 0;

    return {
      hasRtlContent,
      rtlRanges,
      primaryDirection,
      mixedContent,
    };
  }

  /**
   * Get appropriate text layout for content
   */
  static getTextLayout(
    text: string, 
    language: SupportedLanguage,
    forceDirection?: 'rtl' | 'ltr'
  ): TextLayoutInfo {
    if (forceDirection) {
      return {
        direction: forceDirection,
        textAlign: forceDirection === 'rtl' ? 'right' : 'left',
        writingDirection: forceDirection,
        flexDirection: forceDirection === 'rtl' ? 'row-reverse' : 'row',
      };
    }

    const rtlInfo = this.detectRtlContent(text);
    
    // If content is mixed, use the primary direction
    const direction = rtlInfo.hasRtlContent ? rtlInfo.primaryDirection : 'ltr';

    return {
      direction,
      textAlign: direction === 'rtl' ? 'right' : 'left',
      writingDirection: direction,
      flexDirection: direction === 'rtl' ? 'row-reverse' : 'row',
    };
  }

  /**
   * Replace English pharmaceutical terms with Arabic equivalents
   */
  static replaceWithArabicTerms(
    text: string, 
    context: 'medical' | 'islamic' | 'general' = 'general'
  ): string {
    let replacedText = text;

    // Replace common terms based on context
    const termsToReplace = context === 'medical' 
      ? { ...this.MALAYSIAN_RTL_TERMS, ...this.PERSIAN_MEDICAL_TERMS }
      : this.MALAYSIAN_RTL_TERMS;

    for (const [english, arabic] of Object.entries(termsToReplace)) {
      const regex = new RegExp(`\\b${english}\\b`, 'gi');
      replacedText = replacedText.replace(regex, arabic);
    }

    return replacedText;
  }

  /**
   * Format mixed RTL/LTR content for display
   */
  static formatMixedContent(
    text: string,
    options: {
      wrapRtlContent?: boolean;
      addDirectionalMarkers?: boolean;
      preserveWordOrder?: boolean;
    } = {}
  ): string {
    const {
      wrapRtlContent = true,
      addDirectionalMarkers = true,
      preserveWordOrder = true,
    } = options;

    const rtlInfo = this.detectRtlContent(text);

    if (!rtlInfo.hasRtlContent || !rtlInfo.mixedContent) {
      return text;
    }

    let formattedText = text;

    // Add directional markers for proper rendering
    if (addDirectionalMarkers) {
      const RLM = '\u200F'; // Right-to-left mark
      const LRM = '\u200E'; // Left-to-right mark
      
      rtlInfo.rtlRanges.forEach((range, index) => {
        const before = formattedText.substring(0, range.start);
        const rtlContent = formattedText.substring(range.start, range.end);
        const after = formattedText.substring(range.end);
        
        formattedText = before + RLM + rtlContent + LRM + after;
      });
    }

    return formattedText;
  }

  /**
   * Create RTL-aware styles for React Native components
   */
  static createRtlAwareStyle(
    baseStyle: any,
    text: string,
    language: SupportedLanguage
  ): any {
    const layout = this.getTextLayout(text, language);
    
    return {
      ...baseStyle,
      textAlign: layout.textAlign,
      writingDirection: layout.writingDirection,
      // Handle padding and margin for RTL
      ...(layout.direction === 'rtl' && {
        paddingLeft: baseStyle.paddingRight,
        paddingRight: baseStyle.paddingLeft,
        marginLeft: baseStyle.marginRight,
        marginRight: baseStyle.marginLeft,
      }),
    };
  }

  /**
   * Get RTL-aware flex direction for containers
   */
  static getRtlFlexDirection(
    text: string,
    defaultDirection: 'row' | 'column' = 'row'
  ): 'row' | 'row-reverse' | 'column' | 'column-reverse' {
    if (defaultDirection === 'column') {
      return 'column';
    }

    const layout = this.getTextLayout(text, 'en'); // Language doesn't matter for layout detection
    return layout.flexDirection;
  }

  /**
   * Handle RTL medication instructions formatting
   */
  static formatMedicationInstructionsRtl(
    instructions: string,
    language: SupportedLanguage,
    includeArabicTerms: boolean = true
  ): {
    text: string;
    layout: TextLayoutInfo;
    hasArabicContent: boolean;
  } {
    let formattedText = instructions;

    // Replace with Arabic terms if requested and appropriate
    if (includeArabicTerms && (language === 'ms' || language === 'en')) {
      formattedText = this.replaceWithArabicTerms(formattedText, 'medical');
    }

    // Format mixed content
    formattedText = this.formatMixedContent(formattedText, {
      wrapRtlContent: true,
      addDirectionalMarkers: true,
      preserveWordOrder: true,
    });

    const layout = this.getTextLayout(formattedText, language);
    const rtlInfo = this.detectRtlContent(formattedText);

    return {
      text: formattedText,
      layout,
      hasArabicContent: rtlInfo.hasRtlContent,
    };
  }

  /**
   * Get appropriate keyboard type for RTL input
   */
  static getRtlKeyboardType(
    expectedContent: 'arabic' | 'mixed' | 'latin'
  ): 'default' | 'email-address' | 'numeric' | 'phone-pad' {
    switch (expectedContent) {
      case 'arabic':
        return 'default'; // Use default for proper Arabic input support
      case 'mixed':
        return 'default';
      case 'latin':
      default:
        return 'default';
    }
  }

  /**
   * Handle device RTL settings
   */
  static configureDeviceRtl(language: SupportedLanguage, hasRtlContent: boolean): void {
    // For apps that need to change device RTL setting based on content
    // Note: This requires app restart to take effect
    const shouldEnableRtl = hasRtlContent && (language === 'ms' || language === 'en');
    
    if (I18nManager.isRTL !== shouldEnableRtl) {
      I18nManager.allowRTL(shouldEnableRtl);
      I18nManager.forceRTL(shouldEnableRtl);
    }
  }

  /**
   * Get text measurement considering RTL content
   */
  static measureRtlText(
    text: string,
    fontSize: number,
    fontFamily: string = 'System',
    maxWidth?: number
  ): { width: number; height: number; lines: number } {
    // This is a simplified estimation - in production, use proper text measurement
    const rtlInfo = this.detectRtlContent(text);
    
    // RTL text might render slightly differently, adjust measurements
    const baseWidth = text.length * fontSize * 0.6; // Rough estimation
    const adjustedWidth = rtlInfo.hasRtlContent ? baseWidth * 1.1 : baseWidth;
    
    const actualWidth = maxWidth ? Math.min(adjustedWidth, maxWidth) : adjustedWidth;
    const lines = maxWidth ? Math.ceil(adjustedWidth / maxWidth) : 1;
    const height = lines * fontSize * 1.4; // Line height factor

    return {
      width: actualWidth,
      height,
      lines,
    };
  }

  // Private helper methods

  private static isRtlCharacter(charCode: number): boolean {
    return this.RTL_UNICODE_RANGES.some(
      ([start, end]) => charCode >= start && charCode <= end
    );
  }

  private static isLtrCharacter(charCode: number): boolean {
    // Basic Latin and Latin-1 Supplement
    return (charCode >= 0x0041 && charCode <= 0x005A) || // A-Z
           (charCode >= 0x0061 && charCode <= 0x007A) || // a-z
           (charCode >= 0x00C0 && charCode <= 0x00FF);   // Latin-1 Supplement
  }

  /**
   * Utility to check if current device/OS supports RTL properly
   */
  static checkRtlSupport(): {
    deviceSupportsRtl: boolean;
    osVersion: string;
    recommendedSettings: any;
  } {
    return {
      deviceSupportsRtl: I18nManager.isRTL !== undefined,
      osVersion: 'Unknown', // Would detect actual OS version
      recommendedSettings: {
        allowRTL: true,
        swapLeftAndRightInRTL: true,
      },
    };
  }
}

export default RtlSupport;