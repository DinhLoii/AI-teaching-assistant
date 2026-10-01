// @ts-nocheck
export interface BrowserAction {
    action: 'navigate' | 'click' | 'fill' | 'waitForSelector' | 'assertVisible' | 'screenshot';
    target?: string; // CSS Selector
    value?: string;  // Text input or expected text
    screenshotName?: string;
}

/**
 * Defines a browser automation test for frontend and fullstack assignments.
 */
export interface BrowserTestDefinition {
    id: string;
    name: string;
    startUrl: string;
    steps: BrowserAction[];
}

