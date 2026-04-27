import React, { useMemo } from 'react';
import { useCaseStore } from '../store/caseStore';
import { SelectField } from './SelectField';

interface Props {
  value: string | undefined;
  onChange: (caseId: string | undefined) => void;
}

export function EpisodePicker({ value, onChange }: Props) {
  const cases = useCaseStore((s) => s.cases);

  const options = useMemo(() => [
    { id: '', label: 'None — standalone procedure' },
    ...cases
      .slice(0, 100)
      .map((c) => ({ id: c.id, label: `${c.date}  —  ${c.diagnosis}` })),
  ], [cases]);

  return (
    <SelectField
      label="Link to Clinical Episode"
      options={options}
      value={value ?? ''}
      onChange={(v) => onChange(v || undefined)}
      clearable={false}
      placeholder="None — standalone procedure"
    />
  );
}
