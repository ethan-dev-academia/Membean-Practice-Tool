let vocabulary = {};
let questions = [];

// Load vocabulary from paste.txt
async function loadVocabulary() {
    try {
        const response = await fetch('paste.txt');
        const text = await response.text();
        
        // Parse the format: word on one line, then definition on next line starting with "word:"
        const lines = text.split('\n');
        vocabulary = {};
        
        let currentWord = null;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Check if this line is a definition (contains ":")
            if (line.includes(':')) {
                if (currentWord) {
                    // Remove "word: " prefix if present
                    const definition = line.replace(/^[^:]+:\s*/, '');
                    if (definition) {
                        vocabulary[currentWord] = definition;
                    }
                    currentWord = null;
                }
            } else {
                // This is likely a word (no colon, and previous word was processed)
                if (!currentWord) {
                    currentWord = line.toLowerCase();
                }
            }
        }
        
        // Handle case where last word doesn't have a definition
        if (currentWord && !vocabulary[currentWord]) {
            console.warn(`No definition found for: ${currentWord}`);
        }
        
        generateQuestions();
        renderQuiz();
        setupTooltips();
    } catch (error) {
        console.error('Error loading vocabulary:', error);
        document.getElementById('quiz-container').innerHTML = 
            '<div style="color: red; padding: 20px;"><p><strong>Error loading paste.txt</strong></p>' +
            '<p>To use this quiz, you need to run a local web server. Options:</p>' +
            '<ul style="margin: 10px 0; padding-left: 20px;"><li>Python: <code>python -m http.server 8000</code></li>' +
            '<li>Node.js: <code>npx http-server</code></li>' +
            '<li>Then open: <code>http://localhost:8000</code></li></ul>' +
            '<p>Make sure paste.txt is in the same directory as index.html</p></div>';
    }
}

// Generate questions automatically
function generateQuestions() {
    questions = [];
    const words = Object.keys(vocabulary);
    
    words.forEach(word => {
        const definition = vocabulary[word];
        if (!definition) return;
        
        // Create contextual sentence from definition, replacing the word with blank
        let questionText = definition;
        
        // Replace the word with blank in the definition text
        const wordRegex = new RegExp(`\\b${word}\\b`, 'gi');
        questionText = questionText.replace(wordRegex, '<blank>');
        
        // If definition starts with "To [word]" or "When you [word]", clean it up
        questionText = questionText.replace(/^(to|when you|if you)\s+<blank>/i, '<blank>');
        
        // Generate 3 incorrect options from other words
        const incorrectOptions = getRandomWords(words.filter(w => w !== word), 3);
        const allOptions = [word, ...incorrectOptions].sort(() => Math.random() - 0.5);
        const correctIndex = allOptions.indexOf(word);
        
        questions.push({
            type: "fill",
            text: questionText,
            options: allOptions,
            correct: correctIndex,
            words: [word]
        });
    });
}

function getRandomWords(words, count) {
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, words.length));
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadVocabulary();
});

// Shuffle questions
function shuffleQuestions() {
    // Shuffle the questions array
    for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    // Re-render the quiz
    renderQuiz();
    setupTooltips();
}

function renderQuiz() {
    const container = document.getElementById('quiz-container');
    container.innerHTML = '';
    
    questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question';
        questionDiv.id = `question-${index}`;
        
        // Process question text to add hoverable words
        let processedText = question.text;
        question.words.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            processedText = processedText.replace(regex, `<span class="word-hover" data-word="${word.toLowerCase()}">${word}</span>`);
        });
        
        // Replace <blank> with styled blank
        processedText = processedText.replace(/<blank>/g, '<span class="blank">_____</span>');
        
        questionDiv.innerHTML = `
            <div class="question-text">${index + 1}. ${processedText}</div>
            <div class="options" id="options-${index}"></div>
            <div class="feedback" id="feedback-${index}" style="display: none;"></div>
        `;
        
        const optionsDiv = questionDiv.querySelector('.options');
        
        // Single select (radio buttons)
        question.options.forEach((option, optIndex) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            optionDiv.innerHTML = `
                <input type="radio" name="q${index}" id="q${index}-opt${optIndex}" value="${optIndex}">
                <label for="q${index}-opt${optIndex}">${option}</label>
            `;
            optionDiv.addEventListener('click', (e) => {
                if (e.target.tagName !== 'INPUT') {
                    const radio = optionDiv.querySelector('input[type="radio"]');
                    radio.checked = true;
                    checkAnswer(index);
                }
            });
            optionsDiv.appendChild(optionDiv);
        });
        
        container.appendChild(questionDiv);
    });
}

function checkAnswer(questionIndex) {
    const question = questions[questionIndex];
    const feedbackDiv = document.getElementById(`feedback-${questionIndex}`);
    const options = document.querySelectorAll(`#options-${questionIndex} .option`);
    
    const radio = document.querySelector(`#options-${questionIndex} input[type="radio"]:checked`);
    if (!radio) return;
    
    const selected = parseInt(radio.value);
    
    // Mark options
    options.forEach((optionDiv, optIndex) => {
        const input = optionDiv.querySelector('input');
        optionDiv.classList.remove('selected', 'correct', 'incorrect');
        
        if (optIndex === selected) {
            optionDiv.classList.add('selected');
            if (optIndex === question.correct) {
                optionDiv.classList.add('correct');
            } else {
                optionDiv.classList.add('incorrect');
            }
        } else if (optIndex === question.correct) {
            optionDiv.classList.add('correct');
        }
    });
    
    // Show feedback
    const isCorrect = selected === question.correct;
    feedbackDiv.className = `feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedbackDiv.textContent = isCorrect 
        ? '✓ Correct!' 
        : '✗ Incorrect. The correct answer is highlighted in green.';
    feedbackDiv.style.display = 'block';
}

function setupTooltips() {
    const tooltip = document.getElementById('tooltip');
    const wordHovers = document.querySelectorAll('.word-hover');
    
    wordHovers.forEach(wordEl => {
        wordEl.addEventListener('mouseenter', (e) => {
            const word = e.target.getAttribute('data-word').toLowerCase();
            const definition = vocabulary[word];
            if (definition) {
                tooltip.textContent = `${word}: ${definition}`;
                tooltip.classList.add('show');
                
                const rect = e.target.getBoundingClientRect();
                tooltip.style.left = rect.left + 'px';
                tooltip.style.top = (rect.bottom + 5) + 'px';
            }
        });
        
        wordEl.addEventListener('mouseleave', () => {
            tooltip.classList.remove('show');
        });
        
        wordEl.addEventListener('mousemove', (e) => {
            const rect = e.target.getBoundingClientRect();
            tooltip.style.left = rect.left + 'px';
            tooltip.style.top = (rect.bottom + 5) + 'px';
        });
    });
}

function toggleView() {
    showAll = !showAll;
    const btn = document.getElementById('showAllBtn');
    btn.textContent = showAll ? 'Show One at a Time' : 'Show All Questions';
    
    const questions = document.querySelectorAll('.question');
    questions.forEach((q, index) => {
        if (showAll) {
            q.style.display = 'block';
        } else {
            q.style.display = index === 0 ? 'block' : 'none';
        }
    });
}

// Re-setup tooltips after rendering
const observer = new MutationObserver(() => {
    setupTooltips();
});

observer.observe(document.getElementById('quiz-container'), {
    childList: true,
    subtree: true
});