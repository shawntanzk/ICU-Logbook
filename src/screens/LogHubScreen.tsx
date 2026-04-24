import React from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZE, SPACING, RADIUS } from '../utils/constants';
import type { LogStackProps } from '../navigation/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface LogType {
  route: keyof import('../navigation/types').LogStackParamList;
  icon: IconName;
  color: string;
  title: string;
  subtitle: string;
  group: string;
}

const LOG_TYPES: LogType[] = [
  // ── Clinical episodes
  {
    route: 'AddCase',
    icon: 'bed-outline',
    color: COLORS.primary,
    title: 'ICU / HDU Case',
    subtitle: 'Patient episode with diagnosis, procedures & outcome',
    group: 'Clinical Episodes',
  },
  {
    route: 'AddWardReview',
    icon: 'clipboard-outline',
    color: '#6366F1',
    title: 'Ward Review',
    subtitle: 'Review of at-risk patient on general ward',
    group: 'Clinical Episodes',
  },
  {
    route: 'AddTransfer',
    icon: 'car-outline',
    color: '#F59E0B',
    title: 'Transfer',
    subtitle: 'Inter- or intra-hospital critical care transfer',
    group: 'Clinical Episodes',
  },
  {
    route: 'AddED',
    icon: 'flash-outline',
    color: '#EF4444',
    title: 'ED Attendance',
    subtitle: 'Emergency department critical care involvement',
    group: 'Clinical Episodes',
  },
  {
    route: 'AddMedicinePlacement',
    icon: 'medkit-outline',
    color: '#22C55E',
    title: 'Medicine Placement',
    subtitle: 'Out-of-ICU specialty placement',
    group: 'Clinical Episodes',
  },
  // ── Airway & access
  {
    route: 'AddAirway',
    icon: 'thermometer-outline',
    color: '#0891B2',
    title: 'Airway Management',
    subtitle: 'RSI, intubation, DAE, tracheostomy',
    group: 'Procedures',
  },
  {
    route: 'AddArterialLine',
    icon: 'pulse-outline',
    color: '#E11D48',
    title: 'Arterial Line',
    subtitle: 'Arterial catheter insertion by site',
    group: 'Procedures',
  },
  {
    route: 'AddCVC',
    icon: 'git-network-outline',
    color: '#7C3AED',
    title: 'Central Venous Catheter',
    subtitle: 'CVC / vascath insertion by site',
    group: 'Procedures',
  },
  {
    route: 'AddUSS',
    icon: 'radio-outline',
    color: '#0F766E',
    title: 'Ultrasound Study',
    subtitle: 'POCUS — FICE, FAST, AAA, pleural, DVT …',
    group: 'Procedures',
  },
  {
    route: 'AddRegionalBlock',
    icon: 'body-outline',
    color: '#D97706',
    title: 'Regional Block',
    subtitle: 'Nerve block from 45-item catalogue',
    group: 'Procedures',
  },
];

const GROUPS = ['Clinical Episodes', 'Procedures'];

export function LogHubScreen({ navigation }: LogStackProps<'LogHub'>) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>What would you like to log?</Text>

        {GROUPS.map((group) => (
          <View key={group}>
            <Text style={styles.groupLabel}>{group}</Text>
            {LOG_TYPES.filter((lt) => lt.group === group).map((lt) => (
              <TouchableOpacity
                key={lt.route}
                style={styles.card}
                onPress={() => navigation.navigate(lt.route as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.iconBox, { backgroundColor: lt.color + '18' }]}>
                  <Ionicons name={lt.icon} size={26} color={lt.color} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{lt.title}</Text>
                  <Text style={styles.cardSub}>{lt.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  heading: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  groupLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text },
  cardSub: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
});
