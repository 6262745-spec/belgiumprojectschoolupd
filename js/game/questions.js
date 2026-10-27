// questions.js
// To add a question, copy one block and change the text.
// "answer" is the position of the right choice, counting from 0. More technically its an index position if you know what i mean.

/*
In depth:
The answer indexes if you have A, B, C, D is from 0-3, so it's basically the position of the answer subtracted by 1, that's just how js works ( 0 indexing ), dont blame me.
So say you wanna add another choice, you could do:

  {                                                                     i = 4 (5 - 1)
    question: "Example question with 5 choices?",                           |
    choices: ["Choice A", "Choice B", "Choice C", "Choice D", "Choice E, also it could be any text"],
    answer: 4,   // Choice E
  },

*/

const questions = [
  {
    question: "When did Belgium declare its independence?",
    choices: ["1802", "1830", "1742", "32 BCE"],
    answer: 1,   // Choice B
  },
  {
    question: "What are the 3 main languages of Belgium?",
    choices: [
      "Dutch, French, and German", 
      "Dutch, French, and English", 
      "French, German, and Spanish", 
      "Dutch, Flemish, and Walloon"
    ],
    answer: 0,   // Choice A
  },

  {
    question: "Example question three?",
    choices: ["Choice A", "Choice B", "Choice C", "Choice D"],
    answer: 3,   // Choice D
  },
];

for (let i = 0; i < questions.length; i++) {
  const q = questions[i];
  if (q.answer < 0 || q.answer >= q.choices.length) {
    console.warn("Question " + (i + 1) + " has an answer out of range: " + q.question);
  }
}
