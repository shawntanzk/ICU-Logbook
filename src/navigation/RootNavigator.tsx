import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, FONT_SIZE } from '../utils/constants';
import { useAuthStore } from '../store/authStore';
import {
  TabParamList,
  CasesStackParamList,
  ProceduresStackParamList,
  DashboardStackParamList,
  RootStackParamList,
  SettingsStackParamList,
} from './types';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { FirstRunSetupScreen } from '../screens/FirstRunSetupScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { CompetencyScreen } from '../screens/CompetencyScreen';
import { CaseListScreen } from '../screens/CaseListScreen';
import { CaseDetailScreen } from '../screens/CaseDetailScreen';
import { AddCaseScreen } from '../screens/AddCaseScreen';
import { ProcedureListScreen } from '../screens/ProcedureListScreen';
import { AddProcedureScreen } from '../screens/AddProcedureScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ConsentScreen } from '../screens/ConsentScreen';
import { ExportScreen } from '../screens/ExportScreen';
import { AdminPanelScreen } from '../screens/AdminPanelScreen';

const Root = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
const CasesStack = createNativeStackNavigator<CasesStackParamList>();
const ProceduresStack = createNativeStackNavigator<ProceduresStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

const stackScreenOptions = {
  headerStyle: { backgroundColor: COLORS.primary },
  headerTintColor: COLORS.white,
  headerTitleStyle: { fontWeight: '600' as const, fontSize: FONT_SIZE.md },
};

function DashboardNavigator() {
  return (
    <DashboardStack.Navigator screenOptions={stackScreenOptions}>
      <DashboardStack.Screen name="DashboardHome" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <DashboardStack.Screen name="Competency" component={CompetencyScreen} options={{ title: 'Competency Map' }} />
    </DashboardStack.Navigator>
  );
}

function CasesNavigator() {
  return (
    <CasesStack.Navigator screenOptions={stackScreenOptions}>
      <CasesStack.Screen name="CaseList" component={CaseListScreen} options={{ title: 'Case Log' }} />
      <CasesStack.Screen name="CaseDetail" component={CaseDetailScreen} options={{ title: 'Case Details' }} />
    </CasesStack.Navigator>
  );
}

function SettingsNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={stackScreenOptions}>
      <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} options={{ title: 'Settings' }} />
      <SettingsStack.Screen name="Consent" component={ConsentScreen} options={{ title: 'Data Sharing' }} />
      <SettingsStack.Screen name="Export" component={ExportScreen} options={{ title: 'Export Data' }} />
      <SettingsStack.Screen name="AdminPanel" component={AdminPanelScreen} options={{ title: 'Admin Panel' }} />
    </SettingsStack.Navigator>
  );
}

function ProceduresNavigator() {
  return (
    <ProceduresStack.Navigator screenOptions={stackScreenOptions}>
      <ProceduresStack.Screen name="ProcedureList" component={ProcedureListScreen} options={{ title: 'Procedures' }} />
      <ProceduresStack.Screen name="AddProcedure" component={AddProcedureScreen} options={{ title: 'Log Procedure' }} />
    </ProceduresStack.Navigator>
  );
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];
interface TabConfig { route: keyof TabParamList; icon: IconName; activeIcon: IconName }

const TAB_CONFIG: TabConfig[] = [
  { route: 'Dashboard', icon: 'grid-outline', activeIcon: 'grid' },
  { route: 'Cases', icon: 'document-text-outline', activeIcon: 'document-text' },
  { route: 'AddCase', icon: 'add-circle-outline', activeIcon: 'add-circle' },
  { route: 'Procedures', icon: 'medkit-outline', activeIcon: 'medkit' },
  { route: 'Settings', icon: 'settings-outline', activeIcon: 'settings' },
];

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const config = TAB_CONFIG.find((t) => t.route === route.name)!;
        return {
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarStyle: { backgroundColor: COLORS.white, borderTopColor: COLORS.border, paddingBottom: 4 },
          tabBarLabelStyle: { fontSize: FONT_SIZE.xs, fontWeight: '500' },
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? config.activeIcon : config.icon} size={size} color={color} />
          ),
        };
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardNavigator} options={{ tabBarLabel: 'Dashboard' }} />
      <Tab.Screen name="Cases" component={CasesNavigator} options={{ tabBarLabel: 'Cases' }} />
      <Tab.Screen
        name="AddCase"
        component={AddCaseScreen}
        options={{
          tabBarLabel: 'Add Case',
          headerShown: true,
          headerTitle: 'Log New Case',
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: COLORS.white,
          headerTitleStyle: { fontWeight: '600', fontSize: FONT_SIZE.md },
        }}
      />
      <Tab.Screen name="Procedures" component={ProceduresNavigator} options={{ tabBarLabel: 'Procedures' }} />
      <Tab.Screen name="Settings" component={SettingsNavigator} options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { isLoggedIn, needsInitialSetup } = useAuthStore();

  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {isLoggedIn ? (
          <Root.Screen name="Main" component={MainTabs} />
        ) : needsInitialSetup ? (
          <Root.Screen name="Setup" component={FirstRunSetupScreen} />
        ) : (
          <Root.Screen name="Login" component={LoginScreen} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}
