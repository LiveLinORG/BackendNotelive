const { Pool } = require('pg');
const { crearTablas } = require('./modelovistasql/creartablas'); // Importar la función crearTablas

const poolConfig = {
    user: 'postgres',
    host: 'localhost',
    password: 'sqlpos777',
    port: 5432,
    database: 'noteliveusers', 
    max: 20, // Número máximo de conexiones en el pool
    idleTimeoutMillis: 30000, // Tiempo máximo de inactividad antes de que una conexión inactiva sea desconectada (en milisegundos)
    connectionTimeoutMillis: 2000 // Tiempo máximo que el pool esperará para una conexión disponible (en milisegundos)
};

const pool = new Pool(poolConfig); // Pool de conexiones

async function conectarBaseDeDatos() {
    try {
        await pool.connect(); // Conectar al pool de conexiones
        console.log('Base de datos conectada.');
        await crearBaseDeDatosSiNoExiste(); // No es necesario pasar el cliente como parámetro
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error);
        throw error; // Propagar el error
    }
}

async function crearBaseDeDatosSiNoExiste() {
    try {
        // Verificar si la base de datos ya existe
        const query = "SELECT 1 FROM pg_database WHERE datname = 'noteliveusers'";
        const result = await pool.query(query);
        
        if (result.rows.length === 0) {
            // Si la base de datos no existe, crearla
            const createDbQuery = 'CREATE DATABASE noteliveusers';
            await pool.query(createDbQuery);
            await crearTablas(); // No es necesario pasar el cliente como parámetro
            console.log('Base de datos "noteliveusers" creada correctamente.');
        } else {
            console.log('La base de datos "noteliveusers" ya existe.');
            
            // Verificar si la base de datos no tiene tablas
            const tableQuery = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'";
            const tableResult = await pool.query(tableQuery);
            
            if (tableResult.rows.length === 0) {
                // Si la base de datos no tiene tablas, crearlas
                await crearTablas(); // No es necesario pasar el cliente como parámetro
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
        const query = 'INSERT INTO usuarios (nombre_usuario, contraseña) VALUES ($1, $2)';
        await pool.query(query, [nombreUsuario, contraseña]);
        console.log('Usuario creado correctamente');
    } catch (error) {
        console.error('Error al crear usuario', error);
        throw error; 
    }
}

// Manejar la señal de interrupción (Ctrl + C)
process.on('SIGINT', async () => {
    try {
        console.log('Cerrando conexión a la base de datos...');
        await pool.end(); // Cerrar todas las conexiones del pool
        console.log('Conexión cerrada.');
    } catch (error) {
        console.error('Error al cerrar la conexión a la base de datos:', error);
    } finally {
        process.exit(0); // Salir del proceso
    }
});

module.exports = {
    conectarBaseDeDatos,
    crearBaseDeDatosSiNoExiste,
    crearUsuario
};
