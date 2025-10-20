
async function authRoutes(fastify, options) {
    const { userModel } = options;

    const {register} = require("../controllers/authControllers")(userModel);

	// set the endpoints
	fastify.post("/register", register);
	// fastify.post("/login", loginOpts, login);
	// fastify.post(
	// 	"/logout",
	// 	{
	// 		preHandler: fastify.authenticate,
	// 		schema: logoutOpts.schema,
	// 	},
	// 	logout
	// );
}

module.exports = authRoutes;