const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentName: { type: String, required: true },
  studentId: { type: String, required: true },
  university: { type: String, required: true },
  semester: { type: String, required: true },
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    selectedOption: { type: String },
    isCorrect: { type: Boolean, default: false }
  }],
  score: { type: Number, required: true },
  timeTakenSeconds: { type: Number, required: true },
  tabSwitches: { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now }
});

// A student can only take a SPECIFIC exam once
submissionSchema.index({ studentId: 1, university: 1, examId: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);
