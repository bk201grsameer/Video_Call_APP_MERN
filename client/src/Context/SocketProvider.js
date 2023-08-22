import React, { createContext, useContext, useState } from 'react';
import { useEffect } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();
const socket = io.connect('http://localhost:8000');
const SocketProvider = ({ children }) => {
    const [myNumber, setMyNumber] = useState("");
    const [userName, setUserName] = useState("user" + Math.random());
    // socket config
    useEffect(() => {
        function onConnect() {
            console.log(`[+] User connectd ${socket.id}`);
            setMyNumber(socket.id);
        }

        function onDisconnect() {
            console.log(`[+] User disconnected `);
            window.location.href = '/';
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.emit('user:joined', { name: userName });
        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, []);

    return <SocketContext.Provider value={
        {
            socket,
            myNumber,
            setMyNumber,
            userName,
            setUserName
        }}> {children}</SocketContext.Provider>;
};

const useSocketState = () => {
    return useContext(SocketContext);
};
export { SocketProvider, useSocketState };