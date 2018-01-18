var express         = require("express"),
    app             = express(),
    bodyParser      = require("body-parser"),
    mongoose        = require("mongoose"),
    passport        = require("passport"),
    LocalStrategy   = require("passport-local"),
    methodOverride  = require("method-override"),
    User            = require("./models/user"),
		moment					= require("moment"),
		middleware			= require("./middleware/index");


// GOOGLE API: DB PULLDOWN
require('dotenv').config();
var google = require('googleapis'),
		sheetsApi = google.sheets('v4'),
		googleAuth = require('./g-auth');

var parsedData = {},
		teamCount = Number,
		SPREADSHEET_ID = "1NMpkZ9hYt-pJCbtmZRtkID44J9Dvr47sGI01MH6TePw";

googleAuth.authorize()
    .then((auth) => {
        sheetsApi.spreadsheets.values.batchGet({
            auth: auth,
            spreadsheetId: SPREADSHEET_ID,
            ranges: ["Biographical!A:O", "Notes!A:D"],
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
mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost/citi_open", {useMongoClient: true});
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

// ADD COMMENT ROUTE (here so the gSheets dependencies are in place and so it has quick access to the db)
app.post("/player/:id", middleware.isLoggedIn, function(req, res) {
	var newDate = new Date();
	console.log (newDate);
	var noteDate = moment(newDate).format('dddd, MMMM D, h:mm a');
	console.log(noteDate);
	
	var newNote = {
		range: "Notes",
		majorDimension: "ROWS",
		values: [[req.body.noteBallperson, req.user.username, noteDate, req.body.noteNote]],
	}
	
	var newPushNote = {
		ballperson: newNote.values[0][0],
		author: newNote.values[0][1],
		timestamp: newNote.values[0][2],
		note: newNote.values[0][3]
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

// 404 ROUTE
app.get("/*", function (req, res) {
	res.render("404");
});

app.listen(process.env.PORT, process.env.IP, function(){
	console.log("Citi Open application server has started");
});