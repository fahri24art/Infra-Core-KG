import React, { createContext, useContext, useState } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Mock User Data - Quota System (Unit based)
    const [user, setUser] = useState(null);

    const login = (username, password) => {
        // Mock Login Logic
        if (username && password) {
            setUser({
                id: 1,
                name: 'Mulyana',
                department: 'ICT',
                avatar: 'https://ui-avatars.com/api/?name=Mulyana&background=random',
                quotaLimit: 50,
                quotaUsed: 12,
            });
            setIsAuthenticated(true);
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        setIsAuthenticated(false);
    };

    const getAvailableQuota = () => {
        return user ? user.quotaLimit - user.quotaUsed : 0;
    };

    const hasSufficientQuota = (amount) => {
        return getAvailableQuota() >= amount;
    };

    const deductQuota = (amount) => {
        if (!hasSufficientQuota(amount)) return false;
        setUser(prev => ({ ...prev, quotaUsed: prev.quotaUsed + amount }));
        return true;
    };

    return (
        <UserContext.Provider value={{ user, isAuthenticated, login, logout, getAvailableQuota, hasSufficientQuota, deductQuota }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
