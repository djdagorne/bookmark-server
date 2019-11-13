require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const helmet = require('helmet')
const logger = require('../logger')
const cors = require('cors')
const validateBearerToken = require('./validate-bearer-token')
const errorHandler = require('./error-handler')

const { NODE_ENV } = require('./config');
const bookmarkRouter = require('./bookmarks/bookmarks-router');

const app = express();

const morganOption = (NODE_ENV === 'production') ? 'tiny' : 'common';

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());

app.use(validateBearerToken);

app.use(bookmarkRouter);


app.get('/', (req, res) => {
    res.send('Hello, World!')
})


app.use(errorHandler);

module.exports = app;