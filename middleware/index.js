var google = require('googleapis'),
		sheetsApi = google.sheets('v4'),
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
			notes: []
		};
		initialDatabase.push(newObj);
		idNum++;
	});
	
	initialDatabase.shift(); //removes the header row
	
	notes.forEach(function(note) {
		var newNote = { ballperson: note[0], author: note[1], timestamp: note[2], note: note[3]	};
		
		initialDatabase.forEach(function(row) {
			if (newNote.ballperson === (row.firstName + " " + row.lastName)) {
				row.notes.push(newNote);		
			}
		});
	});
	
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

module.exports = middlewareObj;