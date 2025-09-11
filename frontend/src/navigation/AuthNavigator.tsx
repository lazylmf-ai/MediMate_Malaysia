/**
 * Auth Navigator
 * 
 * Navigation stack for unauthenticated users including
 * login, registration, and password reset flows.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '@/screens/LoginScreen';
import RegisterScreen from '@/screens/RegisterScreen';
import { COLORS } from '@/constants/config';
import type { AuthStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerBackTitleVisible: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen}
        options={{
          title: 'Create Account',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={() => {
          // TODO: Implement ForgotPasswordScreen in future tasks
          return null;
        }}
        options={{
          title: 'Reset Password',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="MFAChallenge"
        component={() => {
          // TODO: Implement MFAChallengeScreen in future tasks
          return null;
        }}
        options={{
          title: 'Multi-Factor Authentication',
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
}