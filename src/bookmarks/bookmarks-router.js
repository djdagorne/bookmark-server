const express = require('express');
const logger = require('../../logger');
const uuid = require('uuid/v4');
const store = require('../../store');
const { isWebUri } = require('valid-url')

const BookmarksService = require('./bookmarks-service')

const bookmarkRouter = express.Router();
const bodyParser = express.json();

const serializeBookmark = bookmark => ({
    id: bookmark.id,
    title: bookmark.title,
    url: bookmark.url,
    description: bookmark.description,
    rating: Number(bookmark.rating),
})

bookmarkRouter
    .route('/bookmarks')
    .get((req, res, next) => {
        BookmarksService.getAllBookmarks(req.app.get('db'))
            .then(bookmarks => {
                res.json(bookmarks.map(serializeBookmark))
            })
            .catch(next)
    })
    .post(bodyParser, (req, res) => {
        //TODO update to use database

        for (const field of ['title', 'url', 'rating']) {
            if (!req.body[field]) {
                logger.error(`${field} is required`)
                return res.status(400).send('Invalid data.')
            }
        }
        const { title, url, rating, description = ''} = req.body;
      
        if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
            logger.error(`Invalid rating '${rating}' supplied`)
            return res.status(400).send('Invalid data.')
        }
      
        if (!isWebUri(url)) {
            logger.error(`Invalid url '${url}' supplied`)
            return res.status(400).send('Invalid data.')
        }
        const bookmark = {
            id: uuid(),
            title,
            url,
            rating,
            description
        };

        store.bookmarks.push(bookmark);
        logger.info(`Bookmark with id:${bookmark.id} pushed to array.`);

        res
            .status(201)
            .location(`http://localhost:8000/bookmarks/${bookmark.id}`)
            .json(bookmark);
    })

bookmarkRouter
    .route('/bookmarks/:bookmark_id')
    .get((req, res, next) => {
        const {bookmark_id} = req.params;
        BookmarksService.getById(req.app.get('db'), bookmark_id)
            .then(bookmark => {
                if(!bookmark) {
                    logger.error(`Bookmark with id ${bookmark_id} not found.`);
                    return res.status(404).json(
                        {error:{message:'Bookmark not found'}}
                    )
                }
            res.json(serializeBookmark(bookmark)); 
            })
            .catch(next)
    })
    .delete(bodyParser, (req, res) => {
        //TODO update to use db instead of store
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

        store.bookmarks.splice(bookmark, 1);

        logger.info(`Bookmark with id ${id} has been deleted.`);

        return res
            .status(204)
            .end();
    });

module.exports = bookmarkRouter;