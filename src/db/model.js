const mongoose = require('mongoose')
require('./db.js')

const defaultHeadline = 'Try Elm'
const defaultAvatar = 'https://s-media-cache-ak0.pinimg.com/' + 
	'originals/5b/26/ff/5b26ff29982e6bd0aa05870ad84e9e7a.png'

const profileSchema = new mongoose.Schema({
	username: String,
	headline: { type: String, default: defaultHeadline },
	email: String,
	zipcode: Number,
	avatar: { type: String, default: defaultAvatar },
	dob: Number,
	following: { type: [String], default: [] }
}, { versionKey: false })
export const Profile = mongoose.model('profile', profileSchema)

// _id: 0 is the counter for articles
const counterSchema = new mongoose.Schema({
	_id: Number,
	next: Number
})
const Counter = mongoose.model('counter', counterSchema)

const commentSchema = new mongoose.Schema({
	author: String,
	date: { type: Date, default: Date.now },
	text: String,
	commentId: Number
}, { versionKey: false })

new Counter({ _id: 0, next: 1 }).save()

const nextArticleId = () => {
	const query = Counter.findOneAndUpdate({ _id: 0 }, { $inc: { next: 1 } })
	return query.exec().then((result) => result.next)
}

const articleSchema = new mongoose.Schema({
	_id: { type: Number, index: { unique: true } },
	author: String,
	text: String,
	date: { type: Date, default: Date.now },
	img: String,
	comments: { type: [commentSchema], default: [] },
	counter: counterSchema
}, { versionKey: false })

articleSchema.pre('save', function(next) {
	const doc = this
	nextArticleId().then((_id) => {
		doc._id = _id
		doc.counter = { _id, next: 1 }
		next()
	}).catch((error) => {
		next(error)
	})
})

export const Article = mongoose.model('article', articleSchema)

export const nextCommentId = (postId) =>
	Article.findOneAndUpdate({ _id: postId }, { $inc: { 'counter.next': 1 } })
		.exec().then((result) => {
			if (result) {
				return result.counter.next
			} else {
				throw new Error('Article not found')
			}
		})

const authSchema = new mongoose.Schema({
	username: { type: String, index: { unique: true } },
	salt: String,
	hash: String
}, { versionKey: false })
export const Auth = mongoose.model('auth', authSchema)