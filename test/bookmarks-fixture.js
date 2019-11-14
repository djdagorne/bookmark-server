function makeBookmarksArray() {
    return [
        {
            id: 1,
            title: 'Thinkful',
            url: 'https://www.thinkful.com',
            description: 'Think outside the classroom',
            rating: 5,
        },
        {
            id: 2,
            title: 'Google',
            url: 'https://www.google.com',
            description: 'Where we find everything else',
            rating: 4,
        },
        {
            id: 3,
            title: 'MDN',
            url: 'https://developer.mozilla.org',
            description: 'The only place to find web documentation',
            rating: 5,
        },
    ]
}
function makeMaliciousBookmark() {
    const maliciousBookmark = {
        id: 911,
        title: '<script>alert("xss");</script>',
        url: 'https://yahoo.com',
        description: '<img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">',
        rating: 5,
    }
    const expectedBookmark = {
        ...maliciousBookmark,
        title: '&lt;script&gt;alert(\"xss\");&lt;/script&gt;',
        description: '<img src="https://url.to.file.which/does-not.exist">',
    }
    return {
        maliciousBookmark,
        expectedBookmark,
    }
}
  
module.exports = {
    makeBookmarksArray,
    makeMaliciousBookmark,
}