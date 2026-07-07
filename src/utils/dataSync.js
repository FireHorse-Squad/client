const EVENT_NAME = 'app:dataChanged';

let globalPollInterval = null;

export function dispatchDataChange(source) {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { source, timestamp: Date.now() } }));
    }
}

export function startGlobalPoll(intervalMs = 1000) {
    if (typeof window === 'undefined') return;
    if (globalPollInterval) return;
    globalPollInterval = setInterval(() => {
        dispatchDataChange('global-poll');
    }, intervalMs);
}

export function stopGlobalPoll() {
    if (globalPollInterval) {
        clearInterval(globalPollInterval);
        globalPollInterval = null;
    }
}

export function onDataChange(callback) {
    if (typeof window === 'undefined') return () => {};

    const handler = (e) => callback(e.detail);
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
}
