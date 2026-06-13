const mongoose = require('mongoose');
require('dotenv').config();
const Exam = require('./models/Exam');
const Question = require('./models/Question');

async function addCourseGradeQuestion() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const exams = await Exam.find();
  if (exams.length === 0) {
    console.log('No exams found. Run seed.js first.');
    process.exit();
  }

  for (const exam of exams) {
    // Check if it already exists
    const existing = await Question.findOne({ examId: exam._id, text: 'Course Grade in Structured Programming Language' });
    if (!existing) {
      const q1 = new Question({
        examId: exam._id,
        text: 'Course Grade in Structured Programming Language',
        questionType: 'Drop-down',
        options: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F', 'Incomplete', 'N/A'],
        correctAnswer: '',
        topic: 'Background',
        isSurvey: true
      });
      await q1.save();
      
      const q2 = new Question({
        examId: exam._id,
        text: 'Course Grade in Object Oriented Programming (OOP)',
        questionType: 'Drop-down',
        options: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F', 'Incomplete', 'N/A'],
        correctAnswer: '',
        topic: 'Background',
        isSurvey: true
      });
      await q2.save();
      
      const q3 = new Question({
        examId: exam._id,
        text: 'Course Grade in Java',
        questionType: 'Drop-down',
        options: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F', 'Incomplete', 'N/A'],
        correctAnswer: '',
        topic: 'Background',
        isSurvey: true
      });
      await q3.save();
      
      console.log(`Added course grade questions to Exam: ${exam.title}`);
    } else {
      console.log(`Course grade questions already exist in Exam: ${exam.title}`);
    }
  }

  console.log('Successfully added Course Grade questions!');
  process.exit();
}

addCourseGradeQuestion();
