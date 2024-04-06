const { Client } = require('pg');
const { crearTablas } = require('./modelovistasql/creartablas'); // Importar la función crearTablas

const clientConfig = {
    user: 'postgres',
    host: 'localhost',
    password: 'sqlpos777',
    port: 5432,
    database: 'noteliveusers', 

};

let client; // Variable para almacenar la instancia del cliente de base de datos

async function conectarBaseDeDatos() {
    client = new Client(clientConfig); // Almacena la instancia del cliente
    try {
        await client.connect();
        console.log('Base de datos conectada.');
        await crearBaseDeDatosSiNoExiste(client); // Pasar el cliente como parámetro
        return client; // Devolver el cliente conectado
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error);
        throw error; // Propagar el error
    }
}

async function crearBaseDeDatosSiNoExiste(client) {
    try {
        // Verificar si la base de datos ya existe
        const query = "SELECT 1 FROM pg_database WHERE datname = 'noteliveusers'";
        const result = await client.query(query);
        
        if (result.rows.length === 0) {
            // Si la base de datos no existe, crearla
            const createDbQuery = 'CREATE DATABASE noteliveusers';
            await client.query(createDbQuery);
            await crearTablas(client); // Pasar el cliente como parámetro
            console.log('Base de datos "noteliveusers" creada correctamente.');
        } else {
            console.log('La base de datos "noteliveusers" ya existe.');
            
            // Verificar si la base de datos no tiene tablas
            const tableQuery = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'";
            const tableResult = await client.query(tableQuery);
            
            if (tableResult.rows.length === 0) {
                // Si la base de datos no tiene tablas, crearlas
                await crearTablas(client); // Pasar el cliente como parámetro
                console.log('Se crearon las tablas en la base de datos "noteliveusers".');
            }
        }
    } catch (error) {
        console.error('Error al crear o verificar la base de datos:', error);
        throw error; // Propagar el error
    }
}



async function crearUsuario(nombreUsuario, contraseña, plan = null) {
    try {
        const query = 'INSERT INTO usuarios (nombre_usuario, contraseña, plan) VALUES ($1, $2, $3)';
        await client.query(query, [nombreUsuario, contraseña, plan]);
        console.log('Usuario creado correctamente');
    } catch (error) {
        console.error('Error al crear usuario', error);
        throw error; // Propagar el error
    }
}

// Manejar la señal de interrupción (Ctrl + C)
process.on('SIGINT', async () => {
    if (client) {
        console.log('Cerrando conexión a la base de datos...');
        await client.end(); // Cerrar la conexión
        console.log('Conexión cerrada.');
    }
    process.exit(0); // Salir del proceso
});

module.exports = {
    conectarBaseDeDatos,
    crearBaseDeDatosSiNoExiste,
    crearUsuario,
};
