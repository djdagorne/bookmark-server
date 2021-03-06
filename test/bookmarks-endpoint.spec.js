const knex = require('knex')
const app = require('../src/app')
const { makeBookmarksArray, makeMaliciousBookmark } = require('./bookmarks-fixture')
const path = require('path')

const testBookmarks = makeBookmarksArray();
describe('Bookmarks Endpoints', function() {
    let db, bookmarksCopy;
    before('make knex instance', ()=>{
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL
        })
        app.set('db', db)
    })
    before('clean the table',()=>db('bookmarks').truncate())
    afterEach('clean up',()=>db('bookmarks').truncate())
    after('disconnect from the database',()=> db.destroy())

    describe('Unauthorized requests',()=>{
        it('responds with 401 for GET /bookmarks',()=>{
            return supertest(app)
                .get('/api/bookmarks')
                .expect(401, { error: 'Unauthorized request.' })
        })
        it('responds with 401 for POST /bookmarks',()=>{
            return supertest(app)
                .post('/api/bookmarks')
                .send({title:'test',url:'http://www.pornhub.gov', rating:1})
                .expect(401, { error: 'Unauthorized request.' })
        })
        it('responds with 401 for GET /api/bookmarks/:id',()=>{
            return supertest(app)
                .get(`/api/bookmarks/${testBookmarks[0].id}`)
                .expect(401, { error: 'Unauthorized request.' })
        })
        it('responds with 401 for DELETE /api/bookmarks/:id',()=>{
            return supertest(app)
                .delete(`/api/bookmarks/${testBookmarks[0].id}`)
                .expect(401, { error: 'Unauthorized request.' })
        })
    })//good to go

    describe('GET /api/bookmarks',()=>{
        context('given no bookmarks',()=>{
            it('responds with 200 and an empty array',()=>{
                return supertest(app)
                    .get('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, [])
            })
        })

        context('given there are bookmarks in the database',()=>{
            //const testBookmarks = makeBookmarksArray();
            beforeEach('put the bookmark array back in the database',()=>{
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })
            it('responds with 200 and the bookmark array',()=>{
                return supertest(app)
                    .get('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testBookmarks)
            })
        })
    })//good

    describe(`GET /api/bookmarks/:id`,()=>{
        context('given an no bookmarks',()=>{
            it('should respond a 404 and log where the bookmark doesnt exist',()=>{
                return supertest(app)
                    .get(`/api/bookmarks/4444`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {error:{message:'Bookmark not found'}} )
            })
        })
        context('given there are bookmarks',()=>{
            //const testBookmarks = makeBookmarksArray();
            beforeEach('put bookmarks into the database',()=>{
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })
            it('should respond 200 and return the bookmark by the requested id',()=>{
                const bookmarkId = 2;
                const expectedBookmark = testBookmarks[bookmarkId-1]
                return supertest(app)
                    .get(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, expectedBookmark)
            })
        })
    })//good

    describe(`POST /api/bookmarks/:id`,()=>{
        const requiredFields = ['title','url','rating'];
        requiredFields.forEach(field => { //testing if fields are inputted
            const newBookmark = {
                title: 'test',
                url: 'https://www.thinkful.com',
                description: 'Think outside the classroom',
                rating: 5,
            }
            it(`responds with 400 and an error message that the ${field} is missing.`,()=>{
                delete newBookmark[field];
                return supertest(app)
                    .post('/api/bookmarks')
                    .send(newBookmark)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(400, {
                        error: {message: `Missing '${field}' in request body.`}
                    })
            })
        })
        it('responds 201 and returns us the posted bookmark',()=>{
            const newBookmark = {
                title: 'Test Title',
                url: 'https://www.google.com',
                description: 'test description',
                rating: 5
            }
            return supertest(app)
                .post(`/api/bookmarks/`)
                .send(newBookmark)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(newBookmark.title)
                    expect(res.body.url).to.eql(newBookmark.url)
                    expect(res.body.description).to.eql(newBookmark.description)
                    expect(res.body.rating).to.eql(newBookmark.rating)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`)
                })
                .then(res => {
                    return supertest(app)
                        .get(`/api/bookmarks/${res.body.id}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(res.body)
                })
        })
        it('reponds with 400 if rating is not a number',()=>{
            const newBookmark = {
                title: 'Test Title',
                url: 'https://www.google.com',
                description: 'test description',
                rating: 'sandwich'
            }
            return supertest(app)
                .post('/api/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(newBookmark)
                .expect(400, {
                    error: {message: `'${Number(newBookmark.rating)}' is not a valid rating.`}
                })
        })
        it('reponds with 400 if URL is invalid',()=>{
            const newBookmark = {
                title: 'Test Title',
                url: 'bumps',
                description: 'test description',
                rating: 5
            }
            return supertest(app)
                .post('/api/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(newBookmark)
                .expect(400, {
                    error: {message: `'${newBookmark.url}' is not a valid url.`}
                })
        })
        it(`removes an XSS attack from the response`,()=>{
            const {maliciousBookmark, expectedBookmark}= makeMaliciousBookmark();
            return supertest(app)
                .post('/api/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(maliciousBookmark)
                .expect(201)
                .expect(res=>{
                    expect(res.body.title).to.eql(expectedBookmark.title)
                    expect(res.body.description).to.eql(expectedBookmark.description)
                })
        })
    })//good

    describe(`DELETE /api/bookmarks/:id`,()=>{
        context('given there are bookmarks in the database',()=>{
            //const testBookmarks = makeBookmarksArray();
            beforeEach('put the bookmark array back in the database',()=>{
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })
            it('responds 204 and deletes requested bookmark',()=>{
                const idToRemove = 2;
                const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove)
                return supertest(app)
                    .delete(`/api/bookmarks/${idToRemove}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get('/api/bookmarks')
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmarks)    
                    )
            })
        })
    })//good
    describe(`PATCH /api/bookmarks/:id`,()=>{
        context(`given no articles in the database`,()=>{
            it(`responds 404`,()=>{
                const bookmarkId = 123456;
                return supertest(app)
                    .patch(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {
                        error:{message:'Bookmark not found'}
                    })
            })
        })
        context(`given there is articles in the database`,()=>{
            beforeEach('insert bookmarks',()=>{
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })
            it(`responds 204 and updates the article`,()=>{
                const idToUpdate = 2;
                const updatedBookmark = {
                    title: 'updated',
                    url: 'https://bongo.update.org',
                    description: 'the updated description',
                    rating: 5,
                }
                const expectedBookmark = {
                    ...testBookmarks[idToUpdate-1],
                    ...updatedBookmark
                }
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(updatedBookmark)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmark)    
                    )
            })
            it(`responds 400 when no fields are supplied`,()=>{
                const idToUpdate = 2;
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send({dumbfield: 'bong!'})
                    .expect(400, {
                        error: {message: `Request body must contain either 'title', 'url', 'description' or 'rating'`}
                    })
            })
            it(`responds 204 and updates only the chosen field`,()=>{
                const idToUpdate = 2;
                const updatedBookmark = {
                    title: 'updated title'
                }
                const expectedBookmark = {
                    ...testBookmarks[idToUpdate-1],
                    ...updatedBookmark
                }
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(updatedBookmark)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmark)
                    )
            })
            it(`responds 400 if the url is invalid`,()=>{
                const idToUpdate = 2
                const updateInvalidUrl = {
                    url: 'htp://nope-yeah',
                }
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(updateInvalidUrl)
                    .expect(400, {
                        error: {
                            message: `'${updateInvalidUrl.url}' is not a valid url.`
                        }
                    })    
            })
            it(`responds 400 if the rating isn't between 0-5`,()=>{
                const idToUpdate = 2
                const updateInvalidRating = {
                  rating: 44,
                }
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(updateInvalidRating)
                    .expect(400, {
                        error: {message: `'${updateInvalidRating.rating}' is not a valid rating.`}
                    })
            })
        })
    })
})