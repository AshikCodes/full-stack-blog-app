const mongoose = require('mongoose')

const UserSchema = mongoose.Schema({
    username: {type: String, unique: true},
    password: String,
    email: {type: String},
    active: false,
    confirmationCode: {
        type: String,
        unique: true
    },
    blogs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Blog'
    }]
})

const User = mongoose.model('user', UserSchema)

module.exports = User