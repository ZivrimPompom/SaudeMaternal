const fs = require('fs');
const content = fs.readFileSync('/app/gestacoes/page.tsx', 'utf8');

let braces = 0;
let parens = 0;
let brackets = 0;

for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') braces++;
  if (content[i] === '}') braces--;
  if (content[i] === '(') parens++;
  if (content[i] === ')') parens--;
  if (content[i] === '[') brackets++;
  if (content[i] === ']') brackets--;
  
  if (braces < 0) console.log(`Unbalanced brace at index ${i}`);
  if (parens < 0) console.log(`Unbalanced paren at index ${i}`);
  if (brackets < 0) console.log(`Unbalanced bracket at index ${i}`);
}

console.log(`Final counts: braces=${braces}, parens=${parens}, brackets=${brackets}`);
