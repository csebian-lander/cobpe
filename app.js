var express         = require("express"),
		http 						= require('http'),
		enforce 				= require('express-sslify'),
    app             = express(),
    bodyParser      = require("body-parser"),
    mongoose        = require("mongoose"),
    passport        = require("passport"),
    LocalStrategy   = require("passport-local"),
    methodOverride  = require("method-override"),
    User            = require("./models/user"),
		moment					= require("moment"),
		middleware			= require("./middleware/index");

app.use(enforce.HTTPS({ trustProtoHeader: true }));

// GOOGLE API: DB PULLDOWN
require('dotenv').config();
var google = require('googleapis'),
		sheetsApi = google.sheets('v4'),
		googleAuth = require('./g-auth');

var parsedData = {},
		teamCount = Number,
		SPREADSHEET_ID = "16zZGQ52pmZBLnoGfJ_KTIaWIMufPZCAhZe5gVVDqUDE";

googleAuth.authorize()
    .then((auth) => {
        sheetsApi.spreadsheets.values.batchGet({
            auth: auth,
            spreadsheetId: SPREADSHEET_ID,
            ranges: ["Biographical!A:P", "Notes!A:E"],
        }, function (err, response) {
            if (err) {
                console.log('The API returned an error: ' + err);
                return console.log(err);
            }
						unparsedData = [response.valueRanges[0].values, response.valueRanges[1].values];
            parsedData = middleware.parseInitialDatabase(unparsedData);
            console.log(parsedData[0]);
						teamCount = middleware.determineTeamCount(parsedData);
        });
    })
    .catch((err) => {
        console.log('auth error', err);
    });

// PASSING MOMENT.JS TO EJS
exports.index = function(req, res) {
    // send moment to your ejs
    res.render('index', { moment: moment });
}

// REQUIRING ROUTES
var indexRoutes			= require("./routes/index");
var authRoutes			= require("./routes/auth");

// EXPRESS CONFIG
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));

// MONGOOSE AND PASSPORT CONFIG
process.on('unhandledRejection', error => {
  // Will print "unhandledRejection err is not defined"
  console.log('unhandledRejection', error.message);
});

mongoose.Promise = global.Promise;
mongoose.connect("mongodb://chuck:tangabutts@ds261917.mlab.com:61917/cobpe", {useMongoClient: true});
// mongoose.connect("mongodb://localhost/cobpe", {useMongoClient: true});
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));

// PASSPORT CONFIGURATION
app.use(require("express-session")({
  secret: "Tennis, it is a game of kings",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
  res.locals.currentUser = req.user;  //adds current user info to all templates
	res.locals.database = parsedData;
	res.locals.teamCount = teamCount;
  next();
});  

// USE ROUTES
app.use("/", indexRoutes);
app.use("/", authRoutes);


// GSHEETS ROUTES (here so the gSheets dependencies are in place and so it has quick access to the db)

// ADD COMMENT ROUTE 
app.post("/player/:id", middleware.isLoggedIn, function(req, res) {
	var newDate = new Date();
	console.log (newDate);
	var noteDate = moment(newDate).format('dddd, MMMM D, h:mm a');
	console.log(noteDate);
	
	var newNote = {
		range: "Notes",
		majorDimension: "ROWS",
		values: [[req.body.noteBallperson, req.user.username, noteDate, req.body.noteNote, req.body.noteScore]],
	}
	
	var newPushNote = {
		ballperson: newNote.values[0][0],
		author: newNote.values[0][1],
		timestamp: newNote.values[0][2],
		note: newNote.values[0][3],
    score: newNote.values[0][4]
	};
	
	googleAuth.authorize()
    .then((auth) => {
        sheetsApi.spreadsheets.values.append({
            auth: auth,
            spreadsheetId: SPREADSHEET_ID,
            range: ["Notes"],
						valueInputOption: "RAW",
						insertDataOption: "INSERT_ROWS",
						resource: newNote
        }, function (err, response) {
            if (err) {
                console.log('The API returned an error: ' + err);
                return console.log(err);
            }
        });
    })
    .catch((err) => {
        console.log('auth error', err);
    });
	
	parsedData[(req.params.id - 1)].notes.push(newPushNote);
	
	res.redirect("back");
})

// REFRESH DB ROUTE
app.get("/refresh", middleware.isLoggedIn, function(req, res) {
	googleAuth.authorize()
    .then((auth) => {
        sheetsApi.spreadsheets.values.batchGet({
            auth: auth,
            spreadsheetId: SPREADSHEET_ID,
            ranges: ["Biographical!A:P", "Notes!A:E"],
        }, function (err, response) {
            if (err) {
                console.log('The API returned an error: ' + err);
                return console.log(err);
            }
						unparsedData = [response.valueRanges[0].values, response.valueRanges[1].values];
            parsedData = middleware.parseInitialDatabase(unparsedData);
            console.log(parsedData[0]);
						teamCount = middleware.determineTeamCount(parsedData);
        });
    })
    .catch((err) => {
        console.log('auth error', err);
    });
	res.redirect("/");
});

// CHANGE TEAM NUMBER ROUTE
app.post("/player/:id/teamset", middleware.isLoggedIn, function(req, res) {
  
  var newTeamNumber = req.body.team;
  var playerRow = req.params.id.parseInt() + 1; // player with ID 1 will be in row 2 of the GSheet
  
  console.log(playerRow);
  	
	googleAuth.authorize()
    .then((auth) => {
        sheetsApi.spreadsheets.values.update({
            auth: auth,
            spreadsheetId: SPREADSHEET_ID,
            range: "Biographical!A" + playerRow,
						valueInputOption: "USER_ENTERED",
						resource: newTeamNumber
        }, function (err, response) {
            if (err) {
                console.log('The API returned an error: ' + err);
                return console.log(err);
            }
        });
    })
    .catch((err) => {
        console.log('auth error', err);
    });
	
	//update local db parsedData with new team value
  
	res.redirect("back");
});


// 404 ROUTE
app.get("/*", function (req, res) {
	res.render("404");
});

app.listen(process.env.PORT, process.env.IP, function(){
	console.log("Citi Open application server has started");
});