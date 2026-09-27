import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar, ChevronDown, Check } from 'lucide-react-native';
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
  const [showPicker, setShowPicker] = useState(false);

  // Date initiale : si vide, démarrer en 1980 pour faciliter la sélection des adultes
  const getDateObj = (): Date => {
    if (value && value.includes('-')) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (!isNaN(d.getTime())) return d;
      }
    }
    return new Date(1980, 0, 1);
  };

  const [tempDate, setTempDate] = useState<Date>(getDateObj());

  const handleOpen = () => {
    if (disabled) return;
    setTempDate(getDateObj());
    setShowPicker(true);
  };

  const handleNativeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'set' && selectedDate) {
        const yyyy = selectedDate.getFullYear();
        const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const dd = String(selectedDate.getDate()).padStart(2, '0');
        onChange(`${yyyy}-${mm}-${dd}`);
      }
    } else if (Platform.OS === 'ios') {
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleValiderIos = () => {
    const yyyy = tempDate.getFullYear();
    const mm = String(tempDate.getMonth() + 1).padStart(2, '0');
    const dd = String(tempDate.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setShowPicker(false);
  };

  const maxDate = new Date();
  const minDate = new Date(1910, 0, 1);

  return (
    <View style={styles.champWrapper}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={[
          styles.btnSelecteur,
          value ? styles.btnSelecteurRempli : null,
          disabled ? styles.btnDisabled : null,
        ]}
        onPress={handleOpen}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <View style={styles.btnGauche}>
          <Calendar
            size={18}
            color={value ? WiqayatiTokens.colors.primary : WiqayatiTokens.colors.textMuted}
          />
          <Text
            style={[
              styles.btnTexte,
              value ? styles.btnTexteRempli : styles.btnTextePlaceholder,
            ]}
          >
            {value ? formaterDateFr(value) : 'Choisir sur le calendrier…'}
          </Text>
        </View>

        <View style={styles.badgeFormat}>
          <Text style={styles.badgeTexte}>
            {value ? value : 'AAAA-MM-JJ'}
          </Text>
          <ChevronDown size={14} color={WiqayatiTokens.colors.textMuted} />
        </View>
      </TouchableOpacity>

      {/* DatePicker Android */}
      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={getDateObj()}
          mode="date"
          display="calendar"
          maximumDate={maxDate}
          minimumDate={minDate}
          onChange={handleNativeChange}
        />
      )}

      {/* DatePicker iOS en Modal */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitre}>{label}</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.modalAnnuler}>Annuler</Text>
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                maximumDate={maxDate}
                minimumDate={minDate}
                onChange={handleNativeChange}
                style={styles.iosPicker}
              />

              <TouchableOpacity style={styles.btnConfirmerIos} onPress={handleValiderIos}>
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.btnConfirmerIosTexte}>Confirmer la date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  champWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: WiqayatiTokens.colors.textSecondary,
    marginBottom: 6,
  },
  btnSelecteur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: WiqayatiTokens.colors.surface,
    borderWidth: 1.5,
    borderColor: WiqayatiTokens.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  btnSelecteurRempli: {
    borderColor: WiqayatiTokens.colors.primary,
    backgroundColor: '#F8FAFC',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnGauche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  btnTexte: {
    fontSize: 15,
  },
  btnTextePlaceholder: {
    color: WiqayatiTokens.colors.textMuted,
  },
  btnTexteRempli: {
    color: WiqayatiTokens.colors.textPrimary,
    fontWeight: '600',
  },
  badgeFormat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeTexte: {
    fontSize: 12,
    color: WiqayatiTokens.colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitre: {
    fontSize: 17,
    fontWeight: '700',
    color: WiqayatiTokens.colors.textPrimary,
  },
  modalAnnuler: {
    fontSize: 15,
    color: WiqayatiTokens.colors.textMuted,
  },
  iosPicker: {
    height: 180,
  },
  btnConfirmerIos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: WiqayatiTokens.colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 16,
  },
  btnConfirmerIosTexte: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
