import { describe, it, expect } from 'vitest';
import { AnonymizationSession } from '@doccloak/core';
import { AnonymizerSessionCore } from '../../src/ui/core/anonymizerSession.ts';

describe('AnonymizerSessionCore batch sharing (standalone: false)', () => {
  it('maps the same original value to the same placeholder across two files sharing one session', () => {
    const shared = new AnonymizationSession();
    const fileA = new AnonymizerSessionCore(shared, { standalone: false });
    const fileB = new AnonymizerSessionCore(shared, { standalone: false });

    fileA.handleInputChange('Jan de Vries werkt bij Acme.');
    fileA.addManualEntity(0, 12, 'PERSON');

    fileB.handleInputChange('Contactpersoon: Jan de Vries.');
    fileB.addManualEntity(16, 28, 'PERSON');

    const placeholderA = shared.getForward('Jan de Vries');
    const placeholderB = shared.getForward('Jan de Vries');
    expect(placeholderA).toBeDefined();
    expect(placeholderA).toBe(placeholderB);
    expect(fileA.anonymizedText).toContain(placeholderA!);
    expect(fileB.anonymizedText).toContain(placeholderA!);
  });

  it('never clears the shared session when a batch file is edited (unlike standalone mode)', () => {
    const shared = new AnonymizationSession();
    const fileA = new AnonymizerSessionCore(shared, { standalone: false });
    const fileB = new AnonymizerSessionCore(shared, { standalone: false });

    fileA.handleInputChange('Jan de Vries belde.');
    fileA.addManualEntity(0, 12, 'PERSON');
    const placeholder = shared.getForward('Jan de Vries');
    expect(placeholder).toBeDefined();

    // Editing file B (toggling an unrelated entity) must not wipe file A's
    // mapping out of the shared session - this is the whole point of batch
    // mode's consistent redaction across documents.
    fileB.handleInputChange('Piet Bakker belde ook.');
    fileB.addManualEntity(0, 11, 'PERSON');
    fileB.toggleEntity(0);

    expect(shared.getForward('Jan de Vries')).toBe(placeholder);
  });

  it('standalone mode (default, single-file) still clears the session on load/clear - unchanged behavior', () => {
    const session = new AnonymizationSession();
    const core = new AnonymizerSessionCore(session);

    core.handleInputChange('Jan de Vries belde.');
    core.addManualEntity(0, 12, 'PERSON');
    expect(session.getForward('Jan de Vries')).toBeDefined();

    // clear() (also loadDocxFile/loadImageFile/loadPdfFile/removeFile) wipes
    // the session in standalone mode, since it exclusively owns it.
    core.clear();
    expect(session.getForward('Jan de Vries')).toBeUndefined();
  });
});
