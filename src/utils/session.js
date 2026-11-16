const DEFAULT_THRESHOLD = 8 * 60 * 60 * 1000;
const DEFAULT_CHECK_INTERVAL = 60 * 1000;

let lastActivity = Date.now();
let intervalId = null;
let onLogout = null;
let threshold = DEFAULT_THRESHOLD;
let checkInterval = DEFAULT_CHECK_INTERVAL;

const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

const handleActivity = () => {
    lastActivity = Date.now();
    try {
        localStorage.setItem('lastActivity', String(lastActivity));
    } catch {}
};

export const getLastActivity = () => lastActivity;

export const updateActivity = handleActivity;

export const isInactive = () => Date.now() - lastActivity > threshold;

export const initSession = ({
    onLogoutHandler,
    inactivityThreshold = DEFAULT_THRESHOLD,
    interval = DEFAULT_CHECK_INTERVAL,
}) => {
    onLogout = onLogoutHandler;
    threshold = inactivityThreshold;
    checkInterval = interval;

    const stored = localStorage.getItem('lastActivity');
    lastActivity = stored ? parseInt(stored, 10) : Date.now();
    if (!lastActivity || Number.isNaN(lastActivity)) {
        lastActivity = Date.now();
    }

    activityEvents.forEach((e) =>
        window.addEventListener(e, handleActivity, { passive: true })
    );
    startInterval();
};

const startInterval = () => {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
        if (onLogout && isInactive()) {
            onLogout();
        }
    }, checkInterval);
};

export const destroySession = () => {
    activityEvents.forEach((e) =>
        window.removeEventListener(e, handleActivity)
    );
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    onLogout = null;
};

export const handleReconnect = () => {
    if (onLogout && isInactive()) {
        onLogout();
    }
};
