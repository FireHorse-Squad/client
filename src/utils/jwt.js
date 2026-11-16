export const decodeToken = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
};

export const getTokenExpiry = (token) => {
    const payload = decodeToken(token);
    return payload ? payload.exp * 1000 : 0;
};

export const isTokenExpired = (token, thresholdSeconds = 0) => {
    if (!token) return true;
    const expiry = getTokenExpiry(token);
    return Date.now() >= expiry - thresholdSeconds * 1000;
};

export const getTimeUntilExpiry = (token) => {
    const expiry = getTokenExpiry(token);
    return expiry - Date.now();
};
