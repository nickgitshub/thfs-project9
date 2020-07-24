'use strict';

// load modules
const express = require('express');
const morgan = require('morgan');
const Sequelize = require('sequelize');
const bodyParser = require('body-parser');
const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');
const cors = require('cors')

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


//enable CORS request
app.use(cors())

// setup morgan which gives us http request logging
app.use(morgan('dev'));

// parse application/json
app.use(bodyParser.json()); 

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
    
    const currentUser = await User.findOne({
      attributes: {exclude: ['createdAt', 'updatedAt']},
      where:{
        emailAddress: credentials.name,
      }
    })

    if(currentUser){
      const authenticated = bcryptjs.compareSync(credentials.pass, currentUser.password);
      if(authenticated){
        console.log(`Authentication successful for email: ${currentUser.emailAddress}`);
        req.currentUser = currentUser;

      }else{
        message = `Incorrect password for email: ${currentUser.emailAddress}`;
      }

    } else {
      if(credentials.name === ""){
        message = `Must enter an email address`;
      } else {
        message = `${credentials.name} is not a user email address`;
      }
      
    }
  } else {
    message = 'Auth header not found'
  }

  if(message){
    console.warn(message);
    res.status(401).json({ errors: [message] });
  }else{
    next()
  }

})

/************
USER ROUTES
*************/

//get the current user
app.get('/api/users', authenticateUser, asyncHandler(async(req, res) => {
  const currentUser = req.currentUser
  res.json({
    userId: currentUser.id,
    firstName: currentUser.firstName,
    lastName: currentUser.lastName,
    emailAddress: currentUser.emailAddress,
    password: currentUser.password
  })
}))

//create user
app.post('/api/users', asyncHandler(async(req, res, next) => {
  const newUser = req.body

  //hashing the password
  if(newUser.password){
    newUser.password = bcryptjs.hashSync(newUser.password)
  }

  //email validations happen on the model
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
      error.message = error.errors[0].message
    }

    if(error.name==="SequelizeUniqueConstraintError"){
      error.status = 400
      error.message = "Email address must be different for each user"
    }

    next(error)
  }

}))

/************
COURSE ROUTES
*************/

//Returns a list of all courses (including the user that owns each course)
app.get('/api/courses', asyncHandler(async(req, res) => {

  const allCourses = await Course.findAll({
    attributes: {exclude: ['createdAt', 'updatedAt', 'userId']},
    include:[{
    model: User,
      as: 'user',
      attributes: {exclude: ['createdAt', 'updatedAt', 'password']},
    }]
  })

  return res.status(200).json(allCourses)

}))


//Return a particular course
app.get('/api/courses/:id', asyncHandler(async(req, res, next) => {
  const particularCourse = await Course.findOne({
    attributes: {exclude: ['createdAt', 'updatedAt', 'userId']},
    include:[{
    model: User,
      as: 'user',
      attributes: {exclude: ['createdAt', 'updatedAt', 'password']},
    }],
    where:{
        id: req.params.id,
    }
  })

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

    return res.status(201).location(`/api/courses/${newCourse.id}`).json({courseLocation: `/courses/${newCourse.id}`})
  }catch(error){
    let errorsArray = []
    error.errors.forEach(e=> errorsArray.push(e.message))
    error.errorsArray = errorsArray

    if(error.name==="SequelizeValidationError"){
      error.status = 400
      error.message = error.errors[0].message
    }
    
    next(error)
  }

}))

//update course
app.put('/api/courses/:id', authenticateUser, asyncHandler(async(req, res, next) => {
  const courseToUpdate = await Course.findByPk(req.params.id)

  //checks to make sure that there is a course match the id in the url
  //checks that body of the request is not empty
  //validation of what it is in the body will be run on the model
  if(courseToUpdate){
    if(Object.entries(req.body).length > 0){
      if(courseToUpdate.userId === req.currentUser.id){
        try{
          await courseToUpdate.update({
            ...req.body,
            updatedAt: getDate(),
          })
          return res.status(204).json({});

        }catch(error){
          let errorsArray = []
          error.errors.forEach(e=> errorsArray.push(e.message))
          error.errorsArray = errorsArray

          if(error.name==="SequelizeValidationError"){
            error.status = 400
            error.message = error.errors[0].message
          }

          next(error); 
        }
      }else{
        return res.status(403).json({
          errors: ['Only owner of a course can update it']
        });
      }
    } else {
      return res.status(400).json({
        errors: ['Must send fields to update'],
      });
    }
    
  }else{
    return res.status(404).json({
      errors: ['Course does not exist and cannot be updated'],
    });
  }
}))

//owner of a course can delete the course
app.delete('/api/courses/:id', authenticateUser, asyncHandler(async(req, res,next) => {
  const courseToDelete = await Course.findByPk(req.params.id)
  if(courseToDelete){
    if(courseToDelete.dataValues.userId === req.currentUser.id){
      try{
        await courseToDelete.destroy()
        return res.status(204).json({})
      }catch(error){
        next(error);
      }
    }else{
      return res.status(403).json({
        errors: ['Cannot be deleted as this is not the current user\'s course']
      });
    }
  }else{
    return res.status(404).json({
      errors: ['Course not found'],
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
