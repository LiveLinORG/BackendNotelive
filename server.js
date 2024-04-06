const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const bodyParser = require('body-parser'); // Importa body-parser
const { conectarBaseDeDatos, crearBaseDeDatosSiNoExiste, crearUsuario, client } = require('./database.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(bodyParser.urlencoded({ extended: true })); // Utiliza body-parser

// Ruta al directorio de archivos estáticos
app.use(express.static('public'));

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

// Manejar las conexiones de Socket.IO
io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    // Manejar la creación de una sala
    socket.on('crear_sala', () => {
        const sala = generarCodigoSala();
        // Registrar la sala como activa
        salasActivas[sala] = true;
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
            // Emitir un evento de redirección al cliente solo si la sala es válida
            // io.to(socket.id).emit('redireccionar_sala', sala);
        } else {
            // Si la sala no existe o no está activa, enviar un mensaje de error al cliente
            socket.emit('error', 'La sala no existe o no está activa');
        }
    });

    // Manejar el evento de redirección
    socket.on('redireccionar_sala', (sala) => {
        console.log('Redirigir a sala:', sala);
        // Redirigir al cliente a la sala específica
        socket.emit('redirect', sala);
    });

    // Manejar el envío de preguntas
    socket.on('enviar_pregunta', (data) => {
        io.to(data.sala).emit('nueva_pregunta', data);
    });

    // Manejar el envío de respuestas
    socket.on('responder_pregunta', (data) => {
        io.to(data.sala).emit('nueva_respuesta', data);
    });

    // Manejar la desconexión de un usuario
    socket.on('disconnect', () => {
        // Obtener las salas del usuario desconectado
        const salasUsuario = Object.keys(socket.rooms).filter(room => room !== socket.id);
        // Eliminar las salas que ya no tienen usuarios
        salasUsuario.forEach(sala => {
            if (!io.sockets.adapter.rooms.get(sala)) {
                delete salasActivas[sala];
                console.log('Sala cerrada:', sala);
            }
        });
    });
});

app.post('/registro', async (req, res) => {
    const { new_username, new_password } = req.body; // Omitimos el campo "plan"
    try {
        await crearUsuario(new_username, new_password);
        console.log('Usuario creado correctamente:', new_username);
        res.redirect('/login.html');
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).send('Error al crear usuario');
    }
});


// Conectar a la base de datos al inicio
conectarBaseDeDatos()
    .then(() => {
        console.log('Base de datos conectada.');
        // Iniciar el servidor después de conectarse a la base de datos
        iniciarServidor();
    })
    .catch(error => {
        console.error('Error al conectar a la base de datos:', error);
    });

// Función para iniciar el servidor
// Función para iniciar el servidor
async function iniciarServidor() {
    try {
        // Conectar a la base de datos
        await conectarBaseDeDatos();

        // Puerto en el que escucha el servidor
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(`Servidor escuchando en el puerto ${PORT}`);
        });
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error);
    }
}


