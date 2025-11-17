/*   Configuração Customizada do Tailwind */
tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                'sans': ['Inter', 'sans-serif'],
                'heading': ['Russo One', 'sans-serif']
            },
            colors: {
                'ninja-blue': {
                    '400': '#00bfff', // DeepSkyBlue
                    '600': '#009acd'
                },
                'ninja-orange': {
                    '400': '#ff4500', // OrangeRed
                    '500': '#ff4500',
                    '600': '#e63e00'
                },
                'ninja-dark': '#0a0a0a', // Quase preto
                'ninja-red': {
                    '500': '#dc2626', // red-600
                    '600': '#b91c1c' // red-700
                }
            }
        }
    }
}




// Lógica do FAQ (Acordeão)
document.addEventListener('DOMContentLoaded', () => {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const button = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        const icon = button.querySelector('.faq-icon');

        button.addEventListener('click', () => {
            const isOpen = answer.classList.contains('open');

            document.querySelectorAll('.faq-answer').forEach(ans => {
                ans.classList.remove('open');
                ans.style.maxHeight = null;
            });
            document.querySelectorAll('.faq-icon').forEach(ic => {
                ic.classList.remove('rotate-180');
            });

            if (!isOpen) {
                answer.classList.add('open');
                answer.style.maxHeight = answer.scrollHeight + 'px';
                icon.classList.add('rotate-180');
            }
        });
    });
});

// --- LÓGICA DA API GEMINI ---

const API_KEY = ""; // Deixe em branco, será fornecido pelo ambiente
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;

// Definição dos prompts de hardware para cada plano
const hardwarePrompts = {
    basico: "Hardware: Processador Ryzen 5 5500, Placa de vídeo RX580, 16GB RAM 3200MHZ, SSD 512GB Sata.",
    intermediario: "Hardware: Processador Ryzen 5 7600X, Placa de vídeo RTX 5060 Ti, 16GB RAM 5600MHz, SSD 1TB M.2.",
    pro: "Hardware: Processador Ryzen 7 7800X3D, Placa de vídeo RTX 5070, 32GB RAM 6000MHz, SSD Kingston Fury 1TB."
};

// Função principal chamada pelo botão
function getGameSuggestion(planName, buttonElement) {
    const hardwarePrompt = hardwarePrompts[planName];
    const loadingDiv = document.getElementById(`loading-${planName}`);
    const resultDiv = document.getElementById(`result-${planName}`);

    // Oculta o botão e o resultado anterior, mostra o loader
    buttonElement.style.display = 'none';
    resultDiv.classList.add('hidden');
    loadingDiv.classList.remove('hidden');

    // Chama a função da API
    callGeminiAPI(hardwarePrompt, planName)
        .then(text => {
            // Sucesso: mostra o resultado
            resultDiv.innerText = text;
            resultDiv.classList.remove('hidden');
        })
        .catch(error => {
            // Erro: mostra uma mensagem de erro e re-exibe o botão
            console.error(error);
            resultDiv.innerText = "Desculpe, não foi possível gerar a análise. Tente novamente.";
            resultDiv.classList.remove('hidden');
            buttonElement.style.display = 'inline-block';
        })
        .finally(() => {
            // Sempre oculta o loader
            loadingDiv.classList.add('hidden');
        });
}

// Função para chamar a API com retry (exponential backoff)
async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.status === 429 || response.status >= 500) {
                // Throttling ou erro de servidor, espera e tenta de novo
                throw new Error(`Server error: ${response.status}`);
            }
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.warn(`Attempt ${i + 1} failed. Retrying in ${delay}ms...`);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            } else {
                throw error; // Lança o erro após a última tentativa
            }
        }
    }
}

// Função async que monta e envia a requisição para a API Gemini
async function callGeminiAPI(hardwarePrompt, planName) {
    const systemPrompt = "Você é um especialista em hardware de PC gamer. Seu tom é animador, confiável e direto (linguagem gamer, mas sem exageros). Dado uma lista de hardware, gere uma breve análise (cerca de 2-3 frases curtas) de quais tipos de jogos e qual performance (ex: 1080p, 1440p, 4K, 60fps+, high/ultra) o usuário pode esperar. Foque nos benefícios reais para o jogador.";

    const payload = {
        contents: [{
            parts: [{
                text: hardwarePrompt
            }]
        }],
        systemInstruction: {
            parts: [{
                text: systemPrompt
            }]
        },
    };

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    };

    try {
        const result = await fetchWithRetry(API_URL, options);

        if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts[0].text) {
            return result.candidates[0].content.parts[0].text;
        } else {
            throw new Error("Resposta da API inválida ou vazia.");
        }
    } catch (error) {
        console.error("Erro ao chamar a API Gemini:", error);
        throw error; // Propaga o erro para o handler .catch()
    }
}