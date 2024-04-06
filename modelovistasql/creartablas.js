const { Client } = require('pg');

async function conectarBaseDeDatos() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        password: 'sqlpos777',
        port: 5432,
        database: 'noteliveusers', 

    });

    try {
        await client.connect();
        console.log('Base de datos conectada.');
        return client;
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error);
        throw error;
    }
}

async function crearTablas(client) {
    try {
        // Creación de la tabla usuarios si no existe
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'usuarios'
                )
                THEN
                    CREATE TABLE public.usuarios (
                        id SERIAL PRIMARY KEY,
                        nombre_usuario VARCHAR(100) NOT NULL,
                        contraseña VARCHAR(100) NOT NULL,
                        plan VARCHAR(20)
                    );
                END IF;
            END$$;
        `);

        // Creación de la tabla salas si no existe
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'salas'
                )
                THEN
                    CREATE TABLE public.salas (
                        id SERIAL PRIMARY KEY,
                        sala_id INTEGER UNIQUE,
                        premium BOOLEAN NOT NULL,
                        ppt BYTEA
                    );
                END IF;
            END$$;
        `);

        // Creación de la tabla preguntas si no existe
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'preguntas'
                )
                THEN
                    CREATE TABLE public.preguntas (
                        id SERIAL PRIMARY KEY,
                        sala_id INTEGER REFERENCES salas(sala_id),
                        diapositiva INTEGER NOT NULL,
                        pregunta TEXT NOT NULL,
                        respuesta TEXT,
                        likes INTEGER DEFAULT 0
                    );
                END IF;
            END$$;
        `);

        console.log('Tablas creadas correctamente.');

    } catch (error) {
        console.error('Error al crear las tablas:', error);
        throw error; // Propagar el error
    }
}

module.exports = {
    conectarBaseDeDatos,
    crearTablas
};
