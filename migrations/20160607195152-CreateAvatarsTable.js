'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
      return queryInterface.createTable(
          'Avatars',
          { id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                primaryKey: true,
                autoIncrement: true,
                unique: true
            },
            UserId: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            public_id: {
                type: Sequelize.STRING,
                allowNull: false
            },
            url: {
                type: Sequelize.STRING,
                allowNull: false
            },
            filename: {
                type: Sequelize.STRING,
                allowNull: false
            },
            mime: {
                type: Sequelize.STRING,
                allowNull: false
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false
            }
        },
        { sync: {force:true}
        }
      );
  },

  down: function (queryInterface, Sequelize) {
        return queryInterface.dropTable('Avatars');
  }
};