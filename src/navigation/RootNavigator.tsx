import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NetworkBanner } from '../components/NetworkBanner';

import { COLORS, FONT_SIZE } from '../utils/constants';
import { useAuthStore } from '../store/authStore';
import { useGuestStore } from '../store/guestStore';
import { useTermsStore, TERMS_VERSION } from '../store/termsStore';
import {
  TabParamList,
  CasesStackParamList,
  ProceduresStackParamList,
  DashboardStackParamList,
  LogStackParamList,
  RootStackParamList,
  SettingsStackParamList,
} from './types';

// ── Screens ──────────────────────────────────────────────────────────────────
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { CompleteRegistrationScreen } from '../screens/CompleteRegistrationScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { CompetencyScreen } from '../screens/CompetencyScreen';
import { CaseListScreen } from '../screens/CaseListScreen';
import { CaseDetailScreen } from '../screens/CaseDetailScreen';
import { AddCaseScreen } from '../screens/AddCaseScreen';
import { EditCaseScreen } from '../screens/EditCaseScreen';
import { ProcedureListScreen } from '../screens/ProcedureListScreen';
import { AddProcedureScreen } from '../screens/AddProcedureScreen';
import { EditProcedureScreen } from '../screens/EditProcedureScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ConsentScreen } from '../screens/ConsentScreen';
import { ExportScreen } from '../screens/ExportScreen';
import { AdminPanelScreen } from '../screens/AdminPanelScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { ConflictsScreen } from '../screens/ConflictsScreen';
import { TermsScreen } from '../screens/TermsScreen';

// New log entry screens
import { LogHubScreen } from '../screens/LogHubScreen';
import { AddWardReviewScreen } from '../screens/AddWardReviewScreen';
import { AddTransferScreen } from '../screens/AddTransferScreen';
import { AddEDScreen } from '../screens/AddEDScreen';
import { AddMedicinePlacementScreen } from '../screens/AddMedicinePlacementScreen';
import { AddAirwayScreen } from '../screens/AddAirwayScreen';
import { AddArterialLineScreen } from '../screens/AddArterialLineScreen';
import { AddCVCScreen } from '../screens/AddCVCScreen';
import { AddUSSScreen } from '../screens/AddUSSScreen';
import { AddRegionalBlockScreen } from '../screens/AddRegionalBlockScreen';

const Root = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
const CasesStack = createNativeStackNavigator<CasesStackParamList>();
const ProceduresStack = createNativeStackNavigator<ProceduresStackParamList>();
const LogStack = createNativeStackNavigator<LogStackParamList>();
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
      <CasesStack.Screen
        name="CaseList"
        component={CaseListScreen}
        options={({ navigation }) => ({
          title: 'Case Log',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('AddCase')}
              style={{ marginRight: 8, padding: 4 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add" size={26} color={COLORS.white} />
            </TouchableOpacity>
          ),
        })}
      />
      <CasesStack.Screen name="CaseDetail" component={CaseDetailScreen} options={{ title: 'Case Details' }} />
      <CasesStack.Screen name="EditCase" component={EditCaseScreen} options={{ title: 'Edit Case' }} />
      <CasesStack.Screen name="AddCase" component={AddCaseScreen} options={{ title: 'New Case' }} />
    </CasesStack.Navigator>
  );
}

function LogNavigator() {
  return (
    <LogStack.Navigator screenOptions={stackScreenOptions}>
      <LogStack.Screen name="LogHub" component={LogHubScreen} options={{ title: 'Log Entry' }} />
      {/* Clinical episodes */}
      <LogStack.Screen name="AddCase" component={AddCaseScreen} options={{ title: 'ICU / HDU Case' }} />
      <LogStack.Screen name="AddWardReview" component={AddWardReviewScreen} options={{ title: 'Ward Review' }} />
      <LogStack.Screen name="AddTransfer" component={AddTransferScreen} options={{ title: 'Transfer' }} />
      <LogStack.Screen name="AddED" component={AddEDScreen} options={{ title: 'ED Attendance' }} />
      <LogStack.Screen name="AddMedicinePlacement" component={AddMedicinePlacementScreen} options={{ title: 'Medicine Placement' }} />
      {/* Procedure sub-entries */}
      <LogStack.Screen name="AddAirway" component={AddAirwayScreen} options={{ title: 'Airway Management' }} />
      <LogStack.Screen name="AddArterialLine" component={AddArterialLineScreen} options={{ title: 'Arterial Line' }} />
      <LogStack.Screen name="AddCVC" component={AddCVCScreen} options={{ title: 'Central Venous Catheter' }} />
      <LogStack.Screen name="AddUSS" component={AddUSSScreen} options={{ title: 'Ultrasound Study' }} />
      <LogStack.Screen name="AddRegionalBlock" component={AddRegionalBlockScreen} options={{ title: 'Regional Block' }} />
    </LogStack.Navigator>
  );
}

function SettingsNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={stackScreenOptions}>
      <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} options={{ title: 'Settings' }} />
      <SettingsStack.Screen name="Consent" component={ConsentScreen} options={{ title: 'Data Sharing' }} />
      <SettingsStack.Screen name="Export" component={ExportScreen} options={{ title: 'Export Data' }} />
      <SettingsStack.Screen name="AdminPanel" component={AdminPanelScreen} options={{ title: 'Admin Panel' }} />
      <SettingsStack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
      <SettingsStack.Screen name="Conflicts" component={ConflictsScreen} options={{ title: 'Sync Conflicts' }} />
    </SettingsStack.Navigator>
  );
}

function ProceduresNavigator() {
  return (
    <ProceduresStack.Navigator screenOptions={stackScreenOptions}>
      <ProceduresStack.Screen name="ProcedureList" component={ProcedureListScreen} options={{ title: 'Procedures' }} />
      <ProceduresStack.Screen name="AddProcedure" component={AddProcedureScreen} options={{ title: 'Log Procedure' }} />
      <ProceduresStack.Screen name="EditProcedure" component={EditProcedureScreen} options={{ title: 'Edit Procedure' }} />
    </ProceduresStack.Navigator>
  );
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];
interface TabConfig { route: keyof TabParamList; icon: IconName; activeIcon: IconName }

const TAB_CONFIG: TabConfig[] = [
  { route: 'Dashboard',  icon: 'grid-outline',          activeIcon: 'grid' },
  { route: 'Cases',      icon: 'document-text-outline', activeIcon: 'document-text' },
  { route: 'Log',        icon: 'add-circle-outline',    activeIcon: 'add-circle' },
  { route: 'Procedures', icon: 'medkit-outline',        activeIcon: 'medkit' },
  { route: 'Settings',   icon: 'settings-outline',      activeIcon: 'settings' },
];

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const config = TAB_CONFIG.find((t) => t.route === route.name)!;
        return {
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarStyle: {
            backgroundColor: COLORS.white,
            borderTopColor: COLORS.border,
            paddingLeft: Math.max(insets.left, 8),
            paddingRight: Math.max(insets.right, 8),
            paddingBottom: insets.bottom > 0 ? insets.bottom : 4,
            height: 56 + (insets.bottom > 0 ? insets.bottom : 0),
          },
          tabBarLabelStyle: { fontSize: FONT_SIZE.xs, fontWeight: '500' },
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? config.activeIcon : config.icon} size={size} color={color} />
          ),
        };
      }}
    >
      <Tab.Screen name="Dashboard"  component={DashboardNavigator}  options={{ tabBarLabel: 'Dashboard' }} />
      <Tab.Screen name="Cases"      component={CasesNavigator}      options={{ tabBarLabel: 'Cases' }} />
      <Tab.Screen name="Log"        component={LogNavigator}        options={{ tabBarLabel: 'Log' }} />
      <Tab.Screen name="Procedures" component={ProceduresNavigator} options={{ tabBarLabel: 'Procedures' }} />
      <Tab.Screen name="Settings"   component={SettingsNavigator}   options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { isLoggedIn, profileComplete } = useAuthStore();
  const { isGuest } = useGuestStore();
  const acceptedVersion = useTermsStore((s) => s.acceptedVersion);
  const termsAccepted = acceptedVersion === TERMS_VERSION;

  return (
    <NavigationContainer>
      <View style={{ flex: 1 }}>
        <Root.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
          {!isLoggedIn && !isGuest ? (
            // ── Unauthenticated: Login + Register reachable from each other ──
            <>
              <Root.Screen name="Login" component={LoginScreen} />
              <Root.Screen name="Register" component={RegisterScreen} />
            </>
          ) : !isGuest && !termsAccepted ? (
            // ── Terms gate (skipped for guests — data stays on-device) ──────
            <Root.Screen name="Terms" component={TermsScreen} />
          ) : !isGuest && !profileComplete ? (
            // ── Profile completion gate (Google OAuth / incomplete signup) ──
            <Root.Screen name="CompleteRegistration" component={CompleteRegistrationScreen} />
          ) : (
            // ── Main app (fully authenticated OR offline guest) ────────────
            <Root.Screen name="Main" component={MainTabs} />
          )}
        </Root.Navigator>
        <NetworkBanner />
      </View>
    </NavigationContainer>
  );
}
