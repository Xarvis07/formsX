const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Exam = require('./models/Exam');
const Question = require('./models/Question');
const Submission = require('./models/Submission');

const likertOptions = ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree'];

const questions = [
  // SECTION A
  { topic: 'Logical Reasoning', text: 'Q1. Find the next number in the sequence: 2, 6, 7, 21, 22, ?', options: ['44', '66', '46', '22'], correctAnswer: '66' },
  { topic: 'Logical Deduction', text: 'Q2. Logical Deduction: All programmers are logical thinkers. Some logical thinkers are mathematicians. Which conclusion CAN be true?', options: ['All programmers are mathematicians', 'Some programmers are mathematicians', 'No programmer is a mathematician', 'Cannot be determined'], correctAnswer: 'Some programmers are mathematicians' },
  { topic: 'Spatial Reasoning', text: 'Q3. Spatial Reasoning: A person walks 10m north, turns right and walks 5m east, turns right and walks 10m south. What is their final position?', options: ['Starting point', '5m east of start', '5m west of start', 'Cannot determine'], correctAnswer: '5m east of start' },
  { topic: 'Digital Logic', text: 'Q4. Digital Logic: For (A AND NOT B), if A=1 and B=1, what is the output?', options: ['0', '1', 'Undefined', 'Depends on timing'], correctAnswer: '0' },
  { topic: 'Algorithmic Thinking', text: 'Q5. Algorithmic Thinking: Best strategy to find a specific book in a sorted library?', options: ['Random search', 'Sequential search', 'Start at middle and eliminate half each time', 'Ask librarian'], correctAnswer: 'Start at middle and eliminate half each time' },
  { topic: 'Abstraction', text: 'Q6. Abstraction & Object Properties: Bank Account System. Select essential properties.', options: ['Current balance', 'Transaction history', 'Account type', 'Interest rate'], correctAnswer: 'Current balance' },
  { topic: 'Complex Conditionals', text: 'Q7. Complex Conditionals: attendance=85%, midterm=65%, project=85%. Grade?', options: ['A', 'B', 'F', 'Cannot determine'], correctAnswer: 'Cannot determine' },
  { topic: 'Measurement Puzzle', text: 'Q8. Measurement Puzzle: Minimum steps to measure exactly 4L using 3L and 5L buckets?', options: ['3', '4', '5', '6'], correctAnswer: '6' },
  { topic: 'Algorithm Efficiency', text: 'Q9. Algorithm Efficiency: Most efficient way to find maximum in a list?', options: ['Pairwise comparisons', 'Sort then pick last', 'Single pass through list', 'Compare middle with ends'], correctAnswer: 'Single pass through list' },
  { topic: 'State Representation', text: 'Q10. State Representation: Car simulator. Select essential attributes.', options: ['Current speed', 'Fuel level', 'Position (x,y)', 'Gear'], correctAnswer: 'Current speed' },
  { topic: 'Debugging Logic', text: 'Q11. Debugging Logic: What is the issue with sum=sum+i if sum was never declared?', options: ['No issue', 'Must initialize sum=0', 'Wrong loop range', 'Cannot add to uninitialized variable'], correctAnswer: 'Cannot add to uninitialized variable' },
  { topic: 'Optimization', text: 'Q12. Optimization Under Constraints: Best strategy for completing assignments under time constraints?', options: ['A→B→C', 'A→partial C→B', 'A→B→submit C partially', 'Any order'], correctAnswer: 'A→B→submit C partially' },
  { topic: 'System Design', text: 'Q13. System Design: Best structure for student grade management system?', options: ['Separate files', 'One spreadsheet', 'Normalized tables', 'Random database storage'], correctAnswer: 'Normalized tables' },
  { topic: 'Proportional Reasoning', text: 'Q14. Proportional Reasoning: Program processes 100 records in 2 seconds. Time for 1000 records?', options: ['20s', '200s', '10s', '2s'], correctAnswer: '20s' },
  { topic: 'Series Sum', text: 'Q15. Series Sum: What is 1 + 2 + 3 + ... + 135?', options: ['9135', '9180', '9215', '9310'], correctAnswer: '9180' },
  
  // SECTION B (Non-Verbal)
  { topic: 'Non-Verbal Reasoning', text: 'Q16. Which one is the correct answer? [UPLOAD IMAGE HERE]', options: ['A', 'B', 'C', 'D', 'E'], correctAnswer: 'C' },
  { topic: 'Non-Verbal Reasoning', text: 'Q17. Draw the next sequence of the following pattern: [UPLOAD IMAGE HERE]', options: ['Bottom-Right', 'Top-Left', 'Center', 'Bottom-Left'], correctAnswer: 'Bottom-Right' },
  { topic: 'Non-Verbal Reasoning', text: 'Q18. Which one is the correct answer? (Rotation) [UPLOAD IMAGE HERE]', options: ['A', 'D', 'G', 'J', 'L'], correctAnswer: 'G' },
  { topic: 'Non-Verbal Reasoning', text: 'Q19. Which one is the correct answer? (Count blocks) [UPLOAD IMAGE HERE]', options: ['16', '18', '19', '17', '15'], correctAnswer: '18' },
  { topic: 'Non-Verbal Reasoning', text: 'Q20. Count the number of squares? [UPLOAD IMAGE HERE]', options: ['32', '24', '30', '40', '34'], correctAnswer: '40' },

  // SECTION C - Psychological
  { topic: 'Psychological Factors', text: 'Q21. I enjoy solving difficult programming problems.', options: likertOptions, isSurvey: true },
  { topic: 'Psychological Factors', text: 'Q22. When I cannot solve a problem, I see it as a chance to learn rather than a failure.', options: likertOptions, isSurvey: true },
  { topic: 'Psychological Factors', text: 'Q23. I can learn programming if I put in effort.', options: likertOptions, isSurvey: true },
  { topic: 'Psychological Factors', text: 'Q24. I believe I can solve most programming problems if I persist.', options: likertOptions, isSurvey: true },
  { topic: 'Psychological Factors', text: 'Q25. People are born with certain programming ability; you either have it or you do not. (Reverse)', options: likertOptions, isSurvey: true },
  { topic: 'Psychological Factors', text: 'Q26. Struggling with a problem means I need different strategies, not that I am bad at it.', options: likertOptions, isSurvey: true },
  { topic: 'Psychological Factors', text: 'Q27. I adjust my study strategy if something is not working.', options: likertOptions, isSurvey: true },

  // SECTION D
  { topic: 'Background', text: 'Q28. Have you programmed before?', options: ['Never', 'Tried once', '1 course', '2+ courses', 'Regular practice'], isSurvey: true },
  { topic: 'Background', text: 'Q29. How strong is your mathematics background?', options: ['Weak', 'Average', 'Strong', 'Very Strong'], isSurvey: true },
  { topic: 'Background', text: 'Have you used an AI coding assistant (like GitHub Copilot, ChatGPT, or Gemini) before?', questionType: 'Drop-down', options: ['Yes, frequently', 'Yes, occasionally', 'No, never', 'I don\'t know what that is'], isSurvey: true },
  { topic: 'Background', text: 'Course Grade in Structured Programming Language', questionType: 'Drop-down', options: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F', 'Incomplete', 'N/A'], isSurvey: true },
  { topic: 'Background', text: 'Course Grade in Object Oriented Programming (OOP)', questionType: 'Drop-down', options: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F', 'Incomplete', 'N/A'], isSurvey: true },
  { topic: 'Background', text: 'Course Grade in Java', questionType: 'Drop-down', options: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F', 'Incomplete', 'N/A'], isSurvey: true },
  { topic: 'Background', text: 'Q30. How do you approach a challenging problem?', options: ['Give up quickly', 'Try once then ask for help', 'Try multiple times then seek help', 'Persist with multiple approaches before asking', 'Always try independently first'], isSurvey: true },
];

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    await Exam.deleteMany({});
    await Question.deleteMany({});
    await Submission.deleteMany({});
    
    const exam = await Exam.create({
      title: 'Programming Potential Assessment',
      topic: 'Logical, Non-verbal, Psychological',
      isActive: true
    });
    console.log('Exam created:', exam._id);

    const qsToInsert = questions.map(q => ({ ...q, examId: exam._id }));
    await Question.insertMany(qsToInsert);
    console.log(`Inserted ${qsToInsert.length} questions.`);
    
    console.log('Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
