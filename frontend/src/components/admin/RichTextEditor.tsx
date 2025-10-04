/**
 * Rich Text Editor Component
 *
 * WYSIWYG editor for educational content creation.
 * Currently using enhanced TextInput with markdown support.
 * TODO: Upgrade to react-native-pell-rich-editor once dependencies resolved.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform
} from 'react-native';

interface RichTextEditorProps {
  initialContent: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialContent,
  onChange,
  placeholder = 'Enter content here...',
  editable = true
}) => {
  const [content, setContent] = useState(initialContent);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleContentChange = useCallback((text: string) => {
    setContent(text);
    onChange(text);
  }, [onChange]);

  const insertFormatting = useCallback((prefix: string, suffix: string) => {
    const newContent = `${content}${prefix}${suffix}`;
    setContent(newContent);
    onChange(newContent);
  }, [content, onChange]);

  const insertHeading = () => insertFormatting('\n## ', '\n');
  const insertBold = () => {
    setIsBold(!isBold);
    insertFormatting('**', '**');
  };
  const insertItalic = () => {
    setIsItalic(!isItalic);
    insertFormatting('*', '*');
  };
  const insertList = () => insertFormatting('\n- ', '\n');
  const insertNumberedList = () => insertFormatting('\n1. ', '\n');
  const insertLink = () => insertFormatting('[Link Text](', ')');

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      {editable && (
        <View style={styles.toolbar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={insertHeading}
            >
              <Text style={styles.toolbarButtonText}>H</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolbarButton, isBold && styles.toolbarButtonActive]}
              onPress={insertBold}
            >
              <Text style={[styles.toolbarButtonText, styles.bold]}>B</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolbarButton, isItalic && styles.toolbarButtonActive]}
              onPress={insertItalic}
            >
              <Text style={[styles.toolbarButtonText, styles.italic]}>I</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={insertList}
            >
              <Text style={styles.toolbarButtonText}>• List</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={insertNumberedList}
            >
              <Text style={styles.toolbarButtonText}>1. List</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={insertLink}
            >
              <Text style={styles.toolbarButtonText}>Link</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Editor */}
      <TextInput
        style={styles.editor}
        value={content}
        onChangeText={handleContentChange}
        placeholder={placeholder}
        placeholderTextColor="#999"
        multiline
        editable={editable}
        textAlignVertical="top"
        scrollEnabled={true}
      />

      {/* Character count */}
      <View style={styles.footer}>
        <Text style={styles.charCount}>
          {content.length} characters
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden'
  },
  toolbar: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 8,
    paddingHorizontal: 4
  },
  toolbarButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 2,
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  toolbarButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  toolbarButtonText: {
    fontSize: 14,
    color: '#333'
  },
  bold: {
    fontWeight: 'bold'
  },
  italic: {
    fontStyle: 'italic'
  },
  editor: {
    minHeight: 300,
    padding: 12,
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    ...Platform.select({
      ios: {
        paddingTop: 12
      },
      android: {
        textAlignVertical: 'top'
      }
    })
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd'
  },
  charCount: {
    fontSize: 12,
    color: '#666'
  }
});
