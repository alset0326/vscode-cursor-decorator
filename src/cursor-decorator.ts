import * as vscode from 'vscode';
import { DecorationConfig } from './config';
import { Queue } from './queue'


/**
 * only focus on how to popup gif, not to think about theme or something
 */
export class CursorDecorator {
    private config: DecorationConfig;
    private activeDecorations: Queue<vscode.TextEditorDecorationType>;
    private keystrokeCounter: number;
    private gifIndex: number;
    private cssCache: { [key: string]: string };  // used to store css string

    constructor() { }

    activate = () => {
        this.initialize();
    }

    dispose = () => {
        // Dispose all 
        if (this.activeDecorations) {
            while (!this.activeDecorations.empty()) {
                this.activeDecorations.dequeue().dispose();
            }
            delete this.activeDecorations;
        }
        delete this.cssCache;
    }

    public onDidChangeConfiguration = (newConfig: DecorationConfig) => {
        // before init, the config is null
        if (this.config) {
            let changed = false;
            Object.keys(newConfig).forEach(key => {
                if (this.config[key] !== newConfig[key]) {
                    changed = true;
                }
            });
            if (!changed) {
                return;
            }
        }

        this.config = newConfig;
        this.initialize();
    }

    public initialize = () => {
        // we should dispose first
        this.dispose();

        this.activeDecorations = new Queue(this.config.maxGifs)
        this.gifIndex = 0;
        this.keystrokeCounter = 0;
        this.cssCache = {}
    }


    /**
     * called when editor selection changed
     */
    public onDidChangeTextEditorSelection = (event: vscode.TextEditorSelectionChangeEvent): void => {
        // kind==1 type in, kind==2 mouse click, undefined change panel/delete/enter/...
        if (!event.kind) {
            return;
        }

        if (++this.keystrokeCounter < this.config.gifFrequency) {
            return;
        }
        this.keystrokeCounter = 0;

        // check the selection valid, is this needed?
        const selection = event.selections[0];
        if (!selection) {
            return;
        }

        // console.log(selection.anchor, selection.active, selection.start, selection.end)
        // selection.active is where the current cursor is
        const cursorPosition = selection.active;
        const targetPosition = new vscode.Position(cursorPosition.line, Math.max(0, cursorPosition.character - 1));
        const newRange = new vscode.Range(targetPosition, targetPosition);

        // Dispose excess gifs
        while (this.activeDecorations.size() >= this.config.maxGifs) {
            this.activeDecorations.dequeue().dispose();
        }

        // A new decoration is used each time because otherwise adjacent
        // gifs will all be identical. This helps them be at least a little
        // offset.
        const decoration = this.getGifDecoration();
        if (!decoration) {
            return;
        }

        this.activeDecorations.enqueue(decoration);

        if (this.config.gifDuration !== 0) {
            setTimeout(() => {
                decoration.dispose();
            }, this.config.gifDuration);
        }
        event.textEditor.setDecorations(decoration, [newRange]);
    }

    private getGifDecoration = (): vscode.TextEditorDecorationType => {
        const gifs = this.config.customGifs;
        const gif = this.pickGif(gifs);

        if (!gif) {
            return null;
        }

        return vscode.window.createTextEditorDecorationType(<vscode.DecorationRenderOptions>{
            before: {
                contentText: '',
                textDecoration: this.getOrCreateCss(gif),
            },
            textDecoration: `none; position: relative;`,
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
        });;
    }

    private pickGif(gifs: string[]): string {
        if (!gifs || gifs.length === 0) {
            return null;
        } else if (gifs.length === 1) {
            return gifs[0];
        }
        switch (typeof this.config.gifOrder) {
            case 'string':
                switch (this.config.gifOrder) {
                    case 'random':
                        this.gifIndex = getRandomInt(0, gifs.length);
                        break;
                    case 'sequential':
                        this.gifIndex = (this.gifIndex + 1) % gifs.length;
                        break;
                    default:
                        this.gifIndex = 0;
                }
                break;
            case 'number':
                this.gifIndex = Math.min(gifs.length - 1, Math.floor(Math.abs(this.config.gifOrder as number)));
            default:
                break;
        }
        return gifs[this.gifIndex];
    }
    /**
     * get or generate css decoration string
     */
    private getOrCreateCss(gif: string): string {
        // search cache first
        let css = this.cssCache[gif];
        if (css) {
            return css;
        }
        const uri = vscode.Uri.parse(gif, false);
        if (uri.scheme === 'file') {
            // we use promise to handle file
            this.cssCache[gif] = '';  // we only want read file once
            vscode.workspace.fs.readFile(uri)
                .then(data => {
                    const b64 = Buffer.from(data).toString('base64');
                    const gifUrl = 'data:image/gif;base64,' + b64;
                    this.cssCache[gif] = this.createCss(gifUrl);
                },
                    reason => {
                        const msg = reason.message || `try to read file ${gif} err`;
                        vscode.window.showErrorMessage(msg);
                        // delete it so it can be read again
                        delete this.cssCache[gif];
                    });
            return '';
        }

        css = this.createCss(gif);
        this.cssCache[gif] = css;
        return css;
    }

    /**
     * create a new css string, not store to the cache
     * @param gifUrl gif base64 or url that can used in url()
     * @returns css string
     */
    private createCss(gifUrl: string): string {
        // subtract 1 ch to account for the character and divide by two to make it centered
        // Use Math.floor to skew to the right which especially helps when deleting chars
        const leftValue = this.config.xOffset;
        // By default, the top of the gif will be at the top of the text.
        // Setting the top to a negative value will raise it up.
        // The default gifs are "tall" and the bottom halves are empty.
        // Lowering them makes them appear in a more natural position,
        // but limiting the top to the line number keeps it from going
        // off the top of the editor
        const topValue = this.config.yOffset;

        const backgroundCss = this.config.backgroundMode === 'mask' ?
            this.getMaskCssSettings(gifUrl) :
            this.getBackgroundCssSettings(gifUrl);

        const defaultCss = {
            position: 'absolute',
            ["margin-left"]: `${leftValue}ch`,
            top: `-${topValue}rem`,
            width: `${this.config.gifSize}ch`,
            height: `${this.config.gifSize}rem`,
            display: `inline-block`,
            ['z-index']: 1,
            ['pointer-events']: 'none',
        };

        const backgroundCssString = this.objectToCssString(backgroundCss);
        const defaultCssString = this.objectToCssString(defaultCss);
        const customCssString = this.objectToCssString(this.config.customCss || {});

        return `none; ${defaultCssString} ${backgroundCssString} ${customCssString}`;
    }

    private getBackgroundCssSettings(gif: string) {
        return {
            'background-repeat': 'no-repeat',
            'background-size': 'contain',
            'background-image': `url("${gif}")`,
        }
    }

    private getMaskCssSettings(gif: string): any {
        return {
            'background-color': 'currentColor',
            '-webkit-mask-repeat': 'no-repeat',
            '-webkit-mask-size': 'contain',
            '-webkit-mask-image': `url("${gif}")`,
            filter: 'saturate(150%)',
        }
    }

    private objectToCssString(settings: any): string {
        let value = '';
        const cssString = Object.keys(settings).map(setting => {
            value = settings[setting];
            if (typeof value === 'string' || typeof value === 'number') {
                return `${setting}: ${value};`
            }
        }).join(' ');

        return cssString;
    }

}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}
