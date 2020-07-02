const Sequelize = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'fsjstd-restapi.db'
});

const db = {
	sequelize,
	Sequelize, 
	models:{}
}

db.models.User = require('./models/users.js')(sequelize)
db.models.Course = require('./models/courses.js')(sequelize)

module.exports = db;