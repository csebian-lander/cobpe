var google = require('googleapis'),
		sheetsApi = google.sheets('v4'),
//     moment = require("moment"),
		googleAuth = require('../g-auth');

var middlewareObj = {};

middlewareObj.isLoggedIn = function(req, res, next){
  if (req.isAuthenticated()) {
    return next();
  }
	res.redirect("/login");
}

middlewareObj.parseInitialDatabase = function (data) {
	var initialDatabase = [];
	var idNum = 0;
	
	var bioData = data[0];
	var notes = data[1];
	
	bioData.forEach(function(row) {
		var newObj = {
			ID: idNum,
			team: row[0],
			firstName: row[1].trim(),
			lastName: row[2].trim(),
			gender: row[3],
			homeAddress: row[5],
			Phone: row[6],
			emailAddress: row[7],
			ecName: row[8],
			ecRel: row[9],
			ecPhone: row[10],
			yearsExperience: row[11],
			position: row[12],
			captain: row[13],
			age: row[14],
      headshot: row[15],
			notes: []
		};
		initialDatabase.push(newObj);
		idNum++;
	});
	
	initialDatabase.shift(); //removes the header row
	
//   initialDatabase.sort(compareFirstNames);
//   initialDatabase.sort(compareLastNames); // sorting is alpha by lastname with firstnames sorted within that
  
	notes.forEach(function(note) {
		var newNote = { ballperson: note[0], author: note[1], timestamp: note[2], note: note[3], score: note[4]	};
		
		initialDatabase.forEach(function(row) {
			if (newNote.ballperson === (row.firstName + " " + row.lastName)) {
				row.notes.push(newNote);		
			}
		});
	});
	
//   initialDatabase.forEach(function(ballperson) {
//     ballperson.sort(compareDates);  //within each ballperson object, sort by timestamp
//   });
  
	return initialDatabase;
}

middlewareObj.determineTeamCount = function(data) {
	var teamNumbers = [];
	
	data.forEach(function(ballperson) {
		if (ballperson.team) {	//sanity check: ignores blank/undefined
			teamNumbers.push(Number(ballperson.team));	
		}
	});
	
	var max = 0;
	
	teamNumbers.forEach(function(number) {
		if (number > max) { max = number;	}
	})

	return max;
}

// function compareLastNames(a,b) {
//   if (a.lastName < b.lastName)
//     return -1;
//   if (a.lastName > b.lastName)
//     return 1;
//   return 0;
// }

// function compareFirstNames(a,b) {
//   if (a.firstName < b.firstName)
//     return -1;
//   if (a.firstName > b.firstName)
//     return 1;
//   return 0;
// }

// function compareDates(a,b) {
//   if (moment(a.timestamp) < moment(b.timestamp))
//     return -1;
//   if (moment(a.timestamp) > moment(b.timestamp))
//     return 1;
//   return 0;
// }

module.exports = middlewareObj;