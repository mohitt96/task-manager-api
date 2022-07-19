const express = require('express')
const multer = require('multer')
const sharp = require('sharp')
const User = require('../models/user')
const auth = require('../middleware/auth')
const router = new express.Router()

//Sign-up User
router.post('/users', async (req, res) => {
    const user = new User(req.body)

    try {
        await user.save()
        const authToken = await user.generateAuthToken()
        res.status(201).send({ user, authToken })
    } catch (e) {
        res.status(400).send(e)
    }
})

//Login User
router.post('/users/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const authToken = await user.generateAuthToken()
        res.send({ user, authToken })
    } catch (e) {
        res.status(400).send(e.message)
    }
})

//Logout Current User Session
router.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.authTokens = req.user.authTokens.filter((authToken) => {
            return authToken.authToken !== req.authToken
        })
        await req.user.save()
        res.send({ message: 'Logged out Successfully' })
    } catch (e) {
        res.status(500).send(e)
    }
})

//Logout All User Sessions
router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.authTokens = []
        await req.user.save()
        res.send({ message: 'All sessions logged out successfully' })
    } catch (e) {
        res.status(500).send(e)
    }
})

//Get User Profile
router.get('/users/me', auth, async (req, res) => {
    res.send(req.user)
})

//Update User Data
router.patch('/users/me', auth, async (req, res) => {

    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'email', 'password', 'age']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation || updates.length == 0) {
        return res.status(400).send({ error: 'Update Not allowed for these properties' })
    }

    try {
        updates.forEach((update) => req.user[update] = req.body[update])
        await req.user.save()
        res.send({ user: req.user, message: 'Update Successful' })
    } catch (e) {
        res.status(400).send(e)
    }
})

//Delete User Profile
router.delete('/users/me', auth, async (req, res) => {

    try {
        await req.user.remove()
        res.send(req.user)
    } catch (e) {
        res.status(500).send(e)
    }
})

//Setting up multer
const upload = multer({
    limits: {
        fileSize: 1000000
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(png|jpg|jpeg)$/)) {
            return cb(new Error('Please upload png, jpg or jpeg file only'))
        }
        cb(undefined, true)
    }
})

//Create/Update User Profile Picture
router.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {
    const buffer = await sharp(req.file.buffer)
        .resize({ width: 250, height: 250 })
        .png()
        .toBuffer()
    req.user.avatar = buffer
    await req.user.save()
    res.send()
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message })
})

//Delete User Profile Picture
router.delete('/users/me/avatar', auth, async (req, res) => {
    req.user.avatar = undefined
    await req.user.save()
    res.send()
})

//Fetch user profile picture
router.get('/users/:id/avatar', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
        if (!user || !user.avatar) {
            throw new Error()
        }

        res.set('Content-Type', 'image/jpg')
        res.send(user.avatar)
    } catch (e) {
        res.status(404).send()
    }
})

module.exports = router