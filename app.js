'use strict';

// load modules
const express = require('express');
const morgan = require('morgan');
const Sequelize = require('sequelize');
const bodyParser = require('body-parser');
const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');



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

// parse application/json
app.use(bodyParser.json()); 

//importing the auth module




//asyncHandler
//sends error if network connection cannot be established
function asyncHandler(cb){
  return async (req, res, next)=>{
    try{
      await cb(req, res, next);
    } catch(err){
      err.status = 500
      next(err);
    }
  }
}

//function that generates current date for createdAt and updatedAt
function getDate(){
  const today = new Date();
  const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
  const time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  const dateTime = date+' '+time;

  return dateTime;
}

/************
USER AUTHENTICATION
*************/

const authenticateUser = asyncHandler(async(req, res, next) => {

  let message = null;

  const credentials = auth(req);
  
  if(credentials){
    
    const user = await User.findAll({
      where:{
        emailAddress: credentials.name,
      }
    })
    const currentUser = user[0]['dataValues']

    if(user){
      const authenticated = bcryptjs.compareSync(credentials.pass, currentUser.password);
      if(authenticated){
        console.log(`Authentication successful for username: ${currentUser.emailAddress}`);
        req.currentUser = currentUser;
      }else{
        message = `Authentication failure for username: ${currentUser.emailAddress}`;
      }

    } else {
      message = `User not found for username: ${credentials.name}`;
    }
  } else {
    message = 'Auth header not found'
  }

  if(message){
    console.warn(message);
    res.status(401).json({ message: 'Access Denied' });
  }else{
    next()
  }

})

/************
USER ROUTES
*************/

//
app.get('/api/users', authenticateUser, asyncHandler(async(req, res) => {

  res.json(req.currentUser)

}))

//create user
app.post('/api/users', asyncHandler(async(req, res, next) => {
  console.log(req.body)
  const newUser = req.body

  if(newUser.password){
    newUser.password = bcryptjs.hashSync(newUser.password)
  }

  try{
    await User.create({
      ...newUser,
      createdAt: getDate(),
      updatedAt: getDate(),
    })
    return res.status(201).location('/').json({})
  }catch(error){
    let errorsArray = []
    error.errors.forEach(e=> errorsArray.push(e.message))
    error.errorsArray = errorsArray
    

    if(error.name==="SequelizeValidationError"){
      error.status = 400
    }
    next(error)
  }

}))

/************
COURSE ROUTES
*************/

// setup a friendly greeting for the root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the REST API project!',
  });
});

//Returns a list of all courses (including the user that owns each course)
app.get('/api/courses', asyncHandler(async(req, res) => {

  const allCourses = await Course.findAll({include:[{
    model: User,
    as: 'user',
  }]})

  return res.status(200).json(allCourses)

}))


//Return a particular cours
app.get('/api/courses/:id', asyncHandler(async(req, res, next) => {
  const particularCourse = await Course.findByPk(req.params.id)
  if(particularCourse){
    return res.json(particularCourse)
  }else{
    return res.status(404).json({
      message: 'Course Not Found',
    });
  }
}))

//Create Course
app.post('/api/courses', authenticateUser, asyncHandler(async(req, res, next) => {

  try{
    const newCourse = await Course.create({
      ...req.body,
      createdAt: getDate(),
      updatedAt: getDate(),
    })
    return res.status(201).location(`/api/courses/${req.params.id}`).json(newCourse)
  }catch(error){
    let errorsArray = []
    error.errors.forEach(e=> errorsArray.push(e.message))
    error.errorsArray = errorsArray

    console.log(error)

    if(error.name==="SequelizeValidationError"){
      error.status = 400
    }
    
    next(error)
  }

}))

//update course
app.put('/api/courses/:id', authenticateUser, asyncHandler(async(req, res, next) => {
  const courseToUpdate = await Course.findByPk(req.params.id)
  console.log(req.body)
  console.log(courseToUpdate)
  if(courseToUpdate){
    try{
      await courseToUpdate.update({
        ...req.body,
        updatedAt: getDate(),
      })
      return res.status(204).json({});

    }catch(error){
      console.log("*********", error)
      let errorsArray = []
      error.errors.forEach(e=> errorsArray.push(e.message))
      error.errorsArray = errorsArray

      if(error.name==="SequelizeValidationError"){
        error.status = 400
      }

      next(error); 
    }
  }else{
    return res.status(404).json({
      message: 'Course Not Found',
    });
  }
}))

//
app.delete('/api/courses/:id', authenticateUser, asyncHandler(async(req, res,next) => {
  const courseToDelete = await Course.findByPk(req.params.id)
  if(courseToDelete){
    try{
      await courseToDelete.destroy()
      return res.status(204).json({})
    }catch(error){
      next(error);
    }
  }else{
    return res.status(404).json({
      message: 'Course Not Found',
    });
  }

}))

/************
ERROR HANDLING
*************/

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
    errors: err.errorsArray,
  });
});

// set our port
app.set('port', process.env.PORT || 5000);

// start listening on our port
const server = app.listen(app.get('port'), () => {
  console.log(`Express server is listening on port ${server.address().port}`);
});
