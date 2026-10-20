import { App, ButtonComponent, Modal, Notice } from 'obsidian';
import { parseBackup, type BackupContent } from '../data/backup';
import { getErrorMessage } from '../data/constants';

type FSRSFlashcardsPlugin = import('../plugin/main').FSRSFlashcardsPlugin;

export class ImportBackupModal extends Modal {
    private plugin: FSRSFlashcardsPlugin;
    private content: BackupContent | null = null;

    constructor(app: App, plugin: FSRSFlashcardsPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        this.titleEl.setText('Import review data');
        const intro = this.contentEl.createEl('p', {
            text: 'Choose a Lemma backup or a data.json file. Schedules are merged: a card keeps whichever version was reviewed most recently, and nothing is deleted.',
        });
        intro.addClass('fsrs-import-intro');

        const input = this.contentEl.createEl('input', {
            attr: { type: 'file', accept: '.json,application/json', 'aria-label': 'Backup file' },
        });
        const summary = this.contentEl.createDiv({ cls: 'fsrs-import-summary' });
        const actions = this.contentEl.createDiv({ cls: 'modal-button-container' });
        const importBtn = new ButtonComponent(actions).setButtonText('Import').setCta().setDisabled(true);
        importBtn.onClick(() => { void this.runImport(importBtn); });

        input.addEventListener('change', () => {
            void (async () => {
                this.content = null;
                importBtn.setDisabled(true);
                const file = input.files?.[0];
                if (!file) return;
                try {
                    this.content = parseBackup(await file.text());
                    const cards = Object.keys(this.content.cardData).length;
                    summary.setText(`Found ${cards} card schedules and ${this.content.reviewHistory.length} reviews.`
                        + (this.content.skipped ? ` ${this.content.skipped} invalid entries will be skipped.` : ''));
                    importBtn.setDisabled(cards === 0 && this.content.reviewHistory.length === 0);
                } catch (error: unknown) {
                    summary.setText(getErrorMessage(error));
                }
            })();
        });
    }

    private async runImport(button: ButtonComponent) {
        if (!this.content) return;
        button.setDisabled(true);
        try {
            const result = await this.plugin.dataManager.importBackup(this.content);
            new Notice(`Imported ${result.cards} schedules (${result.matched} match cards in this vault) and ${result.reviews} reviews.`, 8000);
            this.plugin.refreshDashboardView();
            this.close();
        } catch (error: unknown) {
            new Notice(`Import failed: ${getErrorMessage(error)}`, 8000);
            button.setDisabled(false);
        }
    }

    onClose() {
        this.contentEl.empty();
    }
}
