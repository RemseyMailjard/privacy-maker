import { FileText, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle, Clock, X } from 'lucide-react';
import { isImageFile } from '@doccloak/core/dom';
import type { BatchEntry } from '../hooks/useBatchAnonymizer.ts';
import { useTranslation } from '../../i18n/LanguageContext.tsx';

interface BatchFileTabsProps {
  entries: BatchEntry[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
}

function StatusIcon({ status }: { status: BatchEntry['status'] }) {
  switch (status) {
    case 'pending':
      return <Clock className="w-3 h-3 text-[#616161]" />;
    case 'loading':
    case 'detecting':
      return <Loader2 className="w-3 h-3 text-[#0078D4] animate-spin" />;
    case 'done':
      return <CheckCircle2 className="w-3 h-3 text-[#107C10]" />;
    case 'error':
      return <AlertCircle className="w-3 h-3 text-[#D13438]" />;
  }
}

export function BatchFileTabs({ entries, activeIndex, onSelect, onRemove }: BatchFileTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col divide-y divide-[#E1DFDD] border border-[#D1D1D1] bg-[#FFFFFF] max-h-[420px] overflow-y-auto">
      {entries.map((entry, index) => {
        const active = index === activeIndex;
        const isImage = isImageFile(entry.file.name);
        return (
          <button
            key={`${entry.file.name}-${index}`}
            onClick={() => onSelect(index)}
            className={`flex items-center gap-2.5 px-3 py-2.5 text-left cursor-pointer transition-colors ${
              active ? 'bg-[#0078D4]/5' : 'hover:bg-[#F3F2F1]'
            } ${entry.status === 'error' ? 'opacity-70' : ''}`}
          >
            <div className="w-6 h-6 bg-[#F3F2F1] border border-[#E1DFDD] flex items-center justify-center flex-shrink-0">
              {isImage ? <ImageIcon className="w-3 h-3 text-[#616161]" /> : <FileText className="w-3 h-3 text-[#616161]" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-xs truncate ${active ? 'text-[#242424] font-medium' : 'text-[#616161]'}`}>{entry.file.name}</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <StatusIcon status={entry.status} />
                {entry.status === 'pending' && t.batch.statusPending}
                {entry.status === 'loading' && t.batch.statusLoading}
                {entry.status === 'detecting' && t.batch.statusDetecting}
                {entry.status === 'done' && t.batch.statusDone}
                {entry.status === 'error' && (entry.error ?? t.batch.statusError)}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
              }}
              className="text-muted-foreground hover:text-[#D13438] transition-colors cursor-pointer flex-shrink-0"
              title={t.batch.removeFile}
              aria-label={t.batch.removeFile}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </button>
        );
      })}
    </div>
  );
}
