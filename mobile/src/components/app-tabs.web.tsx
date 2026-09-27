/**
 * Navigation par onglets — version Web — Wiqayati Citoyen
 * Barre de navigation horizontale en haut de l'écran.
 */
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, useColorScheme, View, StyleSheet, Text } from 'react-native';
import {
  FolderOpen,
  ClipboardList,
  Search,
  Bell,
  HeartPulse,
} from 'lucide-react-native';

import { Colors, Spacing } from '@/constants/theme';

type TabIconType = 'DOSSIER' | 'PLAN' | 'AUTOEVAL' | 'NOTIF';

const ONGLETS: { nom: string; href: string; libelle: string; iconType: TabIconType }[] = [
  { nom: 'index',        href: '/',              libelle: 'Dossier',    iconType: 'DOSSIER' },
  { nom: 'plan',         href: '/plan',          libelle: 'Mon Plan',   iconType: 'PLAN' },
  { nom: 'autoeval',     href: '/autoeval',      libelle: 'Évaluation', iconType: 'AUTOEVAL' },
  { nom: 'notifications',href: '/notifications', libelle: 'Alertes',    iconType: 'NOTIF' },
];

function renderTabIcon(type: TabIconType, isFocused?: boolean) {
  const color = isFocused ? '#2563eb' : '#64748b';
  const size = 15;
  switch (type) {
    case 'DOSSIER':
      return <FolderOpen size={size} color={color} />;
    case 'PLAN':
      return <ClipboardList size={size} color={color} />;
    case 'AUTOEVAL':
      return <Search size={size} color={color} />;
    case 'NOTIF':
      return <Bell size={size} color={color} />;
  }
}

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <BarreNavigation>
          {ONGLETS.map((onglet) => (
            <TabTrigger key={onglet.nom} name={onglet.nom} href={onglet.href as any} asChild>
              <BoutonOnglet iconType={onglet.iconType}>{onglet.libelle}</BoutonOnglet>
            </TabTrigger>
          ))}
        </BarreNavigation>
      </TabList>
    </Tabs>
  );
}

function BoutonOnglet({ children, isFocused, iconType, ...props }: TabTriggerSlotProps & { iconType?: TabIconType }) {
  return (
    <Pressable {...(props as any)} style={({ pressed }) => [styles.pressable, pressed && { opacity: 0.7 }]}>
      <View style={[styles.ongletView, isFocused && styles.ongletActif]}>
        {iconType && renderTabIcon(iconType, isFocused)}
        <Text style={[styles.ongletTexte, isFocused && styles.ongletTexteActif]}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

function BarreNavigation(props: TabListProps) {
  return (
    <View {...props} style={styles.barreContainer}>
      <View style={styles.barreInterieure}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <HeartPulse size={18} color="#0f2c59" />
          <Text style={styles.brandTexte}>Wiqayati</Text>
        </View>
        <View style={styles.ongletGroupe}>
          {props.children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barreContainer: {
    position: 'absolute',
    top: 0,
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    zIndex: 100,
  } as any,
  barreInterieure: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 900,
    paddingHorizontal: 16,
  },
  brandTexte: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f2c59',
  },
  ongletGroupe: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  pressable: {},
  ongletView: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },
  ongletActif: {
    backgroundColor: '#eff6ff',
  },
  emoji: { fontSize: 14 },
  ongletTexte: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  ongletTexteActif: {
    color: '#2563eb',
    fontWeight: '800',
  },
});
