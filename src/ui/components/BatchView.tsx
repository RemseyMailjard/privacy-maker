import { useCallback, useRef, useState } from 'react';
import { Upload, Download } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext.tsx';
import { useToast } from './Toast.tsx';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TextInput } from './TextInput.tsx';
import { TextOutput } from './TextOutput.tsx';
import { EntityTable } from './EntityTable.tsx';
import { BatchFileTabs } from './BatchFileTabs.tsx';
import { triggerBlobDownload } from '../downloadBlob.ts';
import type { useBatchAnonymizer } from '../hooks/useBatchAnonymizer.ts';
import type { ReplacementMode } from '@doccloak/core';

interface BatchViewProps {
  batch: ReturnType<typeof useBatchAnonymizer>;
  modelLoaded: boolean;
  replacementMode: ReplacementMode;
}

export function BatchView({ batch, modelLoaded, replacementMode }: BatchViewProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const [downloading, setDownloading] = useState(false);

  const { entries, activeIndex, setActiveIndex, activeEntry, addFiles, removeFileAt, processAll, processing, batchProgress } = batch;

  const handleFilesSelected = useCallback((files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length > 0) addFiles(list);
  }, [addFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFilesSelected(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleFilesSelected]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFilesSelected(e.dataTransfer.files);
  }, [handleFilesSelected]);

  const activeCore = activeEntry?.core ?? null;

  const handleDownload = useCallback(async (kind: 'docx' | 'image' | 'pdf') => {
    if (!activeCore || !activeEntry) return;
    setDownloading(true);
    try {
      const blob = kind === 'docx' ? await activeCore.exportDocx()
        : kind === 'image' ? await activeCore.exportRedactedImage()
        : await activeCore.exportRedactedPdf();
      const name = activeEntry.file.name;
      const ext = kind === 'docx' ? (name.match(/\.(docx?)$/i)?.[1] ?? 'docx') : kind === 'image' ? 'png' : 'pdf';
      const baseName = name.replace(/\.[^.]+$/, '');
      triggerBlobDownload(blob, `${baseName}_redacted.${ext}`);
      showToast(t.textOutput.downloaded);
    } catch (err) {
      console.error('[Privacy Maker] Batch export failed:', err);
      showToast(t.textOutput.exportFailed);
    } finally {
      setDownloading(false);
    }
  }, [activeCore, activeEntry, showToast, t]);

  return (
    <div className="space-y-4">
      {/* Dropzone / add files */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="relative border border-dashed border-[#D1D1D1] hover:border-[#616161] transition-colors px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        {isDragging && (
          <div className="absolute inset-0 z-10 bg-[#FFFFFF]/95 border border-dashed border-[#616161] flex items-center justify-center pointer-events-none">
            <p className="text-sm font-medium text-[#242424]">{t.textInput.dragging}</p>
          </div>
        )}
        <div>
          <p className="text-sm text-[#242424] font-medium">{t.batch.dropzoneTitle}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t.batch.dropzoneSubtitle}</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="pressable flex items-center gap-2 px-3 py-2 border border-[#D1D1D1] bg-[#FFFFFF] text-[#242424] hover:bg-[#0078D4] hover:text-[#FFFFFF] transition-colors cursor-pointer text-xs font-medium shrink-0"
        >
          <Upload className="w-3.5 h-3.5" />
          {t.batch.addFiles}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".doc,.docx,.pdf,.png,.jpg,.jpeg,.webp,.bmp,.gif"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {entries.length === 0 ? (
        <div className="border border-[#E1DFDD] px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">{t.batch.emptyState}</p>
        </div>
      ) : (
        <>
          {/* Process button + progress */}
          <div className="flex items-center justify-between gap-4 border border-[#D1D1D1] bg-[#F3F2F1] px-4 py-3">
            <div className="flex-1">
              {batchProgress && (
                <>
                  <p className="text-xs text-[#242424] font-medium">{t.batch.progressLabel(batchProgress.current, batchProgress.total)}</p>
                  <Progress value={Math.round((batchProgress.current / batchProgress.total) * 100)} className="h-1.5 mt-1.5" />
                </>
              )}
            </div>
            <Button
              onClick={() => void processAll()}
              disabled={!modelLoaded || processing || entries.every((e) => e.status === 'done')}
              variant="solid"
              size="sm"
              className="shrink-0 gap-1.5 text-xs font-semibold"
            >
              {processing ? t.batch.processing : t.batch.processBatch}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
            <BatchFileTabs entries={entries} activeIndex={activeIndex} onSelect={setActiveIndex} onRemove={removeFileAt} />

            {activeCore && activeEntry && (
              activeEntry.status === 'pending' ? (
                <div className="border border-[#E1DFDD] px-4 py-10 text-center">
                  <p className="text-sm text-muted-foreground">{t.batch.statusPending}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-[#D1D1D1] bg-[#FFFFFF]">
                    <div className="md:border-r border-[#D1D1D1] flex flex-col">
                      <TextInput
                        value={activeCore.inputText}
                        onChange={() => {}}
                        onClear={() => {}}
                        entities={activeCore.entities}
                        onAddEntity={(start, end, type) => activeCore.addManualEntity(start, end, type)}
                        onRemoveEntity={(index) => activeCore.removeEntity(index)}
                        fileName={activeCore.fileName}
                        onRemoveFile={() => removeFileAt(activeIndex)}
                      />
                    </div>
                    <div className="border-t md:border-t-0 border-[#D1D1D1] flex flex-col">
                      <TextOutput
                        value={activeCore.anonymizedText}
                        entries={activeCore.entries}
                        loading={activeEntry.status === 'loading' || activeEntry.status === 'detecting'}
                      />
                    </div>
                  </div>

                  {(activeCore.hasDocxExtraction || activeCore.hasImage || activeCore.hasPdf) && activeCore.entries.length > 0 && (
                    <div className="flex items-center justify-end gap-2 border border-[#D1D1D1] bg-[#F3F2F1] px-4 py-2">
                      {activeCore.hasDocxExtraction && (
                        <button onClick={() => handleDownload('docx')} disabled={downloading} className="pressable flex items-center gap-2 px-3 py-1.5 border border-[#D1D1D1] bg-[#FFFFFF] text-[#242424] hover:bg-[#0078D4] hover:text-[#FFFFFF] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium">
                          <Download className="w-3 h-3" />
                          {t.textOutput.downloadDocx}
                        </button>
                      )}
                      {activeCore.hasImage && (
                        <button onClick={() => handleDownload('image')} disabled={downloading} className="pressable flex items-center gap-2 px-3 py-1.5 border border-[#D1D1D1] bg-[#FFFFFF] text-[#242424] hover:bg-[#0078D4] hover:text-[#FFFFFF] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium">
                          <Download className="w-3 h-3" />
                          {t.textOutput.downloadImage}
                        </button>
                      )}
                      {activeCore.hasPdf && (
                        <button onClick={() => handleDownload('pdf')} disabled={downloading} className="pressable flex items-center gap-2 px-3 py-1.5 border border-[#D1D1D1] bg-[#FFFFFF] text-[#242424] hover:bg-[#0078D4] hover:text-[#FFFFFF] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium">
                          <Download className="w-3 h-3" />
                          {t.textOutput.downloadPdf}
                        </button>
                      )}
                    </div>
                  )}

                  {replacementMode === 'labeled' && activeCore.entities.length > 0 && (
                    <EntityTable
                      entities={activeCore.entities}
                      entries={activeCore.entries}
                      excludedIndices={activeCore.excludedIndices}
                      onToggle={(index) => activeCore.toggleEntity(index)}
                      onRenameLabel={(original, newLabel) => activeCore.renameLabel(original, newLabel)}
                    />
                  )}
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
