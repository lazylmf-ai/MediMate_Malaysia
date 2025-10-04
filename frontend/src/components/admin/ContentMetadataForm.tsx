/**
 * Content Metadata Form Component
 *
 * Form for editing content metadata including category, tags, difficulty, etc.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

export type ContentType = 'article' | 'video' | 'quiz' | 'interactive';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

interface ContentMetadata {
  estimatedReadTime: number;
  difficulty: DifficultyLevel;
  tags: string[];
  relatedMedications?: string[];
  relatedConditions?: string[];
}

interface ContentMetadataFormProps {
  type: ContentType;
  category: string;
  metadata: Partial<ContentMetadata>;
  onTypeChange: (type: ContentType) => void;
  onCategoryChange: (category: string) => void;
  onMetadataChange: (metadata: Partial<ContentMetadata>) => void;
}

const CONTENT_TYPES: ContentType[] = ['article', 'video', 'quiz', 'interactive'];
const DIFFICULTY_LEVELS: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];

const CATEGORIES = [
  'General Health',
  'Medications',
  'Conditions',
  'Symptoms',
  'Prevention',
  'Treatment',
  'Nutrition',
  'Mental Health',
  'Pregnancy',
  'Child Health',
  'Elderly Care',
  'Emergency'
];

export const ContentMetadataForm: React.FC<ContentMetadataFormProps> = ({
  type,
  category,
  metadata,
  onTypeChange,
  onCategoryChange,
  onMetadataChange
}) => {
  const [tagInput, setTagInput] = useState('');
  const [relatedMedInput, setRelatedMedInput] = useState('');
  const [relatedCondInput, setRelatedCondInput] = useState('');

  const updateMetadata = (updates: Partial<ContentMetadata>) => {
    onMetadataChange({ ...metadata, ...updates });
  };

  const addTag = () => {
    if (tagInput.trim()) {
      const tags = metadata.tags || [];
      updateMetadata({
        tags: [...tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const removeTag = (index: number) => {
    const tags = metadata.tags || [];
    updateMetadata({
      tags: tags.filter((_, i) => i !== index)
    });
  };

  const addRelatedMedication = () => {
    if (relatedMedInput.trim()) {
      const meds = metadata.relatedMedications || [];
      updateMetadata({
        relatedMedications: [...meds, relatedMedInput.trim()]
      });
      setRelatedMedInput('');
    }
  };

  const removeRelatedMedication = (index: number) => {
    const meds = metadata.relatedMedications || [];
    updateMetadata({
      relatedMedications: meds.filter((_, i) => i !== index)
    });
  };

  const addRelatedCondition = () => {
    if (relatedCondInput.trim()) {
      const conds = metadata.relatedConditions || [];
      updateMetadata({
        relatedConditions: [...conds, relatedCondInput.trim()]
      });
      setRelatedCondInput('');
    }
  };

  const removeRelatedCondition = (index: number) => {
    const conds = metadata.relatedConditions || [];
    updateMetadata({
      relatedConditions: conds.filter((_, i) => i !== index)
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Content Type */}
      <View style={styles.field}>
        <Text style={styles.label}>Content Type *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={type}
            onValueChange={(value) => onTypeChange(value as ContentType)}
            style={styles.picker}
          >
            {CONTENT_TYPES.map((t) => (
              <Picker.Item
                key={t}
                label={t.charAt(0).toUpperCase() + t.slice(1)}
                value={t}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Category */}
      <View style={styles.field}>
        <Text style={styles.label}>Category *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={category}
            onValueChange={onCategoryChange}
            style={styles.picker}
          >
            <Picker.Item label="Select a category" value="" />
            {CATEGORIES.map((cat) => (
              <Picker.Item key={cat} label={cat} value={cat} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Difficulty */}
      <View style={styles.field}>
        <Text style={styles.label}>Difficulty Level *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={metadata.difficulty || 'beginner'}
            onValueChange={(value) => updateMetadata({ difficulty: value as DifficultyLevel })}
            style={styles.picker}
          >
            {DIFFICULTY_LEVELS.map((level) => (
              <Picker.Item
                key={level}
                label={level.charAt(0).toUpperCase() + level.slice(1)}
                value={level}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Estimated Read Time */}
      <View style={styles.field}>
        <Text style={styles.label}>Estimated Read Time (minutes) *</Text>
        <TextInput
          style={styles.input}
          value={String(metadata.estimatedReadTime || '')}
          onChangeText={(text) => {
            const time = parseInt(text, 10);
            if (!isNaN(time) || text === '') {
              updateMetadata({ estimatedReadTime: isNaN(time) ? 0 : time });
            }
          }}
          placeholder="5"
          keyboardType="numeric"
        />
      </View>

      {/* Tags */}
      <View style={styles.field}>
        <Text style={styles.label}>Tags</Text>
        <View style={styles.tagInputRow}>
          <TextInput
            style={[styles.input, styles.tagInput]}
            value={tagInput}
            onChangeText={setTagInput}
            placeholder="Add a tag"
            onSubmitEditing={addTag}
          />
          <TouchableOpacity style={styles.addButton} onPress={addTag}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.tagList}>
          {(metadata.tags || []).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
              <TouchableOpacity onPress={() => removeTag(index)}>
                <Text style={styles.tagRemove}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      {/* Related Medications */}
      <View style={styles.field}>
        <Text style={styles.label}>Related Medications</Text>
        <View style={styles.tagInputRow}>
          <TextInput
            style={[styles.input, styles.tagInput]}
            value={relatedMedInput}
            onChangeText={setRelatedMedInput}
            placeholder="Add medication"
            onSubmitEditing={addRelatedMedication}
          />
          <TouchableOpacity style={styles.addButton} onPress={addRelatedMedication}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.tagList}>
          {(metadata.relatedMedications || []).map((med, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{med}</Text>
              <TouchableOpacity onPress={() => removeRelatedMedication(index)}>
                <Text style={styles.tagRemove}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      {/* Related Conditions */}
      <View style={styles.field}>
        <Text style={styles.label}>Related Conditions</Text>
        <View style={styles.tagInputRow}>
          <TextInput
            style={[styles.input, styles.tagInput]}
            value={relatedCondInput}
            onChangeText={setRelatedCondInput}
            placeholder="Add condition"
            onSubmitEditing={addRelatedCondition}
          />
          <TouchableOpacity style={styles.addButton} onPress={addRelatedCondition}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.tagList}>
          {(metadata.relatedConditions || []).map((cond, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{cond}</Text>
              <TouchableOpacity onPress={() => removeRelatedCondition(index)}>
                <Text style={styles.tagRemove}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  field: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333'
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden'
  },
  picker: {
    height: 50
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  tagInput: {
    flex: 1,
    marginRight: 8
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8
  },
  tagText: {
    color: '#fff',
    fontSize: 14,
    marginRight: 6
  },
  tagRemove: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 4
  }
});
