import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../utils/constants';
import { ICD10Entry, searchICD10, findByCode } from '../data/icd10';

interface Props {
  label: string;
  required?: boolean;
  // Stored value — ICD-10 code only (e.g. "A41.9"). Empty string when cleared.
  value: string;
  onChange: (code: string) => void;
  error?: string;
  hint?: string;
}

// Autocomplete that displays "<label> [<code>]" in the suggestion list and
// in the input after selection, but writes only the code up to `onChange`.
// This keeps the on-disk schema unchanged (icd10Code is still just the code).
export function ICD10Autocomplete({
  label,
  required,
  value,
  onChange,
  error,
  hint,
}: Props) {
  // What the user has typed. Initialise from the saved code (if any) so the
  // field re-hydrates cleanly when editing.
  const initial = useMemo(() => {
    const entry = findByCode(value);
    return entry ? formatEntry(entry) : value;
  }, [value]);

  const [query, setQuery] = useState(initial);
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    if (!focused) return [];
    return searchICD10(query, 20);
  }, [query, focused]);

  function handleSelect(entry: ICD10Entry) {
    setQuery(formatEntry(entry));
    onChange(entry.code);
    setFocused(false);
  }

  function handleChangeText(text: string) {
    setQuery(text);
    // Keep the model in sync — extract a code if the typed text matches one
    // exactly; otherwise clear until the user picks a suggestion.
    const exact = findByCode(stripCode(text));
    onChange(exact ? exact.code : '');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholder="Search by code or diagnosis (e.g. sepsis or A41)"
        placeholderTextColor={COLORS.textMuted}
        value={query}
        onChangeText={handleChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          // Defer so a tap on a suggestion can register before the list hides
          setTimeout(() => setFocused(false), 150);
        }}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      {focused && suggestions.length > 0 ? (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.option}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionText} numberOfLines={2}>
                  {item.label} <Text style={styles.optionCode}>[{item.code}]</Text>
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function formatEntry(entry: ICD10Entry): string {
  return `${entry.label} [${entry.code}]`;
}

// Pull a code out of a "label [CODE]" string, if present; otherwise return the
// raw trimmed input so the caller can try a direct code lookup.
function stripCode(text: string): string {
  const match = text.match(/\[([^\]]+)\]\s*$/);
  return (match ? match[1] : text).trim();
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md, zIndex: 10 },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  required: { color: COLORS.error },
  hint: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: SPACING.xs },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    backgroundColor: COLORS.white,
    minHeight: 48,
  },
  inputError: { borderColor: COLORS.error },
  dropdown: {
    marginTop: SPACING.xs,
    maxHeight: 240,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  option: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  optionText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
  },
  optionCode: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  error: { fontSize: FONT_SIZE.xs, color: COLORS.error, marginTop: SPACING.xs },
});
