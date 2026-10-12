import { App, Modal, Setting, Notice, TFile } from 'obsidian';
import { generateBlockId } from '../data/constants';

type FSRSFlashcardsPlugin = import('../plugin/main').FSRSFlashcardsPlugin;

type CardTypeOption = 'basic' | 'single' | 'reversed' | 'cloze' | 'occlusion' | 'typein';

export class CreateCardModal extends Modal {
    private plugin: FSRSFlashcardsPlugin;
    private cardType: CardTypeOption = 'basic';
    private frontText = '';
    private backText = '';
    private clozeText = '';
    private targetFile: TFile | null = null;
    private previewEl: HTMLElement | null = null;

    constructor(app: App, plugin: FSRSFlashcardsPlugin, defaultFile?: TFile) {
        super(app);
        this.plugin = plugin;
        this.targetFile = defaultFile || this.app.workspace.getActiveFile() || null;
    }

    onOpen() {
        this.titleEl.setText('Create flashcard');
        this.modalEl.addClass('fsrs-create-card-modal');
        this.renderForm();

        this.scope.register(['Mod'], 'Enter', () => void this.handleInsert());
    }

    onClose() {
        this.contentEl.empty();
    }

    private renderForm() {
        this.contentEl.empty();
        const container = this.contentEl.createDiv({ cls: 'fsrs-create-card-container' });

        const markdownFiles = this.app.vault.getMarkdownFiles();
        if (!this.targetFile && markdownFiles.length > 0) {
            this.targetFile = markdownFiles[0];
        }

        new Setting(container)
            .setName('Deck note')
            .setDesc('Note where this flashcard will be stored')
            .addDropdown(dd => {
                for (const f of markdownFiles) {
                    dd.addOption(f.path, f.basename);
                }
                if (this.targetFile) {
                    dd.setValue(this.targetFile.path);
                }
                dd.onChange(path => {
                    const found = this.app.vault.getAbstractFileByPath(path);
                    if (found instanceof TFile) {
                        this.targetFile = found;
                    }
                });
            });

        new Setting(container)
            .setName('Card type')
            .setDesc('Format and review behavior')
            .addDropdown(dd => {
                dd.addOption('basic', 'Basic (multi-line question & answer)');
                dd.addOption('single', 'Single-line (q::a)');
                dd.addOption('reversed', 'Reversed (q:::a two-way recall)');
                dd.addOption('cloze', 'Cloze deletion (fill-in-the-blank)');
                dd.addOption('occlusion', 'Image occlusion (in-place diagram swap)');
                dd.addOption('typein', 'Type-in answer (active recall typing)');
                dd.setValue(this.cardType);
                dd.onChange(val => {
                    this.cardType = val as CardTypeOption;
                    this.renderForm();
                });
            });

        const inputsSection = container.createDiv({ cls: 'fsrs-card-inputs-section' });

        if (this.cardType === 'cloze') {
            new Setting(inputsSection)
                .setName('Cloze sentence')
                .setDesc('Use ==c1::text== syntax to wrap words you want to hide')
                .addTextArea(ta => {
                    ta.setPlaceholder('E.g. The ==c1::mitochondria== is the powerhouse of the ==c2::cell==.')
                        .setValue(this.clozeText)
                        .onChange(val => {
                            this.clozeText = val;
                            this.updatePreview();
                        });
                    ta.inputEl.rows = 4;
                    ta.inputEl.addClass('fsrs-modal-textarea');
                });
        } else if (this.cardType === 'occlusion') {
            new Setting(inputsSection)
                .setName('Occluded diagram (question)')
                .setDesc('Wiki-link or markdown embed to masked image')
                .addText(text => {
                    text.setPlaceholder('![[diagram-masked.png]]')
                        .setValue(this.frontText)
                        .onChange(val => {
                            this.frontText = val;
                            this.updatePreview();
                        });
                    text.inputEl.addClass('fsrs-modal-input-wide');
                });

            new Setting(inputsSection)
                .setName('Revealed diagram (answer)')
                .setDesc('Wiki-link or markdown embed to unmasked image')
                .addText(text => {
                    text.setPlaceholder('![[diagram-unmasked.png]]')
                        .setValue(this.backText)
                        .onChange(val => {
                            this.backText = val;
                            this.updatePreview();
                        });
                    text.inputEl.addClass('fsrs-modal-input-wide');
                });
        } else {
            const isSingle = this.cardType === 'single' || this.cardType === 'reversed';
            new Setting(inputsSection)
                .setName('Front / question')
                .setDesc('Prompt shown during review')
                .addTextArea(ta => {
                    ta.setPlaceholder('Enter question or prompt...')
                        .setValue(this.frontText)
                        .onChange(val => {
                            this.frontText = val;
                            this.updatePreview();
                        });
                    ta.inputEl.rows = isSingle ? 2 : 4;
                    ta.inputEl.addClass('fsrs-modal-textarea');
                });

            new Setting(inputsSection)
                .setName('Back / answer')
                .setDesc('Solution revealed on review')
                .addTextArea(ta => {
                    ta.setPlaceholder('Enter answer or explanation...')
                        .setValue(this.backText)
                        .onChange(val => {
                            this.backText = val;
                            this.updatePreview();
                        });
                    ta.inputEl.rows = isSingle ? 2 : 4;
                    ta.inputEl.addClass('fsrs-modal-textarea');
                });
        }

        const previewContainer = container.createDiv({ cls: 'fsrs-card-preview-container' });
        previewContainer.createDiv({ text: 'Markdown preview', cls: 'fsrs-preview-heading' });
        this.previewEl = previewContainer.createEl('pre', { cls: 'fsrs-card-preview-code' });
        this.updatePreview();

        new Setting(container)
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => this.close()))
            .addButton(btn => btn
                .setButtonText('Insert card')
                .setCta()
                .onClick(() => void this.handleInsert()));
    }

    private generateCardMarkdown(): string {
        const blockId = generateBlockId();

        if (this.cardType === 'cloze') {
            const clean = this.clozeText.trim() || 'Sentence with ==c1::cloze==.';
            return `\n${clean} ^${blockId}\n`;
        }

        if (this.cardType === 'occlusion') {
            const q = this.frontText.trim() || '![[diagram-question.png]]';
            const a = this.backText.trim() || '![[diagram-answer.png]]';
            return `\n${q}::${a} ^${blockId}\n`;
        }

        if (this.cardType === 'single') {
            const q = this.frontText.trim().replace(/\n+/g, ' ') || 'Question';
            const a = this.backText.trim().replace(/\n+/g, ' ') || 'Answer';
            return `\n${q}::${a} ^${blockId}\n`;
        }

        if (this.cardType === 'reversed') {
            const q = this.frontText.trim().replace(/\n+/g, ' ') || 'Question';
            const a = this.backText.trim().replace(/\n+/g, ' ') || 'Answer';
            return `\n${q}:::${a} ^${blockId}\n`;
        }

        if (this.cardType === 'typein') {
            const q = this.frontText.trim() || 'Question';
            const a = this.backText.trim() || 'Answer';
            return `\n---card--- ?type ^${blockId}\n${q}\n---\n${a}\n`;
        }

        const q = this.frontText.trim() || 'Question';
        const a = this.backText.trim() || 'Answer';
        return `\n---card--- ^${blockId}\n${q}\n---\n${a}\n`;
    }

    private updatePreview() {
        if (!this.previewEl) return;
        this.previewEl.setText(this.generateCardMarkdown().trim());
    }

    private async handleInsert() {
        if (!this.targetFile) {
            new Notice('Please select a target note.');
            return;
        }

        if (this.cardType === 'cloze' && !this.clozeText.trim()) {
            new Notice('Please enter a cloze sentence.');
            return;
        }

        if (this.cardType !== 'cloze' && (!this.frontText.trim() || !this.backText.trim())) {
            new Notice('Please fill in both question and answer.');
            return;
        }

        const cardMarkdown = this.generateCardMarkdown();

        await this.plugin.dataManager.ensureDeckTag(this.targetFile);

        const activeFile = this.app.workspace.getActiveFile();
        const activeEditor = this.app.workspace.activeEditor?.editor;

        if (activeFile && activeFile.path === this.targetFile.path && activeEditor) {
            const cursor = activeEditor.getCursor();
            activeEditor.replaceRange(`\n${cardMarkdown}\n`, cursor);
        } else {
            const existing = await this.app.vault.read(this.targetFile);
            await this.app.vault.modify(this.targetFile, `${existing.trimEnd()}\n\n${cardMarkdown}\n`);
        }

        new Notice(`Card added to ${this.targetFile.basename}`);
        this.close();
        this.plugin.refreshDashboardView();
    }
}
