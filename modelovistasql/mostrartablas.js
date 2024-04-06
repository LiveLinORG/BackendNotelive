const { Client } = require('pg');

async function mostrarEntidades() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        password: 'sqlpos777',
        port: 5432,
        database: 'noteliveusers', 

    });

    try {
        await client.connect();

        // Consulta para obtener todas las bases de datos en el sistema
        const databasesQuery = 'SELECT datname FROM pg_database WHERE datistemplate = false';
        const databasesResult = await client.query(databasesQuery);
        const databases = databasesResult.rows.map(row => row.datname);

        // Iterar sobre cada base de datos encontrada
        for (const dbName of databases) {
            try {
                // Consulta para verificar si hay tablas en la base de datos actual
                const tablesQuery = `
                    SELECT EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = 'public'
                    );
                `;
                const result = await client.query(tablesQuery);
                const tablesExist = result.rows[0].exists;

                if (!tablesExist) {
                    console.log(`Base de datos "${dbName}" sin tablas.`);
                    continue; // Ir a la próxima base de datos
                }

                // Consulta para obtener todas las tablas en el esquema "public"
                const tablesResult = await client.query(`
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                    ORDER BY table_name;
                `);
                
                // Iterar sobre cada tabla encontrada en la base de datos actual
                for (const row of tablesResult.rows) {
                    const tableName = row.table_name;
                    
                    // Verificar si la tabla existe en realidad antes de intentar mostrar sus entidades
                    const tableExistQuery = `
                        SELECT EXISTS (
                            SELECT 1
                            FROM information_schema.tables
                            WHERE table_name = '${tableName}' AND table_schema = 'public'
                        );
                    `;
                    const tableExistResult = await client.query(tableExistQuery);
                    const tableExists = tableExistResult.rows[0].exists;

                    if (!tableExists) {
                        console.log(`La tabla "${tableName}" no existe en la base de datos "${dbName}".`);
                        continue; // Ir a la próxima tabla
                    }

                    // Consulta para mostrar todas las entidades en la tabla actual
                    const entitiesQuery = `SELECT * FROM public.${tableName}`;
                    const result = await client.query(entitiesQuery);
                    console.log(`\n*** Todas las entidades en la tabla "${tableName}" de la base de datos "${dbName}" ***`);
                    console.table(result.rows);
                }
            } catch (error) {
                console.error(`Error al mostrar entidades en la base de datos "${dbName}":`, error);
            }
        }
    } catch (error) {
        console.error('Error al mostrar entidades:', error);
    } finally {
        await client.end();
    }
}

module.exports = {
    mostrarEntidades
};
