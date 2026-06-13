const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Submission = require('../models/Submission');
const Admin = require('../models/Admin');
const { extractQuestionsFromDocx } = require('../utils/parser');

// Configure Multer for disk storage (images)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadDisk = multer({ storage: storage });
const uploadMem = multer({ storage: multer.memoryStorage() }); // for docx

// Middleware for Admin Auth
const authAdmin = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'Access denied.' });
  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (ex) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

// ====================
// PUBLIC ROUTES
// ====================

// Get active exam and questions
router.get('/active-exam', async (req, res) => {
  try {
    const activeExam = await Exam.findOne({ isActive: true });
    if (!activeExam) return res.status(404).json({ error: 'No active exam found' });

    // Send questions without correct answers
    const questions = await Question.find({ examId: activeExam._id }).select('-correctAnswer');
    res.json({ exam: activeExam, questions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch active exam' });
  }
});

// Submit exam
router.post('/submit', async (req, res) => {
  try {
    const { examId, studentName, studentId, university, semester, answers, timeTakenSeconds, tabSwitches } = req.body;

    // Check if student already submitted for this specific exam
    const existing = await Submission.findOne({ examId, studentId, university });
    if (existing) return res.status(400).json({ error: 'Student has already taken this exam.' });

    let score = 0;
    const processedAnswers = [];

    // Calculate score server-side
    for (let ans of answers) {
      const q = await Question.findById(ans.questionId);
      if (q) {
        let isCorrect = false;
        if (!q.isSurvey) {
          isCorrect = q.correctAnswer === ans.selectedOption;
          if (isCorrect) score += 1;
        }
        processedAnswers.push({
          questionId: q._id,
          selectedOption: ans.selectedOption,
          isCorrect
        });
      }
    }

    const submission = new Submission({
      examId, studentName, studentId, university, semester, answers: processedAnswers, score, timeTakenSeconds, tabSwitches
    });

    await submission.save();
    res.status(201).json({ message: 'Exam submitted successfully!', score });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) return res.status(400).json({ error: 'Student has already taken this exam.' });
    res.status(500).json({ error: 'Failed to submit exam' });
  }
});

// ====================
// ADMIN ROUTES
// ====================
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(400).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ _id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get all exams
router.get('/admin/exams', authAdmin, async (req, res) => {
  try {
    const exams = await Exam.find().sort({ createdAt: -1 });
    res.json(exams);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Create exam
router.post('/admin/exams', authAdmin, async (req, res) => {
  try {
    const exam = new Exam(req.body);
    await exam.save();
    res.json(exam);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Set active exam
router.put('/admin/exams/:id/active', authAdmin, async (req, res) => {
  try {
    await Exam.updateMany({}, { isActive: false });
    const exam = await Exam.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
    res.json(exam);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Delete an exam and its associated questions/submissions
router.delete('/admin/exams/:id', authAdmin, async (req, res) => {
  try {
    const examId = req.params.id;
    // Prevent deleting the active exam if it's the only one, or maybe just let them
    await Question.deleteMany({ examId });
    await Submission.deleteMany({ examId });
    await Exam.findByIdAndDelete(examId);
    
    // If the deleted exam was active, make the first available exam active
    const remainingExam = await Exam.findOne();
    if (remainingExam) {
      await Exam.updateMany({}, { isActive: false });
      remainingExam.isActive = true;
      await remainingExam.save();
    }

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete exam' }); }
});

// Duplicate an exam
router.post('/admin/exams/:id/duplicate', authAdmin, async (req, res) => {
  try {
    const originalExam = await Exam.findById(req.params.id);
    if (!originalExam) return res.status(404).json({ error: 'Exam not found' });

    const newExam = new Exam({
      title: `${originalExam.title} (Copy)`,
      topic: originalExam.topic,
      isActive: false
    });
    await newExam.save();

    const questions = await Question.find({ examId: originalExam._id });
    const newQuestions = questions.map(q => ({
      examId: newExam._id,
      text: q.text,
      options: q.options,
      imageUrl: q.imageUrl,
      correctAnswer: q.correctAnswer,
      topic: q.topic,
      isSurvey: q.isSurvey,
      questionType: q.questionType
    }));
    
    if (newQuestions.length > 0) {
      await Question.insertMany(newQuestions);
    }

    res.json(newExam);
  } catch (err) { res.status(500).json({ error: 'Failed to duplicate' }); }
});

// Get questions for specific exam
router.get('/admin/exams/:id/questions', authAdmin, async (req, res) => {
  try {
    const questions = await Question.find({ examId: req.params.id });
    res.json(questions);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Add single question (with optional image)
router.post('/admin/questions', authAdmin, uploadDisk.single('image'), async (req, res) => {
  try {
    const { examId, text, options, correctAnswer, topic, isSurvey } = req.body;
    let imageUrl = '';
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    // Parse options because formData sends them as a JSON string
    const parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;

    const q = new Question({
      examId, text, imageUrl, options: parsedOptions, correctAnswer, topic, isSurvey: isSurvey === 'true'
    });
    await q.save();
    res.json(q);
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: 'Failed to add question' }); 
  }
});

// Update an existing question's image
router.put('/admin/questions/:id/image', authAdmin, uploadDisk.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const imageUrl = `/uploads/${req.file.filename}`;
    await Question.findByIdAndUpdate(req.params.id, { imageUrl });
    res.json({ imageUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update image' });
  }
});

// Update question details (type, options, text, rows)
router.put('/admin/questions/:id', authAdmin, async (req, res) => {
  try {
    const { text, options, rows, questionType, correctAnswer, topic } = req.body;
    await Question.findByIdAndUpdate(req.params.id, { text, options, rows, questionType, correctAnswer, topic });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// Delete a submission
router.delete('/admin/submissions/:id', authAdmin, async (req, res) => {
  try {
    await Submission.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

// Dashboard Analytics (For all exams and submissions)
router.get('/admin/dashboard', authAdmin, async (req, res) => {
  try {
    const exams = await Exam.find().sort({ createdAt: -1 });
    
    // Fetch all submissions, populated with exam and question details
    const submissions = await Submission.find()
      .sort({ submittedAt: -1 })
      .populate('examId', 'title topic')
      .populate('answers.questionId', 'topic text questionType options correctAnswer isSurvey');
    
    const universityStats = await Submission.aggregate([
      { $group: { _id: "$university", avgScore: { $avg: "$score" }, totalStudents: { $sum: 1 }, avgTime: { $avg: "$timeTakenSeconds" } } }
    ]);

    const totalStats = await Submission.aggregate([
      { $group: { _id: null, avgScore: { $avg: "$score" }, totalStudents: { $sum: 1 }, avgTime: { $avg: "$timeTakenSeconds" } } }
    ]);

    res.json({ exams, submissions, universityStats, totalStats: totalStats[0] || null });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch dashboard data' }); }
});

// Export ALL Responses to Excel
router.get('/admin/export-all', authAdmin, async (req, res) => {
  try {
    const submissions = await Submission.find().populate('examId').populate('answers.questionId');
    if (submissions.length === 0) return res.status(404).json({ error: 'No submissions found' });

    const allQuestions = await Question.find();
    
    // Group questions by their text so columns align perfectly across different exams
    const uniqueQuestionsMap = new Map();
    allQuestions.forEach(q => {
      if (!uniqueQuestionsMap.has(q.text)) {
        uniqueQuestionsMap.set(q.text, q);
      }
    });
    const uniqueQuestions = Array.from(uniqueQuestionsMap.values());

    const data = submissions.map(sub => {
      let row = {
        'Exam Title': sub.examId ? sub.examId.title : 'Unknown',
        'Student Name': sub.studentName,
        'Student ID': sub.studentId,
        'Score': sub.score,
        'Time Taken (s)': sub.timeTakenSeconds,
        'Tab Switches': sub.tabSwitches,
        'Submitted At': sub.createdAt
      };
      
      uniqueQuestions.forEach((uq, index) => {
        // Find if this student answered a question with the same text
        const ans = sub.answers.find(a => a.questionId && a.questionId.text === uq.text);
        row[`Q${index + 1}: ${uq.text}`] = ans ? ans.selectedOption : 'N/A';
      });

      return row;
    });

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'All_Responses');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="overall_exam_responses.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// Upload docx and generate questions (For a specific exam)
router.post('/admin/upload/:examId', authAdmin, uploadMem.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const generatedQuestions = await extractQuestionsFromDocx(req.file.buffer, process.env.GEMINI_API_KEY);
    
    const qs = generatedQuestions.map(q => ({ ...q, examId: req.params.examId }));
    await Question.insertMany(qs);

    res.json({ message: 'Questions parsed and added successfully!', count: generatedQuestions.length });
  } catch (err) { res.status(500).json({ error: 'Failed to process document.' }); }
});

// Export to Excel (Google Forms style)
router.get('/admin/export/:examId', authAdmin, async (req, res) => {
  try {
    const examId = req.params.examId;
    const questions = await Question.find({ examId });
    const submissions = await Submission.find({ examId }).sort({ submittedAt: -1 });

    const data = submissions.map(sub => {
      const row = {
        'Timestamp': sub.submittedAt.toISOString(),
        'Student Name': sub.studentName,
        'Student ID': sub.studentId,
        'University': sub.university,
        'Semester': sub.semester,
        'Score': sub.score,
        'Time Taken (s)': sub.timeTakenSeconds,
        'Tab Switches (Cheat attempts)': sub.tabSwitches,
      };

      // Add each question as a column (Google Forms style)
      questions.forEach((q, idx) => {
        const studentAns = sub.answers.find(a => a.questionId.toString() === q._id.toString());
        // Column header can be "Q1: text..."
        const colName = `Q${idx + 1}: ${q.text || 'Image Question'}`;
        row[colName] = studentAns ? studentAns.selectedOption : 'No Answer';
      });

      return row;
    });

    if (data.length === 0) return res.status(400).json({ error: 'No submissions to export.' });

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Responses");

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename="exam_responses.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

module.exports = router;
