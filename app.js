//jshint esversion:6  
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require('lodash');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');


const homeStartingContent = "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";


const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({
  secret: 'keyboard cat',
  proxy: true,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session()); 


//Connect to mongoDB DB
mongoose.connect('mongodb://localhost:27017/blogWebDB', {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useCreateIndex', true);
//Schema
const blogWebDBSchema = new mongoose.Schema({
  title: String,
  content: String,
  email: String,
  password: String,
  googleId: String
});
blogWebDBSchema.plugin(passportLocalMongoose);
blogWebDBSchema.plugin(findOrCreate);

//Model
const Post = mongoose.model('Post', blogWebDBSchema);

passport.use(Post.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  Post.findById(id, function(err, user) {
    done(err, user);
  });
});


passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/blogs",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    Post.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/facebook/blogs",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile);
  Post.findOrCreate({ facebookId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));


//--------------------------------Home Page-----------------------------------------------
app.get('/', (req,res) => {

  Post.find({"title": {$ne: null}}, (err, foundPosts) => {
    err ? console.log(err) :
    res.render('home',{
      homeStartingContent: homeStartingContent,
      posts: foundPosts
    });
  });
});

//--------------------------------About Page-----------------------------------------------
app.get('/about', (req,res) => {
  res.render('about',{
    aboutContent: aboutContent
  });
});

//--------------------------------Contact Page-----------------------------------------------
app.get('/contact', (req,res) => {
  res.render('contact',{
    contactContent: contactContent
  });
});

//--------------------------------Compose Page-----------------------------------------------
app.get('/compose', (req,res) => {

  if (req.isAuthenticated()) {
    res.render('compose');
  } else {
    res.redirect('/register');
  }
});
app.post('/compose', (req,res) => {

  const post = new Post({
    title: req.body.title,
    content: req.body.post
  });
  post.save(err => {
    if(!err) {
      res.redirect('/');
    }
  });
});

//--------------------------------Registration Page-----------------------------------------------
app.get('/register', (req,res) => {
  res.render('register');
});
app.post('/register', (req,res) => {

  Post.findOne({"username": req.body.username}, (err,foundItem) => {
    if(foundItem) {
      console.log('This Email already exist!');
      res.redirect('/login');
    } else {
      
      Post.register({username: req.body.username}, req.body.password, (err,user) => {
        if(err) {
          console.log(err);
          res.redirect('/register');
        } else {
          passport.authenticate('local')(req,res, () => {
            res.render('compose');
          })
        }
      });

    }
  });
});

//--------------------------------Login Page------------------------------------------------------
app.get('/login', (req,res) => {
  res.render('login');
});
app.post('/login', (req,res) => {

  const user = new Post({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, (err) => {
    if(err) {
      console.log(err);
    } else {
      passport.authenticate('local')(req,res,() => {
        console.log('Authenticate ho gaya');
        res.redirect('/compose');
      });
    }
  });
});

//----------------------------------Google Login--------------------------------------------------
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/blogs', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to home.
    res.redirect('/compose');
});

//----------------------------------Facebook Login--------------------------------------------------
app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/blogs',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });



//------------------------------------Express Routing Parameter-----------------------------------
app.get('/posts/:id', (req,res) => {
  const requestID = req.params.id;
  Post.findOne({_id: requestID}, (err, foundElement) => {
    if (!err) {
      res.render('post',{
        title: foundElement.title,
        post: foundElement.content
      });
    }
  });
});





app.listen(3000, function() {
  console.log("Server started on port 3000");
});
