// @ts-nocheck
export interface DesktopAction {
    action: 'findWindow' | 'clickControl' | 'enterText' | 'assertControlText' | 'screenshot';
    automationId?: string; // e.g., WPF AutomationProperties.AutomationId
    value?: string;
}

/**
 * Defines a UI automation test for Desktop applications (e.g., WPF, WinForms).
 */
export interface DesktopTestDefinition {
    id: string;
    executableName: string;
    windowTitle: string;
    steps: DesktopAction[];
}

