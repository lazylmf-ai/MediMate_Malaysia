/**
 * Text Quality Analyzer
 * 
 * Analyzes OCR text recognition quality and filters low-confidence results
 * to improve overall accuracy for Malaysian medication recognition.
 */

import { TextRecognitionResult } from '@react-native-ml-kit/text-recognition';

export interface QualityAnalysisResult {
  score: number; // 0-100 overall quality score
  textCoverage: number; // Percentage of image area with text
  averageConfidence: number; // Average ML Kit confidence
  readabilityScore: number; // Text readability assessment
  structureScore: number; // Text structure analysis
  recommendations: string[];
  issues: QualityIssue[];
}

export interface QualityIssue {
  type: 'low_confidence' | 'sparse_text' | 'unclear_structure' | 'language_inconsistency';
  severity: 'high' | 'medium' | 'low';
  description: string;
  affectedElements: number;
}

export class TextQualityAnalyzer {
  private static instance: TextQualityAnalyzer;

  private constructor() {}

  public static getInstance(): TextQualityAnalyzer {
    if (!TextQualityAnalyzer.instance) {
      TextQualityAnalyzer.instance = new TextQualityAnalyzer();
    }
    return TextQualityAnalyzer.instance;
  }

  /**
   * Analyze OCR recognition result quality
   */
  public async analyzeRecognitionResult(
    result: TextRecognitionResult,
    validationStrength: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<QualityAnalysisResult> {
    const analysis: QualityAnalysisResult = {
      score: 0,
      textCoverage: 0,
      averageConfidence: 0,
      readabilityScore: 0,
      structureScore: 0,
      recommendations: [],
      issues: []
    };

    try {
      // Step 1: Calculate text coverage
      analysis.textCoverage = this.calculateTextCoverage(result);

      // Step 2: Calculate average confidence
      analysis.averageConfidence = this.calculateAverageConfidence(result);

      // Step 3: Assess text readability
      analysis.readabilityScore = this.assessReadability(result);

      // Step 4: Analyze text structure
      analysis.structureScore = this.analyzeTextStructure(result);

      // Step 5: Identify quality issues
      analysis.issues = this.identifyQualityIssues(result, validationStrength);

      // Step 6: Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis);

      // Step 7: Calculate overall quality score
      analysis.score = this.calculateOverallQualityScore(analysis);

      return analysis;

    } catch (error) {
      console.error('Error analyzing text quality:', error);
      return analysis;
    }
  }

  /**
   * Calculate percentage of image area covered by text
   */
  private calculateTextCoverage(result: TextRecognitionResult): number {
    if (!result.blocks || result.blocks.length === 0) return 0;

    let totalTextArea = 0;
    let imageWidth = 0;
    let imageHeight = 0;

    // Calculate total text area and estimate image dimensions
    for (const block of result.blocks) {
      if (block.frame) {
        const area = block.frame.width * block.frame.height;
        totalTextArea += area;
        
        // Estimate image dimensions from block positions
        imageWidth = Math.max(imageWidth, block.frame.x + block.frame.width);
        imageHeight = Math.max(imageHeight, block.frame.y + block.frame.height);
      }
    }

    if (imageWidth === 0 || imageHeight === 0) return 0;

    const imageArea = imageWidth * imageHeight;
    const coverage = (totalTextArea / imageArea) * 100;
    
    return Math.min(100, Math.max(0, coverage));
  }

  /**
   * Calculate average confidence from ML Kit elements
   */
  private calculateAverageConfidence(result: TextRecognitionResult): number {
    const confidences: number[] = [];

    for (const block of result.blocks || []) {
      for (const line of block.lines || []) {
        for (const element of line.elements || []) {
          if (element.confidence !== undefined) {
            confidences.push(element.confidence);
          }
        }
      }
    }

    if (confidences.length === 0) return 0;

    const sum = confidences.reduce((acc, conf) => acc + conf, 0);
    return sum / confidences.length;
  }

  /**
   * Assess text readability for medication labels
   */
  private assessReadability(result: TextRecognitionResult): number {
    const text = result.text || '';
    if (text.length === 0) return 0;

    let score = 50; // Base score

    // Character distribution analysis
    const alphanumericRatio = this.getAlphanumericRatio(text);
    if (alphanumericRatio > 0.7) score += 20; // Good text/number balance
    else if (alphanumericRatio < 0.3) score -= 15; // Too many numbers/symbols

    // Word length analysis (medication names have specific patterns)
    const avgWordLength = this.getAverageWordLength(text);
    if (avgWordLength >= 4 && avgWordLength <= 12) score += 15; // Good for medication names
    else if (avgWordLength < 2 || avgWordLength > 20) score -= 20;

    // Check for medication-specific patterns
    if (this.hasMedicationPatterns(text)) score += 20;

    // Penalize excessive special characters that indicate OCR errors
    const specialCharRatio = this.getSpecialCharacterRatio(text);
    if (specialCharRatio > 0.3) score -= Math.floor(specialCharRatio * 50);

    // Check for proper sentence structure
    if (this.hasProperStructure(text)) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Analyze text structure for medication labels
   */
  private analyzeTextStructure(result: TextRecognitionResult): number {
    const lines: string[] = [];
    
    for (const block of result.blocks || []) {
      for (const line of block.lines || []) {
        const lineText = line.elements?.map(e => e.text).join(' ').trim();
        if (lineText && lineText.length > 0) {
          lines.push(lineText);
        }
      }
    }

    if (lines.length === 0) return 0;

    let score = 50; // Base score

    // Check for typical medication label structure
    // 1. Medication name (usually in first few lines)
    if (lines.length >= 1 && this.looksLikeMedicationName(lines[0])) score += 20;

    // 2. Dosage information
    if (lines.some(line => this.containsDosageInfo(line))) score += 15;

    // 3. Instructions
    if (lines.some(line => this.containsInstructions(line))) score += 10;

    // 4. Proper line count (medication labels typically have 3-15 lines)
    if (lines.length >= 3 && lines.length <= 15) score += 10;
    else if (lines.length < 2 || lines.length > 25) score -= 15;

    // 5. Consistent line lengths (not too many very short or very long lines)
    const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
    const lineVariance = this.calculateLineVariance(lines, avgLineLength);
    if (lineVariance < 20) score += 5; // Good consistency

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Identify specific quality issues
   */
  private identifyQualityIssues(
    result: TextRecognitionResult,
    validationStrength: 'low' | 'medium' | 'high'
  ): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Define confidence thresholds based on validation strength
    const confidenceThresholds = {
      low: { high: 30, medium: 20, low: 10 },
      medium: { high: 50, medium: 35, low: 20 },
      high: { high: 70, medium: 55, low: 40 }
    };

    const thresholds = confidenceThresholds[validationStrength];

    // Check for low confidence elements
    let lowConfidenceCount = 0;
    let totalElements = 0;

    for (const block of result.blocks || []) {
      for (const line of block.lines || []) {
        for (const element of line.elements || []) {
          totalElements++;
          if (element.confidence !== undefined && element.confidence < thresholds.medium) {
            lowConfidenceCount++;
          }
        }
      }
    }

    if (lowConfidenceCount > totalElements * 0.5) {
      issues.push({
        type: 'low_confidence',
        severity: 'high',
        description: `${Math.round((lowConfidenceCount / totalElements) * 100)}% of text has low confidence`,
        affectedElements: lowConfidenceCount
      });
    } else if (lowConfidenceCount > totalElements * 0.3) {
      issues.push({
        type: 'low_confidence',
        severity: 'medium',
        description: `${Math.round((lowConfidenceCount / totalElements) * 100)}% of text has low confidence`,
        affectedElements: lowConfidenceCount
      });
    }

    // Check for sparse text coverage
    const textCoverage = this.calculateTextCoverage(result);
    if (textCoverage < 5) {
      issues.push({
        type: 'sparse_text',
        severity: 'high',
        description: 'Very little text detected in image',
        affectedElements: 0
      });
    } else if (textCoverage < 15) {
      issues.push({
        type: 'sparse_text',
        severity: 'medium',
        description: 'Limited text coverage detected',
        affectedElements: 0
      });
    }

    // Check for unclear structure
    const structureScore = this.analyzeTextStructure(result);
    if (structureScore < 30) {
      issues.push({
        type: 'unclear_structure',
        severity: 'high',
        description: 'Text structure does not match typical medication label format',
        affectedElements: 0
      });
    }

    return issues;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(analysis: QualityAnalysisResult): string[] {
    const recommendations: string[] = [];

    if (analysis.averageConfidence < 60) {
      recommendations.push('Consider retaking the photo with better lighting');
      recommendations.push('Ensure the medication label is clearly visible and in focus');
    }

    if (analysis.textCoverage < 15) {
      recommendations.push('Move closer to the medication label');
      recommendations.push('Ensure the label fills more of the camera view');
    }

    if (analysis.structureScore < 40) {
      recommendations.push('Focus on the main medication label area');
      recommendations.push('Avoid capturing multiple labels or packaging text');
    }

    // Check for specific high-severity issues
    const highSeverityIssues = analysis.issues.filter(issue => issue.severity === 'high');
    if (highSeverityIssues.length > 0) {
      recommendations.push('Image quality is too low for reliable text recognition');
      recommendations.push('Please retake the photo following the camera guidelines');
    }

    // If no issues, provide positive feedback
    if (analysis.score > 80) {
      recommendations.push('Good image quality detected');
      recommendations.push('Text recognition should be reliable');
    }

    return recommendations;
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallQualityScore(analysis: QualityAnalysisResult): number {
    const weights = {
      confidence: 0.35,
      coverage: 0.25,
      readability: 0.25,
      structure: 0.15
    };

    let score = 
      (analysis.averageConfidence * weights.confidence) +
      (analysis.textCoverage * weights.coverage) +
      (analysis.readabilityScore * weights.readability) +
      (analysis.structureScore * weights.structure);

    // Apply penalty for high severity issues
    const highSeverityCount = analysis.issues.filter(i => i.severity === 'high').length;
    score -= highSeverityCount * 15;

    // Apply penalty for medium severity issues
    const mediumSeverityCount = analysis.issues.filter(i => i.severity === 'medium').length;
    score -= mediumSeverityCount * 8;

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  // Helper methods for text analysis

  private getAlphanumericRatio(text: string): number {
    const alphanumeric = text.match(/[a-zA-Z0-9]/g) || [];
    return alphanumeric.length / text.length;
  }

  private getAverageWordLength(text: string): number {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    if (words.length === 0) return 0;
    return words.reduce((sum, word) => sum + word.length, 0) / words.length;
  }

  private getSpecialCharacterRatio(text: string): number {
    const special = text.match(/[^a-zA-Z0-9\s]/g) || [];
    return special.length / text.length;
  }

  private hasMedicationPatterns(text: string): boolean {
    const medicationPatterns = [
      /\d+\s*(mg|ml|tablet|capsule)/i,
      /take|ambil|minum/i,
      /daily|sehari|times|kali/i,
      /before|after|sebelum|selepas/i
    ];
    
    return medicationPatterns.some(pattern => pattern.test(text));
  }

  private hasProperStructure(text: string): boolean {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    return lines.length >= 2 && lines.length <= 20;
  }

  private looksLikeMedicationName(line: string): boolean {
    const cleanLine = line.trim();
    return cleanLine.length >= 3 && 
           cleanLine.length <= 50 && 
           !/^\d/.test(cleanLine) && 
           !/^(take|ambil|minum)/i.test(cleanLine);
  }

  private containsDosageInfo(line: string): boolean {
    return /\d+\s*(mg|ml|g|tablet|capsule|kapsul|pil)/i.test(line);
  }

  private containsInstructions(line: string): boolean {
    const instructionKeywords = [
      'take', 'ambil', 'minum', 'daily', 'sehari', 'times', 'kali',
      'before', 'after', 'sebelum', 'selepas', 'meal', 'makan'
    ];
    
    const lowerLine = line.toLowerCase();
    return instructionKeywords.some(keyword => lowerLine.includes(keyword));
  }

  private calculateLineVariance(lines: string[], avgLength: number): number {
    if (lines.length === 0) return 0;
    
    const squaredDiffs = lines.map(line => Math.pow(line.length - avgLength, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / lines.length;
    
    return Math.sqrt(variance);
  }
}