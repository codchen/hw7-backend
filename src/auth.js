// Handles all authentication-related requests
import { Profile, Auth } from './db/model'
import { isLoggedIn, cookieKey, putToSession, deleteFromSession } from './middlewares'
const md5 = require('md5')

const hashcode = (salt, password) => md5(salt + password)

// Handlers
const login = (req, res) => {
	if (typeof req.body.username !== 'string' || typeof req.body.password !== 'string') {
		return res.status(400).send('Bad request')
	} else {
		Auth.find({ username: req.body.username })
			.exec((err, result) => {
				if (err) {
					console.error(err)
					return res.status(500).send('Internal server error')
				} else if (result.length === 0) {
					return res.status(401).send('Username not registered')
				} else {
					if (hashcode(result[0].salt, req.body.password) !== result[0].hash) {
						return res.status(401).send('Password incorrect')
					} else {
						const sessionKey = md5(Math.random().toString(36) + result[0].username)
						res.cookie(cookieKey, sessionKey, {
							maxAge: 3600 * 1000,
							httpOnly: true
						})
						putToSession(sessionKey, result[0].username)
						return res.send({
							username: req.body.username,
							result: 'success'
						})
					}
				}
			})
	}
}

const register = (req, res) => {
	if (typeof req.body.username !== 'string' 
		|| typeof req.body.password !== 'string'
		|| typeof req.body.email !== 'string'
		|| typeof req.body.zipcode !== 'string'
		|| typeof req.body.dob !== 'string') {
		return res.status(400).send('Bad request')
	} else {
		const salt = Math.random().toString(36)
		const hash = hashcode(salt, req.body.password)
		Auth.findOneAndUpdate({ username: req.body.username }, {
			$setOnInsert: { salt, hash }}, { upsert: true })
			.exec((err, result) => {
				if (err) {
					console.error(err)
					return res.status(500).send('Internal server error')
				} else if (result !== null) {
					return res.status(401).send('Username existed')
				} else {
					new Profile({
						username: req.body.username,
						email: req.body.email,
						zipcode: +req.body.zipcode,
						dob: new Date(req.body.dob).getTime(),
					}).save(() => {
						return res.send({
							username: req.body.username,
							result: 'success'
						})
					})
				}
			})
	}
}

const logout = (req, res) => {
	const sessionKey = req.cookies[cookieKey]
	deleteFromSession(sessionKey)
	res.clearCookie(cookieKey)
	return res.send('OK')
}

const password = (req, res) => {
	const result = {
		username: req.params.loggedInUser,
		status: 'will not change'
	}
	return res.send(result)
}

module.exports = (app) => {
    app.post('/login', login)
    app.post('/register', register)
    app.put('/logout', isLoggedIn, logout)
    app.put('/password', isLoggedIn, password)
}