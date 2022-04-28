'use strict';
const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

var curstockSchema = Schema( {
  userId: ObjectId,
  stockId: String,
  stockData: [],
} );

module.exports = mongoose.model( 'Curstock', curstockSchema );
