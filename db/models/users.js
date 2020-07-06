'use strict';
const Sequelize = require('sequelize')
module.exports = (sequelize) => {
	class User extends Sequelize.Model{}
	User.init(
		{
			id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
			firstName: {type: Sequelize.STRING, allowNull: false, validate: { notEmpty: {msg: "Please provide First Name"}, notNull:{msg:"First Name cannot be null"}}},
			lastName: {type: Sequelize.STRING, allowNull: false, validate: { notEmpty: {msg: "Please provide Last Name"}, notNull:{msg:"Last Name cannot be null"}}},
			emailAddress: {type: Sequelize.STRING, allowNull: false, unique:true, validate: { isEmail: {msg: "Please provide a valid email address"}, notNull:{msg:"Email address cannot be null"}}},
			password: {type: Sequelize.STRING, allowNull: false, validate: { notEmpty: {msg: "Please provide a Password"}, notNull:{msg:"Password cannot be null"}}},
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