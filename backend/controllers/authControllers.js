

module.exports = (userModel) => ({
	register: async (request, reply) => {
		const { username, email, password } = request.body
        const user = await userModel.createUser(username, email, password);
        reply.send(user);
	},
});