const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Ruta al directorio de archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// SQLite database
const db = new sqlite3.Database('./messages.db');

// Objeto para almacenar las salas activas
const salasActivas = {};

// Función para generar un código de sala aleatorio de 7 dígitos
function generarCodigoSala() {
    return Math.floor(1000000 + Math.random() * 9000000).toString();
}

// Manejar la solicitud de una sala específica
app.get('/:sala', (req, res) => {
    const sala = req.params.sala;
    // Verificar si la sala existe y está activa
    if (sala.length === 7 && /^\d+$/.test(sala) && salasActivas[sala]) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        // Si la sala no existe o no está activa, redirigir al menú principal
        res.redirect('/');
    }
});

// Ruta para obtener todas las sesiones guardadas
app.get('/api/sesiones', (req, res) => {
    db.all('SELECT * FROM sesiones', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Ruta para vaciar todos los mensajes
app.delete('/api/vaciar', (req, res) => {
    db.run('DELETE FROM sesiones', (err) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.sendStatus(200);
    });
});

// Ruta para eliminar una sala específica por su pin
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

// Manejar las conexiones de Socket.IO
io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    // Manejar la creación de una sala
    socket.on('crear_sala', () => {
        const sala = generarCodigoSala();
        // Registrar la sala como activa
        salasActivas[sala] = [];
        socket.join(sala);
        socket.emit('sala_creada', sala);
        console.log('Sala creada:', sala);
    });

    // Manejar unirse a una sala
    socket.on('unirse_sala', (sala) => {
        // Verificar si la sala existe y está activa
        if (salasActivas[sala]) {
            socket.join(sala);
            socket.emit('sala_unida', sala);
            console.log('Usuario', socket.id, 'unido a sala:', sala);
        } else {
            socket.emit('error', 'La sala no existe o no está activa');
        }
    });

    // Manejar el envío de preguntas
    socket.on('enviar_pregunta', (data) => {
        const { sala, pregunta } = data;
        // Verificar si la sala existe y está activa
        if (salasActivas[sala]) {
            // Almacenar la pregunta en los mensajes de la sala
            salasActivas[sala].push(pregunta);
            // Emitir la nueva pregunta a todos los clientes en la sala
            io.to(sala).emit('nueva_pregunta', { pregunta });
            console.log('Pregunta enviada a sala', sala, ':', pregunta);
        } else {
            socket.emit('error', 'La sala no existe o no está activa');
        }
    });

    // Manejar la terminación de una sesión
    socket.on('terminar_sesion', (sala) => {
        // Verificar si la sala existe y está activa
        if (salasActivas[sala]) {
            const mensajes = salasActivas[sala].join(' | ');
            // Guardar los mensajes de la sala en la base de datos
            db.run('INSERT INTO sesiones (sala, mensajes) VALUES (?, ?)', [sala, mensajes], (err) => {
                if (err) {
                    socket.emit('error', 'Error al guardar los mensajes');
                } else {
                    console.log('Sesión terminada y mensajes guardados para la sala', sala);
                    io.to(sala).emit('sesion_terminada');
                    // Eliminar la sala de las salas activas
                    delete salasActivas[sala];
                }
            });
        } else {
            socket.emit('error', 'La sala no existe o no está activa');
        }
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
    });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
