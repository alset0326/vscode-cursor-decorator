import * as vscode from 'vscode';
import { transferConfig } from './config';
import { CursorDecorator } from './cursor-decorator';


// Config values
let enabled = false;

// Native plugins
let cursorDecorator: CursorDecorator | null;

// Disposer
let documentChangeListenerDisposer: vscode.Disposable | null;

export function activate(context: vscode.ExtensionContext) {
    vscode.workspace.onDidChangeConfiguration(onDidChangeConfiguration);
    onDidChangeConfiguration();
}

/**
 * create new CursorDecorator instance from vscode.WorkspaceConfiguration
 * register onDidChangeTextDocument
 * @param config 
 */
function init(config: vscode.WorkspaceConfiguration) {
    // Just in case something was left behind, clean it up
    deactivate();

    cursorDecorator = new CursorDecorator();
    cursorDecorator.onDidChangeConfiguration(transferConfig(config));

    documentChangeListenerDisposer = vscode.window.onDidChangeTextEditorSelection(onDidChangeTextEditorSelection);
}

function onDidChangeTextEditorSelection(event: vscode.TextEditorSelectionChangeEvent) {
    if (!enabled) {
        // will this happen?
        return;
    }
    // handle type in function
    cursorDecorator?.onDidChangeTextEditorSelection(event);
}

/**
 * Note: this method is also called automatically
 * when the extension is deactivated
 */
export function deactivate() {
    if (documentChangeListenerDisposer) {
        documentChangeListenerDisposer.dispose();
        documentChangeListenerDisposer = null;
    }

    if (cursorDecorator) {
        cursorDecorator.dispose();
        cursorDecorator = null;
    }
}

/**
 * called when config changed
 */
function onDidChangeConfiguration() {
    const config = vscode.workspace.getConfiguration('cursordecorator');
    const oldEnabled = enabled;
    enabled = config.get<boolean>('enabled', false);

    if (!enabled) {
        // Switching from enabled to disabled
        if (oldEnabled) {
            deactivate();
        }
        // If not enabled, nothing matters
        // because it will be taken care of
        // when it gets reenabled
        return;
    }

    // Switching from disabled to enabled
    if (!oldEnabled && enabled) {
        init(config);
        return;
    }

    // update config
    cursorDecorator?.onDidChangeConfiguration(transferConfig(config))
}

