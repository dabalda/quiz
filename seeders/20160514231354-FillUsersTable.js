'use strict';

var crypto = require('crypto');


function encryptPassword(password, salt) {
    return crypto.createHmac('sha1', salt).update(password).digest('hex');
};


module.exports = {
  up: function (queryInterface, Sequelize) {

      return queryInterface.bulkInsert('Users', [ 
         { username: 'admin', 
           password: encryptPassword('istrador', 'aaaa'),
           salt:     'aaaa',
           isAdmin: true,
           createdAt: new Date(), updatedAt: new Date() },
         { username: 'David',  
           password: encryptPassword('yo', 'bbbb'),
           salt:     'bbbb',
           createdAt: new Date(), updatedAt: new Date() }
        ]);
  },

  down: function (queryInterface, Sequelize) {
      return queryInterface.bulkDelete('Users', null, {});
  }
};
