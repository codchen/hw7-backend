const frontend = 'https://hw7-frontend.surge.sh'

const cookieKey = 'sid'
const sessions = {}

module.exports = {
	cookieKey,
	putToSession: (key, val) => sessions[key] = val,
	deleteFromSession: (key) => delete sessions[key],
	isLoggedIn: (req, res, next) => {
		const sessionKey = req.cookies[cookieKey]
		if (sessionKey === undefined) {
			return res.status(401).send('Unauthenticated')
		}
		const user = sessions[sessionKey]
		if (user === undefined) {
			return res.status(401).send('Unauthenticated')
		}
		req.params.loggedInUser = user
		return next()
	},
	cors: (req, res, next) => {
		res.set({
			'Access-Control-Allow-Origin': frontend,
			'Access-Control-Allow-Credentials': true,
			'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE',
			'Access-Control-Allow-Headers': 'Authorization, Content-Type'
		})
		if (req.method === 'OPTIONS') {
			return res.status(200).send('OK')
		}
		return next()
	}
}