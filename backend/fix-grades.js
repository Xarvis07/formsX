const mongoose = require('mongoose');
require('dotenv').config();
const Exam = require('./models/Exam');
const Question = require('./models/Question');

async function fixGrades() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Delete the 3 old questions
  await Question.deleteMany({
    text: { $in: [
      'Course Grade in Structured Programming Language',
      'Course Grade in Object Oriented Programming (OOP)',
      'Course Grade in Java'
    ]}
  });

  const exams = await Exam.find();
  for (const exam of exams) {
    const existing = await Question.findOne({ examId: exam._id, text: 'Course Grades' });
    if (!existing) {
      const q = new Question({
        examId: exam._id,
        text: 'Course Grades',
        questionType: 'Multiple-choice grid',
        rows: ['Structured programming language', 'OOP', 'Java'],
        options: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F', 'Incomplete', 'N/A'],
        correctAnswer: '',
        topic: 'Background',
        isSurvey: true
      });
      await q.save();
    }
  }

  console.log('Fixed course grade questions!');
  process.exit();
}
fixGrades();
