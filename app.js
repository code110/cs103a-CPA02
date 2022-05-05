/*
  app.js -- This creates an Express webserver with login/register/logout authentication
*/

// *********************************************************** //
//  Loading packages to support the server
// *********************************************************** //
// First we load in all of the packages we need for the server...
const createError = require("http-errors"); // to handle the server errors
const express = require("express");
const path = require("path");  // to refer to local paths
const cookieParser = require("cookie-parser"); // to handle cookies
const session = require("express-session"); // to handle sessions using cookies
const debug = require("debug")("personalapp:server"); 
const layouts = require("express-ejs-layouts");
const axios = require("axios")
const yahooFinance = require('yahoo-finance2').default;
const dotenv = require('dotenv');
// *********************************************************** //
//  Loading models
// *********************************************************** //
const Stock = require("./models/Stock")
const Curstock = require("./models/Curstock")
// *********************************************************** //
//  Loading JSON datasets
// *********************************************************** //

const getData= async(req,res,next) => {
  const query = res.locals.curStockId;
  const queryOptions = { period1: '2021-05-08', /* ... */ };
  res.locals.curStockData = await yahooFinance.historical(query, queryOptions);
}


// *********************************************************** //
//  Connecting to the database
// *********************************************************** //

const mongoose = require( 'mongoose' );
dotenv.config();
const mongodb_URI = process.env.mongodb_URI || "mongodb+srv://zenocode:123321@zenocode.hshbg.mongodb.net/zenocode?retryWrites=true&w=majority" ;
//const mongodb_URI = 'mongodb://localhost:27017/stock_viewer'
//const mongodb_URI = 'mongodb+srv://zenocode:123321@zenocode.hshbg.mongodb.net/zenocode?retryWrites=true&w=majority'

mongoose.connect( mongodb_URI, { useNewUrlParser: true, useUnifiedTopology: true } );
// fix deprecation warnings
mongoose.set('useFindAndModify', false); 
mongoose.set('useCreateIndex', true);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {console.log("we are connected!!!")});





// *********************************************************** //
// Initializing the Express server 
// This code is run once when the app is started and it creates
// a server that respond to requests by sending responses
// *********************************************************** //
const app = express();

// Here we specify that we will be using EJS as our view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");



// this allows us to use page layout for the views 
// so we don't have to repeat the headers and footers on every page ...
// the layout is in views/layout.ejs
app.use(layouts);

// Here we process the requests so they are easy to handle
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Here we specify that static files will be in the public folder
app.use(express.static(path.join(__dirname, "public")));

// Here we enable session handling using cookies
app.use(
  session({
    secret: "zzbbyanana789sdfa8f9ds8f90ds87f8d9s789fds", // this ought to be hidden in process.env.SECRET
    resave: false,
    saveUninitialized: false
  })
);

// *********************************************************** //
//  Defining the routes the Express server will respond to
// *********************************************************** //


// here is the code which handles all /login /signin /logout routes
const auth = require('./routes/auth')
app.use(auth)

// middleware to test is the user is logged in, and if not, send them to the login page
const isLoggedIn = (req,res,next) => {
  if (res.locals.loggedIn) {
    next()
  }
  else res.redirect('/login')
}

// specify that the server should render the views/index.ejs page for the root path
// and the index.ejs code will be wrapped in the views/layouts.ejs code which provides
// the headers and footers for all webpages generated by this app
app.get("/", (req, res, next) => {
  res.render("index");
});

app.get("/about", (req, res, next) => {
  res.render("about");
});

/*  
    Stock viewer routes
*/
app.get('/stocklist',
    isLoggedIn,
    async (req,res,next) =>{
        try{
            let userId = res.locals.user._id;
            
            let data = await Curstock.find({userId:userId});
            res.locals.data = data;  
            if(data.length !== 0){
            res.locals.mydata = JSON.stringify(data[0].stockData); 
            res.locals.name = data[0].stockId;                   
            }else{
            res.locals.mydata = [];
            res.locals.name = "";
            }
            let items = await Stock.find({userId:userId});
            res.locals.items = items;
            res.render("stocklist");
        } catch(e){
            next(e);
        }
    }
)

app.post('/stocklist/add',
  isLoggedIn,
  async (req,res,next) => {
    try{
      const {stockId} = req.body; 
      const userId = res.locals.user._id; // get the user's id
      const price = "";
      let data = {stockId, userId, price} // create the data object
      let item = new Stock(data) // create the database object (and test the types are correct)
      await item.save() // save the todo item in the database
      res.redirect('/stocklist')  // go back to the todo page
    } catch (e){
      next(e);
    }
  }
  )

app.get("/stocklist/delete/:itemId",
    isLoggedIn,
    async (req,res,next) => {
      try{
        const itemId=req.params.itemId; // get the id of the item to delete
        await Stock.deleteOne({_id:itemId}) // remove that item from the database
        res.redirect('/stocklist') // go back to the todo page
      } catch (e){
        next(e);
      }
    }
  )

  app.get("/stocklist/:curStockId",
  isLoggedIn,
  async (req,res,next) => {
    try{
      const userId = res.locals.user._id;
      const curStockId = req.params.curStockId;

      const query = curStockId;
      const queryOptions = { period1: '2021-05-08', /* ... */ };
      const curStockData = await yahooFinance.historical(query, queryOptions);
      var curPrice = curStockData[curStockData.length - 1].close;
      curPrice = curPrice.toFixed(2);

      await Stock.updateOne(
        { stockId: curStockId},
        { $set: { price: curPrice}},
        { upsert: true })

      let mydata = [];
      for( let i=0; i < curStockData.length; i++){
        mydata.push([curStockData[i].date,curStockData[i].open, curStockData[i].high,curStockData[i].low,curStockData[i].close]);
      } 

      await Curstock.updateOne(
        { userId: userId},
        { $set: { userId: userId, stockId: curStockId, stockData: mydata}},
        { upsert: true })

      res.redirect('/stocklist') // go back to the todo page
    } catch (e){
      next(e);
    }
  }
)



// here we catch 404 errors and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// this processes any errors generated by the previous routes
// notice that the function has four parameters which is how Express indicates it is an error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render("error");
});


// *********************************************************** //
//  Starting up the server!
// *********************************************************** //
//Here we set the port to use between 1024 and 65535  (2^16-1)
const port = process.env.port || "5000";
console.log('connecting on port' + port);
app.set("port", port);

// and now we startup the server listening on that port
const http = require("http");
const { networkInterfaces } = require("os");
const { cursorTo } = require("readline");
const server = http.createServer(app);

server.listen(port);

function onListening() {
  var addr = server.address();
  var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  debug("Listening on " + bind);
}

function onError(error) {
  if (error.syscall !== "listen") {
    throw error;
  }

  var bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
}

server.on("error", onError);

server.on("listening", onListening);

module.exports = app;
