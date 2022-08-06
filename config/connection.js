const mongoClient = require('mongodb').MongoClient
const state = {
    db: null
}

module.exports.connect = (done) => {
    const url = 'mongodb+srv://abinbabu:abin123@cluster0.ksqc2a3.mongodb.net/?retryWrites=true&w=majority'
    const dbname = 'shopping'

    mongoClient.connect(url, (err, data) => {
        if (err) return done(err)
        state.db = data.db(dbname)
        done()
    })

}

module.exports.get=() => {
    return state.db
}