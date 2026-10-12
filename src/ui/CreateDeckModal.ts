import { App, Modal, Setting, Notice } from 'obsidian';

type FSRSFlashcardsPlugin = import('../plugin/main').FSRSFlashcardsPlugin;

export class CreateDeckModal extends Modal {
    private plugin: FSRSFlashcardsPlugin;
    private deckName = '';
    private folderPath = '';

    constructor(app: App, plugin: FSRSFlashcardsPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        this.titleEl.setText('Create new deck');
        const container = this.contentEl.createDiv({ cls: 'fsrs-create-deck-container' });

        new Setting(container)
            .setName('Deck title')
            .setDesc('Title of the deck note to create')
            .addText(text => text
                .setPlaceholder('E.g. Neuroscience 101')
                .onChange(val => {
                    this.deckName = val.trim();
                }));

        new Setting(container)
            .setName('Folder (optional)')
            .setDesc('Leave blank to place at vault root')
            .addText(text => text
                .setPlaceholder('E.g. Flashcards or study/decks')
                .onChange(val => {
                    this.folderPath = val.trim();
                }));

        new Setting(container)
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => this.close()))
            .addButton(btn => btn
                .setButtonText('Create deck')
                .setCta()
                .onClick(() => void this.handleCreate()));

        this.scope.register([], 'Enter', () => void this.handleCreate());
    }

    onClose() {
        this.contentEl.empty();
    }

    private async handleCreate() {
        if (!this.deckName) {
            new Notice('Please enter a deck title.');
            return;
        }

        const cleanName = this.deckName.replace(/[\\/:*?"<>|]/g, '-');
        let fullPath = cleanName.endsWith('.md') ? cleanName : `${cleanName}.md`;

        if (this.folderPath) {
            const cleanFolder = this.folderPath.replace(/^\/+|\/+$/g, '');
            if (!this.app.vault.getAbstractFileByPath(cleanFolder)) {
                await this.app.vault.createFolder(cleanFolder);
            }
            fullPath = `${cleanFolder}/${fullPath}`;
        }

        const existing = this.app.vault.getAbstractFileByPath(fullPath);
        if (existing) {
            new Notice(`A file already exists at ${fullPath}`);
            return;
        }

        const deckTagName = this.plugin.settings.deckTag.replace(/^#/, '');
        const initialContent = `---\ntags:\n  - ${deckTagName}\n---\n\n# ${this.deckName}\n\n`;

        const newFile = await this.app.vault.create(fullPath, initialContent);
        this.close();

        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(newFile);
        new Notice(`Deck created: ${this.deckName}`);
        this.plugin.refreshDashboardView();
    }
}
