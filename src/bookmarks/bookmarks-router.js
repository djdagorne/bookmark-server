const express = require('express');
const logger = require('../../logger');
const uuid = require('uuid/v4');
const { isWebUri } = require('valid-url')
const xss = require('xss')

const BookmarksService = require('./bookmarks-service')

const bookmarkRouter = express.Router();
const bodyParser = express.json();

const serializeBookmark = bookmark => ({
    id: bookmark.id,
    title: xss(bookmark.title),
    url: bookmark.url,
    description: xss(bookmark.description),
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
    .post(bodyParser,(req,res,next)=>{
        const {title, url, description, rating} = req.body;
        const newBookmark = {title, url, description, rating};
        for(const [key, value] of Object.entries(newBookmark)){
            if(value == null){
                return res.status(400).send({
					error: {message: `Missing '${key}' in request body.`}
				})	
            }
        }
        const ratingNumber = Number(rating);
        if(ratingNumber > 5 || ratingNumber < 0 || !Number.isInteger(ratingNumber)){
            logger.error(`Rating should be a number`);
            return res.status(400).send({
                error: {message: `'${ratingNumber}' is not a valid rating.`}
            })
        }
        if(!isWebUri(url)){
            logger.error(`'${url}' is an invalid URL`);
            return res.status(400).send({
                error: {message: `'${url}' is not a valid url.`}
            })
        }

        BookmarksService.insertBookmark(
            req.app.get('db'),
            newBookmark
        )
            .then(bookmark => {
                res
                    .status(201)
                    .location(`/bookmarks/${bookmark.id}`)
                    res.json(serializeBookmark(bookmark))
            })
            .catch(next)
    })

bookmarkRouter
    .route('/bookmarks/:bookmark_id')
    .all((req,res,next)=>{
        const {bookmark_id} = req.params;
        BookmarksService.getById(
            req.app.get('db'), 
            bookmark_id
        )
            .then(bookmark => {
                if(!bookmark) {
                    logger.error(`Bookmark with id ${bookmark_id} not found.`);
                    return res.status(404).json({
                        error:{message:'Bookmark not found'}
                    })
                }
                res.bookmark = bookmark; //save bm to the response for the actual http response
                next()
            })
            .catch(next)
    })
    .get((req, res, next) => {
            res.json(serializeBookmark(res.bookmark))
    })
    .delete((req,res,next)=>{
        BookmarksService.deleteBookmark(
            req.app.get('db'),
            req.params.bookmark_id
        )
            .then(()=>{
                logger.info(`Bookmark with id:${req.params.bookmark_id}`)
                res.status(204).end()
            })
            .catch(next)
    })

module.exports = bookmarkRouter;