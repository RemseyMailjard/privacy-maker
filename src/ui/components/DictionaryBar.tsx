import { useState } from 'react';
import { Plus, X, BookMarked } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext.tsx';
import type { DictionaryEntry } from '../dictionary.ts';

interface DictionaryBarProps {
  dictionary: DictionaryEntry[];
  onChange: (entries: DictionaryEntry[]) => void;
}

// Always-visible strip attached under the document panels: the dictionary is
// a detection input, so it lives with the documents, on the way to the Redact
// button - not in a collapsed section below the results.
export function DictionaryBar({ dictionary, onChange }: DictionaryBarProps) {
  const { t } = useTranslation();
  const [word, setWord] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);

  const addWord = () => {
    const trimmed = word.trim();
    if (!trimmed) return;
    const duplicate = dictionary.some((e) =>
      e.caseSensitive === caseSensitive &&
      (caseSensitive ? e.word === trimmed : e.word.toLowerCase() === trimmed.toLowerCase()),
    );
    if (!duplicate) {
      onChange([...dictionary, { word: trimmed, caseSensitive }]);
    }
    setWord('');
  };

  const removeWord = (index: number) => {
    onChange(dictionary.filter((_, i) => i !== index));
  };

  return (
    <div className="border border-t-0 border-[#D1D1D1] bg-[#F3F2F1]">
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-8 px-4 py-3">
        <div className="shrink-0">
          <div className="flex items-center gap-2">
            <BookMarked className="w-3.5 h-3.5 text-[#242424]" strokeWidth={1.5} />
            <span className="label-meta text-[#242424]">{t.dictionary.title}</span>
          </div>
          <p className="text-[11px] text-[#616161] mt-0.5 leading-snug">{t.dictionary.description}</p>
        </div>

        {/* Segmented input group: field, match-case toggle, and Add share hairlines */}
        <div className="flex items-stretch w-full md:w-auto">
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addWord(); }}
            placeholder={t.dictionary.placeholder}
            aria-label={t.dictionary.title}
            className="relative flex-1 min-w-0 md:flex-initial md:w-52 text-xs px-3 py-2 rounded-l-md border border-[#D1D1D1] bg-[#FFFFFF] text-[#242424] font-mono placeholder:text-[#6B6960] focus:outline-none focus:border-[#0078D4] focus:z-10"
          />
          <button
            type="button"
            onClick={() => setCaseSensitive(!caseSensitive)}
            aria-pressed={caseSensitive}
            aria-label={t.dictionary.caseSensitive}
            title={t.dictionary.caseSensitive}
            className={`pressable -ml-px px-2.5 border text-[11px] font-mono cursor-pointer transition-colors ${
              caseSensitive
                ? 'z-10 bg-[#0078D4] text-[#FFFFFF] border-[#D1D1D1]'
                : 'bg-[#FFFFFF] text-[#616161] border-[#D1D1D1] hover:text-[#242424]'
            }`}
          >
            Aa
          </button>
          <button
            onClick={addWord}
            disabled={!word.trim()}
            className="pressable -ml-px text-xs px-3.5 py-2 rounded-r-md bg-[#0078D4] text-[#FFFFFF] border border-[#0078D4] hover:bg-[#106EBE] transition-colors disabled:bg-[#E1DFDD] disabled:text-[#8A887F] disabled:border-[#D1D1D1] disabled:cursor-not-allowed cursor-pointer font-medium flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3 h-3" />
            {t.dictionary.add}
          </button>
        </div>
      </div>

      {dictionary.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {dictionary.map((entry, index) => (
            <span
              key={`${entry.word}-${entry.caseSensitive}`}
              className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-[#0078D4] text-[#FFFFFF] font-mono"
            >
              {entry.word}
              {entry.caseSensitive && (
                <span
                  className="text-[9px] px-1 py-px rounded-sm border border-[#FFFFFF]/40 text-[#FFFFFF]/80 leading-none"
                  title={t.dictionary.matchesCase}
                  aria-label={t.dictionary.matchesCase}
                >
                  Aa
                </span>
              )}
              <button
                onClick={() => removeWord(index)}
                className="text-[#FFFFFF]/60 hover:text-[#FFFFFF] transition-colors cursor-pointer"
                aria-label={`${t.dictionary.removeWord}: ${entry.word}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
