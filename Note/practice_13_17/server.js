const express = require('express');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const webpush = require('web-push');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Отдаем манифест правильно
app.get('/manifest.json', (req, res) => {
    res.header('Content-Type', 'application/manifest+json');
    res.sendFile(path.join(__dirname, 'manifest.json'));
});
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});
// 2. Раздаем статику
app.use('/icons', express.static(path.join(__dirname, 'icons')));
app.use(express.static(path.join(__dirname, './')));

// КЛЮЧИ
const vapidKeys = {
    publicKey: 'BCZdj6WO7lK8zUeb-WusCjP3CQEFwiWgb2mZs8o_LHpPDPsfh3x_hgEOO22ACCkAZMeehfaoPeWLJ_8lJ64mRpg',
    privateKey: 'gVKkl4iQJJs_JnhUSuaX_TZtguZqRTMD9wcvC95YEhA'
};

webpush.setVapidDetails('mailto:test@example.com', vapidKeys.publicKey, vapidKeys.privateKey);

let subscriptions = [];
const reminders = new Map();

const server = https.createServer({
    key: fs.readFileSync('localhost-key.pem'),
    cert: fs.readFileSync('localhost.pem')
}, app);

const io = socketIo(server);

io.on('connection', (socket) => {
    socket.on('newTask', (task) => socket.broadcast.emit('taskAdded', task));
    socket.on('newReminder', (reminder) => {
        const delay = reminder.reminderTime - Date.now();
        if (delay <= 0) return;
        const timeoutId = setTimeout(() => {
            const payload = JSON.stringify({ 
                title: '⏰ ВНИМАНИЕ!', 
                body: reminder.text, 
                reminderId: reminder.id 
            });
            subscriptions.forEach((sub, index) => {
                webpush.sendNotification(sub, payload).catch(e => {
                    if (e.statusCode === 410) subscriptions.splice(index, 1);
                });
            });
            reminders.delete(reminder.id);
        }, delay);
        reminders.set(reminder.id, { timeoutId, text: reminder.text });
    });
});

app.post('/subscribe', (req, res) => { subscriptions.push(req.body); res.status(201).json({ message: 'OK' }); });

app.post('/snooze', (req, res) => {
    const rId = parseInt(req.query.reminderId);
    if (!reminders.has(rId)) return res.status(404).send();
    const rem = reminders.get(rId);
    clearTimeout(rem.timeoutId);
    const nId = setTimeout(() => {
        const payload = JSON.stringify({ title: '💤 ОТЛОЖЕНО', body: `Повтор: ${rem.text}`, reminderId: rId });
        subscriptions.forEach(sub => webpush.sendNotification(sub, payload).catch(() => {}));
    }, 10000);
    reminders.set(rId, { timeoutId: nId, text: rem.text });
    res.json({ message: 'OK' });
});

server.listen(3000, () => console.log('✅ HTTPS Server: https://localhost:3000'));