const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./messages.db');

const salasActivas = {};

function generarCodigoSala() {
    return Math.floor(1000000 + Math.random() * 9000000).toString();
}

app.get('/:sala', (req, res) => {
    const sala = req.params.sala;
    if (sala.length === 7 && /^\d+$/.test(sala) && salasActivas[sala]) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.redirect('/');
    }
});
app.get('/api/sesion/:sala', (req, res) => {
    const sala = req.params.sala;
    db.get('SELECT * FROM sesiones WHERE sala = ?', [sala], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row);
    });
});

app.get('/api/sesiones', (req, res) => {
    db.all('SELECT * FROM sesiones', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.delete('/api/vaciar', (req, res) => {
    db.run('DELETE FROM sesiones', (err) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.sendStatus(200);
    });
});

app.delete('/api/eliminarSala/:sala', (req, res) => {
    const sala = req.params.sala;
    db.run('DELETE FROM sesiones WHERE sala = ?', [sala], (err) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.sendStatus(200);
    });
});

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('crear_sala', () => {
        const sala = generarCodigoSala();
        const token = crypto.randomBytes(20).toString('hex');
        salasActivas[sala] = { token, mensajes: [] }; 
        socket.join(sala);
        socket.emit('sala_creada', { sala, token });
        console.log('Sala creada:', sala);
    });

    socket.on('unirse_sala', (sala) => {
        
        if (salasActivas[sala]) {
            socket.join(sala);
            socket.emit('sala_unida', sala);
            console.log('Usuario', socket.id, 'unido a sala:', sala);
        } else {
            socket.emit('error', 'La sala no existe o no está activa');
        }
    });

    socket.on('enviar_pregunta', (data) => {
        const { sala, pregunta } = data;
        if (salasActivas[sala]) {
            salasActivas[sala].mensajes.push(pregunta);
            io.to(sala).emit('nueva_pregunta', { pregunta });
            console.log('Pregunta enviada a sala', sala, ':', pregunta);
        } else {
            socket.emit('error', 'La sala no existe o no está activa');
        }
    });

    socket.on('terminar_sesion', (data) => {
        const { sala, token } = data;
        if (salasActivas[sala]) {
            if (salasActivas[sala].token === token) {
                const mensajes = salasActivas[sala].mensajes.join(' | ');
                db.run('INSERT INTO sesiones (sala, mensajes) VALUES (?, ?)', [sala, mensajes], (err) => {
                    if (err) {
                        socket.emit('error', 'Error al guardar los mensajes');
                    } else {
                        console.log('Sesión terminada y mensajes guardados para la sala', sala);
                        io.to(sala).emit('sesion_terminada');
                        delete salasActivas[sala];
                    }
                });
            } else {
                socket.emit('error', 'Token de sesión inválido o no autorizado');
            }
        } else {
            socket.emit('error', 'La sala no existe o no está activa');
        }
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
