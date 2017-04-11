import { Article, Profile, nextCommentId } from './db/model'
import { isLoggedIn } from './middlewares'
// Handle all article-related requests
const sendArticlesByAuthor = (author, res) => {
	console.log(author)
	Article.aggregate({
		$match: { author: { $in: author } }
	}, { $sort: { date: -1 } }, { $limit: 10 }, {
		$project: {
			author: 1,
			text: 1,
			date: 1,
			img: 1,
			'comments.author': 1,
			'comments.text': 1,
			'comments.date': 1,
			'comments.commentId': 1
		} 
	}).exec((err, articles) => {
		if (!articles) {
			return res.send({ articles: [] })
		}
		return res.send({ articles })
	})
}

const sendArticleById = (_id, res) => {
	Article.find({ _id }, {
		counter: 0,
		'comments._id': 0
	}).exec((err, articles) => {
		return res.send({ articles })
	})
}

const sendAllFeed = (username, res) => {
	Profile.findOne({ username })
		.exec((err, result) => {
			sendArticlesByAuthor(
				result.following.concat([username]), res)
		})
}

const editArticle = (postId, author, text, res) => {
	Article.findOneAndUpdate({ _id: postId, author }, { text })
		.exec((err, result) => {
			if (!result) {
				return res.status(403).send('Forbidden: Only author can edit this article')
			}
			sendArticleById(postId, res)
		})
}

const postComment = (postId, author, text, res) => {
	nextCommentId(postId)
		.then((commentId) => Article.updateOne({ _id: postId }, {
				$push: { comments: { author, text, commentId, date: Date.now() } }
			}).exec())
		.then(() => {
			sendArticleById(postId, res)
		})
		.catch(() => {
			res.status(404).send('Article not found')
		})
}

const editComment = (postId, commentId, author, text, res) => {
	Article.findOneAndUpdate({ _id: postId,
			'comments.commentId': commentId,
			'comments.author': author}, { 'comments.$.text': text })
		.exec((err, result) => {
			if (!result) {
				return res.status(403).send('Forbidden: Only author can edit this comment')
			}
			sendArticleById(postId, res)
		})
}

// HTTP Request Handlers
// GET handler -> /articles
const getArticles = (req, res) => {
	if (req.params.id === undefined) {
		sendAllFeed(req.params.loggedInUser, res)
	} else if (isNaN(req.params.id)) {
		sendArticlesByAuthor([req.params.id], res)
	} else {
		sendArticleById(+req.params.id, res)
	}
}

// PUT handler -> /articles
const putArticles = (req, res) => {
	if (req.params.id === undefined || req.body.text === undefined) {
		return res.status(400).send('Bad Request')
	}
	const postId = +req.params.id
	const message = req.body.text
	if (req.body.commentId === undefined) {
		editArticle(postId, req.params.loggedInUser, message, res)
	} else if (+req.body.commentId === -1) {
		postComment(postId, req.params.loggedInUser, message, res)
	} else {
		editComment(postId, +req.body.commentId, req.params.loggedInUser, message, res)
	}
}

// POST handler -> /article
const postArticle = (req, res) => {
	if (typeof req.body.text !== 'string') {
		return res.status(400).send('Bad Request')
	}
	const newArticle = {
		text: req.body.text,
		author: req.params.loggedInUser
	}
	new Article(newArticle).save((err, product) => {
			if (err) {
				console.error(err)
			}
			const payload = product._doc
			delete payload['counter']
			return res.send({ articles: [payload] })
		}
	)
}

module.exports = app => {
     app.get('/articles/:id?', isLoggedIn, getArticles)
     app.put('/articles/:id', isLoggedIn, putArticles)
     app.post('/article', isLoggedIn, postArticle)
}