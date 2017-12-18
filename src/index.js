import http from "http";
import fs from "fs";
import jsonfile from "jsonfile";
import recursive from "recursive-readdir";
import R from "ramda";
import url from "url";

const dotfilePath = `${require("os").homedir()}/.jaskServerConfig.js`;
let config = {};
try {
	config = require(dotfilePath);
} catch (e) {
	if (!fs.existsSync(dotfilePath)) {
		fs.writeFile(
			dotfilePath,
			`module.exports = {
	dataFolder: \`${require("os").homedir()}/Sync/Files/Jask\`,
	port: 9000,
}`,
			err => {
				console.log(`created a config file at ${dotfilePath}`);
				config = require(dotfilePath);
			},
		);
	}
}

// you can pass the parameter in the command line. e.g. node static_server.js 3000
const port = config.port;

const getAllEventsIdents = () =>
	new Promise(done => {
		recursive(config.dataFolder, (err, files) => {
			done(files || []);
		});
	})
		.then(files =>
			Promise.all(
				R.pipe(
					R.sortBy(
						R.pipe(R.replace(/.+\//, ""), x => parseInt(x, 10)),
					),
					R.map(R.replace(config.dataFolder + "/", "")),
					//R.map(
					//filename =>
					//new Promise(done =>
					//jsonfile.readFile(filename, (err, dat) =>
					//done(dat),
					//),
					//),
					//),
				)(files),
			),
		)
		.then(x => JSON.stringify(x));

http
	.createServer((req, res) => {
		console.log(`${req.method} ${req.url}`);
		// parse URL
		const parsedUrl = url.parse(req.url);
		// extract URL path
		let pathname = `.${parsedUrl.pathname}`;

		console.log(parsedUrl.pathname);

		if (parsedUrl.pathname === "/") {
			res.setHeader("Content-type", "application/json");
			getAllEventsIdents().then(data => res.end(data));
		}
	})
	.listen(parseInt(port));

console.log(`Server listening on port ${port}`);
