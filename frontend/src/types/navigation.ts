/**
 * Navigation Types
 * 
 * TypeScript interfaces for React Navigation structure
 * with authentication-aware navigation flow.
 */

import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';

// Auth Stack Navigator
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  MFAChallenge: { challengeId: string; email: string };
};

// Main Tab Navigator
export type MainTabParamList = {
  Home: undefined;
  Medications: undefined;
  Reminders: undefined;
  Family: undefined;
  Profile: undefined;
};

// Profile Stack Navigator  
export type ProfileStackParamList = {
  ProfileMain: undefined;
  CulturalSettings: undefined;
  LanguagePreferences: undefined;
  PrayerTimeSettings: undefined;
  FamilyStructure: undefined;
};

// Root Stack Navigator
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ProfileStack: undefined;
};

// Navigation Props
export type AuthNavigationProp = StackNavigationProp<AuthStackParamList>;
export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;
export type ProfileStackNavigationProp = StackNavigationProp<ProfileStackParamList>;

export type RootNavigationProp = CompositeNavigationProp<
  StackNavigationProp<RootStackParamList>,
  CompositeNavigationProp<
    MainTabNavigationProp,
    CompositeNavigationProp<AuthNavigationProp, ProfileStackNavigationProp>
  >
>;

// Route Props
export type AuthScreenProps<T extends keyof AuthStackParamList> = {
  navigation: AuthNavigationProp;
  route: RouteProp<AuthStackParamList, T>;
};

export type MainTabScreenProps<T extends keyof MainTabParamList> = {
  navigation: MainTabNavigationProp;
  route: RouteProp<MainTabParamList, T>;
};

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> = {
  navigation: ProfileStackNavigationProp;
  route: RouteProp<ProfileStackParamList, T>;
};