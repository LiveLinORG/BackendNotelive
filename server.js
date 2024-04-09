const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const bodyParser = require('body-parser');
const { Pool } = require('pg'); // Importa Pool desde pg
const bcrypt = require('bcrypt');
const { crearUsuario } = require('./database'); // Importa la función crearUsuario desde database.js

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const salasActivas = {};
const pool = new Pool({
    connectionString: 'postgresql://postgres:sqlpos777@localhost:5432/noteliveusers',
    max: 20, // Número máximo de conexiones en el pool
    idleTimeoutMillis: 30000, // Tiempo máximo de inactividad antes de que una conexión inactiva sea desconectada (en milisegundos)
    connectionTimeoutMillis: 2000 // Tiempo máximo que el pool esperará para una conexión disponible (en milisegundos)
});

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

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('crear_sala', () => {
        const sala = generarCodigoSala();
        salasActivas[sala] = true;
        socket.join(sala);
        socket.emit('sala_creada', sala);
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

    socket.on('redireccionar_sala', (sala) => {
        console.log('Redirigir a sala:', sala);
        socket.emit('redirect', sala);
    });

    socket.on('enviar_pregunta', (data) => {
        io.to(data.sala).emit('nueva_pregunta', data);
    });

    socket.on('responder_pregunta', (data) => {
        io.to(data.sala).emit('nueva_respuesta', data);
    });

    socket.on('disconnect', () => {
        const salasUsuario = Object.keys(socket.rooms).filter(room => room !== socket.id);
        salasUsuario.forEach(sala => {
            if (!io.sockets.adapter.rooms.get(sala)) {
                delete salasActivas[sala];
                console.log('Sala cerrada:', sala);
            }
        });
    });
});

app.post('/registro', async (req, res) => {
    const { new_username, new_password } = req.body;
    try {
        await crearUsuario(new_username, new_password);
        console.log('Usuario creado correctamente:', new_username);
        res.redirect('/login.html');
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).send('Error al crear usuario');
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const query = 'SELECT * FROM usuarios WHERE nombre_usuario = $1';
        const result = await pool.query(query, [username]);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            const passwordMatch = await bcrypt.compare(password, user.contraseña);
            if (passwordMatch) {
                req.session.username = username;
                res.redirect('http://localhost:3000/');
            } else {
                res.send('<script>alert("Usuario o contraseña incorrectos"); window.location.href="/login.html";</script>');
            }
        } else {
            res.send('<script>alert("Usuario o contraseña incorrectos"); window.location.href="/login.html";</script>');
        }
    } catch (error) {
        console.error('Error al realizar el login:', error);
        res.status(500).send('Error al realizar el login');
    }
});

async function iniciarServidor() {
    try {
        await pool.connect(); // Conecta el pool a la base de datos
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(`Servidor escuchando en el puerto ${PORT}`);
        });
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error);
    }
}

iniciarServidor();
