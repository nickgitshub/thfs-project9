'use strict';

// load modules
const express = require('express');
const morgan = require('morgan');
const Sequelize = require('sequelize');

// variable to enable global error logging
const enableGlobalErrorLogging = process.env.ENABLE_GLOBAL_ERROR_LOGGING === 'true';

// create the Express app
const app = express();

//setup database
const db = require('./db');
const { User, Course } = db.models;

(async () => {
  try {
    //authenticate sequelize
    console.log('Connection to the database successful!');
    await db.sequelize.authenticate();
    
    //command creates new tables according the schema specified by model
    console.log('Synchronizing the models with the database...');
    db.sequelize.sync();

  } catch(error) {
    console.log('Error connecting to the database', error);
  }
})()

// setup morgan which gives us http request logging
app.use(morgan('dev'));

//asyncHandler
//sends error if network connection cannot be established
function asyncHandler(cb){
  return async (req, res, next)=>{
    try{
      await cb(req, res, next);
    } catch(err){
      console.log('-------------- \n Async Error \n --------------')
      err.status = 500
      next(err);
    }
  }
}


// TODO setup your api routes here

// setup a friendly greeting for the root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the REST API project!',
  });
});

//Returns a list of courses (including the user that owns each course)
app.get('/api/courses', asyncHandler(async(req, res) => {

  const allCourses = await Course.findAll({include:[{
    model: User
  }]})
  console.log("test", allCourses)

  return res.json(allCourses)

}))


//
app.get('/', asyncHandler(async(req, res) => {

}))

//
app.get('/', asyncHandler(async(req, res) => {

}))

//
app.get('/', asyncHandler(async(req, res) => {

}))
//
app.get('/', asyncHandler(async(req, res) => {

}))
//
app.get('/', asyncHandler(async(req, res) => {

}))

// send 404 if no other route matched
app.use((req, res) => {
  res.status(404).json({
    message: 'Route Not Found',
  });
});

// setup a global error handler
app.use((err, req, res, next) => {
  if (enableGlobalErrorLogging) {
    console.error(`Global error handler: ${JSON.stringify(err.stack)}`);
  }

  res.status(err.status || 500).json({
    message: err.message,
    error: {},
  });
});

// set our port
app.set('port', process.env.PORT || 5000);

// start listening on our port
const server = app.listen(app.get('port'), () => {
  console.log(`Express server is listening on port ${server.address().port}`);
});
