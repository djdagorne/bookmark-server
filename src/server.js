const app = require('./app');
const { PORT } = require('./config')

app.listen(PORT, () => {
    console.log(`Listening at http://localhost:${PORT}`);
})