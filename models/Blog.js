const mongoose = require('mongoose')

const blogSchema = new mongoose.Schema({
    title: String,
    author: String,
    content: String,
    likes: Number,
    comments: [String],
    peopleWhoLiked: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
})

const blog = mongoose.model('blog', blogSchema)

module.exports = blog