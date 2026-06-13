const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  text: { type: String },
  imageUrl: { type: String },
  options: [{ type: String, required: true }],
  correctAnswer: { type: String }, // Optional for survey questions
  topic: { type: String },
  isSurvey: { type: Boolean, default: false }, // If true, it doesn't affect the score
  questionType: { type: String, default: 'Multiple choice' },
  rows: [{ type: String }] // For Multiple-choice grid rows
});

module.exports = mongoose.model('Question', questionSchema);
