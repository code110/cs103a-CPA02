'use strict';
const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

var toDoItemSchema = Schema( {
  userId: ObjectId,
  stockId: [String],
} );

module.exports = mongoose.model( 'Stock', StockSchema );
