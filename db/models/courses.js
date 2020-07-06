'use strict';
const Sequelize = require('sequelize')
module.exports = (sequelize) => {
	class Course extends Sequelize.Model{}
	Course.init(
		{
			id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
			title: {type: Sequelize.STRING, allowNull: false, validate: { notEmpty: {msg: "Please provide a Title"}}},
			description: {type: Sequelize.TEXT, allowNull: false, validate: { notEmpty: {msg: "Please provide a Description"}}},
			estimatedTime: {type: Sequelize.STRING, allowNull: true},
			materialsNeeded: {type: Sequelize.STRING, allowNull: true},
			userId: {type: Sequelize.INTEGER},
			createdAt: {type: Sequelize.DATE, allowNull: false},
			updatedAt: {type: Sequelize.DATE, allowNull: false},
		},
		{ sequelize }
	);

	Course.associate = (models) => {
		Course.belongsTo(models.User, {
			as: 'user',
			foreignKey: {
				fieldName: 'userId',
				allowNull: false,
			},
		});
	};

	return Course
}