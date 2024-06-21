function initialize() {
    addCheckButtons();
    observeDOMChanges();
}

function addCheckButtons() {
    const summaries = document.querySelectorAll('summary');
    summaries.forEach(summary => {
        if (summary.textContent.includes('Show Output')) {
            const existingButton = summary.parentElement.querySelector('.check-atlantis-plan-button');
            if (!existingButton) {
                const button = createButton();
                summary.appendChild(button);
            }
        }
    });
}

function createButton() {
    const button = document.createElement('button');
    button.textContent = 'Analyze AI';
    button.className = 'btn btn-sm check-atlantis-plan-button';
    button.style.marginLeft = '10px';
    button.addEventListener('click', checkForAtlantisPlan);
    return button;
}

function observeDOMChanges() {
    const observer = new MutationObserver(() => addCheckButtons());
    observer.observe(document.body, { childList: true, subtree: true });
}

async function checkForAtlantisPlan(event) {
    const button = event.target;
    const summary = button.closest('summary');
    const details = summary.parentElement;
    const highlightDiv = details.querySelector('div');
    const pre = highlightDiv ? highlightDiv.querySelector('pre') : null;

    if (pre) {
        const planContent = pre.textContent;
        const report = await generateAtlantisPlanReport(planContent, button);
        openPopupWithContent(report);
        console.log(report);
    }
}

function openPopupWithContent(content) {
    const popup = window.open("", "popup", "width=600,height=400");
    popup.document.write(`
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                h1 { color: #333; }
               
            </style>
        </head>
        <body>
            <div class="content">${content}</div>
        </body>
        </html>
    `);
}

async function generateAtlantisPlanReport(planContent, button) {
    const apiKey = await getApiKey();
    if (!apiKey) {
        alert('API Key não encontrada. Por favor, configure a chave da API.');
        return 'Erro: API Key não configurada';
    }

    button.disabled = true;
    const originalText = button.textContent;
    button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Carregando...';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    const requestBody = {
        contents: [
            {
                parts: [
                    {
                        text: `
                            Analyze the following Terraform plan and generate a report in Portuguese with the following format as HTML:

                            **Ambiente**: {PROJECT_NAME}
                            **Status:** {STATUS}

                            **Resumo:**
                            {SUMMARY_OF_CHANGES}

                            **Criações:**
                            {LIST_OF_CREATIONS}

                            **Advertências:**
                            {LIST_OF_WARNINGS}

                            **Detalhes das Advertências:**
                            {DETAILS_OF_WARNINGS}

                            **Recomendações:**
                            {LIST_OF_RECOMMENDATIONS}

                            **Próximos Passos:**
                            {LIST_OF_NEXT_STEPS}

                            **Observação:**
                            {NOTE}

                            Here is the Terraform plan:

                            ${planContent}
                        `
                    }
                ]
            }
        ]
    };
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Erro ao gerar o relatório';
    } catch (error) {
        console.error('Erro ao gerar o relatório:', error);
        return 'Erro ao gerar o relatório';
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

function promptForApiKey() {
    const apiKey = prompt("Por favor, insira sua chave da API do Google:");
    if (apiKey) {
        localStorage.setItem('apiKey', apiKey);
    }
    return apiKey;
}

async function getApiKey() {
    return new Promise((resolve) => {
        chrome.storage.sync.get('apiKey', (result) => {
            let apiKey = result.apiKey;
            if (!apiKey) {
                apiKey = promptForApiKey();
                if (apiKey) {
                    chrome.storage.sync.set({ apiKey: apiKey }, () => {
                        localStorage.setItem('apiKey', apiKey);
                        resolve(apiKey);
                    });
                } else {
                    resolve(null);
                }
            } else {
                localStorage.setItem('apiKey', apiKey);
                resolve(apiKey);
            }
        });
    });
}
initialize()