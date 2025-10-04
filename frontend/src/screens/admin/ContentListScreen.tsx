/**
 * Content List Screen
 *
 * Displays list of educational content with search, filter, and sort functionality.
 * Allows navigation to content editor for creating/editing content.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
  RefreshControl
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  adminService,
  ContentListItem,
  ContentStatus,
  ContentType,
  ContentSearchParams
} from '@/services/adminService';

interface ContentListScreenProps {
  navigation: any;
}

export const ContentListScreen: React.FC<ContentListScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [content, setContent] = useState<ContentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<ContentStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<ContentType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'updated_at' | 'created_at' | 'view_count'>('updated_at');

  useEffect(() => {
    loadContent(true);
  }, [filterStatus, filterType, sortBy]);

  const loadContent = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      }

      const params: ContentSearchParams = {
        page: reset ? 1 : page,
        limit: 20,
        sortBy,
        sortOrder: 'desc'
      };

      if (searchText.trim()) {
        params.search = searchText.trim();
      }

      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      if (filterType !== 'all') {
        params.type = filterType;
      }

      const response = await adminService.listContent(params);

      if (reset) {
        setContent(response.items);
      } else {
        setContent([...content, ...response.items]);
      }

      setTotal(response.total);
      setHasMore(response.page < response.totalPages);
    } catch (error) {
      Alert.alert('Error', 'Failed to load content list');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadContent(true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage(page + 1);
      loadContent(false);
    }
  };

  const handleSearch = () => {
    loadContent(true);
  };

  const handleCreateNew = () => {
    navigation.navigate('ContentEditor');
  };

  const handleEditContent = (item: ContentListItem) => {
    navigation.navigate('ContentEditor', { contentId: item.id });
  };

  const handleDeleteContent = (item: ContentListItem) => {
    Alert.alert(
      'Delete Content',
      `Are you sure you want to delete "${item.title.en}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteContent(item.id);
              Alert.alert('Success', 'Content deleted successfully');
              loadContent(true);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete content');
            }
          }
        }
      ]
    );
  };

  const renderContentItem = ({ item }: { item: ContentListItem }) => {
    const statusColor = getStatusColor(item.status);
    const statusLabel = item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('_', ' ');

    return (
      <TouchableOpacity
        style={styles.contentItem}
        onPress={() => handleEditContent(item)}
        activeOpacity={0.7}
      >
        <View style={styles.contentHeader}>
          <Text style={styles.contentTitle} numberOfLines={1}>
            {item.title.en || item.title.ms || 'Untitled'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>

        <Text style={styles.contentDescription} numberOfLines={2}>
          {item.description.en || item.description.ms || 'No description'}
        </Text>

        <View style={styles.contentMeta}>
          <Text style={styles.metaText}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </Text>
          <Text style={styles.metaSeparator}>•</Text>
          <Text style={styles.metaText}>
            {item.category}
          </Text>
          <Text style={styles.metaSeparator}>•</Text>
          <Text style={styles.metaText}>
            {item.view_count} views
          </Text>
          <Text style={styles.metaSeparator}>•</Text>
          <Text style={styles.metaText}>
            v{item.version}
          </Text>
        </View>

        <View style={styles.contentFooter}>
          <Text style={styles.dateText}>
            Updated {new Date(item.updated_at).toLocaleDateString()}
          </Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteContent(item)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const getStatusColor = (status: ContentStatus): string => {
    switch (status) {
      case 'draft':
        return '#FF9500';
      case 'in_review':
        return '#FFCC00';
      case 'approved':
        return '#34C759';
      case 'published':
        return '#007AFF';
      case 'archived':
        return '#8E8E93';
      default:
        return '#666';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Content Management</Text>
        <Text style={styles.headerSubtitle}>{total} total items</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search content..."
          placeholderTextColor="#999"
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filterStatus}
                onValueChange={(value) => setFilterStatus(value as ContentStatus | 'all')}
                style={styles.picker}
              >
                <Picker.Item label="All" value="all" />
                <Picker.Item label="Draft" value="draft" />
                <Picker.Item label="In Review" value="in_review" />
                <Picker.Item label="Approved" value="approved" />
                <Picker.Item label="Published" value="published" />
                <Picker.Item label="Archived" value="archived" />
              </Picker>
            </View>
          </View>

          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filterType}
                onValueChange={(value) => setFilterType(value as ContentType | 'all')}
                style={styles.picker}
              >
                <Picker.Item label="All" value="all" />
                <Picker.Item label="Article" value="article" />
                <Picker.Item label="Video" value="video" />
                <Picker.Item label="Quiz" value="quiz" />
                <Picker.Item label="Interactive" value="interactive" />
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Sort By</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={sortBy}
              onValueChange={(value) => setSortBy(value as any)}
              style={styles.picker}
            >
              <Picker.Item label="Recently Updated" value="updated_at" />
              <Picker.Item label="Recently Created" value="created_at" />
              <Picker.Item label="Most Viewed" value="view_count" />
            </Picker>
          </View>
        </View>
      </View>

      {/* Content List */}
      {loading && content.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading content...</Text>
        </View>
      ) : content.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No content found</Text>
          <Text style={styles.emptySubtext}>Create your first educational content</Text>
        </View>
      ) : (
        <FlatList
          data={content}
          renderItem={renderContentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && content.length > 0 ? (
              <ActivityIndicator size="small" color="#007AFF" style={styles.footerLoader} />
            ) : null
          }
        />
      )}

      {/* Create Button */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateNew}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginRight: 8
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center'
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 12
  },
  filterItem: {
    flex: 1,
    marginHorizontal: 4
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden'
  },
  picker: {
    height: 40
  },
  listContent: {
    padding: 16
  },
  contentItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  contentTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginRight: 8
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  contentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20
  },
  contentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  metaText: {
    fontSize: 12,
    color: '#999'
  },
  metaSeparator: {
    fontSize: 12,
    color: '#ddd',
    marginHorizontal: 6
  },
  contentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  dateText: {
    fontSize: 12,
    color: '#999'
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999'
  },
  footerLoader: {
    marginVertical: 20
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300'
  }
});
