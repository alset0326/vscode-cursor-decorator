import { WorkspaceConfiguration } from 'vscode';
import { Particles } from './particles';

export type GifOrder = 'random' | 'sequential' | number;
export type BackgroundMode = 'mask' | 'image';


export interface DecorationConfig {
    customGifs: string[];
    maxGifs: number;
    gifSize: number;
    gifFrequency: number;
    xOffset: number;
    yOffset: number;
    gifDuration: number;
    gifOrder: GifOrder;
    backgroundMode: BackgroundMode;
    customCss?: { [key: string]: string };
}

const DEFAULT_THEME_CONFIG = Particles;


/**
 * transfer WorkspaceConfiguration to DecorationConfig
 * @param config vscode.workspace.getConfiguration('cursordecorator')
 * @returns DecorationConfig
 */
export function transferConfig(config: WorkspaceConfiguration): DecorationConfig {
    const customGifs = config.get<string[]>('customGifs');
    if (!customGifs || customGifs.length == 0) {
        return DEFAULT_THEME_CONFIG;
    }
    return {
        customGifs,
        maxGifs: config.get<number>('maxGifs'),
        gifSize: config.get<number>('gifSize'),
        gifFrequency: config.get<number>('gifFrequency'),
        xOffset: config.get<number>('xOffset'),
        yOffset: config.get<number>('yOffset'),
        gifOrder: config.get<GifOrder>('gifOrder'),
        gifDuration: config.get<number>('gifDuration'),
        backgroundMode: config.get<BackgroundMode>('backgroundMode'),
        customCss: config.get<any>('customCss'),
    };
}
