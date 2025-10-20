
class User {
    constructor(db) {
        this.db = db
    }

    async createUser(username, email, password) {
        const userEmailExists = await this.db("users")
            .where({ email})
            .first();
        if (userEmailExists) {
            throw new Error("Email already in use");
        }

        const userUsernameExists = await this.db("users")
            .where({ username })
            .first();
        if (userUsernameExists) {
            throw new Error("Username already in use");
        }

        // const salt = await bcrypt.genSalt(10);
        // const hashedPassword = await bcrypt.hash(password, salt);

        const [{ id }] = await this.db("users")
            .insert({
                username,
                email,
                password_hash: password,
            })
            .returning("id"); // SQLite returns id automatically
        return { id, username, email };
    }
}

module.exports = User;