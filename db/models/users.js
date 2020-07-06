'use strict';
const Sequelize = require('sequelize')
module.exports = (sequelize) => {
	class User extends Sequelize.Model{}
	User.init(
		{
			id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
			firstName: {type: Sequelize.STRING, allowNull: false, validate: { notEmpty: {msg: "Please provide First Name"}}},
			lastName: {type: Sequelize.STRING, allowNull: false, validate: { notEmpty: {msg: "Please provide Last Name"}}},
			emailAddress: {type: Sequelize.STRING, allowNull: false, validate: { isEmail: {msg: "Please provide a valid email address"}}},
			password: {type: Sequelize.STRING, allowNull: false, validate: { notEmpty: {msg: "Please provide a password"}}},
			createdAt: {type: Sequelize.DATE, allowNull: false},
			updatedAt: {type: Sequelize.DATE, allowNull: false},
		},
		{ sequelize }
	);

	User.associate = (models) => {
		User.hasMany(models.Course, {
			as: 'user',
			foreignKey: {
				fieldName: 'userId',
				allowNull: false,
			}
		});
	};

	return User;
}