import { useState, useCallback, useReducer } from 'react';
import { AnonymizationSession } from '@doccloak/core';
import { useTranslation } from '../../i18n/LanguageContext.tsx';
import { loadDictionary } from '../dictionary.ts';
import { AnonymizerSessionCore } from '../core/anonymizerSession.ts';

export type BatchEntryStatus = 'pending' | 'loading' | 'detecting' | 'done' | 'error';

export interface BatchEntry {
  file: File;
  core: AnonymizerSessionCore;
  status: BatchEntryStatus;
  error?: string;
}

/**
 * Batch counterpart to useAnonymizer: manages N AnonymizerSessionCore
 * instances that all share one AnonymizationSession, so the same original
 * value (e.g. a name) maps to the same placeholder across every file in the
 * batch. Processing is sequential - the detection engine (src/engine.ts) is
 * one global Worker singleton, so concurrent detect calls would just queue
 * up behind it anyway, and switching providers mid-batch must never happen.
 */
export function useBatchAnonymizer() {
  const { language } = useTranslation();
  const [, forceRender] = useReducer((n: number) => n + 1, 0);
  const [sharedSession] = useState(() => new AnonymizationSession());
  const [entries, setEntries] = useState<BatchEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  const addFiles = useCallback((newFiles: File[]) => {
    setEntries((prev) => [
      ...prev,
      ...newFiles.map((file): BatchEntry => ({
        file,
        core: new AnonymizerSessionCore(sharedSession, { onChange: forceRender, standalone: false }),
        status: 'pending',
      })),
    ]);
  }, [sharedSession]);

  const removeFileAt = useCallback((index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
    setActiveIndex((prev) => (index < prev || (index === prev && prev > 0) ? Math.max(0, prev - 1) : prev));
  }, []);

  const clearBatch = useCallback(() => {
    setEntries([]);
    sharedSession.clear();
    setActiveIndex(0);
    setBatchProgress(null);
  }, [sharedSession]);

  // Sequential: loads + detects one file at a time, skipping already-'done'
  // entries so re-running after adding more files doesn't redo finished work.
  const processAll = useCallback(async () => {
    setProcessing(true);
    const dictionary = loadDictionary();
    const total = entries.length;
    for (let i = 0; i < total; i++) {
      const entry = entries[i];
      if (entry.status === 'done') continue;

      setBatchProgress({ current: i + 1, total });
      entry.status = 'loading';
      forceRender();

      const loadResult = await entry.core.loadFile(entry.file, language);
      if (!loadResult.success) {
        entry.status = 'error';
        entry.error = loadResult.error;
        forceRender();
        continue;
      }

      entry.status = 'detecting';
      forceRender();
      await entry.core.anonymize(dictionary);
      entry.status = entry.core.detectionError ? 'error' : 'done';
      entry.error = entry.core.detectionError ?? undefined;
      forceRender();
    }
    setBatchProgress(null);
    setProcessing(false);
  }, [entries, language]);

  const activeEntry = entries[activeIndex] ?? null;

  return {
    entries,
    activeIndex,
    setActiveIndex,
    activeEntry,
    addFiles,
    removeFileAt,
    clearBatch,
    processAll,
    processing,
    batchProgress,
    sharedSession,
  };
}
