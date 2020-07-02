const Sequelize = require('sequelize')
module.exports = (sequelize) => {
	class Course extends Sequelize.Model{}
	Course.init(
		{
			id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
			title: {type: Sequelize.STRING, allowNull: false},
			description: {type: Sequelize.TEXT},
			estimatedTime: {type: Sequelize.STRING, allowNull: true},
			materialsNeeded: {type: Sequelize.STRING, allowNull: true},
			userId: {type: Sequelize.INTEGER}
		},
		{ sequelize }
	);

	Course.associate = (models) => {
		Course.belongsTo(models.User, {
			foreignKey: 'userId'
		});
	};

	return Course
}