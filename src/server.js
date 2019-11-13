const app = require('./app');
const { PORT } = require('./config')
const knex = require('knex')

const db = knex({
    client: 'pg',
    connection: DB_URL,
})

app.set('db', db);

app.listen(PORT, () => {
    console.log(`Listening at http://localhost:${PORT}`);
})