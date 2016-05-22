'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
      return  queryInterface.addColumn( 'Comments', 
                                        'AuthorId', 
                                        { type: Sequelize.INTEGER,
                                          defaultvalue: 0 
                                        } 
                                      );
  },

  down: function (queryInterface, Sequelize) {
      return queryInterface.removeColumn('Comments','AuthorId');
  }
};