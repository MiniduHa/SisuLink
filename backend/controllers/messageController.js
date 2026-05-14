const db = require('../config/db');

exports.sendMessage = async (req, res) => {
  try {
    const { sender_email, sender_role, sender_name, receiver_email, receiver_role, content } = req.body;

    if (!sender_email || !receiver_email || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await db.query(
      `INSERT INTO messages (sender_email, sender_role, sender_name, receiver_email, receiver_role, subject, content) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [sender_email, sender_role, sender_name, receiver_email, receiver_role, req.body.subject || null, content]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Send Message Error:", error);
    res.status(500).json({ error: "Failed to send message." });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { role, email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Fetch direct messages from 'messages' table
    const result = await db.query(
      `SELECT DISTINCT ON (other_email)
         CASE WHEN LOWER(sender_email) = $1 THEN LOWER(receiver_email) ELSE LOWER(sender_email) END as other_email,
         CASE WHEN LOWER(sender_email) = $1 THEN receiver_role ELSE sender_role END as other_role,
         CASE WHEN LOWER(sender_email) = $1 THEN 'Me' ELSE sender_name END as last_sender_name,
         CASE WHEN LOWER(sender_email) = $1 THEN 
           (SELECT first_name || ' ' || last_name FROM students WHERE LOWER(email) = LOWER(receiver_email) LIMIT 1) 
           || (SELECT full_name FROM teachers WHERE LOWER(email) = LOWER(receiver_email) LIMIT 1)
           || (SELECT full_name FROM parents WHERE LOWER(email) = LOWER(receiver_email) LIMIT 1)
         ELSE sender_name END as other_person_name,
         content as snippet,
         created_at as time,
         is_read,
         receiver_email,
         id
       FROM messages
       WHERE LOWER(sender_email) = $1 OR LOWER(receiver_email) = $1
       ORDER BY other_email, created_at DESC`,
      [cleanEmail]
    );

    let conversations = result.rows.map(row => {
      const dateObj = new Date(row.time);
      let timeStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const now = new Date();
      if (dateObj.toDateString() === now.toDateString()) {
        timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      let displayName = row.other_person_name || row.other_email;
      if (row.last_sender_name !== 'Me') {
        displayName = row.last_sender_name;
      }

      return {
        id: row.id,
        other_email: row.other_email,
        other_role: row.other_role,
        sender: displayName,
        time: timeStr,
        snippet: row.snippet,
        unread: !row.is_read && row.receiver_email.toLowerCase().trim() === cleanEmail
      };
    });

    // 2. If the user is a student or parent, also fetch relevant broadcasts from 'internal_messages'
    if (role === 'Student' || role === 'Parent') {
      let school_id, grade_level, section;
      
      if (role === 'Student') {
        const studentInfo = await db.query('SELECT school_id, grade_level, section FROM students WHERE LOWER(email) = $1', [cleanEmail]);
        if (studentInfo.rows.length > 0) {
          ({ school_id, grade_level, section } = studentInfo.rows[0]);
        }
      } else {
        // For parent, get the first child's info (or all children's info)
        // For simplicity, we fetch broadcasts for all children linked to this parent
        const parentInfo = await db.query('SELECT child_student_ids FROM parents WHERE LOWER(email) = $1', [cleanEmail]);
        if (parentInfo.rows.length > 0) {
          const childIds = parentInfo.rows[0].child_student_ids;
          if (childIds && childIds.length > 0) {
            const childrenInfo = await db.query('SELECT school_id, grade_level, section FROM students WHERE index_number = ANY($1)', [childIds]);
            if (childrenInfo.rows.length > 0) {
               // We take the first child for now to get school context, 
               // but we will fetch broadcasts matching ANY of their grades/sections
               school_id = childrenInfo.rows[0].school_id;
               const grades = childrenInfo.rows.map(c => c.grade_level);
               const sections = childrenInfo.rows.map(c => c.section);
               
               const broadcasts = await db.query(
                `SELECT * FROM internal_messages 
                 WHERE school_id = $1 
                 AND (
                   recipient_type = 'all' 
                   OR (recipient_type = 'grade' AND target_group = ANY($2))
                   OR (recipient_type = 'section' AND target_group = ANY($3))
                 )
                 ORDER BY created_at DESC LIMIT 10`,
                [school_id, grades, sections]
              );

              broadcasts.rows.forEach(b => {
                const dateObj = new Date(b.created_at);
                let timeStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const now = new Date();
                if (dateObj.toDateString() === now.toDateString()) {
                  timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }

                conversations.push({
                  id: b.id + 1000000,
                  other_email: 'admin@school.lk',
                  other_role: 'SchoolAdmin',
                  sender: b.sender_name || 'School Admin',
                  time: timeStr,
                  snippet: b.subject ? `Subject: ${b.subject}` : b.message_body,
                  unread: false
                });
              });
            }
          }
        }
      }

      if (role === 'Student' && school_id) {
        const broadcasts = await db.query(
          `SELECT * FROM internal_messages 
           WHERE school_id = $1 
           AND (
             recipient_type = 'all' 
             OR (recipient_type = 'grade' AND target_group = $2)
             OR (recipient_type = 'section' AND target_group = $3)
           )
           ORDER BY created_at DESC LIMIT 10`,
          [school_id, grade_level, section]
        );

        broadcasts.rows.forEach(b => {
          const dateObj = new Date(b.created_at);
          let timeStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const now = new Date();
          if (dateObj.toDateString() === now.toDateString()) {
            timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }

          // Add broadcast as a message from 'School Admin'
          conversations.push({
            id: b.id + 1000000, // Offset to avoid ID collision
            other_email: 'admin@school.lk',
            other_role: 'SchoolAdmin',
            sender: b.sender_name || 'School Admin',
            time: timeStr,
            snippet: b.message_body,
            unread: false // Broadcasts are usually read-only
          });
        });
      }
    }

    res.json(conversations);
  } catch (error) {
    console.error("Fetch Conversations Error:", error);
    res.status(500).json({ error: "Failed to fetch messages." });
  }
};

exports.getMessageHistory = async (req, res) => {
  try {
    const { email, otherEmail } = req.params;
    const cleanEmail = email.toLowerCase().trim();
    const cleanOtherEmail = otherEmail.toLowerCase().trim();

    const result = await db.query(
      `SELECT * FROM messages 
       WHERE (LOWER(sender_email) = $1 AND LOWER(receiver_email) = $2) 
          OR (LOWER(sender_email) = $2 AND LOWER(receiver_email) = $1)
       ORDER BY created_at ASC`,
      [cleanEmail, cleanOtherEmail]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Fetch Chat History Error:", error);
    res.status(500).json({ error: "Failed to fetch chat history." });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    await db.query('UPDATE messages SET is_read = TRUE WHERE id = $1', [messageId]);
    res.json({ success: true });
  } catch (error) {
    console.error("Mark Read Error:", error);
    res.status(500).json({ error: "Failed to update message status." });
  }
};

