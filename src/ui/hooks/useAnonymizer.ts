import { useState, useCallback, useReducer, useEffect } from 'react';
import type { EntityType, ReplacementMode } from '@doccloak/core';
import { preloadModel, onDownloadProgress, setDetectionThreshold, getDetectionThreshold, getCustomLabels, setCustomLabels, switchProvider as engineSwitchProvider, getActiveProviderId, isRegexEnabled, setRegexEnabled, getRegexRegion, setRegexRegionSetting } from '../../engine.ts';
import type { RegexRegionId } from '@doccloak/core';
import type { ProviderId } from '@doccloak/core';
import { AnonymizationSession } from '@doccloak/core';
import { useTranslation } from '../../i18n/LanguageContext.tsx';
import { loadDictionary, saveDictionary } from '../dictionary.ts';
import type { DictionaryEntry } from '../dictionary.ts';
import { AnonymizerSessionCore } from '../core/anonymizerSession.ts';

export function useAnonymizer() {
  const { language } = useTranslation();
  // AnonymizerSessionCore holds document-scoped state as plain fields
  // (instead of useState) so it can also be instantiated N times for batch
  // processing, where hooks-in-a-loop isn't possible. `forceRender` re-renders
  // this component whenever the core notifies a change.
  const [, forceRender] = useReducer((n: number) => n + 1, 0);
  const [core] = useState(() => new AnonymizerSessionCore(new AnonymizationSession(), { onChange: forceRender }));

  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  // First-visit gate: the ~46 MB model download starts only after the user accepts.
  // Once accepted, later visits load (from cache) without asking again.
  const [modelConsented, setModelConsented] = useState(
    () => localStorage.getItem('doccloak-model-consented') === '1',
  );
  const [modelError, setModelError] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ downloaded: number; total: number } | null>(null);
  const [threshold, setThreshold] = useState(getDetectionThreshold());
  const [replacementMode, setReplacementModeState] = useState<ReplacementMode>('labeled');
  const [customLabels, setCustomLabelsState] = useState<string[]>(getCustomLabels());
  const [activeProvider, setActiveProvider] = useState<ProviderId>(getActiveProviderId());
  const [regexRules, setRegexRulesState] = useState(isRegexEnabled());
  const [regexRegion, setRegexRegionState] = useState<RegexRegionId>(getRegexRegion());
  const [dictionary, setDictionaryState] = useState<DictionaryEntry[]>(loadDictionary);

  // Load (or retry loading) the detection model with progress tracking
  const startModelLoad = useCallback(() => {
    setModelLoading(true);
    setModelError(false);

    onDownloadProgress((downloaded, total) => {
      setDownloadProgress({ downloaded, total });
    });

    preloadModel()
      .then(() => {
        setModelLoaded(true);
        setModelLoading(false);
        setDownloadProgress(null);
        setCustomLabelsState(getCustomLabels());
      })
      .catch((err) => {
        console.error('Model loading failed:', err);
        setModelLoading(false);
        setModelError(true);
        setDownloadProgress(null);
      });
  }, []);

  // Preload detection model in the background on mount, but only after the
  // user has accepted the first-time download.
  useEffect(() => {
    if (modelConsented) startModelLoad();
  }, [modelConsented, startModelLoad]);

  // First-visit accept: persist the choice and start the download immediately.
  const acceptModelDownload = useCallback(() => {
    localStorage.setItem('doccloak-model-consented', '1');
    setModelConsented(true);
  }, []);

  const handleDictionaryChange = useCallback((entries: DictionaryEntry[]) => {
    saveDictionary(entries);
    setDictionaryState(entries);
  }, []);

  const handleInputChange = useCallback((text: string) => core.handleInputChange(text), [core]);

  const anonymize = useCallback(() => {
    void core.anonymize(dictionary);
  }, [core, dictionary]);

  const addManualEntity = useCallback(
    (start: number, end: number, type: EntityType) => core.addManualEntity(start, end, type),
    [core]
  );

  const removeEntity = useCallback((index: number) => core.removeEntity(index), [core]);

  const toggleEntity = useCallback((index: number) => core.toggleEntity(index), [core]);

  const deanonymize = useCallback((aiResponse: string): string => core.deanonymize(aiResponse), [core]);

  const renameLabel = useCallback((original: string, newLabel: string) => core.renameLabel(original, newLabel), [core]);

  const handleThresholdChange = useCallback((value: number) => {
    setThreshold(value);
    setDetectionThreshold(value);
  }, []);

  const handleCustomLabelsChange = useCallback((labels: string[]) => {
    setCustomLabels(labels);
    setCustomLabelsState(labels);
  }, []);

  const handleRegexChange = useCallback((enabled: boolean) => {
    setRegexRulesState(enabled);
    setRegexEnabled(enabled);
  }, []);

  const handleRegexRegionChange = useCallback((region: RegexRegionId) => {
    setRegexRegionState(region);
    setRegexRegionSetting(region);
  }, []);

  const handleSwitchProvider = useCallback(async (id: ProviderId) => {
    if (id === activeProvider) return;
    setModelLoading(true);
    setModelLoaded(false);
    setModelError(false);
    setDownloadProgress(null);
    try {
      await engineSwitchProvider(id, (downloaded, total) => {
        setDownloadProgress({ downloaded, total });
      });
      setActiveProvider(id);
      setModelLoaded(true);
      setModelLoading(false);
      setDownloadProgress(null);
      setCustomLabelsState(getCustomLabels());
      setThreshold(getDetectionThreshold());
    } catch (err) {
      console.error('Model switch failed:', err);
      setModelLoading(false);
      setModelError(true);
      setDownloadProgress(null);
    }
  }, [activeProvider]);

  const handleReplacementModeChange = useCallback((mode: ReplacementMode) => {
    setReplacementModeState(mode);
    core.setReplacementMode(mode);
  }, [core]);

  const loadFile = useCallback((file: File) => core.loadFile(file, language), [core, language]);

  const exportDocx = useCallback(() => core.exportDocx(), [core]);
  const exportRedactedImage = useCallback(() => core.exportRedactedImage(), [core]);
  const exportRedactedPdf = useCallback(() => core.exportRedactedPdf(), [core]);

  const removeFile = useCallback(() => core.removeFile(), [core]);

  const clear = useCallback(() => core.clear(), [core]);

  return {
    inputText: core.inputText,
    anonymizedText: core.anonymizedText,
    entities: core.entities,
    entries: core.entries,
    excludedIndices: core.excludedIndices,
    modelLoaded,
    modelLoading,
    modelError,
    anonymizing: core.anonymizing,
    detectionProgress: core.detectionProgress,
    detectionError: core.detectionError,
    downloadProgress,
    threshold,
    replacementMode,
    customLabels,
    docxFileName: core.docxFileName,
    imageFileName: core.imageFileName,
    pdfFileName: core.pdfFileName,
    fileName: core.fileName,
    hasDocxExtraction: core.hasDocxExtraction,
    hasImage: core.hasImage,
    hasPdf: core.hasPdf,
    ocrProgress: core.ocrProgress,
    pdfLoading: core.pdfLoading,
    handleInputChange,
    anonymize,
    addManualEntity,
    removeEntity,
    renameLabel,
    toggleEntity,
    deanonymize,
    clear,
    handleThresholdChange,
    handleReplacementModeChange,
    handleCustomLabelsChange,
    activeProvider,
    handleSwitchProvider,
    regexRules,
    handleRegexChange,
    regexRegion,
    handleRegexRegionChange,
    dictionary,
    handleDictionaryChange,
    loadFile,
    exportDocx,
    exportRedactedImage,
    exportRedactedPdf,
    removeFile,
    retryModelLoad: startModelLoad,
    modelConsented,
    acceptModelDownload,
  };
}
