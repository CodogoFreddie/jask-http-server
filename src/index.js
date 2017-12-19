import http from "http";
import fs from "fs";
import jsonfile from "jsonfile";
import recursive from "recursive-readdir";
import R from "ramda";
import url from "url";

const dotfilePath = `${require("os").homedir()}/.jaskServerConfig.js`;
let config = {};

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
				)(files),
			),
		)
		.then(x => JSON.stringify(x));

const getEvent = path =>
	new Promise(done =>
		jsonfile.readFile(config.dataFolder + path, (err, dat) => done(dat)),
	).then(x => JSON.stringify(x));

const startServer = () => {
	http
		.createServer((req, res) => {
			const parsedUrl = url.parse(req.url);

			if (req.headers.authorization !== config.key) {
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
		.listen(config.port);

	console.log(`
Server started
==============
	+ on port ${config.port}
	+ serving from ${config.dataFolder}
	+ with auth key: "${config.key}"
`);
};

console.log(`looking for config file at ${dotfilePath}`);
try {
	config = require(dotfilePath);
	startServer();
} catch (e) {
	if (e.code === "MODULE_NOT_FOUND") {
		const possible =
			"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		const generateKey = () =>
			R.times(
				() =>
					possible.charAt(
						Math.floor(Math.random() * possible.length),
					),
				128,
			).join("");

		fs.writeFile(
			dotfilePath,
			`module.exports = {
	dataFolder: \`${require("os").homedir()}/.jaskActions\`,
	port: 9000,
	key: "${generateKey()}",
}`,
			() => {
				console.log(`created a config file at ${dotfilePath}`);
				config = require(dotfilePath);
				startServer();
			},
		);
	}
}
