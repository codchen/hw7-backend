import { Profile } from './db/model'
import { isLoggedIn } from './middlewares'
// Handles all following-related requests

// Handlers
// GET handler -> /following
const getFollowing = (req, res) => {
	const user = req.params.user === undefined ? req.params.loggedInUser : req.params.user
	Profile.find({ username: user })
		.exec((err, result) => {
			if (err) {
				console.error(err)
				return res.status(500).send('Internal server error')
			} else if (result.length === 0) {
				return res.status(404).send(`User ${user} not found`)
			} else {
				return res.send({
					username: user,
					following: result[0].following
				})
			}
		})
}

// PUT handler -> /following
const putFollowing = (req, res) => {
	if (req.params.user === undefined) {
		return res.status(400).send('Bad request')
	}
	const user = req.params.loggedInUser
	Profile.find({ username: req.params.user })
		.exec((err, toFollow) => {
			if (toFollow.length === 0) {
				return res.status(404).send(`User ${req.params.user} not found`)
			}
			Profile.findOne({ username: user })
				.exec((err, result) => {
					if (result.following.includes(req.params.user)) {
						return res.send({
							username: user,
							following: result.following
						})
					} else {
						Profile.updateOne({ username: user }, {
							$push: {
								following: req.params.user
							}
						}).exec(() => {
							return res.send({
								username: user,
								following: result.following.concat([req.params.user])
							})
						})
					}
				})
		})
}

// DELETE handler -> /following
const deleteFollowing = (req, res) => {
	if (req.params.user === undefined) {
		return res.status(400).send('Bad request')
	}
	const user = req.params.loggedInUser
	Profile.findOneAndUpdate({ username: user }, { 
		$pull: {
			following: req.params.user
		} 
	}).exec((err, result) => {
		if (err) {
			console.error(err)
			return res.status(500).send('Internal server error')
		} else {
			return res.send({
				username: user,
				following: result.following.filter((f) => f !== req.params.user)
			})
		}
	})
}

module.exports = app => {
     app.get('/following/:user?', isLoggedIn, getFollowing)
     app.put('/following/:user', isLoggedIn, putFollowing)
     app.delete('/following/:user', isLoggedIn, deleteFollowing)
}