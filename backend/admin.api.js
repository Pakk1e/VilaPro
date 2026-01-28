const express = require("express");



module.exports = function createAdminApi(db) {
    const router = express.Router();

    function requireAdmin(req, res, next) {
        const email = req.cookies?.app_user;
        if (!email) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        db.get(
            "SELECT roles FROM users WHERE email = ?",
            [email],
            (err, row) => {
                if (err || !row) {
                    return res.status(403).json({ error: "Forbidden" });
                }

                const roles = row.roles ? JSON.parse(row.roles) : [];
                if (!roles.includes("admin")) {
                    return res.status(403).json({ error: "Admin access required" });
                }

                next();
            }
        );
    }



    // Apply admin check middleware to all admin routes
    router.use(requireAdmin);

    // Health check
    router.get("/health", (req, res) => {
        res.json({ status: "admin api ok" });
    });

    /**
     * GET /api/admin/users
     * Read-only list of users for Admin panel
     */
    router.get("/users", (req, res) => {
        db.all(
            `SELECT email, roles, status, last_seen FROM users ORDER BY email ASC`,
            [],
            (err, rows) => {
                if (err) {
                    console.error("Admin users query failed:", err);
                    return res.status(500).json({ error: "Failed to load users" });
                }

                const users = rows.map(row => {
                    const roles = row.roles ? JSON.parse(row.roles) : ["user"];

                    return {
                        email: row.email,
                        roles,
                        status: row.status || "active",
                        calendarAccess: roles.includes("calendar_user"),
                        lastSeen: row.last_seen
                    };
                });

                res.json({ users });
            }
        );
    });

    router.patch("/users/:email", (req, res) => {
        const targetEmail = req.params.email;
        const { roles, status } = req.body;

        // Basic validation
        if (!Array.isArray(roles) || !roles.includes("user")) {
            return res.status(400).json({ error: "Invalid roles payload" });
        }

        if (!["active", "disabled"].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        // v1.1 safety: prevent self-demotion
        const requesterEmail = req.cookies?.app_user;
        if (
            requesterEmail === targetEmail &&
            !roles.includes("admin")
        ) {
            return res.status(400).json({
                error: "You cannot remove your own admin role"
            });
        }

        db.run(
            `
            UPDATE users
            SET roles = ?, status = ?
            WHERE email = ?
            `,
            [JSON.stringify(roles), status, targetEmail],
            function (err) {
                if (err) {
                    console.error("Failed to update user:", err);
                    return res.status(500).json({ error: "Failed to update user" });
                }

                if (this.changes === 0) {
                    return res.status(404).json({ error: "User not found" });
                }

                res.json({ success: true });
            }
        );
    });



    return router;
};
