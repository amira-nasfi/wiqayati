/**
 * Navigation par onglets — Wiqayati Citoyen
 * v2 : Onglet Suivi ajouté (remplace explore démo), ordre optimisé.
 * Note (C1) : L'onglet Suivi est TOUJOURS visible — le contenu s'adapte
 * selon que le plan est validé ou non (cacher dynamiquement un NativeTabs
 * est fragile et non recommandé par expo-router).
 */
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

const ONGLETS = [
  { nom: 'index',         libelle: 'Dossier',    icone: require('@/assets/images/tabIcons/home.png') },
  { nom: 'plan',          libelle: 'Mon Plan',   icone: require('@/assets/images/tabIcons/explore.png') },
  { nom: 'autoeval',      libelle: 'Évaluation', icone: require('@/assets/images/tabIcons/explore.png') },
  { nom: 'suivi',         libelle: 'Suivi',      icone: require('@/assets/images/tabIcons/home.png') },
  { nom: 'notifications', libelle: 'Alertes',    icone: require('@/assets/images/tabIcons/home.png') },
];

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
    >
      {ONGLETS.map((onglet) => (
        <NativeTabs.Trigger key={onglet.nom} name={onglet.nom}>
          <NativeTabs.Trigger.Label>{onglet.libelle}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={onglet.icone} renderingMode="template" />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
