'use strict';
const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

var stockSchema = Schema( {
  userId: ObjectId,
  stockId: String,
  price: String,
} );

module.exports = mongoose.model( 'Stock', stockSchema );
