const express = require('express');
const logger = require('../logger');
const uuid = require('uuid/v4');
const { store } = require('../store');

const bookmarkRouter = express.Router();
const bodyParser = express.json();

bookmarkRouter
    .route('/bookmarks')
    .get((req, res) => {
        res.json(store);
    })
    .post(bodyParser, (req, res) => {
        const { title, url, rating, description = ''} = req.body;

        if(!title){
            logger.error('Title is required');
            return res.status(400).send('Invalid data.');
        }
        if(!url){
            logger.error('Title is required');
            return res.status(400).send('Invalid data.');
        }
        if(!req.body){
            logger.error('Body if required.')
            return res.status(400).send('Invalid data.')
        }
        const id = uuid();
        const bookmark = {
            id,
            title,
            url,
            rating,
            description
        };

        store.push(bookmark);

        logger.info(`Bookmark with id:${bookmark.id} pushed to array.`);

        res
            .status(201)
            .location('http://localhost:8000/bookmarks/:'+id)
            .json(bookmark);
    })

bookmarkRouter
    .route('/bookmarks/:+id')
    .get((req, res) => {
        const {id} = req.params;
        const bookmark = store.find(b => b.id == id);

        if(!bookmark) {
            logger.error(`Bookmark with id ${id} not found.`);
            return res.status(404)
                .send('Bookmark not found.');
        }

        res.json(bookmark); 
    })
    .delete(bodyParser, (req, res) => {
        const {id} = req.params;
        const bookmark = store.find(c => c.id == id);

        if(!bookmark) {
            logger.error(`Bookmark with id ${id} not found.`);
            return res.status(404)
                .send('Bookmark not found.');
        }

        if(bookmark === -1){
            logger.error(`Bookmark with the index:${id} not found.`)
            return res 
                .status(404)
                .send('Not Found.');
        }

        store.splice(bookmark, 1);

        logger.info(`Bookmark with id ${id} has been deleted.`);

        return res
            .status(204)
            .end();
    });

module.exports = bookmarkRouter;