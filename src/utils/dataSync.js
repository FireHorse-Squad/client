const EVENT_NAME = 'app:dataChanged';

export function dispatchDataChange(source) {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { source, timestamp: Date.now() } }));
    }
}

export function onDataChange(callback) {
    if (typeof window === 'undefined') return () => {};

    const handler = (e) => callback(e.detail);
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
}
