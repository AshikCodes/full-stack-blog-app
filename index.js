require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')

const PORT = process.env | 3001
const mongoose = require('mongoose')
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const uri = process.env.MONGO_URI
const Blog = require('./models/Blog')
const User = require('./models/User')
const { use } = require('bcrypt/promises')
const { update } = require('./models/Blog')

app.use(express.json())
app.use(cors())
app.use(express.static('build'))

console.log('connecting to mongoDB...')

mongoose.connect(uri)
    .then(() => {
        console.log('connected to mongoDB')
    })
    .catch((err) => {
        console.log(`Error connecting to mongoDB: ${err}`)
    })

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
})


const sendConfirmationEmail = (name,email,confirmationCode) => {
    console.log('Check')
    transporter.sendMail({
        from: process.env.EMAIL,
        to: email,
        subject: 'Please confirm your account',
        html: `<div>
                <h1>Email confirmation</h1>
                <h2>Hello ${name}</h2>
                <p>Thank you for subscribing. Please confirm your account by clicking on the following link.</p>
                <a href=http://localhost:3000/confirm/${confirmationCode}>Click here</a>
                </div>`
    }).catch((err) => {
        console.log(err)
    })
    
}


app.get('/', (req,res) => {
    res.send('SUCCESS YESSIR')
})

app.get('/blogs/:id', async (req,res) => {
    const id = req.params.id
    const blog = await Blog.findById(id)
    res.json(blog);
})

const getTokenFrom = request => {
    const authorization = request.get('authorization')
    if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
      return authorization.substring(7)
    }
    return null
}

app.post('/', async (req,res) => {
    console.log(`user id here is ${req.body.userId}`)
    const user = await User.findById(req.body.userId)
    console.log(`user here is ${user}`)
    const blog = new Blog({
        title: req.body.title,
        author: req.body.author,
        content: req.body.content,
        likes: req.body.likes,
        peopleWhoLiked: req.body.peopleWhoLiked,
        creator: user._id

    })
    const token = getTokenFrom(req)
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET)

    if(!decodedToken.id){
        return res.status(401).json({error: 'Token missing or invalid'})
    }
    console.log(`blog here is ${blog}`)
    try {
        console.log(`user.blogs is ${user}`)
        user.blogs = user.blogs.concat(blog._id)
        // user.blogs = [blog._id]
        await user.save()
        await blog.save()
        res.json(blog)
    }
    catch(err) {
        console.log(`Error saving blog: ${err.message}`)
    }
})

app.patch('/update/:id', async (req,res) => {
    const id = req.params.id
    const updatedBlog = await Blog.findByIdAndUpdate({_id: id},{likes: req.body.likes}, {new: true})
    console.log(`blog here is ${updatedBlog}`)
    res.json(updatedBlog)
})

app.patch('/add-comment/:id', async (req,res) => {
    const id = req.params.id
    const blog = await Blog.findById(id)
    const updatedBlog = await Blog.findByIdAndUpdate({_id: id}, {comments: blog.comments.concat(req.body.comment)}, {new: true})
    console.log(`blog here is ${updatedBlog}`)
    res.json(updatedBlog)
})

app.get('/comments/:id', async (req,res) => {
    const id = req.params.id
    // const blog = await Blog.findById(id)
    const blog = await Blog.find({_id: id}, {comments: 1})
    console.log(`comments here is ${blog}`)
    res.json(blog)

})

app.post('/sign-up', async (req,res) => {
    console.log('up here')
    console.log(`jwt secret here is ${process.env.JWT_SECRET}`)
    const hashedPassword = await bcrypt.hash(String(req.body.password), 10)
    const token = jwt.sign({email: req.body.email}, process.env.JWT_SECRET)
    const newUser = new User({
        email: req.body.email,
        username: req.body.username,
        active: false,
        password: hashedPassword,
        confirmationCode: token
    })

    try {
        await newUser.save()
        res.send({
            message: 'User was successfully registered! Please check your email.'
        });
        sendConfirmationEmail(newUser.username, newUser.email, newUser.confirmationCode)
    }
    catch(err){
        console.log(err)
    }

})

app.post('/login', async (req,res) => {
    const {username, password} = req.body
    const user = await User.findOne({username})

    if(!user) {
        res.status(404).json({error: 'User not found'})
    }

    const passwordCorrect = true ? await bcrypt.compare(password, user.password) : false

    if(!passwordCorrect) {
        res.status(401).json({error: 'Invalid credentials'})
    }

    const userToken = {
        username: user.username,
        id: user._id
    }

    const token = jwt.sign(userToken, process.env.JWT_SECRET)

    res.status(200).send({token, username: user.username, id: user._id})
})

app.get('/blogs', async (req,res) => {
    const blogs = await Blog.find({})
    res.send(blogs)
})

app.get('/confirm/:confirmationCode', async (req,res) => {
    const confirmationCode = req.params.confirmationCode
    try {
        const verifiedUser = await User.findOne({confirmationCode})
        verifiedUser.active = true
        await verifiedUser.save()
        res.json({verifiedUser})
    }
    catch(err) {
        console.log(err)
    }
    
})


app.listen(PORT, () => {
    console.log(`Listening on PORT ${PORT}`)
})
