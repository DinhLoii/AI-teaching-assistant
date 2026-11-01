// @ts-nocheck
export interface BrowserAction {
    action: 'navigate' | 'reload' | 'click' | 'fill' | 'waitForSelector' | 'assertVisible' | 'assertText' | 'assertValidation' | 'screenshot';
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

