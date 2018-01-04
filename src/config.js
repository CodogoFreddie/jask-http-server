import fs from "fs";
import R from "ramda";

const dotfilePath = `${require("os").homedir()}/.jaskrc.js`;
let config = null;

export default () =>
	config
		? Promise.resolve(config)
		: new Promise(done => {
			try {
				config = require(dotfilePath);
				done(config);
			} catch (e) {
				if (e.code === "MODULE_NOT_FOUND") {
					const possible =
							"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
					const generateKey = () =>
						R.times(
							() =>
								possible.charAt(
									Math.floor(
										Math.random() * possible.length,
									),
								),
							128,
						).join("");

					fs.writeFile(
						dotfilePath,
						`module.exports = {
	dataFolder: \`${require("os").homedir()}/.jaskActions\`,
	server: {
		port: 9000,
		key: "${generateKey()}",
	},
	client: {
		userHTTPServer: false,
		rendering: {
			//these will eventually be depricated, in favour of storing such things in the action store.
			//this will allow for universal cross clien config
			giveScore: ({ uuid, due, created, updated, done, tags, project, prioirty, }, { now, }) => {
				return Math.pow(10, ( ( due - now ) / 4320000 ) + 1);
			},
			filterAction: ({ done, }) => !!done,
			headers: [
				"score",
				"id",
				"description",
				"due",
				"tags",
				"priority",
				"project",
				"depends",
				"recur",
			],
		}
	},
}`,
						() => {
							console.log(
								`created a config file at ${dotfilePath}`,
							);
							config = require(dotfilePath);
							done(config);
						},
					);
				}
			}
		});
