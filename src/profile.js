import { Profile } from './db/model'
import { isLoggedIn } from './middlewares'
// Handles all profile-related requests

// DB-query helper functions
const findByUser = (user, callback) => {
	Profile.find({ username: user })
		.exec((err, result) => {
			callback(result, err)
		})
}

const updateByUser = (user, payload, callback) => {
	Profile.update({ username: user }, payload)
		.exec((err, result) => {
			callback(result, err)
		})
}

const findByUserCriteria = (criteria, callback) => {
	Profile.find({ username: criteria })
		.exec((err, result) => {
			callback(result, err)
		})
}

// Helper function to retrieve specific information
const extract = (type) => (p) => {
	const info = { username: p.username }
	info[type] = p[type]
	return info
}

// Template GET handler for array responses
const getCollection = (type) => (req, res) => {
	const key = type + 's'
	const payload = {}
	const callback = (result, error) => {
		if (error) {
			console.error(error)
			return res.status(500).send('Internal server error')
		} else {
			payload[key] = result.map(extract(type))
			return res.send(payload)
		}
	}
	if (req.params.user !== undefined) {
		const users = req.params.user.split(',')
		const criteria = { $in: users }
		findByUserCriteria(criteria, callback)
	} else {
		findByUserCriteria(req.params.loggedInUser, callback)
	}
}

// Template GET handler for non-array responses
const getItem = (type) => (req, res) => {
	const user = req.params.user !== undefined ? req.params.user :
		req.params.loggedInUser
	findByUser(user, (result ,error) => {
		if (error) {
			console.error(error)
			return res.status(500).send('Internal server error')
		} else if (result.length === 0) {
			return res.status(404).send(`User ${user} not found`)
		} else {
			return res.send(extract(type)(result[0]))
		}
	})
}

// Template PUT handler for non-array responses
const putItem = (type) => (req, res) => {
	if (req.body[type] === undefined) {
		return res.status(400).send('Bad request')
	}
	if (typeof req.body[type] !== 'string') {
		return res.status(400).send('Bad request: expect a string')
	}
	const payload = {}
	if (type === 'zipcode') {
		payload[type] = +req.body[type]
	} else {
		payload[type] = req.body[type]
	}
	const user = req.params.loggedInUser
	updateByUser(user, payload, (result, error) => {
		if (error) {
			console.error(error)
			return res.status(500).send('Internal server error')
		} else {
			payload.username = user
			return res.send(payload)
		}
	})
}

module.exports = app => {
     app.get('/headlines/:user?', isLoggedIn, getCollection('headline'))
     app.put('/headline', isLoggedIn, putItem('headline'))
     app.get('/avatars/:user?', isLoggedIn, getCollection('avatar'))
     app.put('/avatar', isLoggedIn, putItem('avatar'))
     app.get('/zipcode/:user?', isLoggedIn, getItem('zipcode'))
     app.put('/zipcode', isLoggedIn, putItem('zipcode'))
     app.get('/email/:user?', isLoggedIn, getItem('email'))
     app.put('/email', isLoggedIn, putItem('email'))
     app.get('/dob', isLoggedIn, getItem('dob'))
}
