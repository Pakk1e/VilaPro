const express = require("express");



module.exports = function createAdminApi(
    db,
    getVillaProTimestamp,
    runtime
) {
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
            `
            SELECT
              email,
              roles,
              status,
              last_seen,
              approved_at
            FROM users
            ORDER BY email ASC
            `,
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
                        approved: !!row.approved_at,   // 👈 ADD THIS
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

    /**
     * PATCH /api/admin/users/:email/approve
     * Approve user account
     */
    router.patch("/users/:email/approve", (req, res) => {
        const targetEmail = req.params.email;

        db.run(
            `
        UPDATE users
        SET approved_at = ?
        WHERE email = ?
        `,
            [getVillaProTimestamp(), targetEmail],
            function (err) {
                if (err) {
                    console.error("Failed to approve user:", err);
                    return res.status(500).json({ error: "Failed to approve user" });
                }

                if (this.changes === 0) {
                    return res.status(404).json({ error: "User not found" });
                }

                res.json({ success: true });
            }
        );
    });

    router.delete("/users/:email", (req, res) => {
        const targetEmail = req.params.email;
        const requesterEmail = req.cookies?.app_user;

        if (!targetEmail) {
            return res.status(400).json({
                error: "Invalid user email",
            });
        }

        if (targetEmail === requesterEmail) {
            return res.status(400).json({
                error: "You cannot delete your own account",
            });
        }

        db.get(
            `
        SELECT email, status
        FROM users
        WHERE email = ?
        `,
            [targetEmail],
            (userErr, user) => {
                if (userErr) {
                    console.error(
                        "Failed to load target user before deletion:",
                        userErr
                    );

                    return res.status(500).json({
                        error: "Failed to load user",
                    });
                }

                if (!user) {
                    return res.status(404).json({
                        error: "User not found",
                    });
                }

                if (user.status !== "disabled") {
                    return res.status(409).json({
                        error:
                            "Only disabled users can be deleted.",
                    });
                }

                runtime.getRunningBulkRulesForUser(
                    targetEmail,
                    (bulkErr, runningRules) => {
                        if (bulkErr) {
                            console.error(
                                "Failed to check running bulk rules:",
                                bulkErr
                            );

                            return res.status(500).json({
                                error:
                                    "Failed to check running automation.",
                            });
                        }

                        if (runningRules.length > 0) {
                            return res.status(409).json({
                                error:
                                    "A bulk automation is currently running for this user. Wait until it finishes and try again.",
                                runningRuleIds: runningRules,
                            });
                        }

                        // Stop any active snipers immediately.
                        runtime.stopUserSnipers(targetEmail);

                        db.serialize(() => {
                            db.run("BEGIN TRANSACTION");

                            const statements = [
                                [
                                    "DELETE FROM bulk_exceptions WHERE email = ?",
                                    [targetEmail],
                                ],
                                [
                                    `
                                DELETE FROM bulk_exceptions
                                WHERE rule_id IN (
                                    SELECT id
                                    FROM bulk_rules
                                    WHERE email = ?
                                )
                                `,
                                    [targetEmail],
                                ],
                                [
                                    "DELETE FROM bulk_rules WHERE email = ?",
                                    [targetEmail],
                                ],
                                [
                                    "DELETE FROM snipers WHERE email = ?",
                                    [targetEmail],
                                ],
                                [
                                    "DELETE FROM reservations WHERE user_email = ?",
                                    [targetEmail],
                                ],
                                [
                                    "DELETE FROM automation_exceptions WHERE email = ?",
                                    [targetEmail],
                                ],
                                [
                                    "DELETE FROM activity_logs WHERE email = ?",
                                    [targetEmail],
                                ],
                                [
                                    "DELETE FROM user_settings WHERE email = ?",
                                    [targetEmail],
                                ],
                                [
                                    "DELETE FROM users WHERE email = ?",
                                    [targetEmail],
                                ],
                            ];

                            let failed = false;

                            const runNext = (index) => {
                                if (index >= statements.length) {
                                    if (failed) {
                                        db.run("ROLLBACK");
                                        return;
                                    }

                                    db.run(
                                        "COMMIT",
                                        (commitErr) => {
                                            if (commitErr) {
                                                console.error(
                                                    "Failed to commit user deletion:",
                                                    commitErr
                                                );

                                                db.run(
                                                    "ROLLBACK"
                                                );

                                                return res
                                                    .status(500)
                                                    .json({
                                                        error:
                                                            "Failed to delete user",
                                                    });
                                            }

                                            console.log(
                                                `🗑️ Admin deleted disabled user ${targetEmail}`
                                            );

                                            return res.json({
                                                success: true,
                                                deleted: true,
                                            });
                                        }
                                    );

                                    return;
                                }

                                const [
                                    sql,
                                    params,
                                ] = statements[index];

                                db.run(
                                    sql,
                                    params,
                                    (err) => {
                                        if (err) {
                                            failed = true;

                                            console.error(
                                                "Failed during user deletion:",
                                                err
                                            );

                                            db.run(
                                                "ROLLBACK",
                                                () => {
                                                    res.status(500).json({
                                                        error:
                                                            "Failed to delete user",
                                                    });
                                                }
                                            );

                                            return;
                                        }

                                        runNext(index + 1);
                                    }
                                );
                            };

                            runNext(0);
                        });
                    }
                );
            }
        );
    });




    return router;
};
