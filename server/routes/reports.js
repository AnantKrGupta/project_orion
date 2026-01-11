const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const User = require('../models/User');
const sanitize = require('mongo-sanitize');

// Handle report and auto-ban
async function handleReport(targetUserId, reporterUserId, reason, type, contentId = null) {
    // Create report
    await Report.create({
        targetUser: targetUserId,
        reporter: reporterUserId,
        reason,
        type,
        contentId
    });

    // Increment report count
    const user = await User.findByIdAndUpdate(
        targetUserId,
        { $inc: { reportCount: 1 } },
        { new: true }
    );

    // Auto-ban at 3 reports
    if (user.reportCount >= 3) {
        await User.updateOne(
            { _id: targetUserId },
            {
                bannedUntil: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
                reportCount: 0 // Reset
            }
        );
        return { autoBanned: true, duration: '48 hours' };
    }

    return { autoBanned: false, reportCount: user.reportCount };
}

// Submit report
router.post('/', async (req, res) => {
    try {
        const { email, targetEmail, reason, type, contentId } = req.body;

        if (!['spam', 'abuse', 'inappropriate', 'harassment', 'other'].includes(reason)) {
            return res.status(400).json({ error: 'Invalid reason' });
        }

        if (!['chat', 'post', 'comment'].includes(type)) {
            return res.status(400).json({ error: 'Invalid type' });
        }

        const reporter = await User.findOne({ email: sanitize(email) });
        const target = await User.findOne({ email: sanitize(targetEmail) });

        if (!reporter || !target) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (reporter._id.equals(target._id)) {
            return res.status(400).json({ error: 'Cannot report yourself' });
        }

        const result = await handleReport(
            target._id,
            reporter._id,
            reason,
            type,
            contentId ? sanitize(contentId) : null
        );

        res.json({
            success: true,
            message: result.autoBanned
                ? 'User has been automatically banned for 48 hours'
                : 'Report submitted successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
module.exports.handleReport = handleReport;
