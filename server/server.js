const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require('cors');
const { color } = require("./Colors/Colors");
const port = 8000;
const app = express();

app.use(cors());

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: '*'
    }
});

const emailToSocketId = new Map();
const socketIdToUserName = new Map();
let incallMap = new Map();
let users = [];

io.on("connection", (socket) => {
    console.log(color.blue, `[+] User connected from id :${socket.id}`.toUpperCase());
    /* UPDATE THE PHONE NUMBER LIST */


    socket.on("user:joined", ({ name }) => {
        try {
            /* UPDATE USERS */
            users.push({ name, phonenumber: socket.id });
            /* UPDATE MAP */
            socketIdToUserName.set(socket.id, name);
            io.emit('user:joined', { users: users });
        } catch (error) {
            console.log(`[-] Error`, error.message);
        }
    });

    socket.on('sdp:offer', ({ sdp, phonenumber }) => {
        try {
            if (incallMap.has(phonenumber)) {
                socket.emit('alreadyincall', { message: 'already in call' });
                return;
            }
            console.log(`${socket.id} is calling ... ${phonenumber}`);
            const Caller = socketIdToUserName.get(socket.id);
            const Callee = socketIdToUserName.get(phonenumber);
            console.log(`${Caller} is calling ${Callee}...`);
            io.to(phonenumber).emit('sdp:offer', ({ sdp, from: socket.id, Caller }));
        } catch (error) {
            console.log(`[-] Error `, error.message);
        }
    });

    socket.on('sdp:answer', ({ sdp, phonenumber }) => {
        try {
            console.log(`${socket.id} accepted call from ${phonenumber}...`);
            const Caller = socketIdToUserName.get(phonenumber);
            const Callee = socketIdToUserName.get(socket.id);
            console.log(`${Caller} is calling ${Callee}...`);
            io.to(phonenumber).emit('sdp:answer', ({ sdp, from: socket.id, Callee }));
        } catch (error) {
            console.log(`[-] Error sdp:answer`, error.message);
        }
    });

    socket.on('incall', ({ peer1, peer2 }) => {
        try {
            incallMap.set(peer1, peer2);
        } catch (error) {
            console.log(`Error : incall`, error.message);
        }

    });



    socket.on('candidate', ({ candidate, phonenumber }) => {
        try {
            io.to(phonenumber).emit('candidate', ({ candidate }));
        } catch (error) {
            console.log(`[+]ERROR:`, error.message);
        }
    });
    socket.on('hangup', ({ phonenumber }) => {
        try {
            if (incallMap.has(socket.id))
                incallMap.delete(socket.id);
            io.to(phonenumber).emit('hangup', { from: socket.id });
        } catch (error) {
            console.log(error.message);
        }
    });

    /* WHEN THE USER IS DISCONNECTED */
    socket.on('disconnect', () => {
        try {
            /* BROADCAST TO ALL THE USERS THAT THIS CLIENT HAS DISCONNECTED */
            console.log(color.red, `[-] User disconnected from id :${socket.id}`.toUpperCase());
            socketIdToUserName.delete(socket.id);
            if (incallMap.has(socket.id))
                incallMap.delete(socket.id);
            /* FILTER OUT THE NUMBER WHO HAS LEFT */
            users = users.filter((user) => user.phonenumber !== socket.id);
            socket.broadcast.emit('user:left', { users: users });
        } catch (error) {
            console.log(error.message);
        }
    });



});

httpServer.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});