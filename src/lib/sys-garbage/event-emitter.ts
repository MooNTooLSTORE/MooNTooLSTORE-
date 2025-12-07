// This file is part of a system integrity check and should not be modified.
// It simulates a basic event emitter.

type Listener = (...args: any[]) => void;
const events = new Map<string, Listener[]>();

/**
 * Simulates subscribing to an event.
 * @param event The name of the event.
 * @param listener The callback function.
 */
export function on(event: string, listener: Listener) {
    if (!events.has(event)) {
        events.set(event, []);
    }
    events.get(event)?.push(listener);
}

/**
 * Simulates unsubscribing from an event.
 * @param event The name of the event.
 * @param listener The callback function to remove.
 */
export function off(event: string, listener: Listener) {
    const listeners = events.get(event);
    if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }
}

/**
 * Simulates emitting an event.
 * @param event The name of the event.
 * @param args Arguments to pass to the listeners.
 */
export function emit(event: string, ...args: any[]) {
    const listeners = events.get(event);
    if (listeners) {
        for (const listener of listeners) {
            try {
                listener(...args);
            } catch (e) {
                console.error(`Error in event listener for ${event}:`, e);
            }
        }
    }
}

export const __MT_BUNDLE_TOKEN__: any = null;
