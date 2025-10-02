/**
 * Education Stack Navigator
 *
 * Stack navigation for education hub with:
 * - EducationHome: Main hub screen
 * - ContentDetail: Full content viewer
 * - ContentSearch: Search screen
 * - CategoryBrowse: Category-filtered content
 *
 * Includes deep linking configuration for content/:id
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import EducationHomeScreen from '@/screens/education/EducationHomeScreen';
import ContentDetailScreen from '@/screens/education/ContentDetailScreen';
import ContentSearchScreen from '@/screens/education/ContentSearchScreen';
import CategoryBrowseScreen from '@/screens/education/CategoryBrowseScreen';
import DownloadManagerScreen from '@/screens/education/DownloadManagerScreen';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import type { EducationStackParamList } from '@/types/navigation';

const Stack = createStackNavigator<EducationStackParamList>();

export default function EducationNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="EducationHome"
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: TYPOGRAPHY.fontWeights.semibold,
          fontSize: TYPOGRAPHY.fontSizes.lg,
        },
        headerBackTitleVisible: false,
        cardStyle: {
          backgroundColor: COLORS.gray[50],
        },
      }}
    >
      <Stack.Screen
        name="EducationHome"
        component={EducationHomeScreen}
        options={{
          title: 'Education Hub',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="ContentDetail"
        component={ContentDetailScreen}
        options={{
          title: 'Learn',
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="ContentSearch"
        component={ContentSearchScreen}
        options={{
          title: 'Search',
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="CategoryBrowse"
        component={CategoryBrowseScreen}
        options={({ route }) => ({
          title: route.params.category || 'Browse',
          headerShown: true,
        })}
      />

      <Stack.Screen
        name="DownloadManager"
        component={DownloadManagerScreen}
        options={{
          title: 'Downloads',
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
}
