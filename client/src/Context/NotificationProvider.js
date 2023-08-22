// NotificationProvider.js
import React, { createContext, useContext, useState } from 'react';

const NotificationContext = createContext();

const NotificationProvider = ({ children }) => {
    const [notification, setNotification] = useState('');

    const clearNotification = async (e) => {
        setNotification(null);
    };
    const inserNotification = (error, clearNotification) => {
        setNotification({
            title: 'Notification',
            message: error.message,
            color: 'red',
            handler: clearNotification
        });
    };

    return (
        <NotificationContext.Provider
            value={{ notification, setNotification, clearNotification,inserNotification }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

const useNotificationGlobalState = () => {
    return useContext(NotificationContext);
};

export { NotificationProvider, useNotificationGlobalState };
