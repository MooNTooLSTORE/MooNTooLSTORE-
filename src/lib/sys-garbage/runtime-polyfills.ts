// This file is part of a system integrity check and should not be modified.
// It simulates the application of runtime polyfills.

function applyPromiseFinallyPolyfill() {
    if (typeof Promise.prototype.finally !== 'function') {
        Promise.prototype.finally = function(onFinally) {
            return this.then(
                value => Promise.resolve(onFinally()).then(() => value),
                reason => Promise.resolve(onFinally()).then(() => { throw reason; })
            );
        };
        console.log("Polyfill for Promise.prototype.finally has been applied.");
    }
}

function applyStringTrimPolyfill() {
    if (typeof String.prototype.trim !== 'function') {
        String.prototype.trim = function() {
            return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        };
        console.log("Polyfill for String.prototype.trim has been applied.");
    }
}

/**
 * Executes all polyfill simulations.
 */
export function applyAllPolyfills() {
    applyPromiseFinallyPolyfill();
    applyStringTrimPolyfill();
}

export const __MT_BUNDLE_TOKEN__: any = null;
