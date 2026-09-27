import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Calendar } from 'lucide-react-native';
import { WiqayatiTokens } from '../constants/theme';

export interface DatePickerInputProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  label?: string;
  disabled?: boolean;
}

const MOIS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export const formaterDateFr = (isoDate: string): string => {
  if (!isoDate || !isoDate.includes('-')) return isoDate;
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [annee, mois, jour] = parts;
  const mIndex = parseInt(mois, 10) - 1;
  const nomMois = MOIS_FR[mIndex] || mois;
  return `${parseInt(jour, 10)} ${nomMois} ${annee}`;
};

export default function DatePickerInput({
  value,
  onChange,
  label = 'Date de naissance',
  disabled = false,
}: DatePickerInputProps) {
  const maxDate = new Date().toISOString().split('T')[0];
  const minDate = '1910-01-01';

  return (
    <View style={styles.champWrapper}>
      <View style={styles.champIcone}>
        <Calendar size={16} color={WiqayatiTokens.colors.textMuted} />
      </View>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputContainer}>
        {/* Input date HTML5 natif pour le Web */}
        <input
          type="date"
          value={value || ''}
          max={maxDate}
          min={minDate}
          disabled={disabled}
          onChange={(e: any) => onChange(e.target.value)}
          style={{
            width: '100%',
            height: '48px',
            fontSize: '15px',
            fontFamily: 'inherit',
            color: value ? WiqayatiTokens.colors.textPrimary : WiqayatiTokens.colors.textMuted,
            backgroundColor: WiqayatiTokens.colors.surface,
            border: `1.5px solid ${WiqayatiTokens.colors.border}`,
            borderRadius: '10px',
            padding: '0 14px',
            outline: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            boxSizing: 'border-box',
          }}
        />
      </View>

      {value ? (
        <Text style={styles.dateFormatee}>
          📅 {formaterDateFr(value)}
        </Text>
      ) : (
        <Text style={styles.hintTexte}>
          Cliquez sur le calendrier pour sélectionner votre date
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  champWrapper: {
    marginBottom: 16,
    position: 'relative',
  },
  champIcone: {
    position: 'absolute',
    top: 2,
    right: 0,
    zIndex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: WiqayatiTokens.colors.textSecondary,
    marginBottom: 6,
  },
  inputContainer: {
    width: '100%',
  },
  dateFormatee: {
    fontSize: 12,
    color: WiqayatiTokens.colors.primary,
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 2,
  },
  hintTexte: {
    fontSize: 11,
    color: WiqayatiTokens.colors.textMuted,
    marginTop: 4,
    marginLeft: 2,
  },
});
