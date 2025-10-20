const fastify = require("fastify")({
	logger: {
		level: "error",
		transport: {
			target: "pino-pretty",
			options: {
				colorize: true, // Adds color to the logs
				translateTime: "SYS:standard", // Human-readable timestamp
				ignore: "pid,hostname", // Hide unneeded fields
			},
		},
	},
});

const authRoutes = require("./routes/authRoutes");

const User = require("./models/User");

const connectDB = require("./connect/connect");

const start = async () => {
	try {
		// 1. Connect to DB
		const db = connectDB("data");
		console.log("Database connected");

		// 1.5. Run migrations to ensure all tables exist
		await db.migrate.latest();
		console.log("Database migrations completed");

        const userModel = new User(db);

        fastify.register(authRoutes, {
            userModel,
			prefix: "/api/v1/auth",
		});


		const address = await fastify.listen({
			port: 3000,
			host: "0.0.0.0",
		});
	} catch (err) {
		console.log(err.message);
		process.exit(1);
	}
};

start();
