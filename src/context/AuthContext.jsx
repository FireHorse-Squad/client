import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isTokenExpired } from '../utils/jwt';
import { initSession, updateActivity, destroySession, handleReconnect } from '../utils/session';
import api, { setRefreshCallback } from '../utils/api';

const AuthContext = createContext(null);

export const setupAxiosInterceptors = () => {
    const token = localStorage.getItem('token');
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/dashboard';

    const clearAuth = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('lastActivity');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
    }, []);

    const performLogout = useCallback(() => {
        clearAuth();
        destroySession();
        navigate('/login', { replace: true });
    }, [clearAuth, navigate]);

    const refreshAccessToken = useCallback(async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await api.post('/auth/refresh', { refreshToken });
        const { token, user: userData, refreshToken: newRefreshToken } = response.data;

        localStorage.setItem('token', token);
        if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
        }
        if (userData) {
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
        }
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        return token;
    }, []);

    useEffect(() => {
        setupAxiosInterceptors();
        setRefreshCallback(refreshAccessToken);

        initSession({
            onLogoutHandler: performLogout,
            inactivityThreshold: 8 * 60 * 60 * 1000,
        });

        const handleOnline = () => {
            handleReconnect();
        };
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('online', handleOnline);
            destroySession();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [performLogout, refreshAccessToken]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);

                if (isTokenExpired(token)) {
                    clearAuth();
                    destroySession();
                    navigate('/login', { replace: true });
                    setLoading(false);
                    return;
                }

                setUser(parsedUser);
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            } catch {
                clearAuth();
                destroySession();
                navigate('/login', { replace: true });
            }
        }
        setLoading(false);
    }, [clearAuth, navigate]);

    const login = async (email, password) => {
        try {
            setError(null);
            const response = await api.post('/auth/login', { email, password });
            const { token, user: userData, refreshToken } = response.data;

            localStorage.setItem('token', token);
            if (refreshToken) {
                localStorage.setItem('refreshToken', refreshToken);
            }
            localStorage.setItem('user', JSON.stringify(userData));
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            setUser(userData);
            updateActivity();
            return true;
        } catch (err) {
            const message = err.response?.data?.message || 'Login failed. Please try again.';
            setError(message);
            return false;
        }
    };

    const redirectAfterLogin = () => {
        navigate(from, { replace: true });
    };

    const logout = () => {
        clearAuth();
        destroySession();
        navigate('/login', { replace: true });
    };

    const updateUser = (updatedUserData) => {
        const newUser = { ...user, ...updatedUserData };
        localStorage.setItem('user', JSON.stringify(newUser));
        setUser(newUser);
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            error,
            login,
            logout,
            redirectAfterLogin,
            updateUser,
            isAuthenticated: !!user
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
