import { App, ButtonComponent, Modal, Notice, Setting, normalizePath } from 'obsidian';
import { convertToLemma, type CardImportResult } from '../data/importCards';
import { getErrorMessage } from '../data/constants';

type FSRSFlashcardsPlugin = import('../plugin/main').FSRSFlashcardsPlugin;

export class ImportCardsModal extends Modal {
    private plugin: FSRSFlashcardsPlugin;
    private deckName = 'Imported cards';
    private text = '';

    constructor(app: App, plugin: FSRSFlashcardsPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        this.titleEl.setText('Import cards');
        this.contentEl.createEl('p', {
            text: 'Choose a plain text export from another flashcard app, or a comma or tab separated file. The first column becomes the front and the second the back. Cards start as new; scheduling data is not imported.',
        });

        new Setting(this.contentEl)
            .setName('Deck note name')
            .setDesc('A new note with this name is created in the vault root.')
            .addText((text) => text
                .setValue(this.deckName)
                .onChange((value) => { this.deckName = value; }));

        const input = this.contentEl.createEl('input', {
            attr: { type: 'file', accept: '.txt,.csv,.tsv,text/plain,text/csv', 'aria-label': 'Cards file' },
        });
        const summary = this.contentEl.createDiv({ cls: 'fsrs-import-summary' });
        const actions = this.contentEl.createDiv({ cls: 'modal-button-container' });
        const importBtn = new ButtonComponent(actions).setButtonText('Create deck').setCta().setDisabled(true);

        let preview: CardImportResult | null = null;
        input.addEventListener('change', () => {
            void (async () => {
                preview = null;
                importBtn.setDisabled(true);
                const file = input.files?.[0];
                if (!file) return;
                this.text = await file.text();
                preview = convertToLemma(this.text, this.plugin.settings.deckTag);
                summary.setText(`Found ${preview.cards} cards.` + (preview.skipped ? ` ${preview.skipped} incomplete rows will be skipped.` : ''));
                importBtn.setDisabled(preview.cards === 0);
            })();
        });

        importBtn.onClick(() => {
            void (async () => {
                if (!preview) return;
                importBtn.setDisabled(true);
                try {
                    const base = this.deckName.trim().replace(/[\\/:*?"<>|#^[\]]/g, '') || 'Imported cards';
                    let path = normalizePath(`${base}.md`);
                    for (let n = 2; this.app.vault.getAbstractFileByPath(path); n++) path = normalizePath(`${base} ${n}.md`);
                    const file = await this.app.vault.create(path, preview.markdown);
                    new Notice(`Created ${file.path} with ${preview.cards} cards.`, 8000);
                    this.close();
                } catch (error: unknown) {
                    new Notice(`Import failed: ${getErrorMessage(error)}`, 8000);
                    importBtn.setDisabled(false);
                }
            })();
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}
