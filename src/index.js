import http from "http";
import fs from "fs";
import jsonfile from "jsonfile";
import recursive from "recursive-readdir";
import R from "ramda";
import url from "url";

import getConfig from "./config";

getConfig().then(config => {
	const { dataFolder, server: { port, key, }, } = config;
	const getAllEventsIdents = () =>
		new Promise(done => {
			recursive(dataFolder, (err, files) => {
				done(files || []);
			});
		})
			.then(files =>
				Promise.all(
					R.pipe(
						R.sortBy(
							R.pipe(R.replace(/.+\//, ""), x => parseInt(x, 10)),
						),
						R.map(R.replace(dataFolder + "/", "")),
					)(files),
				),
			)
			.then(x => JSON.stringify(x));

	const getEvent = path =>
		new Promise(done =>
			jsonfile.readFile(dataFolder + path, (err, dat) => done(dat)),
		).then(x => JSON.stringify(x));

	const startServer = () => {
		http
			.createServer((req, res) => {
				const parsedUrl = url.parse(req.url);

				if (req.headers.authorization !== key) {
					res.statusCode = 401;
					return res.end(
						'{err:401, msg: "not authorised, please provide key"}',
					);
				}

				if (parsedUrl.pathname === "/") {
					res.setHeader("Content-type", "application/json");
					getAllEventsIdents().then(data => res.end(data));
				} else {
					res.setHeader("Content-type", "application/json");
					getEvent(parsedUrl.pathname).then(data => res.end(data));
				}
			})
			.listen(port);

		console.log(`
Server started
==============
	+ on port ${port}
	+ serving from ${dataFolder}
	+ with auth key: "${key}"
`);
	};

	startServer();
});
