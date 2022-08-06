
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fileUpload = require('express-fileupload')
const session = require('express-session')
const db = require('./config/connection')


db.connect((err) => {
  if (err) console.log("connection err" + err);
  else console.log("Database Connected to port 27017");
})


const adminRouter = require('./routes/admin');
const usersRouter = require('./routes/users');
// const hbs = require('express-hbs/lib/hbs');
const hbs = require('express-handlebars')

const app = express();

const HBS = hbs.create({});
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
// app.engine('hbs',hbs.engine({extname:'hbs',defaultLayout:'layout',layoutsDir:__dirname+'/views/layout',partialsDir:__dirname+'views/partials/'}))
app.engine('hbs', hbs.engine({
  extname: 'hbs',
  defaultLayout: 'layout',
  layoutsDir: __dirname + '/views/layout/',
  partialsDir: __dirname + '/views/partials/'
}))






HBS.handlebars.registerHelper("ifCondition",function(v1,v2,options){
  if(v1==v2){
    return options.fn(this)
  }
  return options.inverse(this) 
})

HBS.handlebars.registerHelper("notEquals",function(v1,v2,options){
  if(v1!=v2){
    return options.fn(this)
  }
  return options.inverse(this) 
})



app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload())


app.use((req,res,next)=>{
  if(!req.user){
    res.header('cache-control','private,no-cache,no-store,must revalidate')
    res.header('Express','-3')
  }
  next();
})

app.use(session({secret:"Key",cookie:{}}))


app.use('/', usersRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
// app.use(function (req, res, next) {
//   next(createError(404));
// });
app.get("*",(req,res)=>{
  res.render('users/404',{userUi:true, user: req.session.user}) 
  });


// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
