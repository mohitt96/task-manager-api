const express = require('express')
const auth = require('../middleware/auth')
const router = new express.Router()
const Task = require('../models/task')
const User = require('../models/user')

//Create Task
router.post('/tasks', auth, async (req, res) => {
    const task = new Task({
        ...req.body,
        owner: req.user._id
    })
    try {
        await task.save()
        res.status(201).send(task)
    } catch (e) {
        res.status(400).send(e)
    }
})

//Get All Tasks of a User - Customize Get Requests (Filter, Pagination, Sorting)
//Pagination - limit, skip(starts with 0 and increments as per limit)
router.get('/tasks', auth, async (req, res) => {

    const match = {}
    const sort = {}
    if (req.query.completed) {
        match.completed = req.query.completed === 'true'
    }

    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':')
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
    }
    try {
        await req.user.populate({
            path: 'tasks',
            match,
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        })
        res.send(req.user.tasks)
    } catch (e) {
        res.status(500).send(e)
    }
})

//Get Single Task by ID
router.get('/tasks/:id', auth, async (req, res) => {
    const _id = req.params.id

    if (!_id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).send('ID is not valid as per Mongoose ObjectID (Should be 24 Hex Characters')
    }

    try {
        const task = await Task.findOne({ _id, owner: req.user._id })
        if (!task) {
            return res.status(404).send({ error: 'Task not found' })
        }
        res.send(task)
    } catch (e) {
        res.status(500).send()
    }
})

//Update Task
router.patch('/tasks/:id', auth, async (req, res) => {

    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).send({ error: 'ID is not valid as per Mongoose ObjectID (Should be 24 Hex Characters)' })
    }

    const updates = Object.keys(req.body)
    const allowedUpdates = ['description', 'completed']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation || updates.length == 0) {
        return res.status(400).send({ error: 'Update Not allowed for these properties' })
    }

    try {
        const task = await Task.findOne({ _id: req.params.id, owner: req.user._id })
        if (!task) {
            return res.status(404).send({ error: 'Task not found' })
        }
        updates.forEach((update) => task[update] = req.body[update])
        await task.save()
        res.send(task)
    } catch (e) {
        res.status(400).send(e)
    }
})

//Delete task
router.delete('/tasks/:id', auth, async (req, res) => {

    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).send({ error: 'ID is not valid as per Mongoose ObjectID (Should be 24 Hex Characters)' })
    }

    try {
        const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user._id })
        if (!task) {
            return res.status(404).send({ error: 'Task not found' })
        }
        res.send(task)
    } catch (e) {
        res.status(500).send(e)
    }
})

module.exports = router