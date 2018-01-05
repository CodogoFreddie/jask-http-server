import express from "express";
import cors from "cors";
import jsonfile from "jsonfile";
import recursive from "recursive-readdir";
import R from "ramda";

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
						R.map(R.replace("/", "_")),
					)(files),
				),
			)
			.then(x => JSON.stringify(x));

	const getEvent = path =>
		new Promise(done =>
			jsonfile.readFile(
				dataFolder + "/" + path.replace("_", "/"),
				(err, dat) => {
					console.log({ err, dat, });
					return done(dat);
				},
			),
		).then(x => JSON.stringify(x));

	const app = express();

	app.options("/", cors());
	app.get("/", cors(), (req, res) => {
		if (req.headers.authorization !== key) {
			return res
				.status(401)
				.send('{err:401, msg: "not authorised, please provide key"}');
		}

		res.set("Content-type", "application/json");
		getAllEventsIdents().then(data => res.send(data));
	});

	app.options("/:key", cors());
	app.get("/:key", cors(), (req, res) => {
		if (req.headers.authorization !== key) {
			return res
				.status(401)
				.send('{err:401, msg: "not authorised, please provide key"}');
		}

		res.set("Content-type", "application/json");
		getEvent(req.params.key).then(data => res.end(data));
	});

	app.listen(port, () => {
		console.log(`
Server started
==============
	+ on port ${port}
	+ serving from ${dataFolder}
	+ with auth key: "${key}"
`);
	});
});
