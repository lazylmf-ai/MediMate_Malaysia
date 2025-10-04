/**
 * Main Tab Navigator
 * 
 * Bottom tab navigation for authenticated users with
 * culturally-appropriate icons and labels.
 */

import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '@/screens/HomeScreen';
import MedicationsScreen from '@/screens/MedicationsScreen';
import FamilyScreen from '@/screens/FamilyScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import EducationNavigator from './EducationNavigator';
import { useAppSelector } from '@/store/hooks';
import { COLORS } from '@/constants/config';
import type { MainTabParamList } from '@/types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainNavigator() {
  const { profile } = useAppSelector((state) => state.cultural);
  
  // Get culturally appropriate labels
  const getTabLabels = () => {
    const language = profile?.language || 'en';

    switch (language) {
      case 'ms':
        return {
          Home: 'Utama',
          Medications: 'Ubat',
          Education: 'Belajar',
          Family: 'Keluarga',
          Profile: 'Profil',
        };
      case 'zh':
        return {
          Home: '首页',
          Medications: '药物',
          Education: '学习',
          Family: '家庭',
          Profile: '个人资料',
        };
      case 'ta':
        return {
          Home: 'முகப்பு',
          Medications: 'மருந்துகள்',
          Education: 'கற்றல்',
          Family: 'குடும்பம்',
          Profile: 'சுயவிவரம்',
        };
      default:
        return {
          Home: 'Home',
          Medications: 'Medications',
          Education: 'Learn',
          Family: 'Family',
          Profile: 'Profile',
        };
    }
  };

  const labels = getTabLabels();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: '600',
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray[500],
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.gray[200],
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarIconStyle: {
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: labels.Home,
          headerTitle: 'MediMate Malaysia',
          tabBarIcon: ({ focused, color }) => {
            // TODO: Add proper icons in future tasks
            return null;
          },
        }}
      />
      
      <Tab.Screen
        name="Medications"
        component={MedicationsScreen}
        options={{
          title: labels.Medications,
          headerTitle: labels.Medications,
          tabBarIcon: ({ focused, color }) => {
            // TODO: Add proper icons in future tasks
            return null;
          },
        }}
      />

      <Tab.Screen
        name="Education"
        component={EducationNavigator}
        options={{
          title: labels.Education,
          headerTitle: labels.Education,
          headerShown: false,
          tabBarIcon: ({ focused, color }) => {
            // TODO: Add proper icons in future tasks
            return null;
          },
        }}
      />

      <Tab.Screen
        name="Family"
        component={FamilyScreen}
        options={{
          title: labels.Family,
          headerTitle: labels.Family,
          tabBarIcon: ({ focused, color }) => {
            // TODO: Add proper icons in future tasks
            return null;
          },
        }}
      />
      
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: labels.Profile,
          headerTitle: labels.Profile,
          tabBarIcon: ({ focused, color }) => {
            // TODO: Add proper icons in future tasks
            return null;
          },
        }}
      />
    </Tab.Navigator>
  );
}