const readline = require('readline');
const { Client } = require('pg');

// Crear una interfaz de línea de comandos
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Variable global para almacenar el nombre de la base de datos
let dbName;

// Función para conectar a la base de datos y borrarla
async function borrarBaseDeDatos(soloTablas = false) {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        password: 'sqlpos777',
        port: 5432,
        database: 'noteliveusers', 

    });

    try {
        // Conexión a la base de datos
        await client.connect();

        if (soloTablas) {
            // Consulta para borrar solo las tablas
            await borrarTablas(client);
            console.log(`Tablas de la base de datos "${dbName}" borradas exitosamente.`);
        } else {
            // Consulta para borrar la base de datos
            const query = `DROP DATABASE IF EXISTS ${dbName}`;
            await client.query(query);
            console.log(`Base de datos "${dbName}" borrada exitosamente.`);
        }

    } catch (error) {
        console.error('Error al borrar la base de datos:', error);
    } finally {
        // Cerrar la conexión
        await client.end();
        rl.close(); // Cerrar la interfaz de línea de comandos
    }
}

// Función para borrar solo las tablas dentro de la base de datos
async function borrarTablas(client) {
    // Consulta para obtener todas las tablas de la base de datos actual
    const query = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `;
    const result = await client.query(query);

    // Construir y ejecutar las consultas para borrar cada tabla
    for (const row of result.rows) {
        const tableName = row.table_name;
        const dropQuery = `DROP TABLE IF EXISTS ${tableName} CASCADE`; // Utilizar CASCADE
        await client.query(dropQuery);
    }
}


// Preguntar al usuario si desea borrar solo las tablas o la base de datos completa
rl.question('¿Deseas borrar solo las tablas? (S/N): ', async (answer) => {
    const respuesta = answer.toUpperCase();
    if (respuesta === 'S') {
        await borrarBaseDeDatos(true); // Borrar solo las tablas
    } else if (respuesta === 'N') {
        await borrarBaseDeDatos(); // Borrar la base de datos completa
    } else {
        console.log('Respuesta inválida. Sólo se admite "S" o "N".');
    }
});

// Lógica para obtener el nombre de la base de datos a borrar desde la línea de comandos
const args = process.argv.slice(2);
if (args.length !== 1) {
    console.error('Se requiere especificar el nombre de la base de datos a borrar.');
    console.log('Uso: node borrarbasededatos.js nombre_de_la_base_de_datos');
    process.exit(1);
}

dbName = args[0]; // Asignar el valor de dbName desde los argumentos de la línea de comandos
