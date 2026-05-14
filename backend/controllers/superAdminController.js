const db = require('../config/db');
const nodemailer = require('nodemailer');

exports.getIndustryPartners = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM industry_partners ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Failed to fetch industry partners." }); }
};

exports.updateIndustryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await db.query('UPDATE industry_partners SET status = $1 WHERE id = $2 RETURNING *', [status, id]);

    if (result.rows.length > 0 && status === 'Active') {
      const partner = result.rows[0];
      // Send approval email
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: partner.email,
        subject: 'SisuLink - Industry Partner Account Approved!',
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #2563EB;">Congratulations, ${partner.company_name}!</h2>
            <p>Your Industry Partner account on <b>SisuLink</b> has been approved by the Super Admin.</p>
            <p>You can now log in to the mobile app and start posting internship opportunities for students.</p>
            <p>Note: All posted jobs will require final approval from the respective school administration before becoming visible to students.</p>
            <br/>
            <p>Best Regards,<br/>SisuLink Team</p>
          </div>
        `
      };

      transporter.sendMail(mailOptions, (error) => {
        if (error) console.error("Email sending failed:", error);
      });
    }

    res.json({ message: `Status updated to ${status}`, partner: result.rows[0] });
  } catch (error) { res.status(500).json({ error: "Failed to update status." }); }
};

