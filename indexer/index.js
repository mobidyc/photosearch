/* This is a script to index photos into elasticsearch. 
This part of a post on searching through photos using Elasticsearch 
Read more at http://blog.sandeepchivukula.com */

// Extended from https://github.com/jettro/nodejs-photo-indexer//
// If  you're running this on a VM an you run out of memory create a swapfile 
// using the instructions here:
// http://stackoverflow.com/questions/26193654/node-js-catch-enomem-error-thrown-after-spawn

"use strict";

const walk = require('walk')
const exif = require('exif2')
const readline = require('readline')
const { Client } = require('@elastic/elasticsearch')
const convert = require('color-convert')
const palette = require('get-image-colors')

const suffixes = [".jpg", "jpeg", "png"] // Types of images to index
const startdir = process.argv[2] || './photos' // The Folder with images to index
const queue = 100 // How many items to queue before sending to ES
const hostandport = 'http://127.0.01:9200' //ES Server and Port 
const indexname = 'photos2' //ES Index Name 
var items = [];
const client = new Client({ node: hostandport})


/* First create the Indices */
client.indices.create({
	index: indexname,
	body: {
		"mappings": {
			"properties": {
				"file_name": { "type": "keyword" },
				"name": { "type": "keyword" },
				"camera": { "type": "text", "analyzer": "english", "fields": { "raw": { "type": "keyword" } } },
				"lens": { "type": "keyword" },
				"create_Date": { "type": "date", "ignore_malformed": true },
				"iso": { "type": "integer" },
				"focalLength": { "type": "text", "analyzer": "english", "fields": { "raw": { "type": "keyword" } } },
				"location": { "type": "geo_point" },
				"colors": { "type": "nested" } 
			}
		}
	}
}, {
	"ignore": [404]
}).then((data) => {
	console.log("index create success:")
}).catch((err) => {
	if (err.statusCode === 400) {
		console.error("Index already exists")
	} else {
		console.error(err)
	}
});

/* Go through each directory and extract data */
var walker = walk.walk(startdir);

walker.on('file', function (root, stat, next) {
	console.log("Walk " + stat.name);

	var BreakException = {};
	try {
  	suffixes.forEach(function(suffix) {
    	if (strEndsWith(stat.name.toLowerCase(), suffix)) {
				// Add this file to the list of files
				extractData(root + '/' + stat.name, next);
				throw BreakException;
  		}
		});
	} catch (e) {
 		if (e !== BreakException) throw e;
	}
	next();
});

/* Add a user input so that we wait for the extraction processes to finish 
   before flushing into the index
   */
walker.on('end', function () {
	/* we do this little hokey pokey in case things are still in flight */
	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	rl.question("What do you think of node.js? ", function (answer) {
		console.log("Thank you for your valuable feedback:", answer);
		rl.close();
		flushItems(items);
		console.log("We are done!");
	});

});


/* This is the core work horse that calls the 
functions to get the data from the images an add 
it to a search object */
function extractData(file) {
	exif(file, function (err, obj) {
		if (err) {
			console.log(err);
		} else {
			//console.log("Creating the object");
			var searchObj = {};
			searchObj.id = file;
			//We want something guranteed to be unique here like a primary key but this works. 
			searchObj.orientation = obj["orientation"];
			searchObj.flash = obj["flash"];
			searchObj.lens = obj["lens"];
			searchObj.aperture = obj["aperture"];
			searchObj.megapixels = obj["megapixels"];
			searchObj.file_name = obj["file name"];
			searchObj.directory = obj["directory"];
			searchObj.file_size = obj["file size"];
			searchObj.make = obj["make"];
			searchObj.camera_model_name = obj["camera model name"];
			searchObj.x_resolution = obj["x resolution"];
			searchObj.y_resolution = obj["y resolution"];
			searchObj.resolution_unit = obj["resolution unit"];
			searchObj.create_Date = obj["create date"];
			searchObj.focal_length = obj["focal length"];
			searchObj.focus_position = obj["focus position"];
			searchObj.focus_distance = obj["focus distance"];
			searchObj.lens_f_stops = obj["lens f stops"];
			searchObj.shutter_speed = obj["shutter speed"];
			searchObj.depth_of_field = obj["depth of field"];
			searchObj.GPS_Altitude = obj["gps altitude"];
			searchObj.GPS_Date_Time = obj["gps date/time"];
			searchObj.GPS_Latitude = obj["gps latitude"];
			searchObj.GPS_Longitude = obj["gps longitude"];
			searchObj.gps_altitude = obj["gps altitude"];
			obj["gps position"] > "" ? searchObj.location = gpstodd(obj["gps position"]) : 1;
			sendToElasticsearch(searchObj);
		}
	});

	getPalette(file, function (colors) {
		var searchObj = {}
		searchObj.id = file;
		searchObj.colors = []
		colors.forEach(function (color) {
			searchObj.colors.push({
				"h": color[0],
				"s": color[1],
				"l": color[2]
			})

		});
		sendToElasticsearch(searchObj);
	});

};


/* Some Utility functions */
function strEndsWith(str, suffix) {
	return str.match(suffix + "$") == suffix;
}

/* Convert from GPS Degrees in EXIF to Degree Decimal so the ES understands the GPS */
function gpstodd(input) {
	input = input.replace(/\'/g, " min").replace(/\"/g, ' sec').replace(/\,/g, "").split(" ")

	var lat = (parseFloat(input[0]) + parseFloat(input[2] / 60) + parseFloat(input[4] / (60 * 60))) * (input[6] == "S" ? -1 : 1);
	var lng = (parseFloat(input[7]) + parseFloat(input[9] / 60) + parseFloat(input[11] / (60 * 60))) * (input[13] == "W" ? -1 : 1);
	//console.log(searchObj)
	return {
		"lat": lat,
		"lon": lng
	}
}

/* Get Color information from the photos */
var getPalette = function (file, callback) {
	var output = []
	palette(file, function (err, colors) {
		if (err) throw err
		colors.forEach(function (color) {
			console.log(color["_rgb"][0])
			var hsl = convert.rgb.hsl(color["_rgb"])
			output.push(hsl)
		})
		callback(output);
	});
};


/*Collect and Flsuh using the Bulk Index */
function sendToElasticsearch(searchObj) {
	console.log("Sending to elastic");

	//We'll do an upsert here b/c we don't which feature will return first
	items.push({
		"update": {
			"_id": searchObj.id
		}
	}, {
		"doc": searchObj,
		"doc_as_upsert": true
	});
	if (items.length >= queue) {
		var new_items = items
		flushItems(new_items);
		new_items = [];
		items = [];
	}
}

function flushItems(new_items) {
	console.log("Flushing items");

	async function run() {
		try {
			const { body } = await client.bulk({
				index: indexname,
				body: new_items
			}, {
				ignore: [404]
			})
			console.log(body)
		} catch (err) {
			if (err.statusCode === 400) {
				console.log('Bad request')
			} else {
				console.log(err)
			}
		}
	};
	run().catch(console.log)
}
