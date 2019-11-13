const knex = require('knex')
const app = require('../src/app')
const { makeBookmarksArray } = require('./bookmarks-fixture')

const store = require('../store')

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
    beforeEach('copy the bookmarks from store',()=>{
        bookmarksCopy = store.bookmarks.slice();
    })
    afterEach('restore the bookmarks from store',()=>{
        store.bookmarks = bookmarksCopy;
    })
    afterEach('clean up',()=>db('bookmarks').truncate())
    after('disconnect from the database',()=> db.destroy())

    describe('Unauthorized requests',()=>{
        it('responds with 401 for GET /bookmarks',()=>{
            return supertest(app)
                .get('/bookmarks')
                .expect(401, { error: 'Unauthorized request.' })
        })
        it('responds with 401 for POST /bookmarks',()=>{
            return supertest(app)
                .post('/bookmarks')
                .send({title:'test',url:'http://www.pornhub.gov', rating:1})
                .expect(401, { error: 'Unauthorized request.' })
        })
        it('responds with 401 for GET /bookmarks/:id',()=>{
            const abookmark = store.bookmarks[0];
            return supertest(app)
                .get(`/bookmarks/${abookmark.id}`)
                .expect(401, { error: 'Unauthorized request.' })
        })
        it('responds with 401 for DELETE /bookmarks/:id',()=>{
            const abookmark = store.bookmarks[0];
            return supertest(app)
                .delete(`/bookmarks/${abookmark.id}`)
                .expect(401, { error: 'Unauthorized request.' })
        })
    })//good to go

    describe('GET /bookmarks',()=>{
        context('given no bookmarks',()=>{
            it('responds with 200 and an empty array',()=>{
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, [])
            })
        })

        context('given there are bookmarks in the database',()=>{
            const testBookmarks = makeBookmarksArray();
            beforeEach('put the bookmark array back in the database',()=>{
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })
            it('responds with 200 and the bookmark array',()=>{
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testBookmarks)
            })
        })
    })//good

    describe(`GET /bookmarks/:id`,()=>{
        context('given an no bookmarks',()=>{
            it('should respond a 404 and log where the bookmark doesnt exist',()=>{
                return supertest(app)
                    .get(`/bookmarks/4444`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {error:{message:'Bookmark not found'}} )
            })
        })
        context('given there are bookmarks',()=>{
            const testBookmarks = makeBookmarksArray();
            beforeEach('put bookmarks into the database',()=>{
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })
            it('should respond 200 and return the bookmark by the requested id',()=>{
                const bookmarkId = 2;
                const expectedBookmark = testBookmarks[bookmarkId-1]
                return supertest(app)
                    .get(`/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, expectedBookmark)
            })
        })
    })//good

    describe(`POST /bookmarks/:id`,()=>{
        it('responds 400 if title is not supplied',()=>{
            const testBookmarkNoTitle = {
                id: 1,
                //title: 'Skellingtonman',
                url: 'https://www.google.com',
                description: 'whattup uncle',
                rating: 1
            }
            return supertest(app)
                .post(`/bookmarks`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, 'Invalid data.')
        })//good
        it('responds 400 if url is not supplied',()=>{
            const testBookmarkNoUrl = {
                id: 1,
                title: 'Skellingtonman',
                //url: 'https://www.google.com',
                description: 'whattup uncle',
                rating: 1
            }
            return supertest(app)
                .post(`/bookmarks`)
                .send(testBookmarkNoUrl)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, 'Invalid data.')
        })//good
        it('responds 400 if rating is not supplied',()=>{
            const testBookmarkNoRating = {
                id: 1,
                title: 'Skellingtonman',
                url: 'https://www.google.com',
                description: 'whattup uncle',
                //rating: 1
            }
            return supertest(app)
                .post(`/bookmarks`)
                .send(testBookmarkNoRating)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, 'Invalid data.')
        })//good
        it('responds 400 if there is an invalid rating number supplied',()=>{
            const testBookmarkBadRating = {
                title: 'Skellingtonman',
                url: 'https://www.google.com',
                description: 'whattup uncle',
                rating: 99
            }
            return supertest(app)
                .post(`/bookmarks`)
                .send(testBookmarkBadRating)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, 'Invalid data.')
        })//good
        it('responds 201 and returns us the posted bookmark',()=>{
            const newBookmark = {
                title: 'googs',
                url: 'https://www.google.com',
                description: 'whattup uncle',
                rating: 5
            }
            return supertest(app)
                .post(`/bookmarks`)
                .send(newBookmark)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(res => {
                    expect(res.body.title).to.eql(newBookmark.title)
                    expect(res.body.url).to.eql(newBookmark.url)
                    expect(res.body.description).to.eql(newBookmark.description)
                    expect(res.body.rating).to.eql(newBookmark.rating)
                    expect(res.body.id).to.be.a('string')
                })
                .then(res => {
                    expect(store.bookmarks[store.bookmarks.length - 1]).to.eql(res.body)
                })
        })
    })
})